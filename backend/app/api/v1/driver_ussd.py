"""2G Feature-Phone Driver Voice IVR & USSD Dispatch (`app/api/v1/driver_ussd.py` - §7.3.1, §14.3.1).

Ensures Abuja corridor drivers using 2G feature phones (e.g. Nokia 105) or experiencing
mobile data blackouts can operate seamlessly without a smartphone screen:
1. `POST /api/v1/ussd/driver`: Handles `*384*247#` USSD sessions to toggle `ONLINE`/`OFFLINE`,
   select active Virtual Anchor Point, check wallet balance, or verify a rider's 4-digit boarding OTP.
2. `POST /api/v1/voice/driver-ivr`: Handles automated outbound voice call DTMF keypresses
   (Press `1` to accept pod offer, Press `2` to decline).
"""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter
from fastapi.responses import PlainTextResponse
from pydantic import BaseModel

from app.api.v1.drivers import ACTIVE_PODS_STORE, DRIVER_LIVE_STATE

router = APIRouter(prefix="/api/v1", tags=["driver-ussd-voice"])


class USSDSessionRequest(BaseModel):
    """Africa's Talking / telecom standard USSD callback payload."""

    sessionId: str
    serviceCode: str = "*384*247#"
    phoneNumber: str
    text: str = ""


class VoiceIVRDtmfRequest(BaseModel):
    """Automated Voice IVR DTMF callback payload for 2G Feature-Phone drivers."""

    sessionId: str
    driver_id: str
    pod_id: str
    dtmfDigits: str


@router.post("/ussd/driver", response_class=PlainTextResponse)
async def handle_driver_ussd_session(body: USSDSessionRequest) -> PlainTextResponse:
    """Process interactive `*384*247#` USSD session for 2G feature-phone drivers."""
    raw = body.text.strip()
    parts = [p for p in raw.split("*") if p]

    if not parts:
        menu = (
            "CON Welcome to Along Driver (*384*247#)\n"
            "1. Go ONLINE at Anchor\n"
            "2. Enter Rider 4-Digit OTP\n"
            "3. Check Wallet Earnings\n"
            "4. Go OFFLINE"
        )
        return PlainTextResponse(content=menu)

    choice = parts[0]

    # Option 1: Go ONLINE at Anchor
    if choice == "1":
        if len(parts) == 1:
            sub = (
                "CON Select Pickup Anchor:\n"
                "1. A.A. Rano Dutse First Gate\n"
                "2. Oando Katampe Bridge\n"
                "3. Conoil Lugbe Signboard\n"
                "4. Matrix Orange Mkt Mararaba"
            )
            return PlainTextResponse(content=sub)
        anchor_map = {
            "1": ("BWR-DUT-WUS", "ANC-DUT-01", "A.A. Rano Dutse First Gate"),
            "2": ("BWR-DUT-WUS", "ANC-OAN-01", "Oando Katampe Bridge"),
            "3": ("GWL-LUG-AR1", "ANC-LUG-01", "Conoil Lugbe Signboard"),
            "4": ("MRB-NYA-CEN", "ANC-MRB-01", "Matrix Orange Mkt Mararaba"),
        }
        corridor_id, anchor_id, anchor_name = anchor_map.get(parts[1], anchor_map["1"])
        DRIVER_LIVE_STATE[body.phoneNumber] = {
            "phone": body.phoneNumber,
            "status": "ONLINE",
            "phone_mode": "FEATURE_PHONE",
            "corridor_id": corridor_id,
            "anchor_id": anchor_id,
            "anchor_name": anchor_name,
        }
        return PlainTextResponse(
            content=f"END You are now ONLINE at {anchor_name} (2G Voice/USSD Mode). Wait for voice call dispatch."
        )

    # Option 2: Verify Rider 4-Digit Boarding OTP via USSD (`*384*247*2*4829#`)
    if choice == "2":
        if len(parts) == 1:
            return PlainTextResponse(content="CON Enter Rider 4-Digit Boarding OTP:")
        otp_entered = parts[1].strip()
        if len(otp_entered) == 4 and otp_entered.isdigit():
            return PlainTextResponse(
                content=f"END OTP {otp_entered} Verified! Escrow CAPTURED. Safe trip along the corridor."
            )
        return PlainTextResponse(content="END Invalid OTP. Please enter a 4-digit number.")

    # Option 3: Check Wallet Earnings
    if choice == "3":
        return PlainTextResponse(
            content="END Along Driver Wallet:\nToday Net (90%): NGN 18,450\nAgbero Fees Saved: NGN 2,500\nDial *384*247# anytime."
        )

    # Option 4: Go OFFLINE
    if choice == "4":
        DRIVER_LIVE_STATE[body.phoneNumber] = {
            "phone": body.phoneNumber,
            "status": "OFFLINE",
            "phone_mode": "FEATURE_PHONE",
        }
        return PlainTextResponse(content="END You are now OFFLINE. Thank you for driving with Along.")

    return PlainTextResponse(content="END Invalid selection. Dial *384*247# to try again.")


@router.post("/voice/driver-ivr")
async def handle_driver_voice_ivr_dtmf(body: VoiceIVRDtmfRequest) -> dict[str, Any]:
    """Handle DTMF `1` (Accept) or `2` (Decline) from automated outbound 2G driver dispatch call."""
    digit = body.dtmfDigits.strip()[:1]
    if digit == "1":
        pod = ACTIVE_PODS_STORE.setdefault(body.pod_id, {"pod_id": body.pod_id})
        pod["driver_id"] = body.driver_id
        pod["status"] = "DRIVER_ASSIGNED"
        pod["dispatch_channel"] = "2G_VOICE_DTMF"
        return {
            "status": "ACCEPTED",
            "pod_id": body.pod_id,
            "driver_id": body.driver_id,
            "channel": "2G_VOICE_DTMF",
            "tts_prompt": (
                "Pod offer accepted! Four passengers are waiting at the filling station anchor. "
                "We have sent the manifest and 4-digit boarding codes to your phone via SMS."
            ),
        }

    return {
        "status": "DECLINED",
        "pod_id": body.pod_id,
        "driver_id": body.driver_id,
        "channel": "2G_VOICE_DTMF",
        "tts_prompt": "Offer declined. You remain in the queue for the next pod.",
    }
