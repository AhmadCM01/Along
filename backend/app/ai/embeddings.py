"""Low-memory 768-D vector encoding engine (app/ai/embeddings.py - Section 8.5.1).

Deterministic, zero-network 768-dimensional character n-gram hashing and token stem
L2-normalized vector encoder so FAISS index building and query resolution execute in < 2 ms.
"""

from __future__ import annotations

import hashlib
import re
from typing import Sequence

import numpy as np

EMBEDDING_DIM = 768
_WORD_RE = re.compile(r"[a-z0-9]+")

# Domain synonym canonicalization for multilingual Abuja street terms
_CANONICAL_STEMS: dict[str, str] = {
    "1st": "first",
    "2nd": "second",
    "3rd": "third",
    "7th": "seventh",
    "kofar": "gate",
    "farko": "first",
    "biyu": "second",
    "gadar": "bridge",
    "gada": "bridge",
    "underbridge": "bridge",
    "flyover": "bridge",
    "kasuwar": "market",
    "kasuwa": "market",
    "tashar": "park",
    "tasha": "park",
    "garejin": "garage",
    "gidan": "station",
    "mai": "filling",
    "mararrabar": "junction",
    "zagayen": "roundabout",
    "bustop": "busstop",
    "deidei": "deidei",
    "karimo": "karmo",
    "galadima": "galadimawa",
    "charly": "charley",
    "rano": "aarano",
    "totalenergies": "total",
    "tiransifoma": "transformer",
}


def normalize_landmark_text(text: str) -> str:
    """Normalize punctuation, casing, and common Hausa/Pidgin/English street abbreviations."""
    lowered = text.lower().replace("-", " ").replace(".", "")
    tokens = _WORD_RE.findall(lowered)
    normalized_tokens = [_CANONICAL_STEMS.get(tok, tok) for tok in tokens]
    return " ".join(normalized_tokens)


def _deterministic_embed_single(text: str, dim: int = EMBEDDING_DIM) -> np.ndarray:
    """Compute a 768-D L2-normalized feature vector from word unigrams, bigrams, and char trigrams."""
    stripped = re.sub(r"^(passage|query):\s*", "", text.strip(), flags=re.IGNORECASE)
    primary_part = stripped.split("|")[0].strip()
    norm_primary = normalize_landmark_text(primary_part)
    norm_full = normalize_landmark_text(stripped)

    vec = np.zeros(dim, dtype=np.float32)
    primary_tokens = norm_primary.split()
    full_tokens = norm_full.split()

    def _accumulate(feature: str, weight: float) -> None:
        digest = hashlib.blake2b(feature.encode("utf-8"), digest_size=8).digest()
        h_int = int.from_bytes(digest, "little")
        idx1 = h_int % dim
        idx2 = (h_int >> 16) % dim
        sign1 = 1.0 if (h_int & (1 << 32)) else -1.0
        sign2 = 1.0 if (h_int & (1 << 33)) else -1.0
        vec[idx1] += sign1 * weight
        vec[idx2] += sign2 * (weight * 0.5)

    # High weight on primary alias tokens and bigrams
    for tok in primary_tokens:
        _accumulate(f"w:{tok}", 3.2)
        padded = f"<{tok}>"
        for i in range(max(0, len(padded) - 2)):
            _accumulate(f"c3:{padded[i:i+3]}", 0.9)
        for i in range(max(0, len(padded) - 3)):
            _accumulate(f"c4:{padded[i:i+4]}", 1.1)

    for i in range(len(primary_tokens) - 1):
        _accumulate(f"bg:{primary_tokens[i]}_{primary_tokens[i+1]}", 2.6)

    # Contextual metadata tokens (canonical name, area, kind)
    for tok in full_tokens:
        _accumulate(f"ctx:{tok}", 0.8)

    norm = float(np.linalg.norm(vec))
    if norm > 1e-8:
        vec /= norm
    else:
        vec[0] = 1.0
    return vec


class EmbeddingEngine:
    """768-dimensional character n-gram hashing engine with unit-norm output."""

    def __init__(self, model_name: str = "character_ngram_hash_768d") -> None:
        self.model_name = model_name
        self.dim = EMBEDDING_DIM

    def embed_passages(self, passages: Sequence[str]) -> np.ndarray:
        """Embed a batch of passage strings into a (N, 768) float32 L2-normalized matrix."""
        if not passages:
            return np.zeros((0, self.dim), dtype=np.float32)
        rows = [_deterministic_embed_single(f"passage: {p}", self.dim) for p in passages]
        return np.vstack(rows).astype(np.float32)

    def embed_query(self, query: str) -> np.ndarray:
        """Embed a single query mention into a (768,) float32 L2-normalized vector."""
        return _deterministic_embed_single(f"query: {query}", self.dim)


_default_engine: EmbeddingEngine | None = None


def get_embedding_engine() -> EmbeddingEngine:
    """Return singleton EmbeddingEngine instance."""
    global _default_engine
    if _default_engine is None:
        _default_engine = EmbeddingEngine()
    return _default_engine


def embed_text(query: str) -> np.ndarray:
    """Embed a single text string into a 768-D L2-normalized vector."""
    return get_embedding_engine().embed_query(query)

