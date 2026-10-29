"""3-Pane Judge Cockpit Emulator & Guided Scenario Engine (app/api/v1/demo_emulator.py).

Provides:
- Guided demo scenarios with transparent labeling and fallback flags
- Replay mode with sample traces: labeled 'Sample trace (illustrative, not a live run)'
- Synchronized 3-pane telemetry with API-derived model labeling
"""

from __future__ import annotations

import json
import time
from pathlib import Path
from typing import Any

from fastapi import APIRouter, Request
from pydantic import BaseModel

from app.ai.asr import transcribe_voice_note
from app.ai.graph.workflow import AlongConversationWorkflow
from app.api.v1.drivers import ACTIVE_PODS_STORE
from app.api.v1.webhooks_whatsapp import get_webhook_redis_store
from app.core.ids import generate_boarding_otp, generate_share_token
from app.core.money import format_naira
from app.core.security import hash_otp_code

router = APIRouter(prefix="/api/v1/demo", tags=["demo-cockpit"])

REPLAY_FILE_PATH = Path(__file__).resolve().parents[4] / "data" / "replays" / "real_replay.json"


class DemoChatInput(BaseModel):
    phone: str = "+2348031234567"
    message_text: str | None = None
    audio_fixture_id: str | None = None
    is_peak: bool = False


GUIDED_SCENARIOS: list[dict[str, Any]] = [
    {
        "id": "scn_1_pidgin_full_pod",
        "number": 1,
        "title": "Pidgin Full Pod (Dutse First Gate -> Berger)",
        "subtitle": "Multilingual NLU slot extraction + A.A. Rano Anchor Snap + 4/4 Pod Match (Demo data)",
        "corridor_id": "BWR-DUT-WUS",
        "locale": "pcm",
        "sample_utterance": "Abeg I dey Dutse first gate, two seats go Berger",
        "highlights": [
            "Extracts origin, destination, and 2 seats from Nigerian Pidgin",
            "Snaps pickup to A.A. Rano Filling Station (Zero tout extortion, safe commercial forecourt)",
            "Locks NGN 2,000 in Simulated Escrow and forms 4/4 Pod POD-842A (Demo data)",
        ],
    },
    {
        "id": "scn_2_mid_corridor_reload",
        "number": 2,
        "title": "Relational Landmark + Mid-Corridor Seat Reload",
        "subtitle": "Relational reasoning ('that Oando after Katampe bridge') + 5th fare reload (Demo data)",
        "corridor_id": "BWR-DUT-WUS",
        "locale": "en",
        "sample_utterance": "From Sokale roundabout, drop me for that Oando after Katampe bridge",
        "highlights": [
            "Resolves 'that Oando after Katampe bridge' -> Oando Filling Station (km 26.1)",
            "Charges fair mid-corridor zone fare of NGN 700 instead of full NGN 1,000 terminal fare",
            "When Rider 1 alights at Oando (km 26.1), Rider 5 waiting at Oando reloads into the freed seat to Wuse Market (+NGN 500)",
        ],
    },
    {
        "id": "scn_3_hausa_voice_note",
        "number": 3,
        "title": "Hausa WhatsApp Voice Note",
        "subtitle": "Abuja gazetteer-conditioned speech-to-text + Hausa template response (Demo data)",
        "corridor_id": "BWR-DUT-WUS",
        "locale": "ha",
        "sample_utterance": "Ina Bwari zan je Kasuwar Wuse kujera biyu",
        "audio_fixture_id": "vn_hausa_bwari_wuse",
        "highlights": [
            "Speech recognition conditioned on 140 Abuja landmarks",
            "Resolves 'Kasuwar Wuse' -> Wuse Market Main Gate via character n-gram hashing and Jaro-Winkler",
            "Responds in natural Hausa with transparent zone pricing (NGN 1,800/seat)",
        ],
    },
    {
        "id": "scn_4_feature_phone_ussd",
        "number": 4,
        "title": "2G Feature-Phone Driver Dispatch (*384*247# + Voice IVR)",
        "subtitle": "Offline Nokia 105 driver accepts pod via DTMF '1' + SMS manifest + USSD OTP (Demo data)",
        "corridor_id": "GWL-LUG-AR1",
        "locale": "pcm",
        "sample_utterance": "I dey Police signboard Lugbe, 1 seat go Area 1",
        "highlights": [
            "Matches commuter at Conoil Filling Station (Lugbe Police Signboard) on GWL-LUG-AR1",
            "Dispatches Pod to Mallam Sani (2G Nokia 105 driver, Demo profile) via Voice IVR",
            "Driver verifies 4-digit boarding OTP via *384*247*2*<OTP># USSD with zero mobile data required",
        ],
    },
    {
        "id": "scn_5_one_chance_sos",
        "number": 5,
        "title": "Anti-'One-Chance' Safety Guard & Live SOS",
        "subtitle": "< 2ms rule-based safety gate distress interception + Operations escalation (Demo data)",
        "corridor_id": "MRB-NYA-CEN",
        "locale": "pcm",
        "sample_utterance": "Abeg help me o, driver refused to stop, one chance!",
        "highlights": [
            "Rule-based safety gate intercepts distress keywords in < 2ms (bypasses queue)",
            "Immediately transitions trip to SOS_ACTIVE and broadcasts driver plate and live GPS",
            "Triggers high-priority visual/audio alert on Operations Command Center (/ops)",
        ],
    },
]

# Sample trace fixtures (illustrative historical replays)
RECORDED_REPLAYS: dict[str, dict[str, Any]] = {
    "replay_dutse_berger_pidgin": {
        "id": "replay_dutse_berger_pidgin",
        "label": "Sample trace (illustrative, not a live run)",
        "is_live": False,
        "scenario_title": "Pidgin Full Pod (Dutse First Gate -> Berger)",
        "recorded_at": "2026-10-28T09:15:00Z",
        "utterance": "Abeg I dey Dutse first gate, two seats go Berger",
        "trace": {
            "stage": "extraction",
            "provider_label": "local_fallback",
            "model_id": "none",
            "latency_ms": 11.4,
            "status": "fallback",
            "fallback": True,
        },
        "quote": {
            "corridor_id": "BWR-DUT-WUS",
            "anchor_name": "A.A. Rano Filling Station (Dutse First Gate)",
            "dest_name": "Berger Roundabout Underbridge",
            "unit_fare_naira": "₦900",
            "total_fare_naira": "₦1,800",
            "escrow_status": "Simulated escrow",
            "driver_profile": "Demo driver profile",
        },
    },
    "replay_relational_oando": {
        "id": "replay_relational_oando",
        "label": "Sample trace (illustrative, not a live run)",
        "is_live": False,
        "scenario_title": "Relational Landmark + Mid-Corridor Seat Reload",
        "recorded_at": "2026-10-28T09:25:00Z",
        "utterance": "From Sokale roundabout, drop me for that Oando after Katampe bridge",
        "trace": {
            "stage": "landmark_resolution",
            "provider_label": "local_vector_index",
            "model_id": "character_ngram_hashing",
            "latency_ms": 3.2,
            "status": "ok",
            "fallback": False,
        },
        "quote": {
            "corridor_id": "BWR-DUT-WUS",
            "anchor_name": "Bovas Filling Station (Sokale Roundabout)",
            "dest_name": "Oando Filling Station (After Katampe Bridge)",
            "unit_fare_naira": "₦700",
            "total_fare_naira": "₦700",
            "escrow_status": "Simulated escrow",
            "driver_profile": "Demo driver profile",
        },
    },
}


@router.get("/scenarios")
async def list_demo_scenarios() -> dict[str, Any]:
    """Return the 5 Guided Judge Scenarios with transparent Demo data badges."""
    return {"count": len(GUIDED_SCENARIOS), "scenarios": GUIDED_SCENARIOS}


@router.get("/replays")
async def list_demo_replays() -> dict[str, Any]:
    """Return available sample traces for replay mode."""
    return {"count": len(RECORDED_REPLAYS), "replays": list(RECORDED_REPLAYS.values())}


@router.get("/replay/{replay_id}")
async def get_demo_replay(replay_id: str) -> dict[str, Any]:
    """Return a single sample trace labeled 'Sample trace (illustrative, not a live run)'."""
    replay = RECORDED_REPLAYS.get(replay_id)
    if replay:
        return replay
    return {
        "id": replay_id,
        "label": "Sample trace (illustrative, not a live run)",
        "is_live": False,
        "error": "Replay fixture not found, returning standard sample",
        "trace": list(RECORDED_REPLAYS.values())[0],
    }


@router.get("/replay/live")
async def get_live_replay() -> dict[str, Any]:
    """Return real traces recorded from live runs, or indicate unavailable if file does not exist."""
    if not REPLAY_FILE_PATH.exists():
        return {
            "available": False,
            "recorded_at": None,
            "error": "No live replay file found on disk",
        }
    try:
        data = json.loads(REPLAY_FILE_PATH.read_text(encoding="utf-8"))
        return {
            "available": True,
            "recorded_at": data.get("recorded_at"),
            "replay": data,
        }
    except Exception as exc:
        return {
            "available": False,
            "error": str(exc),
        }


@router.post("/asr")
async def demo_asr_transcribe(request: Request) -> dict[str, Any]:
    """Transcribe inbound audio via real ASR pipeline with honest labeling."""
    content_type = request.headers.get("content-type", "")
    raw_body = await request.body()
    audio_bytes = raw_body
    filename = "voice_note.ogg"

    if "multipart/form-data" in content_type:
        import email
        import email.policy
        msg = email.message_from_bytes(
            b"Content-Type: " + content_type.encode("utf-8") + b"\r\n\r\n" + raw_body,
            policy=email.policy.default,
        )
        for part in msg.iter_parts():
            payload = part.get_payload(decode=True)
            if payload:
                audio_bytes = payload
                fname = part.get_filename()
                if fname:
                    filename = fname
                break

    res = await transcribe_voice_note(
        audio_bytes,
        filename=filename,
    )
    return {
        "status": "ok",
        "transcript": res.transcript,
        "detected_language": res.detected_language,
        "model_used": res.model_used,
        "provider": res.provider,
        "label": "Non-Meta ASR (Whisper)",
        "latency_ms": res.latency_ms,
        "fallback": res.fallback,
    }


@router.post("/chat")
async def execute_demo_chat_turn(body: DemoChatInput, request: Request) -> dict[str, Any]:
    """Execute a live conversational turn in the Judge Cockpit with honest fallback flags."""
    redis_store = get_webhook_redis_store(request)
    workflow = AlongConversationWorkflow(redis_store)

    audio_bytes = b"OggS-demo-voice" if body.audio_fixture_id else None
    state = await workflow.process_inbound_message(
        phone=body.phone,
        message_text=body.message_text,
        audio_bytes=audio_bytes,
        audio_fixture_id=body.audio_fixture_id,
        is_peak=body.is_peak,
    )

    if not state.boarding_otp:
        state.boarding_otp = generate_boarding_otp()
    if not state.share_token:
        state.share_token = generate_share_token()

    # Store HMAC of the boarding OTP in active pod store for constant-time driver verification
    pod_key = (state.pod_code or "POD-842A").split()[0]
    pod_entry = ACTIVE_PODS_STORE.setdefault(
        pod_key,
        {
            "pod_id": pod_key,
            "driver_id": "DRV-001",
            "corridor_id": state.corridor_id or "BWR-DUT-WUS",
            "anchor_lat": 9.1779,
            "anchor_lng": 7.3736,
            "seats_occupied": 4,
            "status": "BOARDING",
            "boarded_requests": {"rr-demo-02", "rr-demo-03", "rr-demo-04"},
        },
    )
    pod_entry.setdefault("boarding_otp_hashes", {})["rr-demo-01"] = hash_otp_code(
        state.boarding_otp, context_id="rr-demo-01"
    )
    pod_entry.setdefault("otp_created_at", {})["rr-demo-01"] = time.time()
    pod_entry.setdefault("otp_attempts", {})["rr-demo-01"] = 0

    gross_pod_kobo = max(state.total_fare_kobo, state.unit_fare_kobo * 4)
    driver_net_kobo = int(round(gross_pod_kobo * 0.90))
    platform_fee_kobo = gross_pod_kobo - driver_net_kobo

    fallback_active = bool(state.xray_trace.get("fallback", True))
    fallback_banner = state.xray_trace.get("fallback_banner")
    traces_list = state.xray_trace.get("traces", [])

    return {
        "status": "ok",
        "fallback": fallback_active,
        "fallback_banner": fallback_banner,
        "traces": traces_list,
        "pane1_whatsapp": {
            "phone": state.phone_e164,
            "locale": state.locale,
            "stage": state.stage,
            "reply_text": state.last_reply_text,
            "buttons": state.last_buttons,
            "request_code": state.request_code,
            "boarding_otp": state.boarding_otp,
            "share_token": state.share_token,
        },
        "pane2_xray_and_ledger": {
            "xray": state.xray_trace,
            "fallback": fallback_active,
            "fallback_banner": fallback_banner,
            "corridor_id": state.corridor_id or "BWR-DUT-WUS",
            "origin_name": state.origin_name,
            "destination_name": state.destination_name,
            "anchor_id": state.anchor_id,
            "anchor_name": state.anchor_name,
            "unit_fare_naira": format_naira(state.unit_fare_kobo),
            "total_fare_naira": format_naira(state.total_fare_kobo),
            "pod_gross_naira": format_naira(gross_pod_kobo),
            "driver_net_90pct_naira": format_naira(driver_net_kobo),
            "platform_10pct_naira": format_naira(platform_fee_kobo),
            "agbero_fee_saved_naira": "₦1,250 (illustrative estimate)",
            "escrow_type": "Simulated escrow",
            "trial_balance_kobo": 0,
        },
        "pane3_driver": {
            "profile_type": "Demo driver profile",
            "pod_code": state.pod_code or "POD-842A (Demo data)",
            "driver_name": "Musa Danjuma (Demo data)",
            "plate_number": "ABJ-412K (Demo data)",
            "vehicle_desc": "Toyota Corolla (Silver)",
            "phone_mode": "SMARTPHONE_AND_2G_USSD",
            "ussd_shortcode": "*384*247#",
            "boarding_otp_expected": state.boarding_otp or "",
        },
    }
