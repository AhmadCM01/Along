"""Concurrency and atomicity tests for P1-T4 (Redis Lua scripts & 500-concurrent pod formation)."""

from __future__ import annotations

import asyncio

import pytest

from app.matching.pod_former import FormedPodResult, try_form_pod
from app.matching.pool import enqueue_ride_request, get_pool_count
from app.redis.keys import anchor_driver_queue_key, delayed_jobs_key, driver_hash_key
from app.redis.scripts import (
    atomic_accept_offer,
    atomic_claim_offer,
    atomic_pop_due_jobs,
    atomic_sliding_rate_limit,
)


@pytest.mark.asyncio
async def test_500_concurrent_requests_form_125_pods_zero_overbooking(fake_redis: object) -> None:
    """Acceptance Gate P1-T4 (Criterion S5): 500 concurrent requests form 125 pods of 4 with 0 duplicates."""
    corridor_id = "BWR-DUT-WUS"
    direction = "S"
    anchor_id = "ANC-DUT-01"

    stops = [
        ("Oando Katampe Ext", 26100, 70000),
        ("Berger Roundabout", 30200, 100000),
        ("Banex Plaza Wuse II", 32100, 120000),
        ("Wuse Market", 33100, 120000),
    ]

    # Enqueue 500 distinct paid ride requests
    for i in range(500):
        dest_name, dest_km, fare_kobo = stops[i % 4]
        await enqueue_ride_request(
            redis=fake_redis,
            corridor_id=corridor_id,
            direction=direction,
            anchor_id=anchor_id,
            ride_request_id=f"rr-{i:04d}",
            rider_id=f"rider-{i:04d}",
            dest_km_marker=dest_km,
            fare_kobo=fare_kobo,
            enqueued_ms=1_760_000_000_000 + i,
            rider_name=f"Rider{i}",
            dest_name=dest_name,
        )

    assert await get_pool_count(fake_redis, corridor_id, direction, anchor_id) == 500

    # Launch 500 concurrent coroutines attempting to form pods simultaneously
    results = await asyncio.gather(
        *(
            try_form_pod(
                redis=fake_redis,
                corridor_id=corridor_id,
                direction="S",
                anchor_id=anchor_id,
                now_ms=1_760_000_010_000 + i,
            )
            for i in range(500)
        )
    )

    formed_pods: list[FormedPodResult] = [r for r in results if r is not None]
    assert len(formed_pods) == 125

    # Verify zero remaining in pool and every request is in exactly 1 pod
    assert await get_pool_count(fake_redis, corridor_id, direction, anchor_id) == 0

    all_podded_members: list[str] = []
    for pod in formed_pods:
        assert len(pod.member_ids) == 4
        assert len(pod.manifest) == 4
        all_podded_members.extend(pod.member_ids)
        # Earliest drop-off (Oando, km 26100) must be assigned BACK_RIGHT for easy exit
        oando_entries = [m for m in pod.manifest if m["dest_km_marker"] == 26100]
        if oando_entries:
            assert oando_entries[-1]["seat_label"] == "BACK_RIGHT"

    assert len(all_podded_members) == 500
    assert len(set(all_podded_members)) == 500


@pytest.mark.asyncio
async def test_offer_claim_accept_ratelimit_and_delayed_jobs(fake_redis: object) -> None:
    pod_id = "pod-test-01"
    drv_1 = "drv-musa-402"
    drv_2 = "drv-sunday-102"

    await fake_redis.hset(driver_hash_key(drv_1), mapping={"status": "QUEUED_AT_ANCHOR"})  # type: ignore[attr-defined]
    await fake_redis.hset(driver_hash_key(drv_2), mapping={"status": "AVAILABLE"})  # type: ignore[attr-defined]
    q_key = anchor_driver_queue_key("BWR-DUT-WUS", "S", "ANC-DUT-01")
    await fake_redis.rpush(q_key, drv_1, drv_2)  # type: ignore[attr-defined]

    # Only one driver can claim the offer at a time
    claimed_1, claimed_2 = await asyncio.gather(
        atomic_claim_offer(fake_redis, pod_id, drv_1, ttl_s=30),
        atomic_claim_offer(fake_redis, pod_id, drv_2, ttl_s=30),
    )
    assert (claimed_1 and not claimed_2) or (claimed_2 and not claimed_1)
    winner = drv_1 if claimed_1 else drv_2
    loser = drv_2 if claimed_1 else drv_1

    # Loser cannot accept the offer
    assert not await atomic_accept_offer(fake_redis, pod_id, loser)

    # Winner accepts the offer atomically
    assert await atomic_accept_offer(
        fake_redis,
        pod_id,
        winner,
        corridor_id="BWR-DUT-WUS",
        direction="S",
        anchor_id="ANC-DUT-01",
    )

    # Sliding-window rate limit (limit=3 within 60s)
    wa_id = "2348031234567"
    assert await atomic_sliding_rate_limit(fake_redis, wa_id, 1000, 60000, 3, "m1")
    assert await atomic_sliding_rate_limit(fake_redis, wa_id, 2000, 60000, 3, "m2")
    assert await atomic_sliding_rate_limit(fake_redis, wa_id, 3000, 60000, 3, "m3")
    assert not await atomic_sliding_rate_limit(fake_redis, wa_id, 4000, 60000, 3, "m4")
    # After window slides past 61000ms, m1 expires and m5 is allowed
    assert await atomic_sliding_rate_limit(fake_redis, wa_id, 62000, 60000, 3, "m5")

    # Delayed jobs popper
    await fake_redis.zadd(  # type: ignore[attr-defined]
        delayed_jobs_key(),
        {"job-due-1": 1000, "job-due-2": 2000, "job-future": 9000},
    )
    popped = await atomic_pop_due_jobs(fake_redis, now_ms=2500, limit=10)
    assert popped == ["job-due-1", "job-due-2"]
    remaining = await atomic_pop_due_jobs(fake_redis, now_ms=10000, limit=10)
    assert remaining == ["job-future"]
