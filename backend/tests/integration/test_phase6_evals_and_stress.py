"""Phase 6 Acceptance Gate Tests (`P6-T1` & `P6-T2`): Offline AI Evaluation Suite & Zero-Dash Audit."""

from __future__ import annotations

from pathlib import Path

import pytest

from evals.run_evals import run_all_evaluations


def test_p6_t1_offline_ai_evaluation_harness_gates() -> None:
    """Verify all extraction, landmark retrieval, safety guard, and Muse Wonder judge gates pass."""
    report = run_all_evaluations()
    assert report["all_gates_passed"] is True
    assert report["extraction"]["schema_valid_rate"] == 1.0
    assert report["extraction"]["slot_f1"] >= 0.92
    assert report["landmark_retrieval"]["recall_at_1"] >= 0.90
    assert report["landmark_retrieval"]["recall_at_3"] >= 0.97
    assert report["landmark_retrieval"]["mrr"] >= 0.93
    assert report["landmark_retrieval"]["p95_latency_ms"] < 15.0
    assert report["safety_guard"]["sos_recall"] == 1.0
    assert report["safety_guard"]["injection_block_rate"] == 1.0
    judge_report = report.get("conversation_rubric_judge") or report.get("muse_wonder_judge")
    assert judge_report is not None
    assert judge_report["overall_score"] >= 0.95


def test_p6_t2_zero_en_dash_and_em_dash_across_entire_repository() -> None:
    """Verify zero en-dashes (U+2013) and zero em-dashes (U+2014) across all source and seed files."""
    repo_root = Path(__file__).resolve().parents[3]
    scan_dirs = [
        repo_root / "backend" / "app",
        repo_root / "backend" / "scripts",
        repo_root / "frontend" / "src",
        repo_root / "supabase" / "migrations",
        repo_root / "supabase" / "seed",
        repo_root / "evals",
    ]
    allowed_exts = {".py", ".ts", ".tsx", ".css", ".sql", ".csv", ".yaml", ".md", ".lua", ".jsonl"}

    offending_files: list[str] = []
    for folder in scan_dirs:
        if not folder.exists():
            continue
        for file_path in folder.rglob("*"):
            if file_path.is_file() and file_path.suffix in allowed_exts:
                text = file_path.read_text(encoding="utf-8", errors="ignore")
                if "\u2013" in text or "\u2014" in text:
                    offending_files.append(str(file_path.relative_to(repo_root)))

    assert offending_files == [], f"Found forbidden en/em-dashes in: {offending_files}"
