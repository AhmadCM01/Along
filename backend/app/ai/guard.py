"""Safety Guardrails (app/ai/guard.py).

Two-tier architecture:
1. Fast rule-based safety gate (< 2ms deterministic regex):
   - SOS distress detection
   - Prompt injection and oversized payload blocking
2. LLM-based safety classification (using configured model / Muse Spark Open):
   - Executed after the rule-based gate when live API is configured
   - Falls back honestly with provider="local_fallback", model_used="none", fallback=True
"""

from __future__ import annotations

import re
import time
from dataclasses import dataclass
from typing import Any, Literal

from app.ai.llm import MetaLLMClient
from app.core.logging import get_logger

logger = get_logger(__name__)

GuardVerdict = Literal["SAFE", "SOS_TRIGGER", "BLOCKED"]

_SOS_REGEX = re.compile(
    r"\b(?:"
    r"sos|help\s+me|emergency|one\s*chance|kidnap|kidnapped|robbery|armed\s+robbers?|"
    r"driver\s+(?:refused\s+to\s+stop|locked\s+the\s+door|is\s+taking\s+another\s+road)|"
    r"abeg\s+help\s+me|dem\s+carry\s+me|save\s+my\s+life|taimakoo|taimako\s+na\s+shiga\s+uku"
    r")\b",
    re.I,
)

_INJECTION_REGEX = re.compile(
    r"(?:"
    r"ignore\s+(?:all\s+)?(?:previous|prior|above)\s+instructions|"
    r"system\s*prompt|you\s+are\s+now\s+dan|jailbreak|"
    r"drop\s+table\s+|union\s+select\s+|;\s*delete\s+from\s+|"
    r"<script\b|javascript:"
    r")",
    re.I,
)


@dataclass(frozen=True)
class SafetyCheckResult:
    """Result of the input safety guardrail check."""

    verdict: GuardVerdict
    reason: str
    latency_ms: float
    provider: str = "local_fallback"
    model_used: str = "none"
    fallback: bool = True
    matched_pattern: str | None = None
    llm_level: str = "rule_based"

    def to_dict(self) -> dict[str, Any]:
        return {
            "verdict": self.verdict,
            "reason": self.reason,
            "latency_ms": self.latency_ms,
            "provider": self.provider,
            "model_used": self.model_used,
            "fallback": self.fallback,
            "matched_pattern": self.matched_pattern,
            "llm_level": self.llm_level,
        }


def check_input_safety(text: str) -> SafetyCheckResult:
    """Evaluate rider input with the deterministic rule-based safety gate."""
    start = time.perf_counter()
    cleaned = (text or "").strip()

    if not cleaned:
        return SafetyCheckResult(
            verdict="BLOCKED",
            reason="Empty message payload",
            latency_ms=round((time.perf_counter() - start) * 1000.0, 3),
            provider="local_fallback",
            model_used="none",
            fallback=True,
        )

    if len(cleaned) > 1000:
        return SafetyCheckResult(
            verdict="BLOCKED",
            reason="Message exceeds 1000-character safety limit",
            latency_ms=round((time.perf_counter() - start) * 1000.0, 3),
            provider="local_fallback",
            model_used="none",
            fallback=True,
        )

    # 1. Check SOS / One-Chance distress first (highest life-safety priority)
    sos_match = _SOS_REGEX.search(cleaned)
    if sos_match:
        return SafetyCheckResult(
            verdict="SOS_TRIGGER",
            reason="Rider distress / SOS keyword detected",
            latency_ms=round((time.perf_counter() - start) * 1000.0, 3),
            provider="local_fallback",
            model_used="none",
            fallback=True,
            matched_pattern=sos_match.group(0),
        )

    # 2. Check adversarial prompt injection / SQLi / XSS
    inj_match = _INJECTION_REGEX.search(cleaned)
    if inj_match:
        return SafetyCheckResult(
            verdict="BLOCKED",
            reason="Adversarial prompt-injection or payload signature detected",
            latency_ms=round((time.perf_counter() - start) * 1000.0, 3),
            provider="local_fallback",
            model_used="none",
            fallback=True,
            matched_pattern=inj_match.group(0),
        )

    return SafetyCheckResult(
        verdict="SAFE",
        reason="Passed rule-based safety gate",
        latency_ms=round((time.perf_counter() - start) * 1000.0, 3),
        provider="local_fallback",
        model_used="none",
        fallback=True,
    )


async def check_safety_with_glimmer(
    text: str,
    llm_client: MetaLLMClient | None = None,
) -> SafetyCheckResult:
    """Run rule-based gate first, followed by secondary LLM safety classification if available."""
    start = time.perf_counter()
    rule_res = check_input_safety(text)
    if rule_res.verdict in ("SOS_TRIGGER", "BLOCKED"):
        return rule_res

    client = llm_client or MetaLLMClient()
    if client.is_live_api_configured():
        prompt = (
            "Analyze the commuter message for transit safety. "
            "Return JSON: {\"verdict\": \"SAFE\" | \"BLOCKED\" | \"SOS_TRIGGER\", \"reason\": \"<brief>\"}."
        )
        try:
            res = await client.complete_json(
                system_prompt=prompt,
                user_message=text,
                max_tokens=128,
                validate=lambda d: d["verdict"],
            )
            if res.parsed_json and "verdict" in res.parsed_json and res.level != "rule_based":
                verdict_raw = str(res.parsed_json["verdict"]).upper()
                verdict: GuardVerdict = (
                    "SOS_TRIGGER"
                    if "SOS" in verdict_raw
                    else "BLOCKED"
                    if "BLOCK" in verdict_raw
                    else "SAFE"
                )
                latency_ms = round((time.perf_counter() - start) * 1000.0, 3)
                return SafetyCheckResult(
                    verdict=verdict,
                    reason=str(res.parsed_json.get("reason", "Passed LLM safety evaluation")),
                    latency_ms=latency_ms,
                    provider=res.provider,
                    model_used=res.model_used,
                    fallback=False,
                    llm_level=res.level,
                )
        except Exception as exc:
            logger.warning("llm_safety_classification_failed_fallback", error=str(exc))

    return rule_res
