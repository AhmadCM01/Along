"""Loader and atomic execution wrapper for Redis Lua scripts (`app/redis/scripts/*.lua`).

Supports both native Redis `EVAL` / `EVALSHA` and an atomic `asyncio.Lock` fallback when
running against test/mock Redis clients without a compiled Lua runtime.
"""

from __future__ import annotations

import asyncio
from pathlib import Path
from typing import Any

try:
    from redis.exceptions import ResponseError
except ImportError:

    class ResponseError(Exception):  # type: ignore[no-redef]
        """Fallback Redis ResponseError when redis package is absent."""

from app.redis.keys import (
    anchor_driver_queue_key,
    delayed_jobs_key,
    driver_hash_key,
    offer_declined_set_key,
    offer_key,
    pod_hash_key,
    pool_hashtag,
    rate_limit_wa_key,
    rider_pool_key,
)

SCRIPTS_DIR = Path(__file__).resolve().parent / "scripts"
_LUA_CACHE: dict[str, str] = {}
_SHA_CACHE: dict[tuple[int, str], str] = {}
_ATOMIC_FALLBACK_LOCK = asyncio.Lock()


def load_lua_source(script_name: str) -> str:
    """Read and cache a `.lua` script file from `app/redis/scripts/`."""
    if script_name not in _LUA_CACHE:
        path = SCRIPTS_DIR / f"{script_name}.lua"
        if not path.exists():
            raise FileNotFoundError(f"Lua script not found: {path}")
        source = path.read_text(encoding="utf-8")
        if "\u2013" in source or "\u2014" in source:
            raise ValueError(f"Lua script {path.name} contains forbidden en/em dash")
        _LUA_CACHE[script_name] = source
    return _LUA_CACHE[script_name]


async def _eval_lua(
    redis: Any,
    script_name: str,
    keys: list[str],
    args: list[str | int],
) -> Any:
    """Execute a Lua script via EVALSHA (loading on first call) if supported by the client."""
    source = load_lua_source(script_name)
    client_id = id(redis)
    cache_key = (client_id, script_name)
    if hasattr(redis, "evalsha") and hasattr(redis, "script_load"):
        try:
            sha = _SHA_CACHE.get(cache_key)
            if sha is None:
                sha = await redis.script_load(source)
                _SHA_CACHE[cache_key] = sha
            return await redis.evalsha(sha, len(keys), *keys, *[str(a) for a in args])
        except ResponseError as exc:
            msg = str(exc).lower()
            if "noscript" in msg:
                sha = await redis.script_load(source)
                _SHA_CACHE[cache_key] = sha
                return await redis.evalsha(sha, len(keys), *keys, *[str(a) for a in args])
            if "unknown command" not in msg and "lupa" not in msg and "eval" not in msg:
                raise
        except Exception as exc:
            msg = str(exc).lower()
            if "lupa" not in msg and "eval" not in msg and "not implemented" not in msg:
                raise
    return None


async def atomic_form_pod(
    redis: Any,
    corridor_id: str,
    direction: str,
    anchor_id: str,
    pod_id: str,
    pod_size: int = 4,
    now_ms: int = 0,
    min_wait_ms_for_partial: int = 0,
) -> list[str]:
    """Atomically pop `pod_size` QUEUED ride requests from `pool:{c:d:a}` and mark them PODDED."""
    pool_k = rider_pool_key(corridor_id, direction, anchor_id)
    hashtag = pool_hashtag(corridor_id, direction, anchor_id)

    for _attempt in range(5):
        res = await _eval_lua(
            redis,
            "form_pod",
            keys=[pool_k],
            args=[pod_size, pod_id, now_ms, hashtag, min_wait_ms_for_partial],
        )
        if res is not None:
            decoded = [m.decode() if isinstance(m, bytes) else str(m) for m in res]
            if decoded == ["RETRY"]:
                continue
            return decoded

        # Atomic lock fallback when running in environments without Lua runtime
        async with _ATOMIC_FALLBACK_LOCK:
            card = await redis.zcard(pool_k)
            if card < pod_size:
                return []
            members_raw = await redis.zrange(pool_k, 0, pod_size - 1)
            members = [m.decode() if isinstance(m, bytes) else str(m) for m in members_raw]
            if min_wait_ms_for_partial > 0:
                oldest_rk = f"req:{hashtag}:{members[0]}"
                oldest_ms = await redis.hget(oldest_rk, "enqueued_ms")
                if oldest_ms is None or (now_ms - int(oldest_ms)) < min_wait_ms_for_partial:
                    return []

            retry_needed = False
            for member in members:
                rk = f"req:{hashtag}:{member}"
                state = await redis.hget(rk, "state")
                state_str = state.decode() if isinstance(state, bytes) else state
                if state_str != "QUEUED":
                    await redis.zrem(pool_k, member)
                    retry_needed = True
                    break
            if retry_needed:
                continue

            await redis.zrem(pool_k, *members)
            for member in members:
                rk = f"req:{hashtag}:{member}"
                await redis.hset(rk, mapping={"state": "PODDED", "pod_id": pod_id})
            return members

    return []


async def atomic_claim_offer(
    redis: Any,
    pod_id: str,
    driver_id: str,
    ttl_s: int = 30,
) -> bool:
    """Atomically claim `offer:{pod_id}` for `driver_id` if eligible and not declined."""
    off_k = offer_key(pod_id)
    drv_k = driver_hash_key(driver_id)
    dec_k = offer_declined_set_key(pod_id)

    res = await _eval_lua(
        redis,
        "claim_offer",
        keys=[off_k, drv_k, dec_k],
        args=[driver_id, ttl_s],
    )
    if res is not None:
        return int(res) == 1

    async with _ATOMIC_FALLBACK_LOCK:
        if await redis.sismember(dec_k, driver_id):
            return False
        st = await redis.hget(drv_k, "status")
        st_str = st.decode() if isinstance(st, bytes) else st
        if st_str not in {"AVAILABLE", "QUEUED_AT_ANCHOR"}:
            return False
        ok = await redis.set(off_k, driver_id, nx=True, ex=ttl_s)
        if not ok:
            return False
        await redis.hset(drv_k, mapping={"status": "OFFERED", "active_pod": off_k})
        return True


async def atomic_accept_offer(
    redis: Any,
    pod_id: str,
    driver_id: str,
    corridor_id: str | None = None,
    direction: str | None = None,
    anchor_id: str | None = None,
) -> bool:
    """Atomically accept `offer:{pod_id}` if `driver_id` still holds it."""
    off_k = offer_key(pod_id)
    drv_k = driver_hash_key(driver_id)
    pod_k = pod_hash_key(pod_id)
    anchorq_k = (
        anchor_driver_queue_key(corridor_id, direction, anchor_id)
        if corridor_id and direction and anchor_id
        else ""
    )

    res = await _eval_lua(
        redis,
        "accept_offer",
        keys=[off_k, drv_k, pod_k, anchorq_k],
        args=[driver_id, pod_id],
    )
    if res is not None:
        return int(res) == 1

    async with _ATOMIC_FALLBACK_LOCK:
        holder = await redis.get(off_k)
        holder_str = holder.decode() if isinstance(holder, bytes) else holder
        if holder_str != driver_id:
            return False
        await redis.delete(off_k)
        await redis.hset(drv_k, mapping={"status": "ON_TRIP", "active_pod": pod_id})
        await redis.hset(pod_k, mapping={"state": "ASSIGNED", "driver_id": driver_id})
        if anchorq_k:
            await redis.lrem(anchorq_k, 0, driver_id)
        return True


async def atomic_sliding_rate_limit(
    redis: Any,
    wa_id: str,
    now_ms: int,
    window_ms: int = 60000,
    limit: int = 20,
    member_id: str = "",
) -> bool:
    """Sliding-window rate limiter returning True if allowed, False if rate-limited."""
    rl_k = rate_limit_wa_key(wa_id)
    res = await _eval_lua(
        redis,
        "rate_limit",
        keys=[rl_k],
        args=[now_ms, window_ms, limit, member_id],
    )
    if res is not None:
        return int(res) == 1

    async with _ATOMIC_FALLBACK_LOCK:
        await redis.zremrangebyscore(rl_k, 0, now_ms - window_ms)
        count = await redis.zcard(rl_k)
        if count >= limit:
            return False
        await redis.zadd(rl_k, {member_id: now_ms})
        await redis.pexpire(rl_k, window_ms * 2)
        return True


async def atomic_pop_due_jobs(
    redis: Any,
    now_ms: int,
    limit: int = 50,
) -> list[str]:
    """Atomically pop up to `limit` due jobs from `jobs:delayed` with score <= `now_ms`."""
    jobs_k = delayed_jobs_key()
    res = await _eval_lua(
        redis,
        "pop_due_jobs",
        keys=[jobs_k],
        args=[now_ms, limit],
    )
    if res is not None:
        return [j.decode() if isinstance(j, bytes) else str(j) for j in res]

    async with _ATOMIC_FALLBACK_LOCK:
        due_raw = await redis.zrangebyscore(jobs_k, "-inf", now_ms, start=0, num=limit)
        due = [j.decode() if isinstance(j, bytes) else str(j) for j in due_raw]
        if due:
            await redis.zrem(jobs_k, *due)
        return due
