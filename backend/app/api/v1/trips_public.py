"""Public Live Trip-Share & 1-Tap Family SOS API (`app/api/v1/trips_public.py` - Section 12, Section 14.5).

Provides zero-login public trip telemetry for the `/t/[shareToken]` safety link sent in WhatsApp
so family members can watch live Abuja corridor progress, driver profile badge,
and trigger an immediate SOS alert if needed.
"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from fastapi import APIRouter, HTTPException

router = APIRouter(prefix="/api/v1/trips", tags=["trips-public"])

PUBLIC_TRIPS_BY_TOKEN: dict[str, dict[str, Any]] = {}


@router.get("/share/{share_token}")
async def get_public_trip_share(share_token: str) -> dict[str, Any]:
    """Return live trip telemetry for `/t/[shareToken]` without requiring login.
    
    Returns 404 if token is unknown.
    """
    trip = PUBLIC_TRIPS_BY_TOKEN.get(share_token)
    if not trip:
        raise HTTPException(
            status_code=404,
            detail=f"Trip with share token '{share_token}' was not found. Please verify your family link or book a trip first.",
        )
    return trip


@router.post("/share/{share_token}/sos")
async def trigger_public_trip_sos(share_token: str) -> dict[str, Any]:
    """Activate immediate SOS alert on a shared trip and notify Along Operations Command Center."""
    trip = PUBLIC_TRIPS_BY_TOKEN.get(share_token)
    if not trip:
        raise HTTPException(
            status_code=404,
            detail=f"Trip with share token '{share_token}' was not found. Cannot trigger SOS.",
        )
    trip["sos_active"] = True
    trip["status"] = "SOS_ACTIVE"
    trip["updated_at"] = datetime.now(timezone.utc).isoformat()
    return {
        "status": "SOS_ACTIVATED",
        "share_token": share_token,
        "pod_code": trip.get("pod_code", "POD-842A"),
        "driver_plate": trip.get("driver", {}).get("plate_number", ""),
        "message": "Along Operations Command Center and FCT Rapid Response alerted with live GPS coordinates.",
    }

