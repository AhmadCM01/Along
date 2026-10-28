"""Phase 4 & Phase 5 Backend Acceptance Gate Tests (`P4-T1`, `P4-T2`, `P4-T4`, `P5-T1`, `P5-T2`).

Verifies:
1. `P4-T1`: DriverDispatcher Anchor FIFO + 3km GEOSEARCH, 30s offer cascade, Mid-Corridor Seat Reload,
   and 8-minute partial pod (`>= 3` seats) scheduler.
2. `P4-T2`: Driver REST API, SAM 3.1 KYC vehicle verification, 150m geofenced 4-digit OTP boarding,
   and 2G Feature-Phone USSD (`*384*247#`) + Voice IVR DTMF `1` acceptance.
3. `P4-T4`: Public Live Trip Share (`/api/v1/trips/share/{token}`) & 1-tap SOS escalation.
4. `P5-T1` & `P5-T2`: Operations Command Center (`/api/v1/ops/overview`, `/api/v1/ops/corridors`)
   and 3-Pane Judge Cockpit (`/api/v1/demo/scenarios`, `/api/v1/demo/chat`).
"""

from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from app.api.v1.drivers import ACTIVE_PODS_STORE
from app.main import create_app
from app.matching.dispatcher import DriverDispatcher
from app.matching.pool import QueuedRideRequest, enqueue_paid_ride_request
from app.workers.scheduler import CorridorSchedulerWorker
from tests.conftest import InMemoryAsyncRedis


@pytest.mark.asyncio
async def test_p4_t1_dispatcher_mid_corridor_reload_and_partial_pod_scheduler(
    fake_redis: InMemoryAsyncRedis,
) -> None:
    """Verify Anchor FIFO + GEOSEARCH dispatch, Mid-Corridor Seat Reload, and 8-min partial pod formation."""
    dispatcher = DriverDispatcher(fake_redis)

    # 1. Register 2 drivers (one in Anchor FIFO queue, one 1.2km away via GEO)
    await dispatcher.register_driver_online(
        driver_id="DRV-001",
        corridor_id="BWR-DUT-WUS",
        direction="S",
        anchor_id="ANC-DUT-01",
        lat=9.1779,
        lng=7.3736,
        phone_mode="SMARTPHONE",
    )
    await dispatcher.register_driver_online(
        driver_id="DRV-002",
        corridor_id="BWR-DUT-WUS",
        direction="S",
        anchor_id=None,
        lat=9.1810,
        lng=7.3750,
        phone_mode="FEATURE_PHONE",
    )

    # 2. Enqueue 3 riders at ANC-DUT-01 and verify partial pod forms after 8-min (480s) wait
    for i in range(3):
        await enqueue_paid_ride_request(
            fake_redis,
            QueuedRideRequest(
                ride_request_id=f"REQ-PARTIAL-{i+1}",
                rider_id=f"RDR-{i+1}",
                corridor_id="BWR-DUT-WUS",
                direction="S",
                anchor_id="ANC-DUT-01",
                origin_zone_id="ZONE-DUT",
                dest_zone_id="ZONE-WUS",
                seats=1,
                fare_kobo=100_000,
                enqueue_ms=1000 + i,
            ),
        )

    scheduler = CorridorSchedulerWorker(fake_redis)
    # Before 8 minutes (wait=120s), 3 seats do not form a pod
    no_pod = await scheduler.check_and_form_partial_or_full_pod(
        corridor_id="BWR-DUT-WUS",
        direction="S",
        anchor_id="ANC-DUT-01",
        oldest_wait_seconds=120,
    )
    assert no_pod == []

    # At 8 minutes (wait=480s), 3-seat partial pod forms atomically
    partial_members = await scheduler.check_and_form_partial_or_full_pod(
        corridor_id="BWR-DUT-WUS",
        direction="S",
        anchor_id="ANC-DUT-01",
        oldest_wait_seconds=480,
    )
    assert len(partial_members) == 3

    # 3. Dispatch offer to first candidate driver (DRV-001 at anchor forecourt) and accept
    pod_id = "POD-RELOAD-01"
    await fake_redis.hset(
        f"pod:{pod_id}",
        mapping={
            "pod_id": pod_id,
            "status": "FORMED",
            "seats_occupied": "4",
            "cumulative_riders_served": "4",
        },
    )
    offered_drv = await dispatcher.dispatch_offer_to_next_driver(
        pod_id=pod_id,
        corridor_id="BWR-DUT-WUS",
        direction="S",
        anchor_id="ANC-DUT-01",
        anchor_lat=9.1779,
        anchor_lng=7.3736,
    )
    assert offered_drv == "DRV-001"

    accepted = await dispatcher.driver_accept_offer(pod_id=pod_id, driver_id="DRV-001")
    assert accepted is True

    # 4. Mid-Corridor Seat Reload at Oando Katampe Bridge (1 seat alights, 1 new rider reloads -> 5 riders served!)
    waiting_at_oando = [
        QueuedRideRequest(
            ride_request_id="REQ-RELOAD-5",
            rider_id="RDR-5",
            corridor_id="BWR-DUT-WUS",
            direction="S",
            anchor_id="ANC-OAN-01",
            origin_zone_id="ZONE-KAT-OAN",
            dest_zone_id="ZONE-WUS",
            seats=1,
            fare_kobo=50_000,
            enqueue_ms=2000,
        )
    ]
    reload_res = await dispatcher.reload_vacated_seats_at_anchor(
        pod_id=pod_id,
        corridor_id="BWR-DUT-WUS",
        direction="S",
        intermediate_anchor_id="ANC-OAN-01",
        alighted_seats=1,
        waiting_riders_at_anchor=waiting_at_oando,
    )
    assert reload_res.reloaded_seats == 1
    assert reload_res.total_cumulative_riders_served == 5
    assert reload_res.incremental_driver_revenue_kobo == 45_000


def test_p4_t2_and_t4_drivers_sam_kyc_otp_geofence_ussd_and_trip_share() -> None:
    """Verify Driver REST API, SAM 3.1 KYC, 150m OTP geofence, 2G USSD/IVR, and Public Trip Share SOS."""
    app = create_app()
    client = TestClient(app)

    # 1. List 18 seeded Abuja corridor drivers
    drv_list = client.get("/api/v1/drivers").json()
    assert drv_list["count"] == 18

    # 2. SAM 3.1 Driver KYC vehicle photo segmentation
    kyc_res = client.post(
        "/api/v1/drivers/kyc/verify-vehicle",
        json={
            "driver_id": "DRV-001",
            "plate_number": "ABJ-412K",
            "declared_seats": 4,
            "image_base64": "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
        },
    )
    assert kyc_res.status_code == 200
    assert kyc_res.json()["verified"] is True
    assert kyc_res.json()["model_used"] == "sam-3.1"

    # 3. 4-digit Boarding OTP verification with 150m geofence enforcement
    ACTIVE_PODS_STORE["POD-OTP-1"] = {
        "pod_id": "POD-OTP-1",
        "status": "DRIVER_ASSIGNED",
        "anchor_lat": 9.1779,
        "anchor_lng": 7.3736,
        "seats_occupied": 1,
        "boarding_otps": {"REQ-1": "4829"},
    }
    # Outside 150m geofence -> rejected with 422
    far_otp = client.post(
        "/api/v1/drivers/DRV-001/pods/POD-OTP-1/verify-otp",
        json={
            "ride_request_id": "REQ-1",
            "otp_code": "4829",
            "driver_lat": 9.1900,
            "driver_lng": 7.3900,
        },
    )
    assert far_otp.status_code == 422

    # Inside 150m geofence with valid OTP -> BOARDED + CAPTURED + IN_TRANSIT
    good_otp = client.post(
        "/api/v1/drivers/DRV-001/pods/POD-OTP-1/verify-otp",
        json={
            "ride_request_id": "REQ-1",
            "otp_code": "4829",
            "driver_lat": 9.1779,
            "driver_lng": 7.3736,
        },
    )
    assert good_otp.status_code == 200
    assert good_otp.json()["escrow_state"] == "CAPTURED"
    assert good_otp.json()["pod_status"] == "IN_TRANSIT"

    # 4. 2G Feature-Phone USSD (*384*247#) + Voice IVR DTMF '1'
    ussd_menu = client.post(
        "/api/v1/ussd/driver",
        json={"sessionId": "USSD_1", "phoneNumber": "+2348030001111", "text": ""},
    )
    assert ussd_menu.status_code == 200
    assert "CON Welcome to Along Driver" in ussd_menu.text

    ussd_online = client.post(
        "/api/v1/ussd/driver",
        json={"sessionId": "USSD_1", "phoneNumber": "+2348030001111", "text": "1*1"},
    )
    assert "END You are now ONLINE at A.A. Rano Dutse First Gate" in ussd_online.text

    ussd_otp = client.post(
        "/api/v1/ussd/driver",
        json={"sessionId": "USSD_2", "phoneNumber": "+2348030001111", "text": "2*4829"},
    )
    assert "END OTP 4829 Verified! Escrow CAPTURED." in ussd_otp.text

    ivr_accept = client.post(
        "/api/v1/voice/driver-ivr",
        json={
            "sessionId": "IVR_1",
            "driver_id": "DRV-002",
            "pod_id": "POD-2G-99",
            "dtmfDigits": "1",
        },
    )
    assert ivr_accept.status_code == 200
    assert ivr_accept.json()["status"] == "ACCEPTED"
    assert ivr_accept.json()["channel"] == "2G_VOICE_DTMF"

    # 5. Public Trip Share & 1-Tap Family SOS
    share_get = client.get("/api/v1/trips/share/tok_demo_family_123")
    assert share_get.status_code == 200
    assert share_get.json()["driver"]["nin_verified"] is True

    share_sos = client.post("/api/v1/trips/share/tok_demo_family_123/sos")
    assert share_sos.status_code == 200
    assert share_sos.json()["status"] == "SOS_ACTIVATED"


def test_p5_ops_and_demo_cockpit_endpoints() -> None:
    """Verify Operations Command Center (/ops) and 3-Pane Judge Cockpit (/demo) API endpoints."""
    app = create_app()
    client = TestClient(app)

    ops_ov = client.get("/api/v1/ops/overview").json()
    assert ops_ov["brand"] == "Along"
    assert ops_ov["network"]["active_corridors"] == 6
    assert ops_ov["ledger_audit"]["trial_balance_kobo"] == 0
    assert ops_ov["ai_models"]["fast_extraction"] == "muse-spark-1.3"
    assert ops_ov["ai_models"]["frontier_reasoning"] == "muse-wonder"
    assert ops_ov["ai_models"]["voice_asr"] == "muse-voice-transcribe"
    assert ops_ov["ai_models"]["vehicle_kyc_vision"] == "sam-3.1"

    ops_corr = client.get("/api/v1/ops/corridors").json()
    assert ops_corr["count"] == 6

    scns = client.get("/api/v1/demo/scenarios").json()
    assert scns["count"] == 5

    chat_res = client.post(
        "/api/v1/demo/chat",
        json={
            "phone": "+2348031234567",
            "message_text": "Abeg I dey Dutse first gate, two seats go Berger",
        },
    )
    assert chat_res.status_code == 200
    c_body = chat_res.json()
    assert c_body["pane1_whatsapp"]["stage"] == "AWAITING_CONFIRMATION"
    assert c_body["pane2_xray_and_ledger"]["trial_balance_kobo"] == 0
    assert c_body["pane3_driver"]["ussd_shortcode"] == "*384*247#"
