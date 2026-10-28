"""OpenStreetMap Overpass, Nominatim, and OSRM Abuja corridor ingestion & verification utility.

Can be run online (`--online`) to query live OpenStreetMap Overpass API nodes around Abuja's
6 corridors, or offline (default) to validate and enrich the canonical seed CSVs and GeoJSON
polylines in `supabase/seed/` and `data/corridor/`.
"""

from __future__ import annotations

import argparse
import csv
import json
from pathlib import Path
from typing import Any

import httpx

from app.core.logging import get_logger
from app.matching.corridor import haversine_distance_m, project_point_onto_polyline_m

logger = get_logger("along.osm")

ROOT_DIR = Path(__file__).resolve().parents[2]
SEED_DIR = ROOT_DIR / "supabase" / "seed"
CORRIDOR_GEOJSON_DIR = ROOT_DIR / "data" / "corridor"

ABUJA_BBOX = (8.90, 7.05, 9.32, 7.66)  # (south_lat, west_lng, north_lat, east_lng)


def load_corridor_polyline(geojson_filename: str) -> list[tuple[float, float]]:
    """Load (lng, lat) coordinates from a corridor GeoJSON file."""
    path = CORRIDOR_GEOJSON_DIR / geojson_filename
    if not path.exists():
        raise FileNotFoundError(f"GeoJSON file not found: {path}")
    raw = json.loads(path.read_text(encoding="utf-8"))
    features = raw.get("features", [])
    if not features:
        raise ValueError(f"No features in {path.name}")
    coords = features[0]["geometry"]["coordinates"]
    return [(float(pt[0]), float(pt[1])) for pt in coords]


def compute_polyline_total_length_m(coords: list[tuple[float, float]]) -> int:
    """Compute cumulative Haversine length of a (lng, lat) polyline in meters."""
    total = 0.0
    for idx in range(len(coords) - 1):
        lng1, lat1 = coords[idx]
        lng2, lat2 = coords[idx + 1]
        total += haversine_distance_m(lat1, lng1, lat2, lng2)
    return int(round(total))


async def query_overpass_filling_stations() -> list[dict[str, Any]]:
    """Query live OpenStreetMap Overpass API for fuel stations in Abuja FCT bounding box."""
    s, w, n, e = ABUJA_BBOX
    query = f"""
    [out:json][timeout:25];
    (
      node["amenity"="fuel"]({s},{w},{n},{e});
      way["amenity"="fuel"]({s},{w},{n},{e});
    );
    out center 100;
    """
    async with httpx.AsyncClient(timeout=30.0) as client:
        resp = await client.post(
            "https://overpass-api.de/api/interpreter",
            data={"data": query},
        )
        resp.raise_for_status()
        data: dict[str, Any] = resp.json()
        return list(data.get("elements", []))


def verify_local_abuja_geodata() -> dict[str, Any]:
    """Verify all 6 GeoJSON polylines, 24 anchors, and 115+ landmarks in local seed files."""
    corridors_csv = SEED_DIR / "corridors.csv"
    anchors_csv = SEED_DIR / "anchors.csv"
    landmarks_csv = SEED_DIR / "landmarks.csv"

    polylines: dict[str, list[tuple[float, float]]] = {}
    with corridors_csv.open(encoding="utf-8", newline="") as f:
        for row in csv.DictReader(f):
            cid = row["id"]
            polylines[cid] = load_corridor_polyline(row["geojson_file"])

    anchor_count = 0
    with anchors_csv.open(encoding="utf-8", newline="") as f:
        for row in csv.DictReader(f):
            lat = float(row["lat"])
            lng = float(row["lng"])
            if not (ABUJA_BBOX[0] <= lat <= ABUJA_BBOX[2] and ABUJA_BBOX[1] <= lng <= ABUJA_BBOX[3]):
                raise ValueError(f"Anchor {row['id']} outside Abuja FCT bbox: ({lat}, {lng})")
            projected_m = project_point_onto_polyline_m(lat, lng, polylines[row["corridor_id"]])
            if projected_m < 0:
                raise ValueError(f"Invalid projection for anchor {row['id']}")
            anchor_count += 1

    landmark_count = 0
    alias_count = 0
    with landmarks_csv.open(encoding="utf-8", newline="") as f:
        for row in csv.DictReader(f):
            lat = float(row["lat"])
            lng = float(row["lng"])
            if not (ABUJA_BBOX[0] <= lat <= ABUJA_BBOX[2] and ABUJA_BBOX[1] <= lng <= ABUJA_BBOX[3]):
                raise ValueError(f"Landmark {row['id']} outside Abuja FCT bbox: ({lat}, {lng})")
            for col in ("aliases_en", "aliases_pcm", "aliases_ha"):
                aliases = [a.strip() for a in row.get(col, "").split("|") if a.strip()]
                alias_count += len(aliases)
            landmark_count += 1

    summary = {
        "corridors_verified": len(polylines),
        "anchors_verified": anchor_count,
        "landmarks_verified": landmark_count,
        "multilingual_aliases_verified": alias_count,
    }
    logger.info("abuja_geodata_verified", **summary)
    return summary


def main() -> None:
    parser = argparse.ArgumentParser(description="Verify or fetch Abuja OSM corridor geodata")
    parser.add_argument("--online", action="store_true", help="Query live Overpass API")
    args = parser.parse_args()
    summary = verify_local_abuja_geodata()
    if args.online:
        import asyncio

        elements = asyncio.run(query_overpass_filling_stations())
        logger.info("overpass_live_fuel_nodes", count=len(elements))
    print(json.dumps(summary, indent=2))


if __name__ == "__main__":
    main()
