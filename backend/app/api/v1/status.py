"""Live Model Status Endpoint (app/api/v1/status.py).

Provides GET /api/v1/status which executes a tiny live ping to the configured model
and returns provider label, model id from response, latency, and success or real error.
Never exposes secret keys.
"""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter

from app.ai.llm import MetaLLMClient

router = APIRouter(prefix="/api/v1", tags=["status"])


@router.get("/status")
async def get_model_status() -> dict[str, Any]:
    """Execute a single live test call against the configured LLM endpoint."""
    client = MetaLLMClient()
    return await client.check_live_status()
