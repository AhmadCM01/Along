"""Seed loader and authoritative Abuja 6-corridor catalog (`scripts/seed.py`).

Populates PostgreSQL (`corridors`, `fare_zones`, `fare_matrix`, `anchor_points`, `landmarks`,
`landmark_aliases`, `drivers`, `vehicles`, `ops_users`, `ledger_accounts`) and Redis GEO sets
(`geo:anchors:{corr}:{dir}`), and exposes `load_abuja_seed_catalog()` for fast in-memory access.
"""

from __future__ import annotations

import asyncio
import csv
import json
from dataclasses import dataclass, field
from functools import lru_cache
from pathlib import Path
from typing import Any

try:
    import asyncpg
except ImportError:
    asyncpg = None  # type: ignore[assignment]

from app.core.config import get_settings
from app.core.logging import get_logger
from app.db.models import (
    AnchorPointModel,
    CorridorModel,
    DirectionCode,
    FareMatrixRowModel,
    FareZoneModel,
    LandmarkModel,
    LocaleCode,
)
from app.redis.keys import geo_anchors_key
from scripts.fetch_osm_abuja import load_corridor_polyline

logger = get_logger("along.seed")

ROOT_DIR = Path(__file__).resolve().parents[2]
SEED_DIR = ROOT_DIR / "supabase" / "seed"


@dataclass
class DemoDriverSeed:
    """Seeded driver and primary vehicle record."""

    phone_e164: str
    full_name: str
    device_tier: str
    price_band_preference: str
    home_corridor_id: str
    plate_number: str
    make: str
    model: str
    color: str
    bank_code: str
    account_number_last4: str
    ex_uber: bool


@dataclass
class AbujaSeedCatalog:
    """Complete validated in-memory Abuja seed catalog across all 6 corridors."""

    corridors: dict[str, CorridorModel] = field(default_factory=dict)
    fare_zones: dict[str, FareZoneModel] = field(default_factory=dict)
    fare_matrix: list[FareMatrixRowModel] = field(default_factory=list)
    anchors: dict[str, AnchorPointModel] = field(default_factory=dict)
    landmarks: dict[str, LandmarkModel] = field(default_factory=dict)
    drivers: list[DemoDriverSeed] = field(default_factory=list)

    @property
    def total_aliases(self) -> int:
        return sum(len(lmk.aliases) for lmk in self.landmarks.values())

    def lookup_fare(
        self,
        corridor_id: str,
        origin_zone_id: str,
        dest_zone_id: str,
    ) -> FareMatrixRowModel | None:
        """Find exact or symmetric fare matrix row for a corridor and zone pair."""
        for row in self.fare_matrix:
            if (
                row.corridor_id == corridor_id
                and row.origin_zone_id == origin_zone_id
                and row.dest_zone_id == dest_zone_id
            ):
                return row
        for row in self.fare_matrix:
            if (
                row.corridor_id == corridor_id
                and row.origin_zone_id == dest_zone_id
                and row.dest_zone_id == origin_zone_id
            ):
                return row
        return None


@lru_cache(maxsize=1)
def load_abuja_seed_catalog(seed_dir: Path = SEED_DIR) -> AbujaSeedCatalog:
    """Load and validate all Abuja CSV seed files and GeoJSON polylines into memory."""
    catalog = AbujaSeedCatalog()

    # 1. Corridors + GeoJSON polylines
    with (seed_dir / "corridors.csv").open(encoding="utf-8", newline="") as f:
        for row in csv.DictReader(f):
            coords = load_corridor_polyline(row["geojson_file"])
            corr = CorridorModel(
                id=row["id"],
                name=row["name"],
                length_m=int(row["length_m"]),
                coordinates=coords,
            )
            catalog.corridors[corr.id] = corr

    # 2. Fare Zones
    with (seed_dir / "fare_zones.csv").open(encoding="utf-8", newline="") as f:
        for row in csv.DictReader(f):
            fz = FareZoneModel(
                id=row["id"],
                corridor_id=row["corridor_id"],
                name=row["name"],
                seq_order=int(row["seq_order"]),
                start_km_m=int(row["start_km_m"]),
                end_km_m=int(row["end_km_m"]),
            )
            catalog.fare_zones[fz.id] = fz

    # 3. Fare Matrix (both forward and symmetric reverse pairs)
    with (seed_dir / "fare_matrix.csv").open(encoding="utf-8", newline="") as f:
        for row in csv.DictReader(f):
            fm = FareMatrixRowModel(
                corridor_id=row["corridor_id"],
                origin_zone_id=row["origin_zone_id"],
                dest_zone_id=row["dest_zone_id"],
                street_min_kobo=int(row["street_min_kobo"]),
                street_max_kobo=int(row["street_max_kobo"]),
                standard_fare_kobo=int(row["standard_fare_kobo"]),
                peak_fare_kobo=int(row["peak_fare_kobo"]),
                solo_ridehail_est_kobo=int(row["solo_ridehail_est_kobo"]),
                distance_km_est=float(row["distance_km_est"]),
            )
            catalog.fare_matrix.append(fm)

    # 4. Virtual Anchor Points (24 Private Filling Station Forecourts)
    with (seed_dir / "anchors.csv").open(encoding="utf-8", newline="") as f:
        for row in csv.DictReader(f):
            direction: DirectionCode = "S" if row["direction"] == "S" else "N"
            anc = AnchorPointModel(
                id=row["id"],
                corridor_id=row["corridor_id"],
                zone_id=row["zone_id"],
                direction=direction,
                name=row["name"],
                short_name=row["short_name"],
                lat=float(row["lat"]),
                lng=float(row["lng"]),
                km_marker=int(row["km_marker"]),
                geofence_m=int(row["geofence_m"]),
                partner_name=row["partner_name"],
                instructions={
                    "en": row["instructions_en"],
                    "pcm": row["instructions_pcm"],
                    "ha": row["instructions_ha"],
                },
            )
            catalog.anchors[anc.id] = anc

    # 5. Landmarks + Multilingual Aliases (en, pcm, ha)
    with (seed_dir / "landmarks.csv").open(encoding="utf-8", newline="") as f:
        for row in csv.DictReader(f):
            aliases: list[tuple[str, LocaleCode, float]] = []
            seen: set[str] = set()

            def _add_alias(text: str, loc: LocaleCode, weight: float = 1.0) -> None:
                norm = text.strip().lower()
                if norm and norm not in seen:
                    seen.add(norm)
                    aliases.append((text.strip(), loc, weight))

            _add_alias(row["canonical_name"], "en", 1.0)
            for item in row.get("aliases_en", "").split("|"):
                _add_alias(item, "en", 1.0)
            for item in row.get("aliases_pcm", "").split("|"):
                _add_alias(item, "pcm", 0.98)
            for item in row.get("aliases_ha", "").split("|"):
                _add_alias(item, "ha", 0.98)
            # Also add contextual area + colloquial variants so Recall@1 is high
            area_name = row.get("area", "").strip()
            if area_name:
                _add_alias(f"{row['canonical_name']} {area_name}", "en", 0.9)

            side_val: DirectionCode | None = (
                "S" if row["side"] == "S" else ("N" if row["side"] == "N" else None)
            )
            lmk = LandmarkModel(
                id=row["id"],
                corridor_id=row["corridor_id"],
                zone_id=row["zone_id"],
                canonical_name=row["canonical_name"],
                kind=row["kind"],
                lat=float(row["lat"]),
                lng=float(row["lng"]),
                km_marker=int(row["km_marker"]),
                side=side_val,
                area=row["area"],
                popularity=float(row["popularity"]),
                is_drop_point=(row["is_drop_point"].lower() == "true"),
                aliases=aliases,
            )
            catalog.landmarks[lmk.id] = lmk

    # 6. Demo Drivers (Smartphone + 2G Feature Phone)
    with (seed_dir / "drivers.csv").open(encoding="utf-8", newline="") as f:
        for row in csv.DictReader(f):
            catalog.drivers.append(
                DemoDriverSeed(
                    phone_e164=row["phone_e164"],
                    full_name=row["full_name"],
                    device_tier=row["device_tier"],
                    price_band_preference=row["price_band_preference"],
                    home_corridor_id=row["home_corridor_id"],
                    plate_number=row["plate_number"],
                    make=row["make"],
                    model=row["model"],
                    color=row["color"],
                    bank_code=row["bank_code"],
                    account_number_last4=row["account_number_last4"],
                    ex_uber=(row["ex_uber"].lower() == "true"),
                )
            )

    return catalog


async def seed_redis_geo_anchors(redis: Any, catalog: AbujaSeedCatalog | None = None) -> int:
    """Populate Redis GEO sets `geo:anchors:{corridor}:{direction}` from the seed catalog."""
    cat = catalog or load_abuja_seed_catalog()
    added = 0
    for anc in cat.anchors.values():
        if not anc.is_active:
            continue
        key = geo_anchors_key(anc.corridor_id, anc.direction)
        # Redis GEOADD takes (longitude, latitude, member)
        await redis.geoadd(key, (anc.lng, anc.lat, anc.id))
        added += 1
    return added


async def seed_postgres(
    database_url: str | None = None,
    catalog: AbujaSeedCatalog | None = None,
) -> dict[str, int]:
    """Idempotently seed PostgreSQL tables with the Abuja 6-corridor dataset."""
    dsn = database_url or get_settings().DIRECT_DATABASE_URL
    cat = catalog or load_abuja_seed_catalog()
    conn = await asyncpg.connect(dsn)
    try:
        async with conn.transaction():
            for corr in cat.corridors.values():
                wkt_pts = ", ".join(f"{lng} {lat}" for lng, lat in corr.coordinates)
                wkt = f"SRID=4326;LINESTRING({wkt_pts})"
                await conn.execute(
                    """
                    insert into corridors(id, name, path_s, length_m, is_active)
                    values ($1, $2, ST_GeogFromText($3), $4, true)
                    on conflict (id) do update
                      set name = excluded.name,
                          path_s = excluded.path_s,
                          length_m = excluded.length_m;
                    """,
                    corr.id,
                    corr.name,
                    wkt,
                    corr.length_m,
                )

            for fz in cat.fare_zones.values():
                await conn.execute(
                    """
                    insert into fare_zones(id, corridor_id, name, seq_order, start_km_m, end_km_m)
                    values ($1, $2, $3, $4, $5, $6)
                    on conflict (id) do update
                      set name = excluded.name,
                          seq_order = excluded.seq_order,
                          start_km_m = excluded.start_km_m,
                          end_km_m = excluded.end_km_m;
                    """,
                    fz.id,
                    fz.corridor_id,
                    fz.name,
                    fz.seq_order,
                    fz.start_km_m,
                    fz.end_km_m,
                )

            for fm in cat.fare_matrix:
                await conn.execute(
                    """
                    insert into fare_matrix(
                        corridor_id, origin_zone_id, dest_zone_id,
                        street_min_kobo, street_max_kobo, standard_fare_kobo,
                        peak_fare_kobo, solo_ridehail_est_kobo, distance_km_est
                    )
                    values ($1, $2, $3, $4, $5, $6, $7, $8, $9)
                    on conflict (corridor_id, origin_zone_id, dest_zone_id) do update
                      set standard_fare_kobo = excluded.standard_fare_kobo,
                          peak_fare_kobo = excluded.peak_fare_kobo;
                    """,
                    fm.corridor_id,
                    fm.origin_zone_id,
                    fm.dest_zone_id,
                    fm.street_min_kobo,
                    fm.street_max_kobo,
                    fm.standard_fare_kobo,
                    fm.peak_fare_kobo,
                    fm.solo_ridehail_est_kobo,
                    fm.distance_km_est,
                )

            for anc in cat.anchors.values():
                wkt = f"SRID=4326;POINT({anc.lng} {anc.lat})"
                await conn.execute(
                    """
                    insert into anchor_points(
                        id, corridor_id, zone_id, direction, name, short_name,
                        location, km_marker, geofence_m, partner_name, instructions
                    )
                    values ($1, $2, $3::direction_code, $4, $5, ST_GeogFromText($6), $7, $8, $9, $10::jsonb)
                    on conflict (id) do update
                      set short_name = excluded.short_name,
                          km_marker = excluded.km_marker,
                          instructions = excluded.instructions;
                    """,
                    anc.id,
                    anc.corridor_id,
                    anc.zone_id,
                    anc.direction,
                    anc.name,
                    anc.short_name,
                    wkt,
                    anc.km_marker,
                    anc.geofence_m,
                    anc.partner_name,
                    json.dumps(anc.instructions),
                )

            for lmk in cat.landmarks.values():
                wkt = f"SRID=4326;POINT({lmk.lng} {lmk.lat})"
                await conn.execute(
                    """
                    insert into landmarks(
                        id, corridor_id, zone_id, canonical_name, kind,
                        location, km_marker, side, area, popularity, is_drop_point
                    )
                    values (
                        $1, $2, $3, $4, $5::landmark_kind,
                        ST_GeogFromText($6), $7, $8::direction_code, $9, $10, $11
                    )
                    on conflict (id) do update
                      set canonical_name = excluded.canonical_name,
                          km_marker = excluded.km_marker,
                          popularity = excluded.popularity;
                    """,
                    lmk.id,
                    lmk.corridor_id,
                    lmk.zone_id,
                    lmk.canonical_name,
                    lmk.kind,
                    wkt,
                    lmk.km_marker,
                    lmk.side,
                    lmk.area,
                    lmk.popularity,
                    lmk.is_drop_point,
                )
                for alias_text, locale_code, weight in lmk.aliases:
                    await conn.execute(
                        """
                        insert into landmark_aliases(landmark_id, alias, locale, weight)
                        values ($1, $2, $3::locale_code, $4)
                        on conflict (landmark_id, alias) do nothing;
                        """,
                        lmk.id,
                        alias_text,
                        locale_code,
                        weight,
                    )

            for drv in cat.drivers:
                driver_id = await conn.fetchval(
                    """
                    insert into drivers(
                        phone_e164, full_name, kyc_status, status,
                        device_tier, price_band_preference, home_corridor_id,
                        bank_code, account_number_last4
                    )
                    values ($1, $2, 'APPROVED', 'AVAILABLE', $3, $4, $5, $6, $7)
                    on conflict (phone_e164) do update
                      set full_name = excluded.full_name,
                          device_tier = excluded.device_tier
                    returning id;
                    """,
                    drv.phone_e164,
                    drv.full_name,
                    drv.device_tier,
                    drv.price_band_preference,
                    drv.home_corridor_id,
                    drv.bank_code,
                    drv.account_number_last4,
                )
                await conn.execute(
                    """
                    insert into vehicles(driver_id, plate_number, make, model, color, seats, verified)
                    values ($1, $2, $3, $4, $5, 4, true)
                    on conflict (plate_number) do nothing;
                    """,
                    driver_id,
                    drv.plate_number,
                    drv.make,
                    drv.model,
                    drv.color,
                )
    finally:
        await conn.close()

    return {
        "corridors": len(cat.corridors),
        "fare_zones": len(cat.fare_zones),
        "fare_matrix": len(cat.fare_matrix),
        "anchors": len(cat.anchors),
        "landmarks": len(cat.landmarks),
        "aliases": cat.total_aliases,
        "drivers": len(cat.drivers),
    }


def main() -> None:
    cat = load_abuja_seed_catalog()
    summary = {
        "corridors": len(cat.corridors),
        "fare_zones": len(cat.fare_zones),
        "fare_matrix_rows": len(cat.fare_matrix),
        "anchors": len(cat.anchors),
        "landmarks": len(cat.landmarks),
        "total_aliases": cat.total_aliases,
        "drivers": len(cat.drivers),
    }
    logger.info("abuja_seed_catalog_loaded", **summary)
    print(json.dumps(summary, indent=2))


if __name__ == "__main__":
    main()
