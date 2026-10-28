"""Hybrid FAISS Cosine + Jaro-Winkler + Popularity reranker (`app/ai/landmarks/hybrid.py` - §8.5.3).

Formula:
  S(q, L) = 0.65 * cos(e_q, e_alias) + 0.25 * JaroWinkler(q_norm, alias_norm) + 0.10 * popularity(L)
"""

from __future__ import annotations

from dataclasses import dataclass

from app.ai.embeddings import normalize_landmark_text
from app.ai.landmarks.builder import get_active_landmark_index
from app.ai.landmarks.index import AliasVectorEntry, LandmarkVectorIndex

try:
    from rapidfuzz.distance import JaroWinkler  # type: ignore[import-untyped]
except ImportError:
    JaroWinkler = None


@dataclass(frozen=True, slots=True)
class LandmarkCandidateScore:
    """Reranked landmark candidate with full telemetry breakdown for the Ops AI X-Ray."""

    landmark_id: str
    corridor_id: str
    zone_id: str
    canonical_name: str
    matched_alias: str
    kind: str
    area: str
    km_marker: int
    lat: float
    lng: float
    is_drop_point: bool
    cosine_score: float
    jaro_winkler_score: float
    popularity_score: float
    final_score: float


def jaro_winkler_similarity(s1: str, s2: str) -> float:
    """Compute normalized Jaro-Winkler similarity in [0.0, 1.0]."""
    if not s1 or not s2:
        return 0.0
    if s1 == s2:
        return 1.0
    if JaroWinkler is not None:
        return float(JaroWinkler.normalized_similarity(s1, s2))

    # Pure-Python exact Jaro-Winkler fallback
    len1, len2 = len(s1), len(s2)
    match_distance = max(len1, len2) // 2 - 1
    if match_distance < 0:
        match_distance = 0

    s1_matches = [False] * len1
    s2_matches = [False] * len2
    matches = 0
    transpositions = 0

    for i in range(len1):
        start = max(0, i - match_distance)
        end = min(i + match_distance + 1, len2)
        for j in range(start, end):
            if s2_matches[j] or s1[i] != s2[j]:
                continue
            s1_matches[i] = True
            s2_matches[j] = True
            matches += 1
            break

    if matches == 0:
        return 0.0

    k = 0
    for i in range(len1):
        if not s1_matches[i]:
            continue
        while not s2_matches[k]:
            k += 1
        if s1[i] != s2[k]:
            transpositions += 1
        k += 1

    jaro = (
        (matches / len1) + (matches / len2) + ((matches - transpositions / 2.0) / matches)
    ) / 3.0
    prefix = 0
    for ch1, ch2 in zip(s1[:4], s2[:4]):
        if ch1 == ch2:
            prefix += 1
        else:
            break
    return min(1.0, jaro + prefix * 0.1 * (1.0 - jaro))


def _score_entry(
    q_norm: str,
    q_tokens: set[str],
    entry: AliasVectorEntry,
    raw_cosine: float,
) -> LandmarkCandidateScore:
    alias_norm = normalize_landmark_text(entry.alias)
    canon_norm = normalize_landmark_text(entry.canonical_name)

    jw_alias = jaro_winkler_similarity(q_norm, alias_norm)
    jw_canon = jaro_winkler_similarity(q_norm, canon_norm)
    jw = max(jw_alias, jw_canon)

    alias_tokens = set(alias_norm.split())
    # Exact normalized match or full token match boost so exact street aliases hit >= 0.90
    eff_cosine = raw_cosine
    if q_norm == alias_norm or q_norm == canon_norm:
        eff_cosine = max(eff_cosine, 0.98)
        jw = 1.0
    elif q_tokens and alias_tokens:
        overlap = len(q_tokens & alias_tokens) / max(1, len(q_tokens | alias_tokens))
        query_coverage = len(q_tokens & alias_tokens) / max(1, len(q_tokens))
        if overlap >= 1.0:
            eff_cosine = max(eff_cosine, 0.96)
            jw = max(jw, 0.96)
        elif query_coverage >= 1.0 and len(alias_tokens) <= len(q_tokens) + 1:
            eff_cosine = max(eff_cosine, 0.90)
            jw = max(jw, 0.88)
        elif overlap >= 0.66:
            eff_cosine = max(eff_cosine, 0.78)

    pop = float(max(0.0, min(1.0, entry.popularity)))
    final = 0.65 * eff_cosine + 0.25 * jw + 0.10 * pop

    return LandmarkCandidateScore(
        landmark_id=entry.landmark_id,
        corridor_id=entry.corridor_id,
        zone_id=entry.zone_id,
        canonical_name=entry.canonical_name,
        matched_alias=entry.alias,
        kind=entry.kind,
        area=entry.area,
        km_marker=entry.km_marker,
        lat=entry.lat,
        lng=entry.lng,
        is_drop_point=entry.is_drop_point,
        cosine_score=round(eff_cosine, 4),
        jaro_winkler_score=round(jw, 4),
        popularity_score=round(pop, 4),
        final_score=round(min(1.0, final), 4),
    )


def hybrid_search_landmarks(
    query: str,
    corridor_hint: str | None = None,
    top_k: int = 5,
    index: LandmarkVectorIndex | None = None,
) -> list[LandmarkCandidateScore]:
    """Retrieve and rerank Abuja landmarks using FAISS Cosine + Jaro-Winkler + Popularity."""
    cleaned = query.strip()
    if not cleaned:
        return []

    idx = index or get_active_landmark_index()
    q_norm = normalize_landmark_text(cleaned)
    q_tokens = set(q_norm.split())

    # 1. Top 12 vector hits from FAISS / inner-product index (< 1ms)
    vec_hits = idx.search(cleaned, top_k=12)
    cosine_by_vec_id = {h.entry.vector_id: h.cosine_score for h in vec_hits}

    # 2. Fast exact-alias union across alias entries (< 0.1ms)
    candidate_entries: dict[int, AliasVectorEntry] = {h.entry.vector_id: h.entry for h in vec_hits}
    q_lower = cleaned.lower()
    for entry in idx.entries:
        if entry.vector_id in candidate_entries:
            continue
        if entry.alias.lower() == q_lower:
            candidate_entries[entry.vector_id] = entry

    best_by_landmark: dict[str, LandmarkCandidateScore] = {}
    for vec_id, entry in candidate_entries.items():
        cos_val = cosine_by_vec_id.get(vec_id, 0.55)
        scored = _score_entry(q_norm, q_tokens, entry, cos_val)

        # Slight tie-breaker preference for landmarks on the active corridor hint
        if corridor_hint and entry.corridor_id == corridor_hint:
            from dataclasses import replace as dc_replace
            scored = dc_replace(
                scored,
                final_score=round(min(1.0, scored.final_score + 0.025), 4),
            )

        prev = best_by_landmark.get(entry.landmark_id)
        if prev is None or scored.final_score > prev.final_score:
            best_by_landmark[entry.landmark_id] = scored

    ranked = sorted(
        best_by_landmark.values(),
        key=lambda c: (-c.final_score, -c.popularity_score, c.landmark_id),
    )
    return ranked[:top_k]
