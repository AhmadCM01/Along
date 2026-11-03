"""Live Model Status Endpoint (app/api/v1/status.py).

Provides GET /api/v1/status which executes a tiny live ping to the configured model
and returns provider label, model id from response, latency, demo mode, and catalog size.
Never exposes secret keys.
"""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter

from app.ai.llm import MetaLLMClient
from app.core.config import get_settings
from scripts.seed import load_abuja_seed_catalog

router = APIRouter(prefix="/api/v1", tags=["status"])


@router.get("/status")
async def get_model_status() -> dict[str, Any]:
    """Execute a single live test call against the configured LLM endpoint."""
    client = MetaLLMClient()
    res = await client.check_live_status()
    settings = get_settings()
    catalog = load_abuja_seed_catalog()
    res["demo_mode"] = settings.DEMO_MODE
    res["catalog"] = {
        "corridors": len(catalog.corridors),
        "anchors": len(catalog.anchors),
        "landmarks": len(catalog.landmarks),
        "aliases": catalog.total_aliases,
    }
    return res
