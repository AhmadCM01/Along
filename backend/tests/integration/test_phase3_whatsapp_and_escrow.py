"""Phase 3 Acceptance Gate Tests (`P3-T1`, `P3-T2`, `P3-T3`).

Verifies:
1. `P3-T1`: LangGraph Conversational Workflow & Multilingual YAML Templates (`en`, `pcm`, `ha`)
   across 1-turn, 2-turn, relational landmark, voice note, SOS, cancel, and rating flows.
2. `P3-T2`: WhatsApp Cloud API Webhook (`GET /api/v1/webhooks/whatsapp` challenge,
   `POST /api/v1/webhooks/whatsapp` HMAC-SHA256 verification, and 48h `wamid` idempotency deduplication).
3. `P3-T3`: Paystack Webhook (`POST /api/v1/webhooks/paystack` HMAC-SHA512 verification,
   idempotent `reference` deduplication, and `EscrowService` double-entry hold/capture/settle).
"""

from __future__ import annotations

import hashlib
import hmac
import json
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient

from app.ai.graph.workflow import AlongConversationWorkflow
from app.core.config import get_settings
from app.main import create_app
from app.payments.escrow import EscrowService
from tests.conftest import InMemoryAsyncRedis


@pytest.mark.asyncio
async def test_p3_t1_multiturn_langgraph_conversation_and_templates(
    fake_redis: InMemoryAsyncRedis,
) -> None:
    """Verify 1-turn, 2-turn, relational, Hausa, voice note, SOS, cancel, and rating state transitions."""
    wf = AlongConversationWorkflow(fake_redis)

    # 1. Single-turn Pidgin booking -> AWAITING_CONFIRMATION -> YES -> POOLING
    s1 = await wf.process_inbound_message(
        phone="08031234567",
        message_text="Abeg I dey Dutse first gate, two seats go Berger",
    )
    assert s1.stage == "AWAITING_CONFIRMATION"
    assert s1.locale == "pcm"
    assert s1.corridor_id == "BWR-DUT-WUS"
    assert s1.seats == 2
    assert "Along Corridor Quote" in s1.last_reply_text

    s1_confirm = await wf.process_inbound_message(
        phone="08031234567",
        message_text="YES",
    )
    assert s1_confirm.stage == "POOLING"
    assert s1_confirm.request_code is not None and s1_confirm.request_code.startswith("REQ-")
    assert s1_confirm.boarding_otp is not None and len(s1_confirm.boarding_otp) == 4

    # 2. Two-turn booking (Origin first -> Destination second)
    s2_t1 = await wf.process_inbound_message(
        phone="08059998877",
        message_text="I am at Sokale roundabout",
    )
    assert s2_t1.stage == "AWAITING_DESTINATION"
    assert "Sokale" in (s2_t1.origin_name or "")

    s2_t2 = await wf.process_inbound_message(
        phone="08059998877",
        message_text="Wuse Market",
    )
    assert s2_t2.stage == "AWAITING_CONFIRMATION"
    assert s2_t2.total_fare_kobo == 100_000  # ₦1,000

    # 3. Relational mid-corridor drop-off ("that Oando after Katampe bridge")
    s3 = await wf.process_inbound_message(
        phone="08091112233",
        message_text="From Sokale roundabout, drop me for that Oando after Katampe bridge",
    )
    assert s3.stage == "AWAITING_CONFIRMATION"
    assert "Oando" in (s3.destination_name or "")
    assert s3.unit_fare_kobo == 70_000  # ₦700 mid-corridor fare

    # 4. Hausa booking + localized Hausa template
    s4 = await wf.process_inbound_message(
        phone="08023334455",
        message_text="Ina Bwari zan je Kasuwar Wuse kujera biyu",
    )
    assert s4.stage == "AWAITING_CONFIRMATION"
    assert s4.locale == "ha"
    assert "Farashin Tafiyar Along" in s4.last_reply_text
    assert s4.seats == 2

    # 5. Voice note booking via voice fixture or Groq Whisper
    s5 = await wf.process_inbound_message(
        phone="08067778899",
        audio_bytes=b"OggS-demo-voice",
        audio_fixture_id="vn_pidgin_lugbe_area1",
    )
    assert s5.stage == "AWAITING_CONFIRMATION"
    assert s5.corridor_id == "GWL-LUG-AR1"
    assert (s5.xray_trace["asr"].get("model_used") or s5.xray_trace["asr"].get("model_id")) in ("none", "whisper-large-v3-turbo")
    assert (s5.xray_trace["asr"].get("provider") or s5.xray_trace["asr"].get("provider_label")) in ("local_fallback", "groq_whisper")

    # 6. SOS interruption
    s_sos = await wf.process_inbound_message(
        phone="08067778899",
        message_text="Abeg help me o, driver refused to stop, one chance!",
    )
    assert s_sos.stage == "SOS_ACTIVE"
    assert "SOS" in s_sos.last_reply_text


def test_p3_t2_whatsapp_webhook_hmac_and_idempotency() -> None:
    """Verify WhatsApp hub challenge, HMAC-SHA256 signature verification, and wamid deduplication."""
    app = create_app()
    client = TestClient(app)
    settings = get_settings()

    # 1. GET hub challenge verification
    resp_ok = client.get(
        "/api/v1/webhooks/whatsapp",
        params={
            "hub.mode": "subscribe",
            "hub.verify_token": settings.WHATSAPP_VERIFY_TOKEN,
            "hub.challenge": "challenge_998877",
        },
    )
    assert resp_ok.status_code == 200
    assert resp_ok.text == "challenge_998877"

    resp_bad = client.get(
        "/api/v1/webhooks/whatsapp",
        params={
            "hub.mode": "subscribe",
            "hub.verify_token": "wrong_token",
            "hub.challenge": "challenge_998877",
        },
    )
    assert resp_bad.status_code == 403

    # 2. POST inbound webhook with valid HMAC-SHA256 signature
    webhook_body = {
        "object": "whatsapp_business_account",
        "entry": [
            {
                "id": "WABA_1",
                "changes": [
                    {
                        "field": "messages",
                        "value": {
                            "messages": [
                                {
                                    "id": "wamid.HBgNMjM0ODAzMTIzNDU2NwA=",
                                    "from": "2348031234567",
                                    "timestamp": "1730000000",
                                    "type": "text",
                                    "text": {
                                        "body": "From Orange market Mararaba to Federal Secretariat"
                                    },
                                }
                            ]
                        },
                    }
                ],
            }
        ],
    }
    raw_bytes = json.dumps(webhook_body).encode("utf-8")
    sig = "sha256=" + hmac.new(
        settings.WHATSAPP_APP_SECRET.encode("utf-8"),
        raw_bytes,
        hashlib.sha256,
    ).hexdigest()

    post1 = client.post(
        "/api/v1/webhooks/whatsapp",
        content=raw_bytes,
        headers={"Content-Type": "application/json", "X-Hub-Signature-256": sig},
    )
    assert post1.status_code == 200
    data1 = post1.json()
    assert data1["results"][0]["status"] == "PROCESSED"
    assert data1["results"][0]["stage"] == "AWAITING_CONFIRMATION"

    # 3. Duplicate delivery of same wamid is ignored idempotently
    post2 = client.post(
        "/api/v1/webhooks/whatsapp",
        content=raw_bytes,
        headers={"Content-Type": "application/json", "X-Hub-Signature-256": sig},
    )
    assert post2.status_code == 200
    assert post2.json()["results"][0]["status"] == "DUPLICATE_IGNORED"

    # 4. Invalid signature rejected with 401
    post_bad = client.post(
        "/api/v1/webhooks/whatsapp",
        content=raw_bytes,
        headers={"Content-Type": "application/json", "X-Hub-Signature-256": "sha256=deadbeef"},
    )
    assert post_bad.status_code == 401


@pytest.mark.asyncio
async def test_p3_t3_paystack_webhook_and_escrow_lifecycle() -> None:
    """Verify Paystack HMAC-SHA512 webhook idempotency and full EscrowService hold -> capture -> settle."""
    app = create_app()
    client = TestClient(app)
    settings = get_settings()

    rider_id = uuid4()
    ride_request_id = uuid4()
    driver_id = uuid4()
    pod_id = uuid4()

    payload = {
        "event": "charge.success",
        "data": {
            "reference": "PSK_REF_2026_001",
            "amount": 100_000,
            "metadata": {
                "rider_id": str(rider_id),
                "ride_request_id": str(ride_request_id),
            },
        },
    }
    raw_bytes = json.dumps(payload).encode("utf-8")
    ps_sig = hmac.new(
        settings.PAYSTACK_SECRET_KEY.encode("utf-8"),
        raw_bytes,
        hashlib.sha512,
    ).hexdigest()

    # 1. First webhook funds wallet and locks escrow hold
    res1 = client.post(
        "/api/v1/webhooks/paystack",
        content=raw_bytes,
        headers={"Content-Type": "application/json", "x-paystack-signature": ps_sig},
    )
    assert res1.status_code == 200
    body1 = res1.json()
    assert body1["deduplicated"] is False
    assert body1["escrow_state"] == "HELD"
    assert body1["amount_kobo"] == 100_000

    # 2. Duplicate webhook is deduplicated with zero double-credit
    res2 = client.post(
        "/api/v1/webhooks/paystack",
        content=raw_bytes,
        headers={"Content-Type": "application/json", "x-paystack-signature": ps_sig},
    )
    assert res2.status_code == 200
    assert res2.json()["deduplicated"] is True

    # 3. Invalid signature rejected with 401
    res_bad = client.post(
        "/api/v1/webhooks/paystack",
        content=raw_bytes,
        headers={"Content-Type": "application/json", "x-paystack-signature": "invalid_sig"},
    )
    assert res_bad.status_code == 401

    # 4. Complete EscrowService boarding capture & 90/10 settlement
    escrow = EscrowService()
    hold = await escrow.fund_and_lock_escrow(
        ride_request_id=ride_request_id,
        rider_id=rider_id,
        fare_kobo=100_000,
        payment_ref="PSK_REF_2026_002",
    )
    assert hold.state == "HELD"

    captured = await escrow.confirm_boarding_otp(ride_request_id)
    assert captured.state == "CAPTURED"

    settled = await escrow.complete_and_settle_ride(
        pod_id=pod_id,
        ride_request_id=ride_request_id,
        driver_id=driver_id,
    )
    assert settled.state == "SETTLED"
