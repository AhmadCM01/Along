"""Asyncpg connection pool configured with statement_cache_size=0 for Supabase Supavisor."""

from __future__ import annotations

try:
    import asyncpg
except ImportError:
    asyncpg = None  # type: ignore[assignment]

from app.core.config import get_settings
from app.core.logging import get_logger

logger = get_logger("along.db")

_pool: asyncpg.Pool | None = None


async def init_db_pool(dsn: str | None = None) -> asyncpg.Pool:
    """Initialize global asyncpg pool with statement_cache_size=0."""
    global _pool
    if _pool is not None:
        return _pool
    effective_dsn = dsn or get_settings().DATABASE_URL
    _pool = await asyncpg.create_pool(
        dsn=effective_dsn,
        min_size=2,
        max_size=15,
        statement_cache_size=0,
        command_timeout=30.0,
    )
    logger.info("db_pool_initialized")
    return _pool


async def get_db_pool() -> asyncpg.Pool | None:
    """Return active asyncpg pool if initialized."""
    return _pool


async def close_db_pool() -> None:
    """Close global asyncpg pool cleanly on shutdown."""
    global _pool
    if _pool is not None:
        await _pool.close()
        _pool = None
        logger.info("db_pool_closed")
