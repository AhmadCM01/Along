# Data Provenance and Geodata Audit

I built Along to solve daily commuter transit challenges in Abuja. This document records the provenance, schema, row counts, technical evidence, and owner statements for all seed datasets in `supabase/seed/` and assets in `data/`.

## 1. Builder Perspective and Data Collection

I live and travel in Abuja, regularly commuting along the Berger, Wuse, and Banex corridors. When building Along, I compiled the initial landmark names, commuter junctions, local aliases, and typical street fare levels from:
1. My own first-hand daily experience commuting across Abuja routes.
2. Informal conversations with a professional commercial driver who is a friend of my dad and regularly drives Abuja commuter corridors.
3. First-hand complaints and feedback I have heard from other daily riders waiting at roadside junctions.
4. General online research on Abuja transit stops and routes (specific websites not recorded; illustrative estimates).

## 2. Seed File Provenance and Verification Findings

| File | Content | Rows | Primary Origin | Evidence in Repository | Verified Status |
|---|---|---|---|---|---|
| `supabase/seed/landmarks.csv` | Canonical Abuja transit landmarks, coordinates, zones, corridor km markers, multilingual aliases (en, pcm, ha) | 142 | Personal route knowledge, driver friend consultations, and online research | WGS84 coordinates with uniform 4-decimal precision (approx 11m resolution); all points fall inside Abuja FCT bounding box (lat 8.9430 to 9.2910, lon 7.0825 to 7.6350); manual pipe-delimited alias strings | Hand-curated coordinates and street aliases; no automated generation script. |
| `supabase/seed/anchors.csv` | 24 Virtual Anchor Points (safe filling station forecourts), coordinates, directions, 150m geofence, partner brands, multilingual boarding instructions | 24 | Personal knowledge of well-lit commercial filling stations along the 6 corridors | Coordinates with uniform 4-decimal precision inside Abuja bounding box (lat 8.9830 to 9.2794, lon 7.1965 to 7.6020); partner forecourt brand names (A.A. Rano, Oando, TotalEnergies, NNPC, Conoil) | Curated safe staging points; forecourt partner names are illustrative staging anchors. |
| `supabase/seed/corridors.csv` | 6 primary Abuja transit corridors, total length in meters, GeoJSON filenames, service hours | 6 | 6 major highway transit corridors recognized in Abuja commuter transit | IDs (`BWR-DUT-WUS`, `ZUB-KUB-WUS`, `ZUB-DEI-DUT`, `ZUB-KRM-JAB`, `GWL-LUG-AR1`, `MRB-NYA-CEN`); links to 7 GeoJSON polyline files in `data/corridor/`; lengths computed via Haversine formula in `backend/scripts/fetch_osm_abuja.py` | Defined corridor highway trunks. |
| `supabase/seed/fare_zones.csv` | Sequential transit fare zones along corridors, sequence order, start and end km boundaries | 20 | Division of corridors based on local commuter staging stops | Explicit sequence integers (`seq_order`) and boundary markers in meters (`start_km_m`, `end_km_m`) | Segmented zones based on commuter staging hubs. |
| `supabase/seed/fare_matrix.csv` | Origin-destination zone fare bands (street min/max, standard, peak, solo ridehail estimate, estimated km) | 75 | First-hand commuter knowledge, driver consultations, and observed roadside market rates | Static matrix in integer Kobo (`standard_fare_kobo`, `peak_fare_kobo`); calibrated against informal street rates (`street_min_kobo`, `street_max_kobo`) | Static lookup table; solo ridehail rates are illustrative baseline comparisons. |

## 3. Investigation of Coordinates, Kilometer Markers, and Aliases

- **Coordinate Precision**: All 24 anchors and 142 landmarks use uniform 4-decimal coordinates (e.g. 9.1779, 7.3736). This corresponds to roughly 11 meters precision, typical of manual pin placement on maps rather than high-frequency survey GPS logs. All coordinates lie strictly within the Abuja Federal Capital Territory bounding box (lat 8.4 to 9.4, lon 6.7 to 7.8).
- **Kilometer Markers**: The `km_marker` field measures route-distance in meters along each corridor polyline (from 50m to 38,100m). These markers serve linear referencing for downstream drop-off ordering. Rows in the CSV were added in batches as corridors expanded, so while individual markers denote sequential highway positions, CSV row ordering is not strictly monotonic.
- **Multilingual Aliases and Vector Embeddings**: Aliases in English (`aliases_en`), Nigerian Pidgin (`aliases_pcm`), and Hausa (`aliases_ha`) were hand-authored directly in `landmarks.csv` to capture natural commuter phrasing (e.g. "Dutse first gate", "Berger underbridge", "Banex junction"). There are exactly 1,122 unique alias strings defined across 142 landmarks, which expand to 1,247 indexed vector representations (including canonical names and area variants) in the FAISS index. No generative script produced these aliases. `backend/scripts/build_landmark_index.py` consumes these static lists to build local FAISS vector embeddings for semantic matching.
- **Fare Matrix**: Fares are stored as fixed integer values in `fare_matrix.csv`. At runtime, the resolver matches origin and destination zones against this table. If an unlisted zone pair is encountered, a documented fallback formula `round_to_100_naira(max(500, 350 + 55 * distance_km))` applies.

## 4. OpenStreetMap (OSM) Analysis and Finding

We audited the repository for OpenStreetMap usage and checked `backend/scripts/fetch_osm_abuja.py`:
1. **Runtime Ingestion**: OpenStreetMap is NOT queried at runtime. The FastAPI application makes zero calls to Overpass, Nominatim, or OSRM during user requests.
2. **Seed Generation**: The seed CSV files in `supabase/seed/` were authored directly and not generated from OSM exports. Git history confirms that `landmarks.csv` and `anchors.csv` originated with the initial commit and were not created by `fetch_osm_abuja.py`.
3. **Role of `fetch_osm_abuja.py`**: The script is an offline reference and verification utility. When executed with default options, it validates that local seed coordinates fall within the Abuja bounding box and calculate polyline lengths. Its `--online` flag contains code to query Overpass for fuel stations, but this output was never piped into the repository seed files.
4. **License Implications**: Because OpenStreetMap data was not extracted or incorporated into the published seed datasets, Open Database License (ODbL) share-alike obligations do not apply to the Along datasets.

## 5. Other Project Assets

- **Evaluation Audio (`data/clips/c01.ogg` to `c30.ogg`)**: 30 spoken audio clips recorded by me and my brother with mutual consent to benchmark slot extraction and ASR accuracy across English, Pidgin, and Hausa. Audio files are kept locally in `data/clips/` and ignored by git.
- **Demo Voice Note (`frontend/public/audio/pidgin_voice_note.ogg`)**: A sample voice note recorded by me and my brother for the simulated WhatsApp interface. The WhatsApp webhook handler exists but is not connected to a verified Meta Business account.
- **Replay Data (`data/replays/real_replay.json`)**: A captured interactive session exported via `backend/scripts/save_live_replay.py` for testing and offline demo review. It is labeled as a sample trace (illustrative estimate, source not recorded as a live street run).

## 6. Limitations and Disclaimers

- Coordinates and kilometer markers are approximate, field-compiled estimates intended for commuter route demonstration and not survey-grade GIS navigation.
- Fare levels represent illustrative approximations of Abuja informal commercial transit rates as of October 2026. They do not constitute regulated tariffs or live banking transactions.
- Market statistics and commuter population figures cited in documentation represent illustrative estimates (source not recorded).
