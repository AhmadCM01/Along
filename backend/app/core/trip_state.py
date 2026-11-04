"""Server-authoritative trip, pod, session and live telemetry state management.

Ensures the server is the single source of truth for all pods, trips,
stages, positions, and boarding OTPs across driver terminals, rider ride
cards, and family trackers.
"""

from __future__ import annotations

import re
import secrets
import time
from typing import Any

from fastapi import HTTPException

# ---------------------------------------------------------------------------
# Clock Management (Injectable for Deterministic Testing)
# ---------------------------------------------------------------------------

_CLOCK_OVERRIDE: float | None = None


def get_server_time() -> float:
    """Return the authoritative server epoch time in seconds."""
    if _CLOCK_OVERRIDE is not None:
        return _CLOCK_OVERRIDE
    return time.time()


def set_fake_clock(t: float | None) -> None:
    """Inject a fixed or advancing epoch timestamp for tests."""
    global _CLOCK_OVERRIDE
    _CLOCK_OVERRIDE = t


def reset_fake_clock() -> None:
    """Reset clock override to use standard system time."""
    global _CLOCK_OVERRIDE
    _CLOCK_OVERRIDE = None


# ---------------------------------------------------------------------------
# Session Validation and Pod Capacity Rules
# ---------------------------------------------------------------------------

SESSION_HEADER_NAME = "X-Along-Session"
SESSION_REGEX = re.compile(r"^[A-Za-z0-9\-]{16,64}$")
IDLE_SESSION_TTL_SECONDS = 7200.0  # 2 hours
MAX_TOTAL_PODS = 500

LAB_POD_ID = "POD-LAB"
DEFAULT_DEMO_POD_ID = "POD-842A"


def validate_session_id(session_id: str | None) -> str | None:
    """Validate X-Along-Session header format (16 to 64 chars of [A-Za-z0-9-])."""
    if session_id is None:
        return None
    cleaned = session_id.strip()
    if not SESSION_REGEX.match(cleaned):
        raise HTTPException(
            status_code=400,
            detail={
                "code": "INVALID_SESSION_HEADER",
                "message": "X-Along-Session header must be 16 to 64 alphanumeric or hyphen characters.",
            },
        )
    return cleaned


# ---------------------------------------------------------------------------
# Shared Storage: Pods, Sessions, and Share Token Index
# ---------------------------------------------------------------------------

ACTIVE_PODS: dict[str, dict[str, Any]] = {}
SESSION_POD_MAP: dict[str, str] = {}
SESSION_LAST_ACTIVE: dict[str, float] = {}
SHARE_TOKENS: dict[str, tuple[str, str]] = {}  # share_token -> (pod_id, request_id)


# ---------------------------------------------------------------------------
# Corridor Waypoints for Strict Telemetry Interpolation
# ---------------------------------------------------------------------------

CORRIDOR_WAYPOINTS: dict[str, list[dict[str, Any]]] = {
    "BWR-DUT-WUS": [
        {"name": "Bwari / Ushafa", "lat": 9.2865, "lng": 7.3812},
        {"name": "Sokale / Muko", "lat": 9.2150, "lng": 7.3750},
        {"name": "Dutse First Gate", "lat": 9.1779, "lng": 7.3736},
        {"name": "Galadima / Dawaki", "lat": 9.1450, "lng": 7.3950},
        {"name": "Gwarinpa / Oando Katampe", "lat": 9.1068, "lng": 7.4342},
        {"name": "Mabushi / Berger Underbridge", "lat": 9.0765, "lng": 7.4525},
        {"name": "Wuse Market Main Gate", "lat": 9.0685, "lng": 7.4660},
    ],
    "ZUB-KUB-WUS": [
        {"name": "Zuba Motor Park", "lat": 9.1050, "lng": 7.2150},
        {"name": "Dei-Dei Building Materials", "lat": 9.1120, "lng": 7.2850},
        {"name": "Kubwa Arab Road", "lat": 9.1450, "lng": 7.3350},
        {"name": "Gwarinpa 1st Avenue", "lat": 9.1060, "lng": 7.4120},
        {"name": "Utako / Berger Underbridge", "lat": 9.0765, "lng": 7.4525},
        {"name": "Wuse Zone 4", "lat": 9.0650, "lng": 7.4720},
    ],
    "ZUB-DEI-DUT": [
        {"name": "Zuba Motor Park", "lat": 9.1050, "lng": 7.2150},
        {"name": "Dei-Dei Main Market", "lat": 9.1120, "lng": 7.2850},
        {"name": "Kubwa Expressway", "lat": 9.1450, "lng": 7.3350},
        {"name": "Dutse Alhaji Junction", "lat": 9.1779, "lng": 7.3736},
        {"name": "Bwari Terminal", "lat": 9.2865, "lng": 7.3812},
    ],
    "ZUB-KRM-JAB": [
        {"name": "Zuba Motor Park", "lat": 9.1050, "lng": 7.2150},
        {"name": "Gwagwa Station", "lat": 9.0850, "lng": 7.2850},
        {"name": "Karmo Market", "lat": 9.0620, "lng": 7.3450},
        {"name": "Life Camp Roundabout", "lat": 9.0600, "lng": 7.3950},
        {"name": "Jabi Motor Park", "lat": 9.0750, "lng": 7.4350},
    ],
    "GWL-LUG-AR1": [
        {"name": "Gwagwalada Park", "lat": 8.9450, "lng": 7.0850},
        {"name": "Giri Junction", "lat": 8.9850, "lng": 7.1550},
        {"name": "Lugbe Police Signboard", "lat": 8.9750, "lng": 7.3650},
        {"name": "City Gate Abuja", "lat": 9.0350, "lng": 7.4450},
        {"name": "Area 1 Roundabout", "lat": 9.0300, "lng": 7.4850},
    ],
    "MRB-NYA-CEN": [
        {"name": "Mararaba Orange Market", "lat": 9.0150, "lng": 7.5850},
        {"name": "Nyanya Bridge", "lat": 9.0320, "lng": 7.5550},
        {"name": "Kugbo Furniture", "lat": 9.0450, "lng": 7.5350},
        {"name": "AYA Asokoro", "lat": 9.0480, "lng": 7.5050},
        {"name": "Federal Secretariat", "lat": 9.0550, "lng": 7.4950},
    ],
}


def generate_random_pod_id() -> str:
    """Generate a random pod ID like POD-XXXX using secrets."""
    while True:
        suffix = secrets.token_hex(2).upper()
        pid = f"POD-{suffix}"
        if pid not in ACTIVE_PODS:
            return pid


def create_initial_pod_dict(
    pod_id: str,
    session_id: str | None = None,
    corridor_id: str = "BWR-DUT-WUS",
) -> dict[str, Any]:
    """Create a pristine 4-seat pod record."""
    now = get_server_time()
    return {
        "pod_id": pod_id,
        "session_id": session_id,
        "driver_id": "DRV-001",
        "driver_name": "Musa Bello",
        "plate_number": "ABJ-402-AL",
        "vehicle_desc": "Volkswagen Golf 4 (Emerald Green)",
        "corridor_id": corridor_id,
        "corridor_name": "Bwari - Dutse - Oando - Berger - Wuse / Central Area",
        "anchor_name": "A.A. Rano Filling Station (Dutse First Gate)",
        "anchor_lat": 9.1779,
        "anchor_lng": 7.3736,
        "seats_occupied": 0,
        "seats_total": 4,
        "passengers": [],
        "boarded_requests": set(),
        "boarding_otp_hashes": {},
        "boarding_otps": {},
        "otp_created_at": {},
        "otp_attempts": {},
        "otp_locked": {},
        "confirmed_at": None,
        "departed_at": None,
        "escrow_released": False,
        "status": "WAITING_FOR_DRIVER",
        "created_at": now,
        "last_activity": now,
    }


# Pre-initialize default demo pod and isolated Multi-Rider Lab pod
ACTIVE_PODS[DEFAULT_DEMO_POD_ID] = create_initial_pod_dict(DEFAULT_DEMO_POD_ID)
ACTIVE_PODS[LAB_POD_ID] = create_initial_pod_dict(LAB_POD_ID)


def cleanup_idle_sessions_and_cap() -> None:
    """Drop sessions idle for >2 hours and enforce 500-pod global ceiling."""
    now = get_server_time()
    # 1. Drop sessions idle for > 2 hours (7200s)
    for sid, last_active in list(SESSION_LAST_ACTIVE.items()):
        if (now - last_active) > IDLE_SESSION_TTL_SECONDS:
            pid = SESSION_POD_MAP.pop(sid, None)
            SESSION_LAST_ACTIVE.pop(sid, None)
            if pid and pid != LAB_POD_ID and pid != DEFAULT_DEMO_POD_ID:
                ACTIVE_PODS.pop(pid, None)
                for tok, (p_id, _) in list(SHARE_TOKENS.items()):
                    if p_id == pid:
                        SHARE_TOKENS.pop(tok, None)

    # 2. Cap total pods at 500
    while len(SESSION_POD_MAP) >= MAX_TOTAL_PODS:
        oldest_sid = min(SESSION_LAST_ACTIVE.keys(), key=lambda k: SESSION_LAST_ACTIVE[k])
        pid = SESSION_POD_MAP.pop(oldest_sid, None)
        SESSION_LAST_ACTIVE.pop(oldest_sid, None)
        if pid and pid != LAB_POD_ID and pid != DEFAULT_DEMO_POD_ID:
            ACTIVE_PODS.pop(pid, None)
            for tok, (p_id, _) in list(SHARE_TOKENS.items()):
                if p_id == pid:
                    SHARE_TOKENS.pop(tok, None)


def get_or_create_session_pod(
    session_id: str,
    corridor_id: str = "BWR-DUT-WUS",
) -> dict[str, Any]:
    """Get active pod for session or create an isolated 4-seat pod with random ID."""
    now = get_server_time()
    cleanup_idle_sessions_and_cap()

    if session_id in SESSION_POD_MAP:
        pid = SESSION_POD_MAP[session_id]
        SESSION_LAST_ACTIVE[session_id] = now
        if pid in ACTIVE_PODS:
            pod = ACTIVE_PODS[pid]
            pod["last_activity"] = now
            return pod

    # Generate new isolated pod with random ID like POD-XXXX
    new_pid = generate_random_pod_id()
    new_pod = create_initial_pod_dict(
        pod_id=new_pid,
        session_id=session_id,
        corridor_id=corridor_id,
    )
    ACTIVE_PODS[new_pid] = new_pod
    SESSION_POD_MAP[session_id] = new_pid
    SESSION_LAST_ACTIVE[session_id] = now
    return new_pod


def get_pod_by_id_or_session(
    pod_id: str | None = None,
    session_id: str | None = None,
    corridor_id: str = "BWR-DUT-WUS",
) -> dict[str, Any]:
    """Resolve authoritative pod via explicit ID, caller session, or default."""
    now = get_server_time()
    if session_id:
        SESSION_LAST_ACTIVE[session_id] = now
        if session_id in SESSION_POD_MAP:
            pid = SESSION_POD_MAP[session_id]
            if pid in ACTIVE_PODS:
                pod = ACTIVE_PODS[pid]
                pod["last_activity"] = now
                return pod
        return get_or_create_session_pod(session_id, corridor_id=corridor_id)

    if pod_id and pod_id in ACTIVE_PODS:
        pod = ACTIVE_PODS[pod_id]
        pod["last_activity"] = now
        return pod

    if pod_id and pod_id not in ("active", "current", "default"):
        # Explicit pod requested but not yet registered (e.g. test custom pod)
        pod = create_initial_pod_dict(pod_id=pod_id, corridor_id=corridor_id)
        ACTIVE_PODS[pod_id] = pod
        return pod

    # Fallback to default demo pod
    if DEFAULT_DEMO_POD_ID not in ACTIVE_PODS:
        ACTIVE_PODS[DEFAULT_DEMO_POD_ID] = create_initial_pod_dict(
            pod_id=DEFAULT_DEMO_POD_ID,
            corridor_id=corridor_id,
        )
    return ACTIVE_PODS[DEFAULT_DEMO_POD_ID]


def get_lab_pod() -> dict[str, Any]:
    """Return the isolated Multi-Rider Lab pod that is never wiped by session reset."""
    if LAB_POD_ID not in ACTIVE_PODS:
        ACTIVE_PODS[LAB_POD_ID] = create_initial_pod_dict(pod_id=LAB_POD_ID)
    return ACTIVE_PODS[LAB_POD_ID]


def reset_session_pod(session_id: str | None = None) -> dict[str, Any]:
    """Reset calling session's pod to pristine standby state."""
    if session_id and session_id in SESSION_POD_MAP:
        pid = SESSION_POD_MAP[session_id]
        if pid in ACTIVE_PODS:
            ACTIVE_PODS[pid] = create_initial_pod_dict(pod_id=pid, session_id=session_id)
            for tok, (p_id, _) in list(SHARE_TOKENS.items()):
                if p_id == pid:
                    SHARE_TOKENS.pop(tok, None)
            return ACTIVE_PODS[pid]

    # Reset default demo pod if no session
    ACTIVE_PODS[DEFAULT_DEMO_POD_ID] = create_initial_pod_dict(pod_id=DEFAULT_DEMO_POD_ID)
    for tok, (p_id, _) in list(SHARE_TOKENS.items()):
        if p_id == DEFAULT_DEMO_POD_ID:
            SHARE_TOKENS.pop(tok, None)
    return ACTIVE_PODS[DEFAULT_DEMO_POD_ID]


# ---------------------------------------------------------------------------
# Authoritative Stage and Telemetry Derivation
# ---------------------------------------------------------------------------

def derive_pod_stage(
    pod: dict[str, Any],
    demo_driver_arrival_seconds: float = 8.0,
    demo_trip_seconds: float = 150.0,
) -> tuple[str, str, float]:
    """Derive stage, stage_label, and progress from server time and pod timestamps.

    Stages:
    1. WAITING_FOR_DRIVER (quote, not confirmed)
    2. DRIVER_ON_THE_WAY (for DEMO_DRIVER_ARRIVAL_SECONDS after confirm, default 8)
    3. BOARDING (docked at the pickup)
    4. IN_TRANSIT (from departed_at until progress reaches 1.0)
    5. COMPLETED (when progress reaches 1.0; simulated escrow released once)
    """
    now = get_server_time()

    departed_at = pod.get("departed_at")
    if departed_at is not None:
        elapsed = max(0.0, now - float(departed_at))
        progress = max(0.0, min(1.0, elapsed / demo_trip_seconds))
        if progress >= 1.0:
            if not pod.get("escrow_released"):
                pod["escrow_released"] = True
            return "COMPLETED", "Trip completed", 1.0
        return "IN_TRANSIT", "In transit along corridor", round(progress, 4)

    confirmed_at = pod.get("confirmed_at")
    if confirmed_at is not None:
        elapsed = max(0.0, now - float(confirmed_at))
        if elapsed < demo_driver_arrival_seconds:
            return "DRIVER_ON_THE_WAY", "Driver on the way", 0.0
        return "BOARDING", "Driver arrived at pickup forecourt", 0.0

    return "WAITING_FOR_DRIVER", "Waiting for driver", 0.0


def interpolate_waypoints_position(
    corridor_id: str,
    pickup_name: str,
    drop_name: str,
    progress: float,
    demo_trip_seconds: float = 150.0,
) -> dict[str, Any]:
    """Interpolate lat/lon position and waypoints strictly between pickup and drop-off."""
    all_wps = CORRIDOR_WAYPOINTS.get(corridor_id) or CORRIDOR_WAYPOINTS["BWR-DUT-WUS"]
    now = get_server_time()
    progress = max(0.0, min(1.0, float(progress)))

    # Find closest matching pickup and drop waypoints
    def find_idx(target: str, default_idx: int) -> int:
        target_lower = target.lower()
        for idx, wp in enumerate(all_wps):
            if any(part in wp["name"].lower() for part in target_lower.split()):
                return idx
        return default_idx

    p_idx = find_idx(pickup_name, 0)
    d_idx = find_idx(drop_name, len(all_wps) - 1)

    if p_idx <= d_idx:
        route_wps = all_wps[p_idx : d_idx + 1]
    else:
        route_wps = list(reversed(all_wps[d_idx : p_idx + 1]))

    if len(route_wps) < 2:
        route_wps = [
            {"name": pickup_name, "lat": all_wps[0]["lat"], "lng": all_wps[0]["lng"]},
            {"name": drop_name, "lat": all_wps[-1]["lat"], "lng": all_wps[-1]["lng"]},
        ]

    seg_count = max(1, len(route_wps) - 1)
    float_idx = progress * seg_count
    seg_idx = min(int(float_idx), seg_count - 1)
    t = float_idx - seg_idx

    p0 = route_wps[seg_idx]
    p1 = route_wps[seg_idx + 1] if (seg_idx + 1 < len(route_wps)) else p0

    lat = round(p0["lat"] + (p1["lat"] - p0["lat"]) * t, 5)
    lon = round(p0["lng"] + (p1["lng"] - p0["lng"]) * t, 5)

    prev_wp = p0["name"]
    next_wp = p1["name"] if (p1 != p0 or seg_count == 1) else route_wps[-1]["name"]
    eta_sec = int(max(0.0, (1.0 - progress) * demo_trip_seconds))

    return {
        "lat": lat,
        "lon": lon,
        "progress": round(progress, 4),
        "previous_waypoint": prev_wp,
        "next_waypoint": next_wp,
        "eta_seconds": eta_sec,
        "server_time": now,
    }


def compute_public_trip_view(
    share_token: str,
    demo_driver_arrival_seconds: float = 8.0,
    demo_trip_seconds: float = 150.0,
) -> dict[str, Any]:
    """Compute the authoritative public trip view from the pod single source of truth."""
    if share_token not in SHARE_TOKENS:
        raise HTTPException(
            status_code=404,
            detail={
                "code": "TRIP_NOT_FOUND",
                "message": "This trip is no longer available. The demo server may have restarted. Book a new ride.",
            },
        )

    pod_id, request_id = SHARE_TOKENS[share_token]
    pod = ACTIVE_PODS.get(pod_id)
    if not pod:
        raise HTTPException(
            status_code=404,
            detail={
                "code": "TRIP_NOT_FOUND",
                "message": "This trip is no longer available. The demo server may have restarted. Book a new ride.",
            },
        )

    passengers = pod.get("passengers", [])
    rider = next((p for p in passengers if p.get("request_id") == request_id), None)
    if not rider:
        # Default rider context if missing
        rider = {
            "first_name": "Rider A (you)",
            "origin": pod.get("anchor_name", "Dutse First Gate"),
            "destination": "Berger Roundabout Underbridge",
            "seats": 1,
            "fare_naira": 900,
            "sos_active": False,
        }

    stage, stage_label, progress = derive_pod_stage(
        pod,
        demo_driver_arrival_seconds=demo_driver_arrival_seconds,
        demo_trip_seconds=demo_trip_seconds,
    )
    pod["status"] = stage

    pickup = rider.get("origin") or pod.get("anchor_name") or "Dutse First Gate"
    drop = rider.get("destination") or "Berger Roundabout Underbridge"

    telem = interpolate_waypoints_position(
        corridor_id=pod.get("corridor_id", "BWR-DUT-WUS"),
        pickup_name=pickup,
        drop_name=drop,
        progress=progress,
        demo_trip_seconds=demo_trip_seconds,
    )

    boarded_count = sum(p.get("seats", 1) for p in passengers if p.get("is_boarded"))

    driver_profile = {
        "full_name": pod.get("driver_name", "Musa Bello"),
        "profile_note": "Demo driver",
        "vehicle_desc": pod.get("vehicle_desc", "Volkswagen Golf 4 (Emerald Green)"),
        "plate_number": pod.get("plate_number", "ABJ-402-AL"),
        "id_on_file": True,
        "rating": 4.94,
    }

    now = get_server_time()
    departed_at_val = pod.get("departed_at")

    return {
        "stage": stage,
        "stage_label": stage_label,
        "progress": telem["progress"],
        "position": {"lat": telem["lat"], "lon": telem["lon"]},
        "previous_waypoint": telem["previous_waypoint"],
        "next_waypoint": telem["next_waypoint"],
        "eta_seconds": telem["eta_seconds"],
        "pickup": pickup,
        "drop": drop,
        "seats": rider.get("seats", 1),
        "boarded_count": boarded_count,
        "pod_seats_total": pod.get("seats_total", 4),
        "driver": driver_profile,
        "plate": pod.get("plate_number", "ABJ-402-AL"),
        "escrow_status": "Simulated",
        "sos_active": bool(rider.get("sos_active", False)),
        "server_time": now,
        "departed_at": departed_at_val,
        # Backward compatibility fields for UI/tests
        "share_token": share_token,
        "status": stage,
        "corridor_id": pod.get("corridor_id", "BWR-DUT-WUS"),
        "corridor_name": pod.get("corridor_name", "Bwari - Dutse - Oando - Berger - Wuse / Central Area"),
        "pickup_anchor": pickup,
        "drop_off": drop,
        "fare_naira": rider.get("fare_naira", 900),
        "telemetry": {
            "lat": telem["lat"],
            "lng": telem["lon"],
            "lon": telem["lon"],
            "progress_pct": round(telem["progress"] * 100, 1),
            "current_landmark": telem["previous_waypoint"],
            "eta_minutes": telem["eta_seconds"] // 60,
        },
    }
