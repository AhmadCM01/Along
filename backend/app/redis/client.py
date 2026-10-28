"""Async Redis connection pool with decode_responses=True."""

from __future__ import annotations

from typing import Any

try:
    import redis.asyncio as aioredis
except ImportError:
    aioredis = None  # type: ignore[assignment]

from app.core.config import get_settings
from app.core.logging import get_logger

logger = get_logger("along.redis")

_redis_client: aioredis.Redis | None = None


async def init_redis_client(url: str | None = None) -> aioredis.Redis:
    """Initialize global async Redis client."""
    global _redis_client
    if _redis_client is not None:
        return _redis_client
    effective_url = url or get_settings().REDIS_URL
    _redis_client = aioredis.from_url(
        effective_url,
        decode_responses=True,
        max_connections=30,
    )
    logger.info("redis_client_initialized", url=effective_url)
    return _redis_client


def get_redis_client() -> aioredis.Redis:
    """Return active async Redis client or raise if not initialized."""
    if _redis_client is None:
        raise RuntimeError("Redis client is not initialized; call init_redis_client() first")
    return _redis_client


def set_redis_client_for_tests(client: Any) -> None:
    """Inject a test/fake async Redis client."""
    global _redis_client
    _redis_client = client


async def close_redis_client() -> None:
    """Close global async Redis client."""
    global _redis_client
    if _redis_client is not None:
        await _redis_client.aclose()
        _redis_client = None
        logger.info("redis_client_closed")
