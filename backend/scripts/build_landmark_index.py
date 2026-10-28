"""CLI script to build and persist the Abuja FAISS landmark index (`scripts/build_landmark_index.py`)."""

from __future__ import annotations

import json
import time
from pathlib import Path

from app.ai.landmarks.builder import build_index_from_catalog
from app.ai.landmarks.index import LandmarkVectorIndex
from app.core.logging import get_logger

logger = get_logger("along.faiss_build")

DEFAULT_FAISS_DIR = Path(__file__).resolve().parents[2] / "data" / "faiss"


def main() -> None:
    t0 = time.perf_counter()
    index = build_index_from_catalog(persist_dir=DEFAULT_FAISS_DIR)
    build_ms = round((time.perf_counter() - t0) * 1000.0, 2)

    t1 = time.perf_counter()
    reloaded = LandmarkVectorIndex.load(DEFAULT_FAISS_DIR, version=index.version)
    load_ms = round((time.perf_counter() - t1) * 1000.0, 2)

    summary = {
        "version": reloaded.version,
        "n_vectors": reloaded.size,
        "build_ms": build_ms,
        "hot_load_ms": load_ms,
        "artifact_dir": str(DEFAULT_FAISS_DIR / reloaded.version),
    }
    logger.info("landmark_index_built", **summary)
    print(json.dumps(summary, indent=2))


if __name__ == "__main__":
    main()
