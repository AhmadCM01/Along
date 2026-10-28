"""Driver Dispatch Cascade & Mid-Corridor Seat Reload Engine (`app/matching/dispatcher.py` - §7.3, §7.6).

Implements:
1. Forecourt FIFO Queue priority (`anchorq:{corr:dir:anchor}`) + 3km `GEOSEARCH` fallback.
2. Atomic 30-second Driver Offer Claim (`atomic_claim_offer`) and Acceptance (`atomic_accept_offer`)
   with up to 5-driver cascade (`DRIVER_CASCADE_MAX = 5`).
3. **Mid-Corridor Seat Reload (§7.6)**: When a passenger alights at an intermediate Virtual Anchor
   (e.g., `Oando Mabushi` at `km 26.1` on `BWR-DUT-WUS`), `reload_vacated_seats_at_anchor`
   automatically fills the freed seat(s) with waiting riders at that anchor heading further down
   the same corridor, turning one 4-seat car into 5 to 7 paid fares per corridor run.
"""

from __future__ import annotations

import time
from dataclasses import dataclass, field
from typing import Any

from app.core.config import BusinessRules
from app.core.ids import generate_boarding_otp, generate_pod_code, generate_share_token, new_uuid7_str
from app.matching.pool import QueuedRideRequest
from app.redis.keys import (
    anchor_driver_queue_key,
    driver_hash_key,
    geo_drivers_key,
    pod_hash_key,
)
from app.redis.scripts import atomic_accept_offer, atomic_claim_offer


@dataclass
class MidCorridorSeatReloadResult:
    """Result of a Mid-Corridor Seat Reload at an intermediate anchor."""

    pod_id: str
    corridor_id: str
    anchor_id: str
    alighted_seats: int
    reloaded_seats: int
    new_rider_request_ids: list[str] = field(default_factory=list)
    total_cumulative_riders_served: int = 4
    incremental_driver_revenue_kobo: int = 0


class DriverDispatcher:
    """Coordinates driver candidate selection, 30s offer cascade, and Mid-Corridor Seat Reloads."""

    def __init__(self, redis_client: Any) -> None:
        self.redis = redis_client

    async def register_driver_online(
        self,
        *,
        driver_id: str,
        corridor_id: str,
        direction: str,
        anchor_id: str | None,
        lat: float,
        lng: float,
        phone_mode: str = "SMARTPHONE",
        plate_number: str = "ABJ-412K",
        full_name: str = "Musa Danjuma",
        vehicle_desc: str = "Toyota Corolla (Silver)",
    ) -> None:
        """Mark a verified driver AVAILABLE/QUEUED_AT_ANCHOR, update Redis GEO position, and join Anchor FIFO queue."""
        now_ms = int(time.time() * 1000)
        drv_status = "QUEUED_AT_ANCHOR" if anchor_id else "AVAILABLE"
        await self.redis.hset(
            driver_hash_key(driver_id),
            mapping={
                "driver_id": driver_id,
                "status": drv_status,
                "corridor_id": corridor_id,
                "direction": direction,
                "anchor_id": anchor_id or "",
                "lat": str(lat),
                "lng": str(lng),
                "phone_mode": phone_mode,
                "plate_number": plate_number,
                "full_name": full_name,
                "vehicle_desc": vehicle_desc,
                "last_seen_ms": str(now_ms),
            },
        )
        await self.redis.geoadd(geo_drivers_key(corridor_id), (lng, lat, driver_id))
        if anchor_id:
            q_key = anchor_driver_queue_key(corridor_id, direction, anchor_id)
            await self.redis.lrem(q_key, 0, driver_id)
            await self.redis.rpush(q_key, driver_id)

    async def find_candidate_drivers(
        self,
        *,
        corridor_id: str,
        direction: str,
        anchor_id: str,
        anchor_lat: float,
        anchor_lng: float,
    ) -> list[str]:
        """Return ordered candidate driver IDs: Anchor Forecourt FIFO queue first, then 3km GEOSEARCH."""
        candidates: list[str] = []
        q_key = anchor_driver_queue_key(corridor_id, direction, anchor_id)
        popped = await self.redis.lpop(q_key)
        if popped:
            candidates.append(popped)
            await self.redis.rpush(q_key, popped)

        geo_hits = await self.redis.geosearch(
            geo_drivers_key(corridor_id),
            longitude=anchor_lng,
            latitude=anchor_lat,
            radius=BusinessRules.DRIVER_SEARCH_RADIUS_M,
            unit="m",
            sort="ASC",
            count=BusinessRules.DRIVER_CASCADE_MAX,
        )
        for member, _dist, _coords in geo_hits:
            if member not in candidates:
                candidates.append(member)
        return candidates[: BusinessRules.DRIVER_CASCADE_MAX]

    async def dispatch_offer_to_next_driver(
        self,
        *,
        pod_id: str,
        corridor_id: str,
        direction: str,
        anchor_id: str,
        anchor_lat: float,
        anchor_lng: float,
    ) -> str | None:
        """Offer `pod_id` to the first eligible candidate driver with a 30s TTL."""
        candidates = await self.find_candidate_drivers(
            corridor_id=corridor_id,
            direction=direction,
            anchor_id=anchor_id,
            anchor_lat=anchor_lat,
            anchor_lng=anchor_lng,
        )
        for drv_id in candidates:
            claimed = await atomic_claim_offer(
                self.redis,
                pod_id=pod_id,
                driver_id=drv_id,
                ttl_s=BusinessRules.DRIVER_OFFER_TTL_S,
            )
            if claimed:
                return drv_id
        return None

    async def driver_accept_offer(
        self,
        *,
        pod_id: str,
        driver_id: str,
        corridor_id: str | None = None,
        direction: str | None = None,
        anchor_id: str | None = None,
    ) -> bool:
        """Atomically accept a live pod offer and transition pod to `ASSIGNED`."""
        return await atomic_accept_offer(
            self.redis,
            pod_id=pod_id,
            driver_id=driver_id,
            corridor_id=corridor_id,
            direction=direction,
            anchor_id=anchor_id,
        )

    async def reload_vacated_seats_at_anchor(
        self,
        *,
        pod_id: str,
        corridor_id: str,
        direction: str,
        intermediate_anchor_id: str,
        alighted_seats: int,
        waiting_riders_at_anchor: list[QueuedRideRequest],
    ) -> MidCorridorSeatReloadResult:
        """Execute Mid-Corridor Seat Reload (§7.6) when a passenger drops off at an intermediate anchor."""
        pod_key = pod_hash_key(pod_id)
        pod_data = await self.redis.hgetall(pod_key)
        prev_occupied = int(pod_data.get("seats_occupied", 4))
        prev_total_served = int(pod_data.get("cumulative_riders_served", prev_occupied))

        available_after_drop = max(
            0,
            min(BusinessRules.POD_SIZE, BusinessRules.POD_SIZE - (prev_occupied - alighted_seats)),
        )
        reloaded = 0
        matched_ids: list[str] = []
        incremental_rev = 0

        for req in waiting_riders_at_anchor:
            if reloaded + req.seats <= available_after_drop:
                reloaded += req.seats
                matched_ids.append(req.ride_request_id)
                incremental_rev += req.fare_kobo * req.seats
                if reloaded >= available_after_drop:
                    break

        new_occupied = (prev_occupied - alighted_seats) + reloaded
        new_cumulative = prev_total_served + reloaded

        await self.redis.hset(
            pod_key,
            mapping={
                "seats_occupied": str(new_occupied),
                "cumulative_riders_served": str(new_cumulative),
                "last_reload_anchor_id": intermediate_anchor_id,
            },
        )
        return MidCorridorSeatReloadResult(
            pod_id=pod_id,
            corridor_id=corridor_id,
            anchor_id=intermediate_anchor_id,
            alighted_seats=alighted_seats,
            reloaded_seats=reloaded,
            new_rider_request_ids=matched_ids,
            total_cumulative_riders_served=new_cumulative,
            incremental_driver_revenue_kobo=int(round(incremental_rev * 0.90)),
        )


def build_new_pod_metadata(
    *,
    corridor_id: str,
    direction: str,
    anchor_id: str,
    anchor_name: str,
    member_request_ids: list[str],
) -> dict[str, Any]:
    """Create canonical pod metadata including pod code, share token, and per-rider 4-digit OTPs."""
    pod_id = new_uuid7_str()
    pod_code = generate_pod_code()
    share_token = generate_share_token()
    otps = {req_id: generate_boarding_otp() for req_id in member_request_ids}
    return {
        "pod_id": pod_id,
        "pod_code": pod_code,
        "corridor_id": corridor_id,
        "direction": direction,
        "anchor_id": anchor_id,
        "anchor_name": anchor_name,
        "status": "FORMED",
        "seats_occupied": len(member_request_ids),
        "cumulative_riders_served": len(member_request_ids),
        "member_request_ids": member_request_ids,
        "boarding_otps": otps,
        "share_token": share_token,
    }
