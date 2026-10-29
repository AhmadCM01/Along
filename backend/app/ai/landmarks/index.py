"""In-process FAISS / NumPy inner-product vector index with hot-reload support (§8.5.2)."""

from __future__ import annotations

import json
from dataclasses import dataclass
from pathlib import Path
from typing import Any

import numpy as np

from app.ai.embeddings import EMBEDDING_DIM, get_embedding_engine
from app.core.config import get_settings

try:
    import faiss  # type: ignore[import-untyped]
except ImportError:
    faiss = None


@dataclass(frozen=True, slots=True)
class AliasVectorEntry:
    """Metadata mapped to a single vector ID in the landmark index."""

    vector_id: int
    landmark_id: str
    corridor_id: str
    zone_id: str
    canonical_name: str
    alias: str
    locale: str
    weight: float
    km_marker: int
    kind: str
    lat: float
    lng: float
    area: str
    popularity: float
    is_drop_point: bool


@dataclass(frozen=True, slots=True)
class VectorSearchHit:
    """Raw cosine similarity hit from the vector index."""

    entry: AliasVectorEntry
    cosine_score: float


class LandmarkVectorIndex:
    """Exact inner-product (cosine similarity on unit vectors) index over Abuja landmark aliases."""

    def __init__(
        self,
        version: str,
        vectors: np.ndarray,
        entries: list[AliasVectorEntry],
    ) -> None:
        self.version = version
        self.vectors = np.ascontiguousarray(vectors, dtype=np.float32)
        self.entries = entries
        self._faiss_index: Any = None
        if faiss is not None and len(entries) > 0:
            base_idx = faiss.IndexFlatIP(EMBEDDING_DIM)
            id_idx = faiss.IndexIDMap2(base_idx)
            ids = np.arange(len(entries), dtype=np.int64)
            id_idx.add_with_ids(self.vectors, ids)
            self._faiss_index = id_idx

    @property
    def size(self) -> int:
        return len(self.entries)

    def search(self, query_text: str, top_k: int = 15) -> list[VectorSearchHit]:
        """Search top-K alias vectors by exact inner product (cosine similarity)."""
        if not self.entries:
            return []
        k = min(top_k, len(self.entries))
        q_vec = get_embedding_engine().embed_query(query_text)

        if self._faiss_index is not None:
            q_mat = np.expand_dims(q_vec, axis=0)
            scores, indices = self._faiss_index.search(q_mat, k)
            hits: list[VectorSearchHit] = []
            for score, idx in zip(scores[0], indices[0]):
                if 0 <= int(idx) < len(self.entries):
                    hits.append(
                        VectorSearchHit(
                            entry=self.entries[int(idx)],
                            cosine_score=float(max(0.0, min(1.0, score))),
                        )
                    )
            return hits

        # Exact matrix inner product (identical mathematically to faiss.IndexFlatIP)
        raw_scores: np.ndarray = self.vectors @ q_vec
        top_indices = np.argsort(-raw_scores)[:k]
        return [
            VectorSearchHit(
                entry=self.entries[int(idx)],
                cosine_score=float(max(0.0, min(1.0, raw_scores[int(idx)]))),
            )
            for idx in top_indices
        ]

    def save(self, artifact_dir: Path) -> Path:
        """Persist vectors, metadata.json, and manifest.json to disk."""
        target_dir = artifact_dir / self.version
        target_dir.mkdir(parents=True, exist_ok=True)
        np.save(target_dir / "vectors.npy", self.vectors)
        if self._faiss_index is not None:
            faiss.write_index(self._faiss_index, str(target_dir / "landmarks.faiss"))

        metadata_rows = [
            {
                "vector_id": e.vector_id,
                "landmark_id": e.landmark_id,
                "corridor_id": e.corridor_id,
                "zone_id": e.zone_id,
                "canonical_name": e.canonical_name,
                "alias": e.alias,
                "locale": e.locale,
                "weight": e.weight,
                "km_marker": e.km_marker,
                "kind": e.kind,
                "lat": e.lat,
                "lng": e.lng,
                "area": e.area,
                "popularity": e.popularity,
                "is_drop_point": e.is_drop_point,
            }
            for e in self.entries
        ]
        (target_dir / "metadata.json").write_text(
            json.dumps(metadata_rows, indent=2), encoding="utf-8"
        )
        manifest = {
            "version": self.version,
            "dim": EMBEDDING_DIM,
            "n_vectors": len(self.entries),
            "embedding_model": getattr(get_settings(), "EMBEDDING_MODEL", "deterministic-ngram-768d"),
        }
        (target_dir / "manifest.json").write_text(
            json.dumps(manifest, indent=2), encoding="utf-8"
        )
        (artifact_dir / "latest_version.txt").write_text(self.version, encoding="utf-8")
        return target_dir

    @classmethod
    def load(cls, artifact_dir: Path, version: str | None = None) -> LandmarkVectorIndex:
        """Load persisted index artifact from disk."""
        eff_version = version
        if eff_version is None:
            latest_file = artifact_dir / "latest_version.txt"
            if not latest_file.exists():
                raise FileNotFoundError(f"No latest_version.txt in {artifact_dir}")
            eff_version = latest_file.read_text(encoding="utf-8").strip()

        target_dir = artifact_dir / eff_version
        vectors = np.load(target_dir / "vectors.npy")
        raw_meta = json.loads((target_dir / "metadata.json").read_text(encoding="utf-8"))
        entries = [AliasVectorEntry(**row) for row in raw_meta]
        return cls(version=eff_version, vectors=vectors, entries=entries)
