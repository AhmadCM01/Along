"""OpenAI-compatible LLM client with a two level fallback chain (app/ai/llm.py).

Level order for every JSON completion:
1. primary:  LLM_BASE_URL, LLM_API_KEY, LLM_MODEL, LLM_PROVIDER_LABEL
2. fallback: LLM_FALLBACK_BASE_URL, LLM_FALLBACK_API_KEY, LLM_FALLBACK_MODEL,
             LLM_FALLBACK_PROVIDER_LABEL
3. rule_based: no model call. Callers run deterministic logic and report fallback=True.

Each model level is tried with LLM_TIMEOUT_SECONDS and one retry. Every result carries
`level` so traces can record which level answered. API keys are never logged, and error
strings are redacted before they leave this module.
"""

from __future__ import annotations

import asyncio
import json
import re
import time
from dataclasses import dataclass, field
from typing import Any, Callable, Iterable, Literal, Sequence
from urllib.parse import urlparse

import httpx

from app.core.config import Settings, get_settings, is_valid_secret
from app.core.logging import get_logger

logger = get_logger(__name__)

LLMLevel = Literal["primary", "fallback", "rule_based"]
ModelLevel = Literal["primary", "fallback"]

CHAIN_ORDER: tuple[ModelLevel, ...] = ("primary", "fallback")
RETRIES_PER_LEVEL = 1

# Deterministic client errors: retrying the same request cannot succeed, so the chain
# moves straight to the next level instead of spending the retry.
_NON_RETRYABLE_STATUS = {400, 401, 403, 404, 405, 413, 422}

_JSON_REMINDER = "\nRespond with valid JSON object only."


# ---------------------------------------------------------------------------
# Labeling
# ---------------------------------------------------------------------------


def label_model(model_id: str | None) -> str:
    """Classify a model by the model id returned in the API response."""
    if not model_id or model_id == "none":
        return "none"
    m_lower = model_id.lower()
    if "muse-spark-open" in m_lower:
        return "Meta open-weight model (Muse Spark Open)"
    if "glimmer" in m_lower:
        return "Meta open-weight model (Muse Glimmer)"
    if "llama" in m_lower:
        return "Meta open-weight model (Llama)"
    return "Non-Meta"


def provider_display_name(provider_label: str, base_url: str, *, call_succeeded: bool) -> str:
    """Return the exact provider display name for a configured endpoint.

    "Meta Model API" is only ever returned for api.meta.ai when the call succeeded.
    """
    host = (urlparse(base_url).hostname or "").lower() if base_url else ""
    label = (provider_label or "").lower()
    if "baseten" in host or "baseten" in label:
        return "via Baseten"
    if "nvidia" in host or "nvidia" in label or label == "nim":
        return "via NVIDIA NIM"
    if host == "api.meta.ai":
        return "via Meta Model API" if call_succeeded else "via api.meta.ai (call did not succeed)"
    if host:
        return f"via {host}"
    return provider_label or "unknown provider"


# ---------------------------------------------------------------------------
# Redaction
# ---------------------------------------------------------------------------

_BEARER_RE = re.compile(r"(Bearer\s+)\S+", re.I)
_KEY_PARAM_RE = re.compile(r"((?:api[_-]?key|token|key)=)[^&\s]+", re.I)


def redact_secrets(text: str, secrets: Iterable[str | None] = ()) -> str:
    """Remove bearer tokens, key query params and any known secret values from text."""
    out = _BEARER_RE.sub(r"\1[REDACTED]", text or "")
    out = _KEY_PARAM_RE.sub(r"\1[REDACTED]", out)
    for secret in secrets:
        if secret and len(secret) >= 6:
            out = out.replace(secret, "[REDACTED]")
    return out


# ---------------------------------------------------------------------------
# Data structures
# ---------------------------------------------------------------------------


@dataclass(frozen=True)
class LLMEndpoint:
    """One configured model level. The key is excluded from repr so it never lands in logs."""

    level: ModelLevel
    base_url: str
    model: str
    provider_label: str
    api_key: str = field(repr=False, default="")

    def display(self, *, call_succeeded: bool) -> str:
        return provider_display_name(self.provider_label, self.base_url, call_succeeded=call_succeeded)


def _endpoint_from_settings(settings: Settings, level: ModelLevel) -> LLMEndpoint | None:
    if level == "primary":
        key = settings.get_effective_llm_key()
        base_url, model, label = settings.LLM_BASE_URL, settings.LLM_MODEL, settings.LLM_PROVIDER_LABEL
    else:
        key = settings.get_effective_llm_fallback_key()
        base_url = settings.LLM_FALLBACK_BASE_URL
        model = settings.LLM_FALLBACK_MODEL
        label = settings.LLM_FALLBACK_PROVIDER_LABEL
    if not key or not (base_url or "").strip() or not (model or "").strip():
        return None
    return LLMEndpoint(
        level=level,
        base_url=base_url.strip(),
        model=model.strip(),
        provider_label=(label or "").strip(),
        api_key=key,
    )


def missing_level_settings(settings: Settings, level: ModelLevel) -> list[str]:
    """Names of env vars that keep a level from being configured (names only, never values)."""
    prefix = "LLM_" if level == "primary" else "LLM_FALLBACK_"
    values = {
        f"{prefix}BASE_URL": settings.LLM_BASE_URL if level == "primary" else settings.LLM_FALLBACK_BASE_URL,
        f"{prefix}API_KEY": settings.LLM_API_KEY if level == "primary" else settings.LLM_FALLBACK_API_KEY,
        f"{prefix}MODEL": settings.LLM_MODEL if level == "primary" else settings.LLM_FALLBACK_MODEL,
    }
    missing = []
    for name, val in values.items():
        ok = is_valid_secret(val) if name.endswith("API_KEY") else bool((val or "").strip())
        if not ok:
            missing.append(name)
    return missing


@dataclass(frozen=True)
class StageTraceRecord:
    """Structured audit trace emitted by every pipeline stage."""

    stage: str
    provider_label: str
    model_id: str
    latency_ms: float
    input_truncated: str
    output_truncated: str
    status: Literal["ok", "fallback", "error"]
    fallback: bool
    llm_level: str = "rule_based"

    def to_dict(self) -> dict[str, Any]:
        return {
            "stage": self.stage,
            "provider_label": self.provider_label,
            "model_id": self.model_id,
            "label": label_model(self.model_id),
            "llm_level": self.llm_level,
            "latency_ms": self.latency_ms,
            "input_truncated": self.input_truncated,
            "output_truncated": self.output_truncated,
            "status": self.status,
            "fallback": self.fallback,
        }


@dataclass(frozen=True)
class LLMCallResult:
    """Result from an LLM invocation with API-verified model ID, level and latency."""

    model_used: str
    provider: str
    content: str
    parsed_json: dict[str, Any] | None
    latency_ms: float
    prompt_tokens: int
    completion_tokens: int
    fallback: bool = False
    error: str | None = None
    level: LLMLevel = "primary"
    provider_config_label: str = ""
    requested_model: str = ""
    http_status: int | None = None
    retryable: bool = True
    finish_reason: str | None = None
    reasoning_present: bool = False
    reasoning_chars: int = 0
    reasoning_tokens: int | None = None
    attempts: tuple[dict[str, Any], ...] = ()

    @property
    def ok(self) -> bool:
        """True when the HTTP call itself succeeded (independent of JSON validity)."""
        return self.error is None and self.level != "rule_based"

    @property
    def label(self) -> str:
        return label_model(self.model_used)

    def trace_meta(self) -> dict[str, Any]:
        """Fields every stage trace should carry for this call."""
        return {
            "llm_level": self.level,
            "provider_label": self.provider,
            "model_id": self.model_used,
            "label": self.label,
            "latency_ms": self.latency_ms,
            "fallback": self.fallback,
        }


def extract_final_answer(raw_content: str) -> str:
    """Extract final answer, discarding any inline <think> reasoning blocks."""
    text = raw_content.strip()
    cleaned = re.sub(r"<think>[\s\S]*?</think>", "", text).strip()
    if cleaned:
        return cleaned
    return text


def parse_clean_json(text: str) -> dict[str, Any] | None:
    """Robustly parse a JSON object from the final answer text."""
    final_text = extract_final_answer(text)
    try:
        val = json.loads(final_text)
        return val if isinstance(val, dict) else None
    except Exception:
        pass

    match = re.search(r"\{[\s\S]*\}", final_text)
    if match:
        try:
            val = json.loads(match.group(0))
            return val if isinstance(val, dict) else None
        except Exception:
            pass
    return None


def _content_to_text(content: Any) -> str:
    if isinstance(content, str):
        return content
    if isinstance(content, list):
        parts = [p.get("text", "") for p in content if isinstance(p, dict)]
        return "".join(str(p) for p in parts)
    return ""


# ---------------------------------------------------------------------------
# Client
# ---------------------------------------------------------------------------


class MetaLLMClient:
    """Client for OpenAI-compatible endpoints with a primary -> fallback -> rule-based chain."""

    def __init__(
        self,
        api_key: str | None = None,
        *,
        endpoints: Sequence[LLMEndpoint] | None = None,
    ) -> None:
        self.settings = get_settings()
        if endpoints is not None:
            self._endpoints = list(endpoints)
        elif api_key is not None:
            # Test hook: override the primary key only and disable the fallback level.
            primary = _endpoint_from_settings(self.settings, "primary")
            if api_key and primary is not None:
                self._endpoints = [
                    LLMEndpoint(
                        level="primary",
                        base_url=primary.base_url,
                        model=primary.model,
                        provider_label=primary.provider_label,
                        api_key=api_key,
                    )
                ]
            else:
                self._endpoints = []
        else:
            self._endpoints = [
                ep
                for ep in (_endpoint_from_settings(self.settings, lvl) for lvl in CHAIN_ORDER)
                if ep is not None
            ]

    # -- configuration ------------------------------------------------------

    def endpoints(self, levels: Sequence[ModelLevel] = CHAIN_ORDER) -> list[LLMEndpoint]:
        return [ep for lvl in levels for ep in self._endpoints if ep.level == lvl]

    def endpoint(self, level: ModelLevel) -> LLMEndpoint | None:
        found = self.endpoints((level,))
        return found[0] if found else None

    def is_live_api_configured(self) -> bool:
        """Return True only if at least one model level is configured."""
        return bool(self._endpoints)

    def _secrets(self) -> list[str]:
        return [ep.api_key for ep in self._endpoints]

    def _redact(self, text: str) -> str:
        return redact_secrets(text, self._secrets())

    # -- single call --------------------------------------------------------

    async def call_endpoint(
        self,
        endpoint: LLMEndpoint,
        *,
        messages: list[dict[str, Any]],
        temperature: float = 0.0,
        max_tokens: int = 1024,
        timeout_sec: float | None = None,
        extra_body: dict[str, Any] | None = None,
    ) -> LLMCallResult:
        """Make exactly one chat completion call. Never raises; errors are redacted."""
        start = time.perf_counter()
        timeout = float(timeout_sec if timeout_sec is not None else self.settings.LLM_TIMEOUT_SECONDS)
        url = f"{endpoint.base_url.rstrip('/')}/chat/completions"
        payload: dict[str, Any] = {
            "model": endpoint.model,
            "temperature": temperature,
            "max_tokens": max_tokens,
            "messages": messages,
        }
        if extra_body:
            payload.update(extra_body)

        def _failure(error: str, status: int | None, retryable: bool) -> LLMCallResult:
            return LLMCallResult(
                model_used="none",
                provider=endpoint.display(call_succeeded=False),
                content="",
                parsed_json=None,
                latency_ms=round((time.perf_counter() - start) * 1000.0, 2),
                prompt_tokens=0,
                completion_tokens=0,
                fallback=False,
                error=self._redact(error),
                level=endpoint.level,
                provider_config_label=endpoint.provider_label,
                requested_model=endpoint.model,
                http_status=status,
                retryable=retryable,
            )

        try:
            async with httpx.AsyncClient(timeout=timeout) as client:
                resp = await client.post(
                    url,
                    headers={
                        "Authorization": f"Bearer {endpoint.api_key}",
                        "Content-Type": "application/json",
                    },
                    json=payload,
                )
        except httpx.TimeoutException as exc:
            return _failure(f"timeout after {timeout:.0f}s ({type(exc).__name__})", None, True)
        except httpx.HTTPError as exc:
            return _failure(f"{type(exc).__name__}: {exc}", None, True)

        if resp.status_code >= 400:
            body = resp.text[:300].replace("\n", " ")
            return _failure(
                f"HTTP {resp.status_code}: {body}",
                resp.status_code,
                resp.status_code not in _NON_RETRYABLE_STATUS,
            )

        try:
            data = resp.json()
        except ValueError:
            return _failure(f"HTTP {resp.status_code}: response is not JSON", resp.status_code, True)

        choices = data.get("choices") or []
        first_choice = choices[0] if choices else {}
        message_data = first_choice.get("message") or {}
        raw_content = _content_to_text(message_data.get("content"))
        reasoning = message_data.get("reasoning_content") or message_data.get("reasoning") or ""
        if not isinstance(reasoning, str):
            reasoning = json.dumps(reasoning)
        usage = data.get("usage") or {}
        details = usage.get("completion_tokens_details") or {}
        reasoning_tokens = details.get("reasoning_tokens") if isinstance(details, dict) else None

        # Model id must come from the response JSON, never from configuration.
        returned_model = str(data.get("model") or "unknown (not returned by API)")
        return LLMCallResult(
            model_used=returned_model,
            provider=endpoint.display(call_succeeded=True),
            content=raw_content,
            parsed_json=parse_clean_json(raw_content) if raw_content.strip() else None,
            latency_ms=round((time.perf_counter() - start) * 1000.0, 2),
            prompt_tokens=int(usage.get("prompt_tokens") or 0),
            completion_tokens=int(usage.get("completion_tokens") or 0),
            fallback=False,
            level=endpoint.level,
            provider_config_label=endpoint.provider_label,
            requested_model=endpoint.model,
            http_status=resp.status_code,
            finish_reason=first_choice.get("finish_reason"),
            reasoning_present=bool(reasoning.strip()),
            reasoning_chars=len(reasoning),
            reasoning_tokens=int(reasoning_tokens) if isinstance(reasoning_tokens, int) else None,
        )

    # -- chain --------------------------------------------------------------

    async def run_chain(
        self,
        *,
        build_messages: Callable[[bool], list[dict[str, Any]]],
        levels: Sequence[ModelLevel] = CHAIN_ORDER,
        temperature: float = 0.0,
        max_tokens: int = 1024,
        timeout_sec: float | None = None,
        validate: Callable[[dict[str, Any]], object] | None = None,
    ) -> LLMCallResult:
        """Try each level with the configured timeout and one retry, then return rule_based.

        `build_messages(is_retry_after_bad_json)` builds the chat messages for one attempt.
        `validate` may raise to reject a parsed JSON answer (counts as a failed attempt).
        """
        start = time.perf_counter()
        attempts: list[dict[str, Any]] = []

        for endpoint in self.endpoints(levels):
            bad_json = False
            for attempt in range(1 + RETRIES_PER_LEVEL):
                res = await self.call_endpoint(
                    endpoint,
                    messages=build_messages(bad_json),
                    temperature=temperature,
                    max_tokens=max_tokens,
                    timeout_sec=timeout_sec,
                )
                failure: str | None = res.error
                if failure is None:
                    if res.parsed_json is None:
                        failure = (
                            "empty final answer (finish_reason="
                            f"{res.finish_reason}, reasoning_present={res.reasoning_present})"
                            if not res.content.strip()
                            else "final answer is not valid JSON"
                        )
                        bad_json = True
                    elif validate is not None:
                        try:
                            validate(res.parsed_json)
                        except Exception as exc:
                            failure = self._redact(f"schema validation failed: {str(exc)[:200]}")
                            bad_json = True

                if failure is None:
                    attempts.append(
                        {"level": endpoint.level, "attempt": attempt + 1, "ok": True, "latency_ms": res.latency_ms}
                    )
                    return _with_attempts(res, attempts)

                attempts.append(
                    {
                        "level": endpoint.level,
                        "attempt": attempt + 1,
                        "ok": False,
                        "http_status": res.http_status,
                        "latency_ms": res.latency_ms,
                        "error": failure,
                    }
                )
                logger.warning(
                    "llm_level_attempt_failed",
                    level=endpoint.level,
                    attempt=attempt + 1,
                    http_status=res.http_status,
                    error=failure,
                )
                if res.error is not None and not res.retryable:
                    break

        latency_ms = round((time.perf_counter() - start) * 1000.0, 2)
        if attempts:
            summary = "; ".join(f"{a['level']}#{a['attempt']}: {a.get('error')}" for a in attempts)
        else:
            summary = "No LLM level configured"
        return LLMCallResult(
            model_used="none",
            provider="local_fallback",
            content="",
            parsed_json=None,
            latency_ms=latency_ms,
            prompt_tokens=0,
            completion_tokens=0,
            fallback=True,
            error=summary,
            level="rule_based",
            attempts=tuple(attempts),
        )

    async def complete_json(
        self,
        *,
        system_prompt: str,
        user_message: str,
        temperature: float = 0.0,
        max_tokens: int = 1024,
        timeout_sec: float | None = None,
        validate: Callable[[dict[str, Any]], object] | None = None,
        levels: Sequence[ModelLevel] = CHAIN_ORDER,
    ) -> LLMCallResult:
        """Complete a prompt expecting a JSON object through primary -> fallback -> rule_based."""

        def _build(is_retry: bool) -> list[dict[str, Any]]:
            return [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_message + (_JSON_REMINDER if is_retry else "")},
            ]

        return await self.run_chain(
            build_messages=_build,
            levels=levels,
            temperature=temperature,
            max_tokens=max_tokens,
            timeout_sec=timeout_sec,
            validate=validate,
        )

    # -- status -------------------------------------------------------------

    async def _level_status(self, level: ModelLevel) -> dict[str, Any]:
        endpoint = self.endpoint(level)
        if endpoint is None:
            missing = missing_level_settings(self.settings, level)
            return {
                "level": level,
                "configured": False,
                "api_key": "set" if not any(m.endswith("API_KEY") for m in missing) else "not set",
                "provider_label": None,
                "requested_model": None,
                "response_model_id": None,
                "model_label": "none",
                "latency_ms": 0.0,
                "success": False,
                "error": f"not configured: missing {', '.join(missing)}",
            }
        res = await self.call_endpoint(
            endpoint,
            messages=[
                {"role": "system", "content": "Reply with the exact word PONG."},
                {"role": "user", "content": "PING"},
            ],
            max_tokens=64,
        )
        return {
            "level": level,
            "configured": True,
            "api_key": "set",
            "provider_label": res.provider,
            "requested_model": endpoint.model,
            "response_model_id": res.model_used if res.ok else None,
            "model_label": label_model(res.model_used) if res.ok else "none",
            "latency_ms": res.latency_ms,
            "success": res.ok,
            "error": res.error,
            "reasoning_output_present": res.reasoning_present if res.ok else None,
        }

    async def check_live_status(self) -> dict[str, Any]:
        """One tiny live call per level, run concurrently. Never exposes keys."""
        primary, fallback = await asyncio.gather(
            self._level_status("primary"), self._level_status("fallback")
        )
        return {
            "chain": ["primary", "fallback", "rule_based"],
            "timeout_seconds": float(self.settings.LLM_TIMEOUT_SECONDS),
            "retries_per_level": RETRIES_PER_LEVEL,
            "levels": {"primary": primary, "fallback": fallback},
        }

    def check_live_status_sync(self) -> dict[str, Any]:
        """Synchronous wrapper for CLI diagnostics. Never prints keys."""
        return asyncio.run(self.check_live_status())


def _with_attempts(res: LLMCallResult, attempts: list[dict[str, Any]]) -> LLMCallResult:
    from dataclasses import replace

    return replace(res, attempts=tuple(attempts))
