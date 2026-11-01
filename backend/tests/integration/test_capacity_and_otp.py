"""Integration tests for 4-seat pod capacity enforcement and seat reuse.

Covers:
1. Booking 5 seats on a 4-seat pod fails with HTTP 409 in user language.
2. Two bookings never share a seat (unique seat numbers per rider).
3. A freed seat when a passenger alights can be rebooked.
"""

from __future__ import annotations

import pytest
from fastapi import HTTPException
from fastapi.testclient import TestClient

from app.api.v1.drivers import (
    ACTIVE_PODS_STORE,
    BookPodSeatInput,
    alight_pod_passenger,
    book_pod_passenger,
    get_pod_for_corridor,
)
from app.main import create_app


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
    client = TestClient(create_app())
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
