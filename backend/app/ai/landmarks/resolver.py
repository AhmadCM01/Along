"""End-to-end Landmark -> Corridor -> Virtual Anchor Point -> Zone Fare Resolver (`app/ai/landmarks/resolver.py`)."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Literal

from app.ai.landmarks.hybrid import LandmarkCandidateScore, hybrid_search_landmarks
from app.ai.relational import resolve_relational_landmark
from app.ai.schemas import RelationalRef
from app.core.errors import ShortTripError
from app.core.money import format_naira
from app.db.models import DirectionCode
from app.matching.anchors import AnchorSnapResult, snap_to_anchor
from app.matching.corridor import haversine_distance_m, infer_corridor_direction
from scripts.seed import AbujaSeedCatalog, load_abuja_seed_catalog

HIGH_CONFIDENCE_MIN = 0.80
MARGIN_MIN = 0.08
MEDIUM_CONFIDENCE_MIN = 0.58

ResolutionConfidenceStatus = Literal["HIGH", "DISAMBIGUATE", "UNRESOLVED"]


@dataclass(frozen=True, slots=True)
class SingleMentionResolution:
    """Resolution status and candidate list for a single origin or destination mention."""

    status: ResolutionConfidenceStatus
    best: LandmarkCandidateScore | None
    candidates: list[LandmarkCandidateScore] = field(default_factory=list)
    explanation: str = ""


@dataclass(frozen=True, slots=True)
class RouteResolutionQuote:
    """Complete resolved route, snapped Virtual Anchor Point, and dynamic zone fare."""

    status: Literal[
        "COMPLETE",
        "DISAMBIGUATE_ORIGIN",
        "DISAMBIGUATE_DEST",
        "MISSING_ORIGIN",
        "MISSING_DEST",
        "OUT_OF_RADIUS_ANCHOR",
        "SHORT_TRIP",
    ]
    corridor_id: str
    direction: DirectionCode
    origin: SingleMentionResolution
    destination: SingleMentionResolution
    anchor_snap: AnchorSnapResult | None
    standard_fare_kobo: int
    peak_fare_kobo: int
    active_fare_kobo: int
    solo_ridehail_est_kobo: int
    fare_naira: str
    savings_pct: int


def resolve_landmark_mention(
    mention: str | None,
    relational: RelationalRef | None = None,
    direction_hint: DirectionCode = "S",
    corridor_hint: str | None = None,
) -> SingleMentionResolution:
    """Resolve a landmark mention (or relational description) with §8.5.4 confidence thresholds."""
    if relational is not None:
        rel_res = resolve_relational_landmark(
            relational,
            direction=direction_hint,
            corridor_hint=corridor_hint,
        )
        if rel_res.resolved is not None:
            return SingleMentionResolution(
                status="HIGH",
                best=rel_res.resolved,
                candidates=[rel_res.resolved],
                explanation=rel_res.explanation,
            )

    if not mention or not mention.strip():
        return SingleMentionResolution(status="UNRESOLVED", best=None, candidates=[])

    candidates = hybrid_search_landmarks(mention, corridor_hint=corridor_hint, top_k=5)
    if not candidates:
        return SingleMentionResolution(status="UNRESOLVED", best=None, candidates=[])

    s1 = candidates[0].final_score
    s2 = candidates[1].final_score if len(candidates) > 1 else 0.0

    # If top 2 candidates are in the exact same zone and within 450m physical distance
    # (e.g. Dutse First Gate across intersecting corridors or adjacent A.A. Rano station),
    # treat as unambiguous HIGH confidence when s1 >= 0.80.
    same_hub = (
        len(candidates) > 1
        and candidates[0].zone_id == candidates[1].zone_id
        and haversine_distance_m(
            candidates[0].lat,
            candidates[0].lng,
            candidates[1].lat,
            candidates[1].lng,
        )
        <= 450.0
    )

    if s1 >= HIGH_CONFIDENCE_MIN and ((s1 - s2) >= MARGIN_MIN or same_hub):
        return SingleMentionResolution(
            status="HIGH",
            best=candidates[0],
            candidates=candidates,
            explanation=f"Auto-resolved {mention!r} -> {candidates[0].canonical_name} ({s1:.2f})",
        )

    if s1 >= MEDIUM_CONFIDENCE_MIN:
        return SingleMentionResolution(
            status="DISAMBIGUATE",
            best=candidates[0],
            candidates=candidates[:3],
            explanation=f"Ambiguous match for {mention!r} (top={s1:.2f}, runner_up={s2:.2f})",
        )

    return SingleMentionResolution(
        status="UNRESOLVED",
        best=None,
        candidates=candidates[:3],
        explanation=f"Low confidence ({s1:.2f} < {MEDIUM_CONFIDENCE_MIN}) for {mention!r}",
    )


def _select_shared_corridor(
    orig: LandmarkCandidateScore,
    dest: LandmarkCandidateScore,
    catalog: AbujaSeedCatalog,
) -> str:
    """Choose the best connecting corridor for an origin and destination zone pair."""
    if orig.corridor_id == dest.corridor_id:
        return orig.corridor_id
    for corr_id in catalog.corridors:
        if catalog.lookup_fare(corr_id, orig.zone_id, dest.zone_id) is not None:
            return corr_id
    return orig.corridor_id


def resolve_route_and_quote(
    origin_mention: str | None,
    destination_mention: str | None,
    origin_relational: RelationalRef | None = None,
    destination_relational: RelationalRef | None = None,
    is_peak: bool = False,
    catalog: AbujaSeedCatalog | None = None,
) -> RouteResolutionQuote:
    """Resolve origin & destination, snap to a Virtual Anchor Point, and compute zone fare."""
    cat = catalog or load_abuja_seed_catalog()

    orig_res = resolve_landmark_mention(origin_mention, relational=origin_relational)
    dest_hint = orig_res.best.corridor_id if orig_res.best else None
    dest_res = resolve_landmark_mention(
        destination_mention,
        relational=destination_relational,
        corridor_hint=dest_hint,
    )

    if orig_res.status == "UNRESOLVED" or orig_res.best is None:
        return RouteResolutionQuote(
            status="MISSING_ORIGIN",
            corridor_id="BWR-DUT-WUS",
            direction="S",
            origin=orig_res,
            destination=dest_res,
            anchor_snap=None,
            standard_fare_kobo=0,
            peak_fare_kobo=0,
            active_fare_kobo=0,
            solo_ridehail_est_kobo=0,
            fare_naira="₦0",
            savings_pct=0,
        )

    if dest_res.status == "UNRESOLVED" or dest_res.best is None:
        return RouteResolutionQuote(
            status="MISSING_DEST",
            corridor_id=orig_res.best.corridor_id,
            direction="S",
            origin=orig_res,
            destination=dest_res,
            anchor_snap=None,
            standard_fare_kobo=0,
            peak_fare_kobo=0,
            active_fare_kobo=0,
            solo_ridehail_est_kobo=0,
            fare_naira="₦0",
            savings_pct=0,
        )

    if orig_res.status == "DISAMBIGUATE":
        return RouteResolutionQuote(
            status="DISAMBIGUATE_ORIGIN",
            corridor_id=orig_res.best.corridor_id,
            direction="S",
            origin=orig_res,
            destination=dest_res,
            anchor_snap=None,
            standard_fare_kobo=0,
            peak_fare_kobo=0,
            active_fare_kobo=0,
            solo_ridehail_est_kobo=0,
            fare_naira="₦0",
            savings_pct=0,
        )

    if dest_res.status == "DISAMBIGUATE":
        return RouteResolutionQuote(
            status="DISAMBIGUATE_DEST",
            corridor_id=orig_res.best.corridor_id,
            direction="S",
            origin=orig_res,
            destination=dest_res,
            anchor_snap=None,
            standard_fare_kobo=0,
            peak_fare_kobo=0,
            active_fare_kobo=0,
            solo_ridehail_est_kobo=0,
            fare_naira="₦0",
            savings_pct=0,
        )

    orig_lmk = orig_res.best
    dest_lmk = dest_res.best
    corridor_id = _select_shared_corridor(orig_lmk, dest_lmk, cat)

    # Infer direction or check Haversine distance if across connected corridors
    try:
        if orig_lmk.corridor_id == dest_lmk.corridor_id:
            direction = infer_corridor_direction(orig_lmk.km_marker, dest_lmk.km_marker)
        else:
            dist_m = int(haversine_distance_m(orig_lmk.lat, orig_lmk.lng, dest_lmk.lat, dest_lmk.lng))
            if dist_m < 800:
                raise ShortTripError(distance_m=dist_m)
            direction = "S" if dest_lmk.lat <= orig_lmk.lat else "N"
    except ShortTripError:
        return RouteResolutionQuote(
            status="SHORT_TRIP",
            corridor_id=corridor_id,
            direction="S",
            origin=orig_res,
            destination=dest_res,
            anchor_snap=None,
            standard_fare_kobo=0,
            peak_fare_kobo=0,
            active_fare_kobo=0,
            solo_ridehail_est_kobo=0,
            fare_naira="₦0",
            savings_pct=0,
        )

    snap = snap_to_anchor(
        lat=orig_lmk.lat,
        lng=orig_lmk.lng,
        corridor_id=corridor_id,
        direction=direction,
        catalog=cat,
    )

    fm_row = cat.lookup_fare(corridor_id, orig_lmk.zone_id, dest_lmk.zone_id)
    if fm_row is not None:
        std_kobo = fm_row.standard_fare_kobo
        peak_kobo = fm_row.peak_fare_kobo
        solo_kobo = fm_row.solo_ridehail_est_kobo
    else:
        dist_km = max(
            2.0,
            haversine_distance_m(orig_lmk.lat, orig_lmk.lng, dest_lmk.lat, dest_lmk.lng) / 1000.0,
        )
        raw_kobo = max(50000, int(round((35000 + dist_km * 5500) / 10000.0)) * 10000)
        std_kobo = raw_kobo
        peak_kobo = raw_kobo + 10000
        solo_kobo = raw_kobo * 4

    active_kobo = peak_kobo if is_peak else std_kobo
    savings_pct = int(round((1.0 - (active_kobo / max(1, solo_kobo))) * 100))

    final_status: Literal["COMPLETE", "OUT_OF_RADIUS_ANCHOR"] = (
        "COMPLETE" if snap.status == "SNAPPED" else "OUT_OF_RADIUS_ANCHOR"
    )

    return RouteResolutionQuote(
        status=final_status,
        corridor_id=corridor_id,
        direction=direction,
        origin=orig_res,
        destination=dest_res,
        anchor_snap=snap,
        standard_fare_kobo=std_kobo,
        peak_fare_kobo=peak_kobo,
        active_fare_kobo=active_kobo,
        solo_ridehail_est_kobo=solo_kobo,
        fare_naira=format_naira(active_kobo),
        savings_pct=savings_pct,
    )
