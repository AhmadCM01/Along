"""Unit and integration verification for P1-T2 (SQL migrations), P1-T5 (Abuja 6-corridor seeds), and P1-T6 (GeoJSON polylines)."""

from __future__ import annotations

import pytest

from app.core.errors import ShortTripError
from app.matching.corridor import infer_corridor_direction, project_point_onto_polyline_m
from app.redis.keys import geo_anchors_key
from scripts.fetch_osm_abuja import verify_local_abuja_geodata
from scripts.migrate import validate_migrations_offline
from scripts.seed import load_abuja_seed_catalog, seed_redis_geo_anchors


def test_sql_migrations_validate_offline() -> None:
    versions = validate_migrations_offline()
    assert versions == [
        "0001_extensions.sql",
        "0002_enums.sql",
        "0003_geo_corridor.sql",
        "0004_identity.sql",
        "0005_trips.sql",
        "0006_ledger.sql",
        "0007_conversation_ai.sql",
        "0008_rls.sql",
        "0009_views.sql",
    ]


def test_abuja_6_corridor_seed_catalog_completeness() -> None:
    catalog = load_abuja_seed_catalog()

    # 1. All 6 Abuja corridors present
    assert set(catalog.corridors.keys()) == {
        "BWR-DUT-WUS",
        "ZUB-KUB-WUS",
        "ZUB-DEI-DUT",
        "ZUB-KRM-JAB",
        "GWL-LUG-AR1",
        "MRB-NYA-CEN",
    }

    # 2. All 20 fare zones present
    assert len(catalog.fare_zones) == 20

    # 3. 36+ Origin-Destination fare matrix rows & verified real Abuja fares
    assert len(catalog.fare_matrix) >= 36

    # Dutse -> Oando (after Katampe Ext Bridge) == 700 NGN (70000 kobo)
    dut_oando = catalog.lookup_fare("BWR-DUT-WUS", "ZONE-DUT", "ZONE-KAT-OAN")
    assert dut_oando is not None
    assert dut_oando.standard_fare_kobo == 70000
    assert dut_oando.peak_fare_kobo == 70000

    # Dutse -> Wuse == 1,000 NGN standard / 1,200 NGN peak
    dut_wuse = catalog.lookup_fare("BWR-DUT-WUS", "ZONE-DUT", "ZONE-WUS")
    assert dut_wuse is not None
    assert dut_wuse.standard_fare_kobo == 100000
    assert dut_wuse.peak_fare_kobo == 120000

    # Bwari -> Wuse == 1,800 NGN standard / 2,000 NGN peak
    bwr_wuse = catalog.lookup_fare("BWR-DUT-WUS", "ZONE-BWR", "ZONE-WUS")
    assert bwr_wuse is not None
    assert bwr_wuse.standard_fare_kobo == 180000
    assert bwr_wuse.peak_fare_kobo == 200000

    # Oando -> Wuse mid-corridor reload == 500 NGN standard / 600 NGN peak
    oan_wuse = catalog.lookup_fare("BWR-DUT-WUS", "ZONE-KAT-OAN", "ZONE-WUS")
    assert oan_wuse is not None
    assert oan_wuse.standard_fare_kobo == 50000
    assert oan_wuse.peak_fare_kobo == 60000

    # Dei-Dei -> Dutse == 600 NGN standard / 700 NGN peak
    dei_dut = catalog.lookup_fare("ZUB-DEI-DUT", "ZONE-DEI", "ZONE-DUT")
    assert dei_dut is not None
    assert dei_dut.standard_fare_kobo == 60000
    assert dei_dut.peak_fare_kobo == 70000

    # 4. 24 private filling station Virtual Anchor Points
    assert len(catalog.anchors) == 24
    assert "ANC-DUT-01" in catalog.anchors
    assert "ANC-OAN-01" in catalog.anchors
    assert catalog.anchors["ANC-DUT-01"].short_name == "A.A. Rano Dutse"
    assert catalog.anchors["ANC-OAN-01"].short_name == "Oando Katampe Ext"

    # 5. >= 110 landmarks and >= 500 multilingual aliases (en, pcm, ha)
    assert len(catalog.landmarks) >= 110
    assert catalog.total_aliases >= 500

    # 6. 18 Demo Drivers covering both SMARTPHONE and FEATURE_PHONE (2G) tiers
    assert len(catalog.drivers) == 18
    tiers = {d.device_tier for d in catalog.drivers}
    assert tiers == {"SMARTPHONE", "FEATURE_PHONE"}
    assert any(d.plate_number == "ABJ-402-AL" and d.full_name == "Musa Bello" for d in catalog.drivers)


@pytest.mark.asyncio
async def test_corridor_linear_referencing_and_redis_geo_seeding(fake_redis: object) -> None:
    summary = verify_local_abuja_geodata()
    assert summary["corridors_verified"] == 6
    assert summary["anchors_verified"] == 24
    assert summary["landmarks_verified"] >= 110

    catalog = load_abuja_seed_catalog()
    poly = catalog.corridors["BWR-DUT-WUS"].coordinates

    # Verify progressive linear ordering along Bwari -> Dutse -> Oando -> Berger -> Wuse -> Central Area
    km_bwari = project_point_onto_polyline_m(9.2865, 7.3812, poly)
    km_dutse = project_point_onto_polyline_m(9.1790, 7.3738, poly)
    km_oando = project_point_onto_polyline_m(9.1068, 7.4342, poly)
    km_berger = project_point_onto_polyline_m(9.0765, 7.4525, poly)
    km_wuse = project_point_onto_polyline_m(9.0685, 7.4660, poly)
    km_central = project_point_onto_polyline_m(9.0585, 7.4952, poly)

    assert km_bwari < km_dutse < km_oando < km_berger < km_wuse < km_central
    assert infer_corridor_direction(km_dutse, km_oando) == "S"
    assert infer_corridor_direction(km_wuse, km_dutse) == "N"

    with pytest.raises(ShortTripError):
        infer_corridor_direction(15100, 15250)

    # Seed Redis GEO anchors and snap Dutse First Gate (9.1790, 7.3738) to ANC-DUT-01 (A.A. Rano Dutse)
    seeded = await seed_redis_geo_anchors(fake_redis, catalog=catalog)
    assert seeded == 24

    hits = await fake_redis.geosearch(  # type: ignore[attr-defined]
        geo_anchors_key("BWR-DUT-WUS", "S"),
        longitude=7.3738,
        latitude=9.1790,
        radius=600,
        unit="m",
        sort="ASC",
        count=3,
    )
    assert len(hits) >= 1
    assert hits[0][0] == "ANC-DUT-01"
