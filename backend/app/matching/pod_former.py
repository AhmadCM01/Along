"""Lua-backed atomic pod formation and 4-seat manifest assembly (§6.5, §7.3)."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any
from uuid import uuid4

from app.core.config import BusinessRules
from app.core.ids import generate_pod_code, generate_share_token
from app.core.money import PodFinancialBreakdown, compute_pod_financials, format_naira
from app.db.models import DirectionCode
from app.matching.corridor import RiderStopCandidate, assign_seats_and_order_stops
from app.redis.keys import pod_hash_key, ride_request_hash_key
from app.redis.scripts import atomic_form_pod


@dataclass(frozen=True, slots=True)
class FormedPodResult:
    """Result of an atomic pod formation."""

    pod_id: str
    pod_code: str
    share_token: str
    corridor_id: str
    direction: DirectionCode
    anchor_id: str
    is_partial: bool
    member_ids: list[str]
    manifest: list[dict[str, Any]]
    financials: PodFinancialBreakdown


async def try_form_pod(
    redis: Any,
    corridor_id: str,
    direction: DirectionCode,
    anchor_id: str,
    now_ms: int,
    allow_partial: bool = False,
) -> FormedPodResult | None:
    """Attempt to atomically form a 4-seat pod (or 3-seat partial pod after wait threshold)."""
    pod_id = str(uuid4())
    target_size = BusinessRules.PARTIAL_POD_MIN_SIZE if allow_partial else BusinessRules.POD_SIZE
    min_wait_ms = BusinessRules.PARTIAL_POD_WAIT_S * 1000 if allow_partial else 0

    member_ids = await atomic_form_pod(
        redis=redis,
        corridor_id=corridor_id,
        direction=direction,
        anchor_id=anchor_id,
        pod_id=pod_id,
        pod_size=target_size,
        now_ms=now_ms,
        min_wait_ms_for_partial=min_wait_ms,
    )
    if not member_ids:
        return None

    candidates: list[RiderStopCandidate] = []
    for rr_id in member_ids:
        rk = ride_request_hash_key(corridor_id, direction, anchor_id, rr_id)
        data = await redis.hgetall(rk)
        decoded = {
            (k.decode() if isinstance(k, bytes) else str(k)): (
                v.decode() if isinstance(v, bytes) else str(v)
            )
            for k, v in data.items()
        }
        candidates.append(
            RiderStopCandidate(
                ride_request_id=rr_id,
                rider_name=decoded.get("rider_name", "Commuter"),
                dest_name=decoded.get("dest_name", "Destination"),
                dest_km_marker=int(decoded.get("dest_km", "10000")),
                fare_kobo=int(decoded.get("fare_kobo", "100000")),
            )
        )

    assigned = assign_seats_and_order_stops(candidates, direction=direction)
    financials = compute_pod_financials([c.fare_kobo for c, _seat in assigned])
    manifest: list[dict[str, Any]] = []
    for candidate, seat_label in assigned:
        manifest.append(
            {
                "ride_request_id": candidate.ride_request_id,
                "rider_name": candidate.rider_name,
                "seat_label": seat_label,
                "dest_name": candidate.dest_name,
                "dest_km_marker": candidate.dest_km_marker,
                "fare_kobo": candidate.fare_kobo,
                "fare_naira": format_naira(candidate.fare_kobo),
                "boarded": False,
            }
        )

    pod_code = generate_pod_code()
    share_token = generate_share_token()
    pk = pod_hash_key(pod_id)
    await redis.hset(
        pk,
        mapping={
            "code": pod_code,
            "state": "FORMING",
            "corridor_id": corridor_id,
            "direction": direction,
            "anchor_id": anchor_id,
            "members": ",".join(member_ids),
            "driver_id": "",
            "formed_ms": str(now_ms),
            "gross_kobo": str(financials.gross_kobo),
            "commission_kobo": str(financials.commission_kobo),
            "driver_net_kobo": str(financials.driver_net_kobo),
            "share_token": share_token,
        },
    )
    await redis.expire(pk, 12 * 3600)

    return FormedPodResult(
        pod_id=pod_id,
        pod_code=pod_code,
        share_token=share_token,
        corridor_id=corridor_id,
        direction=direction,
        anchor_id=anchor_id,
        is_partial=(len(member_ids) < BusinessRules.POD_SIZE),
        member_ids=member_ids,
        manifest=manifest,
        financials=financials,
    )
