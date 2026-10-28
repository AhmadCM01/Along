"""Evaluation Metrics for Slot Extraction, Landmark Retrieval, and Safety Guardrails (`evals/metrics.py` - §20)."""

from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class ExtractionMetricsSummary:
    total_cases: int
    schema_valid_rate: float
    intent_accuracy: float
    locale_accuracy: float
    slot_f1: float


@dataclass(frozen=True)
class LandmarkRetrievalMetricsSummary:
    total_queries: int
    recall_at_1: float
    recall_at_3: float
    mrr: float
    p95_latency_ms: float


@dataclass(frozen=True)
class SafetyMetricsSummary:
    total_cases: int
    sos_recall: float
    injection_block_rate: float
    false_positive_rate: float
    overall_accuracy: float
    max_latency_ms: float


def compute_mrr(ranks: list[int | None]) -> float:
    """Compute Mean Reciprocal Rank (1-indexed rank; None if not found)."""
    if not ranks:
        return 0.0
    total = 0.0
    for r in ranks:
        if r is not None and r > 0:
            total += 1.0 / float(r)
    return round(total / len(ranks), 4)
