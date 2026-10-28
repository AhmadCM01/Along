"""Distributed Redis locks with token-checked release and optional background renewal (§6.8)."""

from __future__ import annotations

import asyncio
import secrets
from contextlib import asynccontextmanager
from typing import Any, AsyncIterator

_RELEASE_LOCK_LUA = """
if redis.call('GET', KEYS[1]) == ARGV[1] then
  return redis.call('DEL', KEYS[1])
else
  return 0
end
"""


class DistributedLock:
    """Token-verified Redis lock supporting NX PX acquisition and safe release."""

    def __init__(self, redis: Any, key: str, ttl_ms: int = 30000) -> None:
        self._redis = redis
        self._key = key
        self._ttl_ms = ttl_ms
        self._token = secrets.token_hex(16)
        self._renew_task: asyncio.Task[None] | None = None

    @property
    def token(self) -> str:
        return self._token

    async def acquire(self) -> bool:
        """Attempt to acquire lock via SET NX PX."""
        ok = await self._redis.set(self._key, self._token, nx=True, px=self._ttl_ms)
        return bool(ok)

    async def release(self) -> bool:
        """Release lock only if still held by our token."""
        if self._renew_task is not None:
            self._renew_task.cancel()
            self._renew_task = None
        try:
            res = await self._redis.eval(_RELEASE_LOCK_LUA, 1, self._key, self._token)
            return int(res) == 1
        except Exception:
            cur = await self._redis.get(self._key)
            cur_str = cur.decode() if isinstance(cur, bytes) else cur
            if cur_str == self._token:
                await self._redis.delete(self._key)
                return True
            return False

    def start_auto_renew(self, interval_s: float = 10.0) -> None:
        """Renew lock TTL periodically during long-running operations."""

        async def _loop() -> None:
            while True:
                await asyncio.sleep(interval_s)
                cur = await self._redis.get(self._key)
                cur_str = cur.decode() if isinstance(cur, bytes) else cur
                if cur_str == self._token:
                    await self._redis.pexpire(self._key, self._ttl_ms)
                else:
                    break

        self._renew_task = asyncio.create_task(_loop())


@asynccontextmanager
async def hold_lock(
    redis: Any,
    key: str,
    ttl_ms: int = 30000,
    auto_renew: bool = False,
) -> AsyncIterator[bool]:
    """Context manager that yields True if lock was acquired, releasing on exit."""
    lock = DistributedLock(redis, key=key, ttl_ms=ttl_ms)
    acquired = await lock.acquire()
    if acquired and auto_renew:
        lock.start_auto_renew(interval_s=max(1.0, (ttl_ms / 1000.0) / 3.0))
    try:
        yield acquired
    finally:
        if acquired:
            await lock.release()
