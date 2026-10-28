"""Unified Meta Model API & Open-Weight Meta LLM client (`app/ai/llm.py`).

Supports:
1. Official Meta Model API (`https://api.meta.ai/v1`) covered by the $150 Hackathon Grant:
   - `muse-spark-1.3` (Muse Spark: fast multilingual intent & slot extraction)
   - `muse-wonder` (Muse Wonder: deep frontier reasoning for relational Abuja landmarks & evals)
2. Open-Weight Meta Models via OpenAI-compatible inference endpoints (Groq / Baseten / Fireworks):
   - `muse-glimmer`, `muse-spark-open`
   - `llama-3.3-70b-versatile`, `llama-3.1-8b-instant`
"""

from __future__ import annotations

import json
import time
from dataclasses import dataclass
from typing import Any

import httpx

from app.core.config import get_settings
from app.core.logging import get_logger

logger = get_logger(__name__)


@dataclass(frozen=True)
class LLMCallResult:
    """Result from a Meta LLM invocation."""

    model_used: str
    provider: str
    content: str
    parsed_json: dict[str, Any] | None
    latency_ms: float
    prompt_tokens: int
    completion_tokens: int


class MetaLLMClient:
    """Dual-provider async client for Meta Model API (Muse) and Open-Weight Llama/Muse endpoints."""

    def __init__(self) -> None:
        self.settings = get_settings()

    def is_live_api_configured(self) -> bool:
        """Return True if either META_API_KEY or GROQ_API_KEY is configured with a real key."""
        meta_key = (self.settings.META_API_KEY or "").strip()
        groq_key = (self.settings.GROQ_API_KEY or "").strip()
        has_meta = bool(meta_key and "replace_me" not in meta_key and meta_key != "test")
        has_groq = bool(groq_key and "replace_me" not in groq_key and groq_key != "test")
        return has_meta or has_groq

    async def complete_json(
        self,
        *,
        system_prompt: str,
        user_message: str,
        tier: str = "fast",
        temperature: float = 0.0,
        timeout_sec: float = 6.0,
    ) -> LLMCallResult:
        """Invoke Meta Muse Spark (`fast`) or Muse Wonder (`reasoning`) with automatic fallback."""
        start = time.perf_counter()

        if tier == "fast":
            meta_model = self.settings.MUSE_SPARK_MODEL
            groq_model = self.settings.LLAMA_FAST_MODEL
        else:
            meta_model = self.settings.MUSE_WONDER_MODEL
            groq_model = self.settings.LLAMA_STRONG_MODEL

        meta_key = (self.settings.META_API_KEY or "").strip()
        groq_key = (self.settings.GROQ_API_KEY or "").strip()

        if meta_key and "replace_me" not in meta_key and meta_key != "test":
            try:
                return await self._call_openai_compatible(
                    base_url=self.settings.META_MODEL_API_BASE_URL,
                    api_key=meta_key,
                    model=meta_model,
                    provider="meta_model_api",
                    system_prompt=system_prompt,
                    user_message=user_message,
                    temperature=temperature,
                    timeout_sec=timeout_sec,
                )
            except Exception as exc:
                logger.warning("meta_model_api_fallback", model=meta_model, error=str(exc))

        if groq_key and "replace_me" not in groq_key and groq_key != "test":
            try:
                return await self._call_openai_compatible(
                    base_url="https://api.groq.com/openai/v1",
                    api_key=groq_key,
                    model=groq_model,
                    provider="groq_open_weights",
                    system_prompt=system_prompt,
                    user_message=user_message,
                    temperature=temperature,
                    timeout_sec=timeout_sec,
                )
            except Exception as exc:
                logger.warning("groq_api_fallback", model=groq_model, error=str(exc))

        latency_ms = round((time.perf_counter() - start) * 1000.0, 2)
        raise RuntimeError(f"No live LLM API key configured or reachable (elapsed {latency_ms}ms)")

    async def _call_openai_compatible(
        self,
        *,
        base_url: str,
        api_key: str,
        model: str,
        provider: str,
        system_prompt: str,
        user_message: str,
        temperature: float,
        timeout_sec: float,
    ) -> LLMCallResult:
        start = time.perf_counter()
        url = f"{base_url.rstrip('/')}/chat/completions"
        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        }
        payload = {
            "model": model,
            "temperature": temperature,
            "response_format": {"type": "json_object"},
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_message},
            ],
        }
        async with httpx.AsyncClient(timeout=timeout_sec) as client:
            resp = await client.post(url, headers=headers, json=payload)
            resp.raise_for_status()
            data = resp.json()

        content = data["choices"][0]["message"]["content"]
        usage = data.get("usage", {})
        parsed = json.loads(content)
        latency_ms = round((time.perf_counter() - start) * 1000.0, 2)
        return LLMCallResult(
            model_used=model,
            provider=provider,
            content=content,
            parsed_json=parsed,
            latency_ms=latency_ms,
            prompt_tokens=int(usage.get("prompt_tokens", 0)),
            completion_tokens=int(usage.get("completion_tokens", 0)),
        )
