"""Pod Matcher & Timer Scheduler Worker (`app/workers/scheduler.py` - §7.2, §7.4).

Handles:
1. Full 4-seat pod formation (`allow_partial=False`).
2. Partial 3-seat pod formation after `PARTIAL_POD_WAIT_S` (8 minutes = 480s).
3. Due delayed jobs (`atomic_pop_due_jobs`):
   - `OFFER_TIMEOUT` (30s driver offer cascade)
   - `POD_WAIT_TIMEOUT` (15m full escrow refund)
   - `BOARDING_GRACE_TIMEOUT` (3m forecourt no-show 50/50 split)
"""

from __future__ import annotations

import json
import time
from typing import Any

from app.core.config import BusinessRules
from app.matching.pod_former import try_form_pod
from app.redis.keys import delayed_jobs_key
from app.redis.scripts import atomic_pop_due_jobs


class CorridorSchedulerWorker:
    """Deterministic scheduler for partial pods, offer cascades, and boarding grace timers."""

    def __init__(self, redis_client: Any) -> None:
        self.redis = redis_client

    async def schedule_delayed_job(
        self,
        *,
        job_type: str,
        delay_seconds: int,
        payload: dict[str, Any],
        now_ms: int | None = None,
    ) -> str:
        base_ms = now_ms if now_ms is not None else int(time.time() * 1000)
        due_ms = base_ms + (delay_seconds * 1000)
        serialized = json.dumps({"job_type": job_type, "due_ms": due_ms, **payload})
        await self.redis.zadd(delayed_jobs_key(), {serialized: float(due_ms)})
        return serialized

    async def poll_due_jobs(self, *, now_ms: int | None = None, batch_size: int = 25) -> list[dict[str, Any]]:
        eff_now = now_ms if now_ms is not None else int(time.time() * 1000)
        raw_jobs = await atomic_pop_due_jobs(self.redis, now_ms=eff_now, limit=batch_size)
        parsed: list[dict[str, Any]] = []
        for raw in raw_jobs:
            try:
                parsed.append(json.loads(raw))
            except Exception:
                continue
        return parsed

    async def check_and_form_partial_or_full_pod(
        self,
        *,
        corridor_id: str,
        direction: str,
        anchor_id: str,
        oldest_wait_seconds: int = 0,
        base_enqueue_ms: int = 1000,
    ) -> list[str]:
        """Form a 4-seat pod immediately, or a 3-seat partial pod if oldest wait >= 480s (8 mins)."""
        allow_partial = oldest_wait_seconds >= BusinessRules.PARTIAL_POD_WAIT_S
        now_ms = base_enqueue_ms + (oldest_wait_seconds * 1000)
        res = await try_form_pod(
            self.redis,
            corridor_id=corridor_id,
            direction=direction,  # type: ignore[arg-type]
            anchor_id=anchor_id,
            now_ms=now_ms,
            allow_partial=allow_partial,
        )
        return res.member_ids if res else []
