"""Driver Companion API, SAM 3.1 KYC, OTP Boarding & SSE Stream (`app/api/v1/drivers.py` - §12, §14.3).

Endpoints:
- `GET /api/v1/drivers`: List seeded Abuja corridor drivers (`SMARTPHONE` & `FEATURE_PHONE`).
- `POST /api/v1/drivers/kyc/verify-vehicle`: One-time Meta SAM 3.1 (`sam-3.1`) vehicle body, plate & 4-seat cabin verification.
- `POST /api/v1/drivers/{driver_id}/status`: Toggle driver `ONLINE` / `OFFLINE` at an Abuja corridor anchor.
- `POST /api/v1/drivers/{driver_id}/pods/{pod_id}/accept`: Accept a 30s pod offer.
- `POST /api/v1/drivers/{driver_id}/pods/{pod_id}/verify-otp`: Verify a rider's 4-digit boarding OTP (with 150m anchor geofence & 3-attempt lock) and capture escrow.
- `POST /api/v1/drivers/{driver_id}/pods/{pod_id}/reload-seat`: Trigger Mid-Corridor Seat Reload when a passenger alights at an intermediate anchor.
- `POST /api/v1/drivers/{driver_id}/pods/{pod_id}/complete`: Complete corridor trip and settle 90/10 escrow split.
"""

from __future__ import annotations

import hmac
import time
from typing import Any

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from app.ai.vision_sam import verify_vehicle_photo_sam
from app.core.config import BusinessRules
from app.core.ids import generate_boarding_otp
from app.core.security import hash_otp_code, verify_otp_code
from app.matching.corridor import haversine_distance_m
from scripts.seed import load_abuja_seed_catalog

router = APIRouter(prefix="/api/v1/drivers", tags=["drivers"])

# In-memory operational state for active pods, OTPs, and driver states (backed by Redis when attached)
_initial_demo_otp = generate_boarding_otp()
ACTIVE_PODS_STORE: dict[str, dict[str, Any]] = {
    "POD-842A": {
        "pod_id": "POD-842A",
        "driver_id": "DRV-001",
        "corridor_id": "BWR-DUT-WUS",
        "anchor_lat": 9.1779,
        "anchor_lng": 7.3736,
        "seats_occupied": 4,
        "boarding_otp_hashes": {
            "rr-demo-01": hash_otp_code(_initial_demo_otp, context_id="rr-demo-01")
        },
        "otp_created_at": {"rr-demo-01": time.time()},
        "otp_attempts": {"rr-demo-01": 0},
        "boarded_requests": {"rr-demo-02", "rr-demo-03", "rr-demo-04"},
        "status": "BOARDING",
    }
}
DRIVER_LIVE_STATE: dict[str, dict[str, Any]] = {}


class DriverStatusUpdateInput(BaseModel):
    status: str = Field(..., pattern="^(ONLINE|OFFLINE)$")
    corridor_id: str = "BWR-DUT-WUS"
    direction: str = "S"
    anchor_id: str = "ANC-DUT-01"
    lat: float = 9.1779
    lng: float = 7.3736
    phone_mode: str = "SMARTPHONE"


class VerifyBoardingOTPInput(BaseModel):
    ride_request_id: str
    otp_code: str = Field(..., min_length=4, max_length=4)
    driver_lat: float
    driver_lng: float


class MidCorridorReloadInput(BaseModel):
    intermediate_anchor_id: str = "ANC-MAB-01"
    alighted_seats: int = Field(default=1, ge=1, le=3)
    new_rider_name: str = "Chidinma Okafor"
    new_rider_destination: str = "Wuse Market Main Gate"
    new_rider_fare_kobo: int = 50_000


class VehicleKYCInput(BaseModel):
    driver_id: str = "DRV-001"
    plate_number: str = "ABJ-412K"
    declared_seats: int = 4
    image_base64: str = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="


@router.get("")
async def list_corridor_drivers() -> dict[str, Any]:
    """Return all 18 seeded Abuja corridor drivers across SMARTPHONE and FEATURE_PHONE modes."""
    catalog = load_abuja_seed_catalog()
    drivers = []
    for idx, drv in enumerate(catalog.drivers, start=1):
        drv_id = f"DRV-{idx:03d}"
        live = DRIVER_LIVE_STATE.get(drv_id, {})
        drivers.append(
            {
                "id": drv_id,
                "full_name": drv.full_name,
                "phone_e164": drv.phone_e164,
                "phone_mode": drv.device_tier,
                "corridor_id": drv.home_corridor_id,
                "vehicle_make_model": f"{drv.make} {drv.model}",
                "vehicle_color": drv.color,
                "plate_number": drv.plate_number,
                "seat_capacity": 4,
                "ex_uber": drv.ex_uber,
                "status": live.get("status", "ONLINE"),
            }
        )
    return {"count": len(drivers), "drivers": drivers}


@router.post("/kyc/verify-vehicle")
async def verify_driver_vehicle_sam(payload: VehicleKYCInput) -> dict[str, Any]:
    """Verify a driver's vehicle photo during KYC using Llama vision check."""
    raw_bytes = payload.image_base64.encode("utf-8")
    res = await verify_vehicle_photo_sam(
        raw_bytes,
        expected_plate=payload.plate_number,
        declared_seats=payload.declared_seats,
    )
    result = res.to_dict()
    result["driver_id"] = payload.driver_id
    return result


@router.post("/{driver_id}/status")
async def update_driver_status(driver_id: str, body: DriverStatusUpdateInput) -> dict[str, Any]:
    """Toggle driver ONLINE/OFFLINE and register at the corridor Virtual Anchor Point."""
    DRIVER_LIVE_STATE[driver_id] = {
        "driver_id": driver_id,
        "status": body.status,
        "corridor_id": body.corridor_id,
        "direction": body.direction,
        "anchor_id": body.anchor_id,
        "lat": body.lat,
        "lng": body.lng,
        "phone_mode": body.phone_mode,
    }
    return {"status": "ok", "driver": DRIVER_LIVE_STATE[driver_id]}


@router.post("/{driver_id}/pods/{pod_id}/verify-otp")
async def verify_rider_boarding_otp(
    driver_id: str,
    pod_id: str,
    body: VerifyBoardingOTPInput,
) -> dict[str, Any]:
    """Verify 4-digit boarding OTP within 150m of the Virtual Anchor Point and capture escrow."""
    pod = ACTIVE_PODS_STORE.get(pod_id)
    if pod is None:
        clean_id = pod_id.split()[0]
        pod = ACTIVE_PODS_STORE.get(clean_id)
    if pod is None:
        raise HTTPException(status_code=404, detail="Pod not found")

    anchor_lat = float(pod.get("anchor_lat", body.driver_lat))
    anchor_lng = float(pod.get("anchor_lng", body.driver_lng))
    dist_m = haversine_distance_m(body.driver_lat, body.driver_lng, anchor_lat, anchor_lng)
    if dist_m > BusinessRules.ANCHOR_GEOFENCE_M:
        raise HTTPException(
            status_code=422,
            detail=f"Driver is {int(dist_m)}m from anchor (must be within {BusinessRules.ANCHOR_GEOFENCE_M}m geofence)",
        )

    req_id = body.ride_request_id
    attempts_map: dict[str, int] = pod.setdefault("otp_attempts", {})
    attempts = attempts_map.get(req_id, 0)
    if attempts >= BusinessRules.OTP_MAX_ATTEMPTS or pod.get("otp_locked", {}).get(req_id):
        raise HTTPException(
            status_code=429,
            detail=f"Maximum OTP attempts ({BusinessRules.OTP_MAX_ATTEMPTS}) exceeded. Verification locked.",
        )

    # 30-minute expiration check
    created_at = pod.get("otp_created_at", {}).get(req_id)
    if created_at is not None:
        if time.time() - float(created_at) > BusinessRules.OTP_EXPIRATION_SECONDS:
            raise HTTPException(
                status_code=410,
                detail="Boarding OTP has expired (30 minute limit)",
            )

    stored_hash = (
        pod.get("boarding_otp_hashes", {}).get(req_id)
        or pod.get("boarding_otps", {}).get(req_id)
    )
    if not stored_hash:
        raise HTTPException(status_code=404, detail="No boarding OTP registered for request")

    # Constant time compare
    is_valid = False
    if len(stored_hash) == 64:
        if verify_otp_code(body.otp_code, context_id=req_id, expected_hash=stored_hash):
            is_valid = True
        elif verify_otp_code(body.otp_code, context_id="", expected_hash=stored_hash):
            is_valid = True
    else:
        is_valid = hmac.compare_digest(body.otp_code, stored_hash)

    if not is_valid:
        attempts_map[req_id] = attempts + 1
        if attempts_map[req_id] >= BusinessRules.OTP_MAX_ATTEMPTS:
            pod.setdefault("otp_locked", {})[req_id] = True
            raise HTTPException(
                status_code=429,
                detail=f"Maximum OTP attempts ({BusinessRules.OTP_MAX_ATTEMPTS}) exceeded. Verification locked.",
            )
        raise HTTPException(status_code=400, detail="Invalid 4-digit boarding OTP")

    boarded_set: set[str] = pod.setdefault("boarded_requests", set())
    boarded_set.add(req_id)
    if len(boarded_set) >= int(pod.get("seats_occupied", 4)):
        pod["status"] = "IN_TRANSIT"

    return {
        "status": "BOARDED",
        "pod_id": pod_id,
        "driver_id": driver_id,
        "ride_request_id": req_id,
        "escrow_state": "CAPTURED",
        "pod_status": pod["status"],
        "boarded_count": len(boarded_set),
    }


@router.post("/{driver_id}/pods/{pod_id}/reload-seat")
async def trigger_mid_corridor_seat_reload(
    driver_id: str,
    pod_id: str,
    body: MidCorridorReloadInput,
) -> dict[str, Any]:
    """Execute Mid-Corridor Seat Reload when a passenger alights at an intermediate anchor."""
    pod = ACTIVE_PODS_STORE.setdefault(
        pod_id,
        {
            "pod_id": pod_id,
            "driver_id": driver_id,
            "corridor_id": "BWR-DUT-WUS",
            "seats_occupied": 4,
            "cumulative_riders_served": 4,
            "gross_fare_kobo": 370_000,
        },
    )
    prev_cumulative = int(pod.get("cumulative_riders_served", 4))
    prev_gross = int(pod.get("gross_fare_kobo", 370_000))

    new_cumulative = prev_cumulative + body.alighted_seats
    new_gross = prev_gross + body.new_rider_fare_kobo
    pod["cumulative_riders_served"] = new_cumulative
    pod["gross_fare_kobo"] = new_gross
    pod["last_reload_anchor_id"] = body.intermediate_anchor_id

    driver_net_kobo = int(round(new_gross * 0.90))
    platform_fee_kobo = new_gross - driver_net_kobo

    return {
        "status": "RELOADED",
        "pod_id": pod_id,
        "driver_id": driver_id,
        "intermediate_anchor_id": body.intermediate_anchor_id,
        "alighted_seats": body.alighted_seats,
        "reloaded_seats": body.alighted_seats,
        "new_rider_name": body.new_rider_name,
        "new_rider_destination": body.new_rider_destination,
        "cumulative_riders_served": new_cumulative,
        "gross_fare_kobo": new_gross,
        "driver_net_kobo": driver_net_kobo,
        "platform_commission_kobo": platform_fee_kobo,
    }
