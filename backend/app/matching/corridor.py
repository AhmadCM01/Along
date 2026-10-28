"""Corridor linear referencing, Haversine geometry, direction inference, and seat assignment (§7.1, §7.3)."""

from __future__ import annotations

import math
from dataclasses import dataclass
from typing import Sequence

from app.core.config import BusinessRules
from app.core.errors import ShortTripError
from app.db.models import DirectionCode, SeatLabel

EARTH_RADIUS_M = 6_371_000.0


@dataclass(frozen=True, slots=True)
class RiderStopCandidate:
    """Member candidate used for deterministic 4-seat assignment and stop ordering."""

    ride_request_id: str
    rider_name: str
    dest_name: str
    dest_km_marker: int
    fare_kobo: int


def haversine_distance_m(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    """Compute great-circle distance in meters between two WGS84 coordinates."""
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    d_phi = math.radians(lat2 - lat1)
    d_lambda = math.radians(lng2 - lng1)
    a = (
        math.sin(d_phi / 2.0) ** 2
        + math.cos(phi1) * math.cos(phi2) * math.sin(d_lambda / 2.0) ** 2
    )
    return 2.0 * EARTH_RADIUS_M * math.atan2(math.sqrt(a), math.sqrt(max(0.0, 1.0 - a)))


def project_point_onto_polyline_m(
    lat: float,
    lng: float,
    polyline_lng_lat: Sequence[tuple[float, float]],
) -> int:
    """Compute linear reference distance in meters (`km_marker`) along a corridor polyline."""
    if len(polyline_lng_lat) < 2:
        return 0

    cumulative_m = 0.0
    best_dist_m = float("inf")
    best_marker_m = 0.0

    for idx in range(len(polyline_lng_lat) - 1):
        lng_a, lat_a = polyline_lng_lat[idx]
        lng_b, lat_b = polyline_lng_lat[idx + 1]
        seg_len_m = haversine_distance_m(lat_a, lng_a, lat_b, lng_b)
        if seg_len_m <= 0.01:
            continue

        # Local equirectangular projection for segment fraction t in [0, 1]
        cos_lat = math.cos(math.radians((lat_a + lat_b) / 2.0))
        dx = (lng_b - lng_a) * cos_lat
        dy = lat_b - lat_a
        px = (lng - lng_a) * cos_lat
        py = lat - lat_a
        denom = dx * dx + dy * dy
        t = max(0.0, min(1.0, (px * dx + py * dy) / denom)) if denom > 0 else 0.0

        proj_lng = lng_a + t * (lng_b - lng_a)
        proj_lat = lat_a + t * (lat_b - lat_a)
        perp_dist_m = haversine_distance_m(lat, lng, proj_lat, proj_lng)

        if perp_dist_m < best_dist_m:
            best_dist_m = perp_dist_m
            best_marker_m = cumulative_m + t * seg_len_m

        cumulative_m += seg_len_m

    return int(round(best_marker_m))


def infer_corridor_direction(origin_km_marker: int, dest_km_marker: int) -> DirectionCode:
    """Infer travel direction ('S' inbound vs 'N' outbound) or raise ShortTripError if < 800m."""
    delta = dest_km_marker - origin_km_marker
    if abs(delta) < BusinessRules.MIN_TRIP_DISTANCE_M:
        raise ShortTripError(distance_m=abs(delta))
    return "S" if delta > 0 else "N"


def compute_walk_minutes(distance_m: float) -> int:
    """Estimate pedestrian walk time in minutes using 1.25 tortuosity factor and 80 m/min speed."""
    if distance_m <= 0:
        return 1
    return max(1, math.ceil((distance_m * 1.25) / 80.0))


def assign_seats_and_order_stops(
    members: Sequence[RiderStopCandidate],
    direction: DirectionCode,
) -> list[tuple[RiderStopCandidate, SeatLabel]]:
    """Assign 1 Front and 3 Back seats deterministically by drop-off order (§7.3.2).

    - Furthest drop-off (rank 1) -> FRONT
    - Second furthest (rank 2) -> BACK_LEFT
    - Third furthest (rank 3) -> BACK_MIDDLE (left empty on 3-rider partial pods)
    - Earliest drop-off -> BACK_RIGHT (curbside door for easiest exit without others stepping out)
    """
    if not (3 <= len(members) <= 4):
        raise ValueError(f"Pod must have 3 or 4 members, got {len(members)}")

    # Sort from furthest downstream to earliest downstream
    if direction == "S":
        sorted_furthest_first = sorted(
            members,
            key=lambda m: (-m.dest_km_marker, m.ride_request_id),
        )
    else:
        sorted_furthest_first = sorted(
            members,
            key=lambda m: (m.dest_km_marker, m.ride_request_id),
        )

    if len(sorted_furthest_first) == 4:
        labels: list[SeatLabel] = ["FRONT", "BACK_LEFT", "BACK_MIDDLE", "BACK_RIGHT"]
    else:
        labels = ["FRONT", "BACK_LEFT", "BACK_RIGHT"]

    return list(zip(sorted_furthest_first, labels, strict=True))
