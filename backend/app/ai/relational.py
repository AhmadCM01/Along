"""Linear-referenced relational landmark resolver (`app/ai/relational.py` - §8.5.5).

Resolves expressions such as:
- "second transformer after Dutse first gate" -> LMK-DUT-TR2
- "filling station opposite Dawaki junction" -> nearest FILLING_STATION or Dawaki base
- "under Berger bridge" -> LMK-BER-RB
"""

from __future__ import annotations

from dataclasses import dataclass

from app.ai.landmarks.hybrid import LandmarkCandidateScore, hybrid_search_landmarks
from app.ai.schemas import RelationalRef
from app.db.models import DirectionCode
from scripts.seed import AbujaSeedCatalog, load_abuja_seed_catalog


@dataclass(frozen=True, slots=True)
class RelationalResolutionResult:
    """Result of resolving a RelationalRef along a corridor."""

    resolved: LandmarkCandidateScore | None
    base_landmark: LandmarkCandidateScore | None
    used_fallback_to_base: bool
    explanation: str


def resolve_relational_landmark(
    rel: RelationalRef,
    direction: DirectionCode = "S",
    corridor_hint: str | None = None,
    catalog: AbujaSeedCatalog | None = None,
) -> RelationalResolutionResult:
    """Resolve an ordinal/directional landmark relative to a base landmark using km_marker."""
    cat = catalog or load_abuja_seed_catalog()
    base_candidates = hybrid_search_landmarks(
        rel.base_landmark_mention,
        corridor_hint=corridor_hint,
        top_k=3,
    )
    if not base_candidates:
        return RelationalResolutionResult(
            resolved=None,
            base_landmark=None,
            used_fallback_to_base=False,
            explanation=f"Could not resolve base landmark {rel.base_landmark_mention!r}",
        )

    base = base_candidates[0]
    corr_landmarks = [
        lmk for lmk in cat.landmarks.values() if lmk.corridor_id == base.corridor_id
    ]

    relation = rel.relation.upper()
    target_kind = rel.target_kind.upper() if rel.target_kind else None
    ordinal = max(1, rel.ordinal)

    matches = []
    if relation in {"AFTER", "BEFORE"}:
        # In direction S, AFTER means increasing km_marker; in direction N, AFTER means decreasing
        move_increasing = (relation == "AFTER" and direction == "S") or (
            relation == "BEFORE" and direction == "N"
        )
        for lmk in corr_landmarks:
            if lmk.id == base.landmark_id:
                continue
            if target_kind and lmk.kind != target_kind:
                continue
            delta = lmk.km_marker - base.km_marker
            if move_increasing and 0 < delta <= 2500:
                matches.append((abs(delta), lmk))
            elif not move_increasing and -2500 <= delta < 0:
                matches.append((abs(delta), lmk))
        matches.sort(key=lambda item: item[0])
    else:
        # OPPOSITE / NEAR / UNDER -> within 350m of base km_marker
        for lmk in corr_landmarks:
            if target_kind and lmk.kind != target_kind:
                continue
            dist = abs(lmk.km_marker - base.km_marker)
            if dist <= 350:
                matches.append((dist, lmk))
        matches.sort(key=lambda item: item[0])

    if len(matches) >= ordinal:
        chosen = matches[ordinal - 1][1]
        resolved_score = LandmarkCandidateScore(
            landmark_id=chosen.id,
            corridor_id=chosen.corridor_id,
            zone_id=chosen.zone_id,
            canonical_name=chosen.canonical_name,
            matched_alias=f"{rel.relation} {base.canonical_name} (#{ordinal})",
            kind=chosen.kind,
            area=chosen.area or "",
            km_marker=chosen.km_marker,
            lat=chosen.lat,
            lng=chosen.lng,
            is_drop_point=chosen.is_drop_point,
            cosine_score=base.cosine_score,
            jaro_winkler_score=base.jaro_winkler_score,
            popularity_score=chosen.popularity,
            final_score=round(min(0.99, max(0.88, base.final_score)), 4),
        )
        return RelationalResolutionResult(
            resolved=resolved_score,
            base_landmark=base,
            used_fallback_to_base=False,
            explanation=(
                f"Resolved {rel.ordinal}x {target_kind or 'landmark'} {relation} "
                f"{base.canonical_name} -> {chosen.canonical_name} (km={chosen.km_marker}m)"
            ),
        )

    # Step 4 fallback: use base landmark so anchor snapping still succeeds cleanly
    return RelationalResolutionResult(
        resolved=base,
        base_landmark=base,
        used_fallback_to_base=True,
        explanation=(
            f"No exact {target_kind or 'sub-landmark'} #{ordinal} found {relation} "
            f"{base.canonical_name}; snapped relative to {base.canonical_name}"
        ),
    )
