# Data Provenance and Geodata Audit

This document records the provenance, schema, row counts, repository evidence, and open verification questions for all seed data files in `supabase/seed/`.

## 1. Seed File Provenance Summary

| File | Content | Rows | Source Claimed by Owner | Evidence in Repo | Open Questions |
|---|---|---|---|---|---|
| `supabase/seed/landmarks.csv` | Canonical Abuja transit landmarks, coordinates, zones, corridor km markers, multilingual aliases (en, pcm, ha) | 142 | Compiled mostly from owner first-hand knowledge of Abuja commuter routes (Berger, Wuse, Banex) and informal conversations with a professional driver friend of owner father | WGS84 coordinates with uniform 4-decimal precision; `km_marker` along corridors; referenced in `backend/scripts/seed.py` and validated in `backend/scripts/fetch_osm_abuja.py` (Abuja FCT bounding box `8.90, 7.05, 9.32, 7.66`); no external URL header in file | Method for coordinates and km markers: owner to confirm. Parts of data not from these sources: owner to list. |
| `supabase/seed/anchors.csv` | 24 Virtual Anchor Points (filling station forecourts), coordinates, directions, 150m geofence, partner brands, multilingual instructions | 24 | Compiled from owner knowledge of safe filling station forecourts along Abuja corridors | Uniform 4-decimal coordinates; `km_marker` linear distance; partner names (A.A. Rano, Oando, TotalEnergies, NNPC, Conoil); `backend/scripts/fetch_osm_abuja.py` contains query logic for OSM fuel stations (`amenity=fuel`) via `https://overpass-api.de/api/interpreter`, but file has no external source tag | Method for coordinates: owner to confirm. Specific forecourt agreements or commercial permissions: owner to confirm. |
| `supabase/seed/corridors.csv` | 6 primary Abuja transit corridors, total length in meters, GeoJSON filenames, service hours | 6 | 6 major highway transit corridors recognized in Abuja commuter transit | Defines IDs (`BWR-DUT-WUS`, `ZUB-KUB-WUS`, `ZUB-DEI-DUT`, `ZUB-KRM-JAB`, `GWL-LUG-AR1`, `MRB-NYA-CEN`); links to 7 GeoJSON polyline files in `data/corridor/`; lengths computed via Haversine in `backend/scripts/fetch_osm_abuja.py` | Source and digitizing method for GeoJSON corridor polyline coordinates: owner to confirm. |
| `supabase/seed/fare_zones.csv` | Sequential transit fare zones along corridors, sequence order, start and end km boundaries | 20 | Segment division of corridors based on local commuter staging stops | Explicit sequence integers (`seq_order`) and boundary markers in meters (`start_km_m`, `end_km_m`) | Boundary definition method: owner to confirm. |
| `supabase/seed/fare_matrix.csv` | Origin-destination zone fare bands (street minimum, street maximum, standard kobo, peak kobo, solo ridehail estimate, estimated km) | 75 | Fare levels compiled mostly from owner first-hand knowledge and informal driver conversations | Expressed in integer Kobo (`standard_fare_kobo`, `peak_fare_kobo`); calibrated against street rates (`street_min_kobo`, `street_max_kobo`) | Source of solo ridehail benchmark estimates (`solo_ridehail_est_kobo`): owner to confirm. |

## 2. External Geodata and Web Keyword Scan (Part 2 Findings)
A comprehensive scan across the entire repository (excluding `node_modules`, `.next`, and `.git`) for geodata providers (`google`, `maps.google`, `openstreetmap`, `osm`, `nominatim`, `mapbox`, `wikipedia`, `wikimapia`, `here.com`, and HTTP/HTTPS URLs) identified the following hits:
- **OpenStreetMap / Overpass / Nominatim**:
  - `backend/scripts/fetch_osm_abuja.py`:
    - Line 1: `"""OpenStreetMap Overpass, Nominatim, and OSRM Abuja corridor ingestion & verification utility.`
    - Line 3: Mentions online query against live OpenStreetMap Overpass API nodes around Abuja's 6 corridors.
    - Line 54: Function `query_overpass_filling_stations()` querying live OSM Overpass API for fuel stations in Abuja bounding box.
    - Line 66: Endpoint URL `"https://overpass-api.de/api/interpreter"`.
    - Line 122: Argument parser description `"Verify or fetch Abuja OSM corridor geodata"`.
  - `backend/scripts/seed.py`:
    - Line 35: `from scripts.fetch_osm_abuja import load_corridor_polyline`.
- **Google**:
  - `PITCH_DECK.md`: Line 128 (colloquial comparison: *"Google Maps does not know what second transformer after first gate means..."*).
  - `MASTER_IMPLEMENTATION_PLAN.md`: Line 2302 (reference to Google Fonts); Line 2369 (reference to Google Maps navigation intent).
- **Other Providers**:
  - `maps.google`: 0 hits in codebase.
  - `mapbox`: 0 hits in codebase.
  - `wikipedia`: 0 hits in codebase.
  - `wikimapia`: 0 hits in codebase.
  - `here.com`: 0 hits in codebase.

## 3. Limitations
Coordinates, km markers and fares are approximate, field-compiled, not survey grade, and fares are illustrative.
- **Coordinates & Spatial Accuracy**: Landmark and anchor coordinates are recorded to 4 decimal places (approximately 11 meters resolution) for commuter routing and filling station forecourt identification. They are not high-precision geodetic survey coordinates.
- **Kilometer Markers**: Corridor linear references (`km_marker`) represent approximated route-distance meters along corridor roadway polylines, calibrated for sequential ordering and seat drop-off sequencing.
- **Fare Levels**: Fares represent illustrative approximations based on Abuja informal commercial transit market rates as of October 2026. They do not constitute official regulated tariffs or live banking transaction records.
