"""Unit tests for server-authoritative trip state, per-session pods, and live telemetry.

Verifies:
1. Stages advance over time using an injectable fake clock.
2. Progress is monotonic and reaches COMPLETED.
3. Simulated escrow is released exactly once.
4. Two sessions receive different pods and cannot see each other's seats.
5. Capacity 4 returns HTTP 409.
6. Driver verify and start-trip change what the public endpoint returns.
7. Unknown share token returns HTTP 404 with code TRIP_NOT_FOUND.
8. SOS affects only its own trip and returns the specified disclaimer.
9. Two bookings receive distinct OTPs and 5 wrong codes trigger a 429 lock.
10. CORS preflight allows X-Along-Session header.
11. A bad session header returns HTTP 400.
"""

from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from app.core.trip_state import (
    ACTIVE_PODS,
    DEFAULT_DEMO_POD_ID,
    LAB_POD_ID,
    SESSION_LAST_ACTIVE,
    SESSION_POD_MAP,
    SHARE_TOKENS,
    compute_public_trip_view,
    derive_pod_stage,
    get_or_create_session_pod,
    get_pod_by_id_or_session,
    get_server_time,
    interpolate_waypoints_position,
    reset_fake_clock,
    reset_session_pod,
    set_fake_clock,
)
from app.main import create_app


@pytest.fixture(autouse=True)
def clean_trip_state() -> None:
    """Reset fake clock and trip state stores before and after each test."""
    reset_fake_clock()
    yield
    reset_fake_clock()


def test_stages_advance_over_time_and_monotonic_progress() -> None:
    """Assert stages advance from WAITING_FOR_DRIVER -> DRIVER_ON_THE_WAY -> BOARDING -> IN_TRANSIT -> COMPLETED."""
    session_id = "test-session-stages-0001"
    pod = get_or_create_session_pod(session_id)
    t0 = 10_000.0
    set_fake_clock(t0)

    # 1. Unconfirmed pod: WAITING_FOR_DRIVER
    stage, label, prog = derive_pod_stage(pod, demo_driver_arrival_seconds=8.0, demo_trip_seconds=150.0)
    assert stage == "WAITING_FOR_DRIVER"
    assert prog == 0.0

    # 2. Confirm booking at t0
    pod["confirmed_at"] = t0

    # 2 seconds later (< 8s): DRIVER_ON_THE_WAY
    set_fake_clock(t0 + 2.0)
    stage, label, prog = derive_pod_stage(pod, demo_driver_arrival_seconds=8.0, demo_trip_seconds=150.0)
    assert stage == "DRIVER_ON_THE_WAY"
    assert prog == 0.0

    # 9 seconds later (>= 8s): BOARDING
    set_fake_clock(t0 + 9.0)
    stage, label, prog = derive_pod_stage(pod, demo_driver_arrival_seconds=8.0, demo_trip_seconds=150.0)
    assert stage == "BOARDING"
    assert prog == 0.0

    # 3. Depart pod at t = t0 + 20.0
    t_depart = t0 + 20.0
    pod["departed_at"] = t_depart
    set_fake_clock(t_depart)
    stage, label, prog = derive_pod_stage(pod, demo_driver_arrival_seconds=8.0, demo_trip_seconds=150.0)
    assert stage == "IN_TRANSIT"
    assert prog == 0.0

    # 75 seconds later (halfway): IN_TRANSIT, progress = 0.5
    set_fake_clock(t_depart + 75.0)
    stage, label, prog_mid = derive_pod_stage(pod, demo_driver_arrival_seconds=8.0, demo_trip_seconds=150.0)
    assert stage == "IN_TRANSIT"
    assert prog_mid == 0.5
    assert prog_mid > prog

    # 150 seconds later: COMPLETED, progress = 1.0
    set_fake_clock(t_depart + 150.0)
    stage, label, prog_end = derive_pod_stage(pod, demo_driver_arrival_seconds=8.0, demo_trip_seconds=150.0)
    assert stage == "COMPLETED"
    assert prog_end == 1.0
    assert prog_end > prog_mid

    # Beyond trip duration: clamped at 1.0, stage remains COMPLETED
    set_fake_clock(t_depart + 300.0)
    stage, label, prog_clamp = derive_pod_stage(pod, demo_driver_arrival_seconds=8.0, demo_trip_seconds=150.0)
    assert stage == "COMPLETED"
    assert prog_clamp == 1.0


def test_escrow_released_once() -> None:
    """Assert simulated escrow is released exactly once when progress reaches 1.0."""
    session_id = "test-session-escrow-0002"
    pod = get_or_create_session_pod(session_id)
    t0 = 50_000.0
    set_fake_clock(t0)
    pod["departed_at"] = t0
    assert pod["escrow_released"] is False

    # In transit: not released
    set_fake_clock(t0 + 50.0)
    derive_pod_stage(pod, demo_trip_seconds=150.0)
    assert pod["escrow_released"] is False

    # Arrival: released once
    set_fake_clock(t0 + 150.0)
    derive_pod_stage(pod, demo_trip_seconds=150.0)
    assert pod["escrow_released"] is True

    # Subsequent calls maintain escrow_released True without side-effects
    set_fake_clock(t0 + 200.0)
    derive_pod_stage(pod, demo_trip_seconds=150.0)
    assert pod["escrow_released"] is True


def test_two_sessions_get_different_pods_and_cannot_see_each_other() -> None:
    """Assert two sessions get distinct random pods and never share seats or state."""
    app = create_app()
    client = TestClient(app)

    session_a = "session-client-alpha-1234"
    session_b = "session-client-beta-5678"

    # Session A books
    res_a = client.post(
        "/api/v1/demo/chat",
        json={"message_text": "From Dutse first gate to Berger, two seats"},
        headers={"X-Along-Session": session_a},
    )
    assert res_a.status_code == 200
    pod_a_data = client.get("/api/v1/drivers/active-pod", headers={"X-Along-Session": session_a}).json()["pod"]
    pod_a_id = pod_a_data["pod_id"]

    # Session B books
    res_b = client.post(
        "/api/v1/demo/chat",
        json={"message_text": "From Bwari to Wuse, one seat"},
        headers={"X-Along-Session": session_b},
    )
    assert res_b.status_code == 200
    pod_b_data = client.get("/api/v1/drivers/active-pod", headers={"X-Along-Session": session_b}).json()["pod"]
    pod_b_id = pod_b_data["pod_id"]

    # Pod IDs must be strictly different
    assert pod_a_id != pod_b_id
    assert pod_a_data["seats_occupied"] == 2
    assert pod_b_data["seats_occupied"] == 1

    # Manifests must be strictly isolated
    passengers_a = [p["display_name"] for p in pod_a_data["passengers"]]
    passengers_b = [p["display_name"] for p in pod_b_data["passengers"]]
    assert len(passengers_a) == 1
    assert len(passengers_b) == 1
    assert passengers_a[0] == "Rider A (you)"
    assert passengers_b[0] == "Rider A (you)"


def test_capacity_4_returns_409() -> None:
    """Assert booking more than available seats on a 4-seat pod fails with HTTP 409."""
    app = create_app()
    client = TestClient(app)
    session_id = "session-capacity-limit-9999"

    # 1. First booking: 3 seats
    res1 = client.post(
        "/api/v1/demo/chat",
        json={"message_text": "From Dutse first gate to Berger, 3 seats", "phone": "+2348031111111"},
        headers={"X-Along-Session": session_id},
    )
    assert res1.status_code == 200

    # 2. Second booking: 2 seats from different rider (3 + 2 = 5 > 4) -> 409
    res2 = client.post(
        "/api/v1/demo/chat",
        json={"message_text": "From Sokale to Wuse, 2 seats", "phone": "+2348032222222"},
        headers={"X-Along-Session": session_id},
    )
    assert res2.status_code == 409
    assert "Pod capacity" in res2.json()["detail"]


def test_driver_verify_and_start_trip_change_public_endpoint() -> None:
    """Assert driver verify-otp and dispatch update the public trip telemetry."""
    app = create_app()
    client = TestClient(app)
    session_id = "session-driver-flow-7777"
    t0 = 20_000.0
    set_fake_clock(t0)

    # 1. Book and confirm ride
    res_book = client.post(
        "/api/v1/demo/chat",
        json={"message_text": "From Dutse first gate to Berger, 1 seat"},
        headers={"X-Along-Session": session_id},
    )
    assert res_book.status_code == 200
    token = res_book.json()["pane1_whatsapp"]["share_token"]
    otp = res_book.json()["pane1_whatsapp"]["boarding_otp"]

    res_confirm = client.post(
        "/api/v1/demo/chat",
        json={"message_text": "YES"},
        headers={"X-Along-Session": session_id},
    )
    assert res_confirm.status_code == 200

    # Fast forward clock past arrival threshold (8s)
    set_fake_clock(t0 + 10.0)

    # Public endpoint shows BOARDING
    pub1 = client.get(f"/api/v1/trips/share/{token}")
    assert pub1.status_code == 200
    assert pub1.json()["stage"] == "BOARDING"
    assert pub1.json()["boarded_count"] == 0

    # 2. Driver verifies OTP
    res_otp = client.post(
        "/api/v1/drivers/DRV-001/pods/active/verify-otp",
        json={
            "ride_request_id": "auto",
            "otp_code": otp,
            "driver_lat": 9.1779,
            "driver_lng": 7.3736,
        },
        headers={"X-Along-Session": session_id},
    )
    assert res_otp.status_code == 200
    assert res_otp.json()["status"] == "BOARDED"

    # Public endpoint shows 1 rider boarded
    pub2 = client.get(f"/api/v1/trips/share/{token}")
    assert pub2.json()["boarded_count"] == 1

    # 3. Driver starts trip
    res_disp = client.post(
        "/api/v1/drivers/DRV-001/pods/active/dispatch",
        headers={"X-Along-Session": session_id},
    )
    assert res_disp.status_code == 200
    assert res_disp.json()["status"] == "IN_TRANSIT"

    # Public endpoint now shows IN_TRANSIT with valid departed_at
    pub3 = client.get(f"/api/v1/trips/share/{token}")
    assert pub3.json()["stage"] == "IN_TRANSIT"
    assert pub3.json()["departed_at"] is not None


def test_start_trip_with_zero_boarded_returns_409() -> None:
    """Assert demo shortcut dispatch returns HTTP 409 if zero riders are boarded."""
    app = create_app()
    client = TestClient(app)
    session_id = "session-empty-dispatch-001"

    # Pristine session with 0 boarded riders
    res = client.post(
        "/api/v1/drivers/DRV-001/pods/active/dispatch",
        headers={"X-Along-Session": session_id},
    )
    assert res.status_code == 409
    assert "at least one passenger must be boarded" in res.json()["detail"]


def test_unknown_token_returns_404_with_code() -> None:
    """Assert unknown share token returns HTTP 404 with standard code and message."""
    app = create_app()
    client = TestClient(app)

    res = client.get("/api/v1/trips/share/non-existent-token-xyz-999")
    assert res.status_code == 404
    body = res.json()
    assert body["code"] == "TRIP_NOT_FOUND"
    assert "This trip is no longer available" in body["message"]
    assert res.headers.get("Cache-Control") == "no-store"


def test_sos_affects_only_its_own_trip_and_returns_disclaimer() -> None:
    """Assert SOS activation sets flag on that trip only and returns demo disclaimer."""
    app = create_app()
    client = TestClient(app)

    session_1 = "session-sos-test-0001"
    session_2 = "session-sos-test-0002"

    res1 = client.post(
        "/api/v1/demo/chat",
        json={"message_text": "From Dutse first gate to Berger, 1 seat"},
        headers={"X-Along-Session": session_1},
    )
    token1 = res1.json()["pane1_whatsapp"]["share_token"]

    res2 = client.post(
        "/api/v1/demo/chat",
        json={"message_text": "From Bwari to Wuse, 1 seat"},
        headers={"X-Along-Session": session_2},
    )
    token2 = res2.json()["pane1_whatsapp"]["share_token"]

    # Trigger SOS on trip 1 only
    sos_res = client.post(f"/api/v1/trips/share/{token1}/sos")
    assert sos_res.status_code == 200
    expected_msg = "Demo only. This marks the trip as an emergency in this demo. It does not contact any emergency service."
    assert sos_res.json()["message"] == expected_msg

    # Verify trip 1 has sos_active True
    view1 = client.get(f"/api/v1/trips/share/{token1}").json()
    assert view1["sos_active"] is True

    # Verify trip 2 has sos_active False
    view2 = client.get(f"/api/v1/trips/share/{token2}").json()
    assert view2["sos_active"] is False


def test_two_bookings_give_different_otps_and_5_wrong_codes_lock() -> None:
    """Assert bookings receive distinct random OTPs and 5 invalid verification attempts lock the OTP."""
    app = create_app()
    client = TestClient(app)

    # 1. Distinct OTPs
    res1 = client.post(
        "/api/v1/demo/chat",
        json={"message_text": "From Dutse first gate to Berger, 1 seat"},
        headers={"X-Along-Session": "session-otp-lock-0001"},
    )
    otp1 = res1.json()["pane1_whatsapp"]["boarding_otp"]

    res2 = client.post(
        "/api/v1/demo/chat",
        json={"message_text": "From Bwari to Wuse, 1 seat"},
        headers={"X-Along-Session": "session-otp-lock-0002"},
    )
    otp2 = res2.json()["pane1_whatsapp"]["boarding_otp"]
    assert otp1 != otp2

    # 2. 5 wrong attempts trigger 429 lock
    session_id = "session-otp-lock-0001"
    req_id_1 = res1.json()["pane1_whatsapp"]["request_code"]
    for attempt in range(4):
        bad_res = client.post(
            "/api/v1/drivers/DRV-001/pods/active/verify-otp",
            json={
                "ride_request_id": req_id_1,
                "otp_code": "0000",
                "driver_lat": 9.1779,
                "driver_lng": 7.3736,
            },
            headers={"X-Along-Session": session_id},
        )
        assert bad_res.status_code == 400

    # 5th attempt locks
    lock_res = client.post(
        "/api/v1/drivers/DRV-001/pods/active/verify-otp",
        json={
            "ride_request_id": req_id_1,
            "otp_code": "0000",
            "driver_lat": 9.1779,
            "driver_lng": 7.3736,
        },
        headers={"X-Along-Session": session_id},
    )
    assert lock_res.status_code == 429
    assert "Verification locked" in lock_res.json()["detail"]


def test_cors_preflight_allows_x_along_session() -> None:
    """Assert CORS preflight OPTIONS request returns X-Along-Session in allowed headers."""
    app = create_app()
    client = TestClient(app)

    res = client.options(
        "/api/v1/demo/chat",
        headers={
            "Origin": "http://localhost:3000",
            "Access-Control-Request-Method": "POST",
            "Access-Control-Request-Headers": "X-Along-Session",
        },
    )
    assert res.status_code == 200
    allow_headers = res.headers.get("access-control-allow-headers", "")
    assert "x-along-session" in allow_headers.lower() or "*" in allow_headers


def test_bad_session_header_gives_400() -> None:
    """Assert an invalid X-Along-Session header returns HTTP 400."""
    app = create_app()
    client = TestClient(app)

    # Too short (< 16 characters)
    res_short = client.post(
        "/api/v1/demo/chat",
        json={"message_text": "Hello"},
        headers={"X-Along-Session": "short-id"},
    )
    assert res_short.status_code == 400
    assert res_short.json()["code"] == "INVALID_SESSION_HEADER"

    # Invalid characters (!@#$)
    res_invalid_chars = client.post(
        "/api/v1/demo/chat",
        json={"message_text": "Hello"},
        headers={"X-Along-Session": "invalid_session_with_bad_symbols!@#$1234"},
    )
    assert res_invalid_chars.status_code == 400
    assert res_invalid_chars.json()["code"] == "INVALID_SESSION_HEADER"
