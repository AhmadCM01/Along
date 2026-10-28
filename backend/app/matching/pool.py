"""Rider pool queueing and priority score calculation (§7.3)."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from app.redis.keys import ride_request_hash_key, rider_pool_key

PRIORITY_SHIFT_MS = 600_000  # 10 minutes per priority level


@dataclass(frozen=True, slots=True)
class QueuedRideRequest:
    """Structured ride request queued in an Anchor pool."""

    ride_request_id: str
    rider_id: str
    corridor_id: str
    direction: str
    anchor_id: str
    origin_zone_id: str
    dest_zone_id: str
    seats: int = 1
    fare_kobo: int = 100_000
    enqueue_ms: int = 1000
    dest_km_marker: int = 30_000



def compute_pool_score(enqueued_ms: int, priority: int = 0) -> int:
    """Compute ZSET score: enqueued_ms shifted 10 minutes earlier per priority bump."""
    return enqueued_ms - (priority * PRIORITY_SHIFT_MS)


async def enqueue_ride_request(
    redis: Any,
    corridor_id: str,
    direction: str,
    anchor_id: str,
    ride_request_id: str,
    rider_id: str,
    dest_km_marker: int,
    fare_kobo: int,
    enqueued_ms: int,
    priority: int = 0,
    rider_name: str = "Commuter",
    dest_name: str = "Destination",
) -> int:
    """Mirror a paid ride request into Redis HASH `req:{c:d:a}:{rr_id}` and ZSET `pool:{c:d:a}`."""
    rk = ride_request_hash_key(corridor_id, direction, anchor_id, ride_request_id)
    pk = rider_pool_key(corridor_id, direction, anchor_id)
    score = compute_pool_score(enqueued_ms=enqueued_ms, priority=priority)

    await redis.hset(
        rk,
        mapping={
            "rider_id": rider_id,
            "rider_name": rider_name,
            "dest_name": dest_name,
            "dest_km": str(dest_km_marker),
            "fare_kobo": str(fare_kobo),
            "state": "QUEUED",
            "enqueued_ms": str(enqueued_ms),
            "priority": str(priority),
            "pod_id": "",
        },
    )
    await redis.expire(rk, 6 * 3600)
    await redis.zadd(pk, {ride_request_id: score})
    count = await redis.zcard(pk)
    return int(count)


async def get_pool_count(
    redis: Any,
    corridor_id: str,
    direction: str,
    anchor_id: str,
) -> int:
    """Return live number of queued riders at an anchor."""
    pk = rider_pool_key(corridor_id, direction, anchor_id)
    return int(await redis.zcard(pk))


async def enqueue_paid_ride_request(redis: Any, req: QueuedRideRequest) -> int:
    """Enqueue a `QueuedRideRequest` object into its Anchor Redis HASH + ZSET pool."""
    return await enqueue_ride_request(
        redis=redis,
        corridor_id=req.corridor_id,
        direction=req.direction,
        anchor_id=req.anchor_id,
        ride_request_id=req.ride_request_id,
        rider_id=req.rider_id,
        dest_km_marker=req.dest_km_marker,
        fare_kobo=req.fare_kobo,
        enqueued_ms=req.enqueue_ms,
    )

