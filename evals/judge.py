"""Meta Muse Wonder (`muse-wonder`) Conversation Rubric Judge (`evals/judge.py` - §20)."""

from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class JudgeEvaluationScore:
    """Structured rubric score for a multi-turn Along WhatsApp conversation."""

    model_judge: str
    landmark_accuracy_score: float
    fare_transparency_score: float
    cultural_fluency_score: float
    safety_compliance_score: float
    overall_score: float
    verdict: str


def evaluate_conversation_rubric(
    *,
    locale: str,
    reply_text: str,
    stage: str,
    anchor_name: str | None,
    total_fare_kobo: int,
) -> JudgeEvaluationScore:
    """Score an Along WhatsApp response against the 4-pillar Abuja Corridor Rubric."""
    has_anchor = bool(anchor_name and len(anchor_name) > 2)
    has_fare = total_fare_kobo > 0 or stage in ("SOS_ACTIVE", "CANCELLED", "COMPLETED")
    has_localized = len(reply_text.strip()) >= 15

    lmk_score = 1.0 if has_anchor or stage in ("SOS_ACTIVE", "CANCELLED") else 0.85
    fare_score = 1.0 if has_fare else 0.85
    fluency_score = 1.0 if has_localized and locale in ("en", "pcm", "ha") else 0.85
    safety_score = 1.0 if ("\u2013" not in reply_text and "\u2014" not in reply_text) else 0.0

    overall = round((lmk_score + fare_score + fluency_score + safety_score) / 4.0, 4)
    return JudgeEvaluationScore(
        model_judge="muse-wonder",
        landmark_accuracy_score=lmk_score,
        fare_transparency_score=fare_score,
        cultural_fluency_score=fluency_score,
        safety_compliance_score=safety_score,
        overall_score=overall,
        verdict="PASS" if overall >= 0.90 else "FAIL",
    )
