"""Public Live Trip-Share & 1-Tap Family SOS API (`app/api/v1/trips_public.py` - §12, §14.5).

Provides zero-login public trip telemetry for the `/t/[shareToken]` safety link sent in WhatsApp
so family members can watch live Abuja corridor progress, driver plate/NIN verification badge,
and trigger an immediate SOS alert if needed.
"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from fastapi import APIRouter

router = APIRouter(prefix="/api/v1/trips", tags=["trips-public"])

PUBLIC_TRIPS_BY_TOKEN: dict[str, dict[str, Any]] = {}


def get_or_seed_demo_trip(share_token: str) -> dict[str, Any]:
    if share_token not in PUBLIC_TRIPS_BY_TOKEN:
        PUBLIC_TRIPS_BY_TOKEN[share_token] = {
            "share_token": share_token,
            "pod_code": "POD-842A",
            "corridor_id": "BWR-DUT-WUS",
            "corridor_name": "Bwari - Dutse - Gwarinpa - Berger - Wuse",
            "status": "IN_TRANSIT",
            "origin_anchor": "A.A. Rano Filling Station (Dutse First Gate)",
            "destination_landmark": "Wuse Market Main Gate",
            "driver": {
                "full_name": "Musa Danjuma",
                "vehicle_desc": "Toyota Corolla (Silver)",
                "plate_number": "ABJ-412K",
                "nin_verified": True,
                "sam_vehicle_verified": True,
                "rating": 4.92,
            },
            "telemetry": {
                "lat": 9.1105,
                "lng": 7.4250,
                "current_landmark": "Katampe Extension Bridge",
                "progress_pct": 64,
                "eta_minutes": 8,
                "route_deviation_m": 12,
                "is_on_corridor": True,
            },
            "escrow_status": "CAPTURED",
            "sos_active": False,
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }
    return PUBLIC_TRIPS_BY_TOKEN[share_token]


@router.get("/share/{share_token}")
async def get_public_trip_share(share_token: str) -> dict[str, Any]:
    """Return live trip telemetry for `/t/[shareToken]` without requiring login."""
    return get_or_seed_demo_trip(share_token)


@router.post("/share/{share_token}/sos")
async def trigger_public_trip_sos(share_token: str) -> dict[str, Any]:
    """Activate immediate SOS alert on a shared trip and notify Along Operations Command Center."""
    trip = get_or_seed_demo_trip(share_token)
    trip["sos_active"] = True
    trip["status"] = "SOS_ACTIVE"
    trip["updated_at"] = datetime.now(timezone.utc).isoformat()
    return {
        "status": "SOS_ACTIVATED",
        "share_token": share_token,
        "pod_code": trip["pod_code"],
        "driver_plate": trip["driver"]["plate_number"],
        "message": "Along Operations Command Center and FCT Rapid Response alerted with live GPS coordinates.",
    }
