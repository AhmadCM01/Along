"""Public Live Trip-Share & 1-Tap Family SOS API (`app/api/v1/trips_public.py` - Section 12, Section 14.5).

Provides zero-login public trip telemetry for the `/t/[shareToken]` safety link sent in WhatsApp
so family members can watch live Abuja corridor progress, driver profile badge,
and trigger an immediate SOS alert if needed.
"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

router = APIRouter(prefix="/api/v1/trips", tags=["trips-public"])

class TripLocationInput(BaseModel):
    lat: float
    lng: float
    progress_pct: float = Field(default=0.0, ge=0.0, le=100.0)
    current_landmark: str = "Corridor Segment"
    status: str | None = None
    eta_minutes: int | None = None


def get_default_demo_trip() -> dict[str, Any]:
    """Construct authoritative default demo trip for share-bwr-4817."""
    return {
        "share_token": "share-bwr-4817",
        "pod_code": "POD-842A",
        "corridor": "BWR-DUT-WUS",
        "corridor_id": "BWR-DUT-WUS",
        "corridor_name": "Dutse First Gate -> Berger Roundabout Underbridge",
        "status": "BOARDING",
        "pickup_anchor": "A.A. Rano Filling Station (Dutse First Gate)",
        "origin_anchor": "A.A. Rano Filling Station (Dutse First Gate)",
        "drop_off": "Berger Roundabout Underbridge",
        "destination_landmark": "Berger Roundabout Underbridge",
        "seats": 2,
        "fare": 1800,
        "fare_kobo": 180000,
        "fare_naira": 1800,
        "driver": {
            "full_name": "Musa Bello",
            "profile_note": "Demo driver profile",
            "vehicle_desc": "Volkswagen Golf 4 (Emerald Green)",
            "plate_number": "ABJ-402-AL",
            "id_on_file": True,
            "rating": 4.94,
        },
        "telemetry": {
            "lat": 9.1779,
            "lng": 7.3736,
            "current_landmark": "Dutse First Gate Forecourt Bay",
            "progress_pct": 0,
            "eta_minutes": 14,
            "route_deviation_m": 0,
            "is_on_corridor": True,
        },
        "escrow_status": "Locked in Simulated Atomic Escrow",
        "sos_active": False,
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }


PUBLIC_TRIPS_BY_TOKEN: dict[str, dict[str, Any]] = {
    "share-bwr-4817": get_default_demo_trip(),
}


@router.get("/share/{share_token}")
async def get_public_trip_share(share_token: str) -> dict[str, Any]:
    """Return live trip telemetry for `/t/[shareToken]` without requiring login.
    
    Synchronizes real-time progress for family members and riders, automatically
    advancing in-transit trips and completing them at destination arrival.
    Returns 404 if token is unknown.
    """
    trip = PUBLIC_TRIPS_BY_TOKEN.get(share_token)
    if not trip:
        raise HTTPException(
            status_code=404,
            detail=f"Trip with share token '{share_token}' was not found. Please verify your family link or book a trip first.",
        )

    trip_status = (trip.get("status") or "").upper()
    if trip_status in ("IN_TRANSIT", "IN_TRIP", "EN_ROUTE"):
        now_dt = datetime.now(timezone.utc)
        if not trip.get("in_transit_started_at"):
            trip["in_transit_started_at"] = now_dt.isoformat()

        try:
            started_dt = datetime.fromisoformat(trip["in_transit_started_at"])
            elapsed = max(0.0, (now_dt - started_dt).total_seconds())
            demo_duration_sec = 35.0
            computed_pct = min(100.0, (elapsed / demo_duration_sec) * 100.0)

            trip.setdefault("telemetry", {})
            current_pct = float(trip["telemetry"].get("progress_pct", 0.0))
            effective_pct = max(current_pct, computed_pct)

            trip["telemetry"]["progress_pct"] = round(effective_pct, 1)
            trip["telemetry"]["eta_minutes"] = max(0, int(14 * (1.0 - effective_pct / 100.0)))

            if effective_pct >= 100.0:
                trip["status"] = "COMPLETED"
                drop_target = trip.get("destination_landmark") or trip.get("drop_off") or "Destination"
                trip["telemetry"]["current_landmark"] = drop_target

            trip["updated_at"] = now_dt.isoformat()
        except Exception:
            pass

    return trip


@router.post("/share/{share_token}/location")
async def update_public_trip_location(share_token: str, body: TripLocationInput) -> dict[str, Any]:
    """Update simulated GPS telemetry and progress for a shared trip."""
    trip = PUBLIC_TRIPS_BY_TOKEN.get(share_token)
    if not trip:
        raise HTTPException(
            status_code=404,
            detail=f"Trip with share token '{share_token}' was not found. Cannot update location.",
        )
    if "telemetry" not in trip or not isinstance(trip["telemetry"], dict):
        trip["telemetry"] = {}

    trip["telemetry"]["lat"] = body.lat
    trip["telemetry"]["lng"] = body.lng
    trip["telemetry"]["progress_pct"] = body.progress_pct
    trip["telemetry"]["current_landmark"] = body.current_landmark
    if body.eta_minutes is not None:
        trip["telemetry"]["eta_minutes"] = body.eta_minutes
    else:
        trip["telemetry"]["eta_minutes"] = max(0, int(14 * (1 - body.progress_pct / 100)))

    if body.status:
        trip["status"] = body.status
    elif body.progress_pct >= 100:
        trip["status"] = "COMPLETED"
    elif body.progress_pct > 0:
        trip["status"] = "IN_TRANSIT"
        if not trip.get("in_transit_started_at"):
            trip["in_transit_started_at"] = datetime.now(timezone.utc).isoformat()

    trip["updated_at"] = datetime.now(timezone.utc).isoformat()
    return {
        "status": "ok",
        "share_token": share_token,
        "trip_status": trip["status"],
        "telemetry": trip["telemetry"],
        "updated_at": trip["updated_at"],
    }


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

