"""Public Live Trip-Share & 1-Tap Family SOS API (`app/api/v1/trips_public.py` - Section 12, Section 14.5).

Provides zero-login public trip telemetry for the `/t/[shareToken]` safety link sent in WhatsApp
so family members can watch live Abuja corridor progress, driver profile badge,
and trigger an immediate SOS alert if needed.
"""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter, HTTPException
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field

from app.core.config import get_settings
from app.core.ids import generate_share_token
from app.core.trip_state import (
    ACTIVE_PODS,
    DEFAULT_DEMO_POD_ID,
    SHARE_TOKENS,
    compute_public_trip_view,
    get_pod_by_id_or_session,
    get_server_time,
)

router = APIRouter(prefix="/api/v1/trips", tags=["trips-public"])


class TripLocationInput(BaseModel):
    lat: float
    lng: float
    progress_pct: float = Field(default=0.0, ge=0.0, le=100.0)
    current_landmark: str = "Corridor Segment"
    status: str | None = None
    eta_minutes: int | None = None


# Backward-compatibility alias dictionary for legacy tests
PUBLIC_TRIPS_BY_TOKEN: dict[str, dict[str, Any]] = {}


def get_default_demo_trip(token: str | None = None) -> dict[str, Any]:
    """Construct authoritative default demo trip with a random or requested share token."""
    assigned_token = token or generate_share_token()
    pod = get_pod_by_id_or_session(pod_id=DEFAULT_DEMO_POD_ID)
    req_id = "rr-demo-01"
    SHARE_TOKENS[assigned_token] = (DEFAULT_DEMO_POD_ID, req_id)
    if not any(p.get("request_id") == req_id for p in pod.get("passengers", [])):
        pod["passengers"].append({
            "request_id": req_id,
            "first_name": "Rider A (you)",
            "display_name": "Rider A (you)",
            "simulated": False,
            "origin": "A.A. Rano Filling Station (Dutse First Gate)",
            "destination": "Berger Roundabout Underbridge",
            "seats": 2,
            "fare_naira": 1800,
            "fare_kobo": 180000,
            "is_boarded": False,
            "is_confirmed": False,
            "sos_active": False,
            "share_token": assigned_token,
        })
    settings = get_settings()
    return compute_public_trip_view(
        share_token=assigned_token,
        demo_driver_arrival_seconds=settings.DEMO_DRIVER_ARRIVAL_SECONDS,
        demo_trip_seconds=settings.DEMO_TRIP_SECONDS,
    )


@router.get("/share/{share_token}")
async def get_public_trip_share(share_token: str) -> JSONResponse:
    """Return live trip telemetry for `/t/[shareToken]` without requiring login.

    Synchronizes real-time progress for family members and riders, automatically
    advancing in-transit trips and completing them at destination arrival.
    Returns 404 if token is unknown.
    """
    settings = get_settings()

    # If not in SHARE_TOKENS, check legacy PUBLIC_TRIPS_BY_TOKEN
    if share_token not in SHARE_TOKENS and share_token in PUBLIC_TRIPS_BY_TOKEN:
        legacy = PUBLIC_TRIPS_BY_TOKEN[share_token]
        pid = legacy.get("pod_code") or DEFAULT_DEMO_POD_ID
        req_id = "rr-demo-legacy"
        SHARE_TOKENS[share_token] = (pid, req_id)
        pod = get_pod_by_id_or_session(pod_id=pid)
        pod["passengers"] = [
            {
                "request_id": req_id,
                "first_name": "Rider A (you)",
                "display_name": "Rider A (you)",
                "simulated": False,
                "origin": legacy.get("origin_anchor") or legacy.get("pickup_anchor") or "Dutse First Gate",
                "destination": legacy.get("destination_landmark") or legacy.get("drop_off") or "Wuse Market Main Gate",
                "seats": legacy.get("seats", 1),
                "fare_naira": legacy.get("fare_naira", 900),
                "is_boarded": True,
                "is_confirmed": True,
                "sos_active": bool(legacy.get("sos_active", False)),
                "share_token": share_token,
            }
        ]
        if legacy.get("status") in ("IN_TRANSIT", "IN_TRIP"):
            pod["departed_at"] = pod.get("departed_at") or get_server_time()

    if share_token not in SHARE_TOKENS:
        return JSONResponse(
            status_code=404,
            content={
                "code": "TRIP_NOT_FOUND",
                "message": "This trip is no longer available. The demo server may have restarted. Book a new ride.",
            },
            headers={"Cache-Control": "no-store"},
        )

    try:
        data = compute_public_trip_view(
            share_token=share_token,
            demo_driver_arrival_seconds=settings.DEMO_DRIVER_ARRIVAL_SECONDS,
            demo_trip_seconds=settings.DEMO_TRIP_SECONDS,
        )
    except HTTPException as exc:
        if exc.status_code == 404:
            return JSONResponse(
                status_code=404,
                content={
                    "code": "TRIP_NOT_FOUND",
                    "message": "This trip is no longer available. The demo server may have restarted. Book a new ride.",
                },
                headers={"Cache-Control": "no-store"},
            )
        raise exc

    return JSONResponse(content=data, headers={"Cache-Control": "no-store"})


@router.post("/share/{share_token}/location")
async def update_public_trip_location(share_token: str, body: TripLocationInput) -> dict[str, Any]:
    """Simulated GPS location endpoint (kept for API contract compatibility)."""
    if share_token not in SHARE_TOKENS and share_token not in PUBLIC_TRIPS_BY_TOKEN:
        raise HTTPException(
            status_code=404,
            detail={
                "code": "TRIP_NOT_FOUND",
                "message": "This trip is no longer available. The demo server may have restarted. Book a new ride.",
            },
        )
    return {
        "status": "ok",
        "share_token": share_token,
        "lat": body.lat,
        "lng": body.lng,
        "progress_pct": body.progress_pct,
    }


@router.post("/share/{share_token}/sos")
async def trigger_public_trip_sos(share_token: str) -> dict[str, Any]:
    """Activate immediate SOS alert on that trip only."""
    if share_token not in SHARE_TOKENS and share_token in PUBLIC_TRIPS_BY_TOKEN:
        SHARE_TOKENS[share_token] = (DEFAULT_DEMO_POD_ID, "rr-demo-legacy")

    if share_token not in SHARE_TOKENS:
        raise HTTPException(
            status_code=404,
            detail={
                "code": "TRIP_NOT_FOUND",
                "message": "This trip is no longer available. The demo server may have restarted. Book a new ride.",
            },
        )

    pod_id, req_id = SHARE_TOKENS[share_token]
    pod = ACTIVE_PODS.get(pod_id)
    if not pod:
        raise HTTPException(
            status_code=404,
            detail={
                "code": "TRIP_NOT_FOUND",
                "message": "This trip is no longer available. The demo server may have restarted. Book a new ride.",
            },
        )

    for p in pod.get("passengers", []):
        if p.get("request_id") == req_id or p.get("share_token") == share_token:
            p["sos_active"] = True

    msg = "Demo only. This marks the trip as an emergency in this demo. It does not contact any emergency service."
    return {
        "status": "SOS_ACTIVATED",
        "share_token": share_token,
        "sos_active": True,
        "message": msg,
        "text": msg,
        "pod_code": pod.get("pod_id", "POD-842A"),
        "driver_plate": pod.get("plate_number", "ABJ-402-AL"),
    }
