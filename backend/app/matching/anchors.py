"""Origin landmark / GPS pin to Virtual Anchor Point (VAP) snapper (`app/matching/anchors.py` - §7.2)."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Literal

from app.core.config import BusinessRules
from app.db.models import AnchorPointModel, DirectionCode
from app.matching.corridor import compute_walk_minutes, haversine_distance_m
from scripts.seed import AbujaSeedCatalog, load_abuja_seed_catalog


@dataclass(frozen=True, slots=True)
class AnchorSnapResult:
    """Result of snapping an origin coordinate to a private filling station forecourt."""

    status: Literal["SNAPPED", "OUT_OF_RADIUS", "NONE_FOUND"]
    anchor: AnchorPointModel | None
    distance_m: int
    walk_minutes: int


def snap_to_anchor(
    lat: float,
    lng: float,
    corridor_id: str,
    direction: DirectionCode = "S",
    snap_radius_m: int = BusinessRules.ANCHOR_SNAP_RADIUS_M,
    fallback_radius_m: int = BusinessRules.ANCHOR_FALLBACK_RADIUS_M,
    catalog: AbujaSeedCatalog | None = None,
) -> AnchorSnapResult:
    """Snap a rider's origin coordinate to the nearest active Virtual Anchor Point in travel direction."""
    cat = catalog or load_abuja_seed_catalog()

    # Collect active anchors on the same corridor and direction (or any active anchor on that corridor if none in direction)
    candidates = [
        anc
        for anc in cat.anchors.values()
        if anc.is_active and anc.corridor_id == corridor_id and anc.direction == direction
    ]
    if not candidates:
        candidates = [
            anc
            for anc in cat.anchors.values()
            if anc.is_active and anc.corridor_id == corridor_id
        ]
    if not candidates:
        candidates = [anc for anc in cat.anchors.values() if anc.is_active]

    scored: list[tuple[float, AnchorPointModel]] = []
    for anc in candidates:
        dist_m = haversine_distance_m(lat, lng, anc.lat, anc.lng)
        scored.append((dist_m, anc))
    scored.sort(key=lambda item: item[0])

    # If the closest anchor on (corridor_id, direction) is further than 900m,
    # also check all active anchors across the Abuja network so cross-corridor
    # or reverse-direction origins (e.g. Banex, Berger, Dutse, Gwarinpa) snap
    # to the filling station right next to the rider.
    if not scored or scored[0][0] > 900.0:
        all_scored: list[tuple[float, AnchorPointModel]] = [
            (haversine_distance_m(lat, lng, anc.lat, anc.lng), anc)
            for anc in cat.anchors.values()
            if anc.is_active
        ]
        all_scored.sort(key=lambda item: item[0])
        if all_scored and (not scored or all_scored[0][0] < scored[0][0]):
            scored = all_scored

    if not scored:
        return AnchorSnapResult(
            status="NONE_FOUND",
            anchor=None,
            distance_m=0,
            walk_minutes=0,
        )

    best_dist_m, best_anchor = scored[0]
    rounded_dist = int(round(best_dist_m))
    walk_mins = compute_walk_minutes(best_dist_m)

    if best_dist_m <= snap_radius_m:
        return AnchorSnapResult(
            status="SNAPPED",
            anchor=best_anchor,
            distance_m=rounded_dist,
            walk_minutes=walk_mins,
        )

    if best_dist_m <= fallback_radius_m:
        return AnchorSnapResult(
            status="OUT_OF_RADIUS",
            anchor=best_anchor,
            distance_m=rounded_dist,
            walk_minutes=walk_mins,
        )

    # Even if further than 2.5km on a long corridor (e.g. Gwagwalada/Ushafa), return nearest corridor anchor as OUT_OF_RADIUS
    return AnchorSnapResult(
        status="OUT_OF_RADIUS",
        anchor=best_anchor,
        distance_m=rounded_dist,
        walk_minutes=walk_mins,
    )
