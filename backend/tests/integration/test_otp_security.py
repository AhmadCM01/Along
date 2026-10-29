"""Integration tests for per-trip OTP generation, HMAC storage, constant-time verification, lock, and expiry."""

from __future__ import annotations

import time
import pytest
from fastapi.testclient import TestClient

from app.ai.graph.workflow import AlongConversationWorkflow
from app.api.v1.drivers import ACTIVE_PODS_STORE
from app.core.security import hash_otp_code
from app.main import create_app
from tests.conftest import InMemoryAsyncRedis


@pytest.mark.asyncio
async def test_per_trip_otp_uniqueness_and_rejection() -> None:
    """Assert two distinct bookings produce distinct 4-digit OTPs and a wrong OTP is rejected."""
    redis_store = InMemoryAsyncRedis()
    wf = AlongConversationWorkflow(redis_store)
    client = TestClient(create_app())

    # 1. First booking
    res1 = await wf.process_inbound_message(
        phone="08031112222",
        message_text="From Dutse first gate to Berger, two seats",
    )
    assert res1.stage == "AWAITING_CONFIRMATION"
    otp1 = res1.boarding_otp
    assert otp1 is not None and len(otp1) == 4 and otp1.isdigit()

    # 2. Second booking (different rider and corridor)
    res2 = await wf.process_inbound_message(
        phone="08039998888",
        message_text="From Orange Market Mararaba to Federal Secretariat, one seat",
    )
    assert res2.stage == "AWAITING_CONFIRMATION"
    otp2 = res2.boarding_otp
    assert otp2 is not None and len(otp2) == 4 and otp2.isdigit()

    # Assert that the two bookings generated different OTPs
    assert otp1 != otp2, f"Expected unique per-trip OTPs, but got duplicate: {otp1} == {otp2}"

    # 3. Store ONLY HMAC in active pod store (no plain text OTP stored)
    req_id = "REQ-SEC-1"
    pod_id = "POD-SEC-TEST"
    ACTIVE_PODS_STORE[pod_id] = {
        "pod_id": pod_id,
        "driver_id": "DRV-001",
        "status": "DRIVER_ASSIGNED",
        "anchor_lat": 9.1779,
        "anchor_lng": 7.3736,
        "seats_occupied": 2,
        "boarding_otp_hashes": {req_id: hash_otp_code(otp1, context_id=req_id)},
        "otp_created_at": {req_id: time.time()},
        "otp_attempts": {req_id: 0},
    }

    # Verify that a wrong OTP is rejected with HTTP 400
    wrong_otp = "0000" if otp1 != "0000" else "1111"
    bad_res = client.post(
        f"/api/v1/drivers/DRV-001/pods/{pod_id}/verify-otp",
        json={
            "ride_request_id": req_id,
            "otp_code": wrong_otp,
            "driver_lat": 9.1779,
            "driver_lng": 7.3736,
        },
    )
    assert bad_res.status_code == 400
    assert "Invalid 4-digit boarding OTP" in bad_res.json()["detail"]

    # Verify that the correct OTP is accepted with HTTP 200
    good_res = client.post(
        f"/api/v1/drivers/DRV-001/pods/{pod_id}/verify-otp",
        json={
            "ride_request_id": req_id,
            "otp_code": otp1,
            "driver_lat": 9.1779,
            "driver_lng": 7.3736,
        },
    )
    assert good_res.status_code == 200
    assert good_res.json()["status"] == "BOARDED"
    assert good_res.json()["escrow_state"] == "CAPTURED"


@pytest.mark.asyncio
async def test_otp_lockout_after_five_failed_attempts() -> None:
    """Assert verification is locked after 5 consecutive wrong attempts."""
    client = TestClient(create_app())
    req_id = "REQ-LOCK-1"
    pod_id = "POD-LOCK-TEST"
    correct_otp = "7721"

    ACTIVE_PODS_STORE[pod_id] = {
        "pod_id": pod_id,
        "driver_id": "DRV-001",
        "status": "DRIVER_ASSIGNED",
        "anchor_lat": 9.1779,
        "anchor_lng": 7.3736,
        "seats_occupied": 1,
        "boarding_otp_hashes": {req_id: hash_otp_code(correct_otp, context_id=req_id)},
        "otp_created_at": {req_id: time.time()},
        "otp_attempts": {req_id: 0},
    }

    # First 4 failed attempts return 400
    for _ in range(4):
        res = client.post(
            f"/api/v1/drivers/DRV-001/pods/{pod_id}/verify-otp",
            json={
                "ride_request_id": req_id,
                "otp_code": "0000",
                "driver_lat": 9.1779,
                "driver_lng": 7.3736,
            },
        )
        assert res.status_code == 400

    # 5th failed attempt locks verification and returns 429
    res5 = client.post(
        f"/api/v1/drivers/DRV-001/pods/{pod_id}/verify-otp",
        json={
            "ride_request_id": req_id,
            "otp_code": "0000",
            "driver_lat": 9.1779,
            "driver_lng": 7.3736,
        },
    )
    assert res5.status_code == 429
    assert "locked" in res5.json()["detail"].lower()

    # Even the correct OTP is now rejected because it is locked
    res_locked = client.post(
        f"/api/v1/drivers/DRV-001/pods/{pod_id}/verify-otp",
        json={
            "ride_request_id": req_id,
            "otp_code": correct_otp,
            "driver_lat": 9.1779,
            "driver_lng": 7.3736,
        },
    )
    assert res_locked.status_code == 429


@pytest.mark.asyncio
async def test_otp_expiration_after_thirty_minutes() -> None:
    """Assert OTP expires after 30 minutes and returns 410 Gone."""
    client = TestClient(create_app())
    req_id = "REQ-EXP-1"
    pod_id = "POD-EXP-TEST"
    correct_otp = "8342"

    ACTIVE_PODS_STORE[pod_id] = {
        "pod_id": pod_id,
        "driver_id": "DRV-001",
        "status": "DRIVER_ASSIGNED",
        "anchor_lat": 9.1779,
        "anchor_lng": 7.3736,
        "seats_occupied": 1,
        "boarding_otp_hashes": {req_id: hash_otp_code(correct_otp, context_id=req_id)},
        # Created 31 minutes ago (1860 seconds ago)
        "otp_created_at": {req_id: time.time() - 1860},
        "otp_attempts": {req_id: 0},
    }

    res = client.post(
        f"/api/v1/drivers/DRV-001/pods/{pod_id}/verify-otp",
        json={
            "ride_request_id": req_id,
            "otp_code": correct_otp,
            "driver_lat": 9.1779,
            "driver_lng": 7.3736,
        },
    )
    assert res.status_code == 410
    assert "expired" in res.json()["detail"].lower()
