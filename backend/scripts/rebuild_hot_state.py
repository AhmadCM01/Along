"""Hot-state recovery job (`scripts/rebuild_hot_state.py` - §6.9 of MASTER_IMPLEMENTATION_PLAN.md).

Reconstructs Redis GEO anchor indices (`geo:anchors:{corridor}:{direction}`) and sets
`hotstate:built_at` on startup or on demand from the Ops Command Center.
"""

from __future__ import annotations

import time
from typing import Any

from app.core.logging import get_logger
from scripts.seed import AbujaSeedCatalog, load_abuja_seed_catalog, seed_redis_geo_anchors

logger = get_logger("along.hotstate")


async def rebuild_hot_state(
    redis: Any,
    catalog: AbujaSeedCatalog | None = None,
) -> dict[str, int]:
    """Rebuild Redis spatial indices from authoritative catalog / database state."""
    cat = catalog or load_abuja_seed_catalog()
    anchors_seeded = await seed_redis_geo_anchors(redis, catalog=cat)
    now_ms = int(time.time() * 1000)
    await redis.set("hotstate:built_at", str(now_ms))
    result = {
        "anchors_seeded": anchors_seeded,
        "built_at_ms": now_ms,
    }
    logger.info("hotstate_rebuilt", **result)
    return result
