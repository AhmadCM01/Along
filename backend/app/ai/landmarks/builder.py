"""Builder for the in-process Abuja landmark vector index (`app/ai/landmarks/builder.py`)."""

from __future__ import annotations

import hashlib
from pathlib import Path

from app.ai.embeddings import get_embedding_engine
from app.ai.landmarks.index import AliasVectorEntry, LandmarkVectorIndex
from scripts.seed import AbujaSeedCatalog, load_abuja_seed_catalog

_ACTIVE_INDEX: LandmarkVectorIndex | None = None


def build_index_from_catalog(
    catalog: AbujaSeedCatalog | None = None,
    persist_dir: Path | None = None,
) -> LandmarkVectorIndex:
    """Build a LandmarkVectorIndex from all seeded Abuja landmarks and aliases."""
    cat = catalog or load_abuja_seed_catalog()
    engine = get_embedding_engine()

    entries: list[AliasVectorEntry] = []
    passages: list[str] = []
    hasher = hashlib.sha256()
    hasher.update(engine.model_name.encode("utf-8"))

    vec_id = 0
    for lmk_id in sorted(cat.landmarks.keys()):
        lmk = cat.landmarks[lmk_id]
        for alias_text, locale_code, weight in lmk.aliases:
            passage = f"{alias_text} | {lmk.canonical_name} ({lmk.area or ''}, {lmk.kind})"
            passages.append(passage)
            hasher.update(f"{lmk.id}:{alias_text}:{locale_code}\n".encode("utf-8"))
            entries.append(
                AliasVectorEntry(
                    vector_id=vec_id,
                    landmark_id=lmk.id,
                    corridor_id=lmk.corridor_id,
                    zone_id=lmk.zone_id,
                    canonical_name=lmk.canonical_name,
                    alias=alias_text,
                    locale=locale_code,
                    weight=weight,
                    km_marker=lmk.km_marker,
                    kind=lmk.kind,
                    lat=lmk.lat,
                    lng=lmk.lng,
                    area=lmk.area or "",
                    popularity=lmk.popularity,
                    is_drop_point=lmk.is_drop_point,
                )
            )
            vec_id += 1

    version = f"v1_{hasher.hexdigest()[:12]}"
    vectors = engine.embed_passages(passages)
    index = LandmarkVectorIndex(version=version, vectors=vectors, entries=entries)

    if persist_dir is not None:
        index.save(persist_dir)

    global _ACTIVE_INDEX
    _ACTIVE_INDEX = index
    return index


def get_active_landmark_index() -> LandmarkVectorIndex:
    """Return active in-memory LandmarkVectorIndex, building on first access if needed."""
    global _ACTIVE_INDEX
    if _ACTIVE_INDEX is None:
        _ACTIVE_INDEX = build_index_from_catalog()
    return _ACTIVE_INDEX
