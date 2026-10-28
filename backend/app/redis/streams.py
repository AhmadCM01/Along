"""Redis Streams producer, consumer-group reader, XAUTOCLAIM recovery, and DLQ helper (§6.3)."""

from __future__ import annotations

import json
from typing import Any

try:
    from redis.exceptions import ResponseError
except ImportError:

    class ResponseError(Exception):  # type: ignore[no-redef]
        """Fallback Redis ResponseError when redis package is absent."""

from app.redis.keys import stream_dlq_key


async def ensure_consumer_group(redis: Any, stream_key: str, group_name: str) -> None:
    """Create a consumer group with MKSTREAM if it does not already exist."""
    try:
        await redis.xgroup_create(stream_key, group_name, id="0", mkstream=True)
    except ResponseError as exc:
        if "BUSYGROUP" not in str(exc):
            raise


async def xadd_json(
    redis: Any,
    stream_key: str,
    payload: dict[str, Any],
    maxlen: int = 50000,
) -> str:
    """Publish a JSON-encoded event into a Redis Stream with approximate MAXLEN trimming."""
    entry_id = await redis.xadd(
        stream_key,
        {"data": json.dumps(payload)},
        maxlen=maxlen,
        approximate=True,
    )
    return entry_id.decode() if isinstance(entry_id, bytes) else str(entry_id)


async def move_to_dlq(
    redis: Any,
    source_stream: str,
    group_name: str,
    entry_id: str,
    raw_fields: dict[str, Any],
    error_message: str,
) -> None:
    """Move a poison stream message (exceeding max retries) to stream:dlq and XACK the original."""
    await xadd_json(
        redis,
        stream_dlq_key(),
        {
            "source_stream": source_stream,
            "group": group_name,
            "entry_id": entry_id,
            "fields": raw_fields,
            "error": error_message,
        },
    )
    await redis.xack(source_stream, group_name, entry_id)
