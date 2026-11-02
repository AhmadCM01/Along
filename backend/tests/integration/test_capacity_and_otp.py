"""Integration tests for 4-seat pod capacity enforcement and seat reuse.

Covers:
1. Booking 5 seats on a 4-seat pod fails with HTTP 409 in user language.
2. Two bookings never share a seat (unique seat numbers per rider).
3. A freed seat when a passenger alights can be rebooked.
"""

from __future__ import annotations

import pytest
from fastapi import FastAPI, HTTPException
from fastapi.testclient import TestClient

from app.api.v1.drivers import (
    ACTIVE_PODS_STORE,
    BookPodSeatInput,
    VerifyBoardingOTPInput,
    alight_pod_passenger,
    book_pod_passenger,
    get_pod_for_corridor,
    router as drivers_router,
)


def test_booking_5_seats_fails_with_409() -> None:
    """Assert booking 5 seats on a 4-seat pod fails with HTTP 409 in user language."""
    pod_id = "POD-TEST-CAP-5"
    pod = get_pod_for_corridor("BWR-DUT-WUS", pod_id)
    pod["passengers"] = []
    pod["seats_occupied"] = 0

    # 1. Test via direct helper with English
    with pytest.raises(HTTPException) as exc_en:
        book_pod_passenger(
            pod,
            BookPodSeatInput(
                rider_name="Rider A",
                seats=5,
                locale="en",
            ),
        )
    assert exc_en.value.status_code == 409
    assert "Pod capacity exceeded" in exc_en.value.detail
    assert "4 seats" in exc_en.value.detail

    # 2. Test via direct helper with Pidgin
    with pytest.raises(HTTPException) as exc_pcm:
        book_pod_passenger(
            pod,
            BookPodSeatInput(
                rider_name="Rider A",
                seats=5,
                locale="pcm",
            ),
        )
    assert exc_pcm.value.status_code == 409
    assert "Pod capacity don pass limit" in exc_pcm.value.detail

    # 3. Test via direct helper with Hausa
    with pytest.raises(HTTPException) as exc_ha:
        book_pod_passenger(
            pod,
            BookPodSeatInput(
                rider_name="Rider A",
                seats=5,
                locale="ha",
            ),
        )
    assert exc_ha.value.status_code == 409
    assert "Yawan kujerun mota ya cika" in exc_ha.value.detail

    # 4. Test via HTTP endpoint
    app = FastAPI()
    app.include_router(drivers_router)
    with TestClient(app) as client:
        res = client.post(
            f"/api/v1/drivers/DRV-001/pods/{pod_id}/book",
            json={
                "rider_name": "Rider A",
                "origin": "Dutse First Gate",
                "destination": "Berger",
                "seats": 5,
                "locale": "en",
            },
        )
        assert res.status_code == 409
        assert "Pod capacity exceeded" in res.json()["detail"]


def test_two_bookings_never_share_a_seat() -> None:
    """Assert two concurrent bookings on the same pod never share any seat number."""
    pod_id = "POD-TEST-NO-SHARE"
    pod = get_pod_for_corridor("BWR-DUT-WUS", pod_id)
    pod["passengers"] = []
    pod["seats_occupied"] = 0

    # First booking: 2 seats
    b1 = book_pod_passenger(
        pod,
        BookPodSeatInput(
            rider_name="Rider A",
            seats=2,
            request_id="req-a",
        ),
    )
    assert len(b1["seat_numbers"]) == 2

    # Second booking: 2 seats
    b2 = book_pod_passenger(
        pod,
        BookPodSeatInput(
            rider_name="Rider B",
            seats=2,
            request_id="req-b",
        ),
    )
    assert len(b2["seat_numbers"]) == 2

    # Verify no seat overlap
    seats_b1 = set(b1["seat_numbers"])
    seats_b2 = set(b2["seat_numbers"])
    assert seats_b1.isdisjoint(seats_b2), f"Seat collision: {seats_b1} & {seats_b2}"
    assert seats_b1 | seats_b2 == {1, 2, 3, 4}
    assert pod["seats_occupied"] == 4


def test_freed_seat_can_be_rebooked() -> None:
    """Assert a seat freed by an alighting passenger can be reused by a new booking."""
    pod_id = "POD-TEST-RELOAD"
    pod = get_pod_for_corridor("BWR-DUT-WUS", pod_id)
    pod["passengers"] = []
    pod["seats_occupied"] = 0

    # Fill pod to 4/4 capacity
    b1 = book_pod_passenger(
        pod,
        BookPodSeatInput(
            rider_name="Rider A",
            seats=2,
            request_id="req-reload-1",
        ),
    )
    b2 = book_pod_passenger(
        pod,
        BookPodSeatInput(
            rider_name="Rider B",
            seats=2,
            request_id="req-reload-2",
        ),
    )
    assert pod["seats_occupied"] == 4

    # Booking when full fails with 409
    with pytest.raises(HTTPException) as exc_full:
        book_pod_passenger(
            pod,
            BookPodSeatInput(
                rider_name="Rider C",
                seats=1,
                locale="en",
            ),
        )
    assert exc_full.value.status_code == 409

    # Rider A alights at intermediate anchor
    alighted = alight_pod_passenger(pod, "req-reload-1")
    assert alighted["is_alighted"] is True
    assert pod["seats_occupied"] == 2

    # Now 2 seats are free and Rider C can book
    b3 = book_pod_passenger(
        pod,
        BookPodSeatInput(
            rider_name="Rider C",
            seats=2,
            request_id="req-reload-3",
        ),
    )
    assert len(b3["seat_numbers"]) == 2
    # Rider C reused the exact seats freed by Rider A
    assert set(b3["seat_numbers"]) == set(b1["seat_numbers"])
    assert pod["seats_occupied"] == 4


def test_verify_otp_with_auto_request_id_and_strict_departure() -> None:
    """Assert OTP verification works with 'auto' request_id and pod only departs when full."""
    pod_id = "POD-TEST-AUTO-DISPATCH"
    pod = get_pod_for_corridor("BWR-DUT-WUS", pod_id)
    pod["passengers"] = []
    pod["seats_occupied"] = 0
    pod["boarded_requests"] = set()
    pod["boarding_otp_hashes"] = {}
    pod["boarding_otps"] = {}
    pod["status"] = "STANDBY"

    # Book 1 seat (Rider A)
    b1 = book_pod_passenger(
        pod,
        BookPodSeatInput(
            rider_name="Rider A",
            seats=1,
            request_id="req-auto-1",
        ),
    )
    otp = b1["otp_code"]

    app = FastAPI()
    app.include_router(drivers_router)
    with TestClient(app) as client:
        # 1. Unknown OTP with "auto" fails with 404
        bad_res = client.post(
            f"/api/v1/drivers/DRV-001/pods/{pod_id}/verify-otp",
            json={
                "ride_request_id": "auto",
                "otp_code": "0000",
                "driver_lat": 9.1779,
                "driver_lng": 7.3736,
            },
        )
        assert bad_res.status_code == 404

        # 2. Valid OTP with "auto" succeeds
        good_res = client.post(
            f"/api/v1/drivers/DRV-001/pods/{pod_id}/verify-otp",
            json={
                "ride_request_id": "auto",
                "otp_code": otp,
                "driver_lat": 9.1779,
                "driver_lng": 7.3736,
            },
        )
        assert good_res.status_code == 200
        data = good_res.json()
        assert data["status"] == "BOARDED"
        # Pod is only 1/4 full, so it must stay in BOARDING state
        assert data["pod_status"] == "BOARDING"

        # Verify passenger is marked boarded in pod
        p_entry = next(p for p in pod["passengers"] if p["request_id"] == "req-auto-1")
        assert p_entry["is_boarded"] is True
        assert p_entry["status"] == "BOARDED"

        # 3. Simulate co-riders filling the remaining 3 seats
        fill_res = client.post(f"/api/v1/drivers/DRV-001/pods/{pod_id}/fill-coriders")
        assert fill_res.status_code == 200
        fill_data = fill_res.json()
        assert fill_data["seats_occupied"] == 4
        # All 4 seats are boarded now, so pod departs (IN_TRANSIT)
        assert fill_data["pod_status"] == "IN_TRANSIT"
        assert pod["status"] == "IN_TRANSIT"
