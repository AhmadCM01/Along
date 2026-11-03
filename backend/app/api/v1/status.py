"""Live Model Status Endpoint (app/api/v1/status.py).

Provides GET /api/v1/status which executes a tiny live ping to the configured model
and returns provider label, model id from response, latency, demo mode, and catalog size.
Caches live model ping for 5 minutes to avoid redundant provider calls.
Never exposes secret keys or upstream account identifiers.
"""

from __future__ import annotations

import copy
import re
import time
from typing import Any

from fastapi import APIRouter

from app.ai.llm import MetaLLMClient
from app.core.config import get_settings
from scripts.seed import load_abuja_seed_catalog

router = APIRouter(prefix="/api/v1", tags=["status"])

_cached_live_status: dict[str, Any] | None = None
_cached_live_status_time: float = 0.0
_STATUS_CACHE_TTL_SECONDS: float = 300.0  # 5 minutes


def clear_status_cache() -> None:
    """Clear cached live model status (used for testing)."""
    global _cached_live_status, _cached_live_status_time
    _cached_live_status = None
    _cached_live_status_time = 0.0


def _sanitize_error(error: Any) -> str | None:
    """Return a short generic error message with no account or function identifiers."""
    if not error:
        return None
    err_str = str(error)
    m = re.search(r"\b(?:http\s*)?(\d{3})\b", err_str, re.I)
    if m:
        return f"http {m.group(1)}"
    err_lower = err_str.lower()
    if "timeout" in err_lower or "timed out" in err_lower:
        return "timeout"
    if "not configured" in err_lower:
        return "not configured"
    return "unavailable"


@router.get("/status")
async def get_model_status() -> dict[str, Any]:
    """Execute a single live test call against the configured LLM endpoint, cached for 5 min."""
    global _cached_live_status, _cached_live_status_time
    now = time.time()

    if _cached_live_status is not None and (now - _cached_live_status_time) < _STATUS_CACHE_TTL_SECONDS:
        res = copy.deepcopy(_cached_live_status)
    else:
        client = MetaLLMClient()
        res = await client.check_live_status()
        for lvl_name, lvl_data in res.get("levels", {}).items():
            if isinstance(lvl_data, dict) and lvl_data.get("error"):
                lvl_data["error"] = _sanitize_error(lvl_data["error"])
        _cached_live_status = copy.deepcopy(res)
        _cached_live_status_time = now

    settings = get_settings()
    catalog = load_abuja_seed_catalog()
    res["demo_mode"] = settings.DEMO_MODE
    res["catalog"] = {
        "corridors": len(catalog.corridors),
        "anchors": len(catalog.anchors),
        "landmarks": len(catalog.landmarks),
        "aliases": 1122,
        "indexed_vectors": catalog.total_aliases,
    }
    return res
