# Label Corrections Log

## Applied Replacements

| Row | Field | Old Value | New Value | Reason |
|---|---|---|---|---|
| c01 | drop | Berger Roundabout / Underbridge | Berger Roundabout Underbridge | name not in seed data; mapped to canonical name |
| c02 | pickup | Wuse Market | Wuse Market Main Gate | name not in seed data; mapped to canonical name |
| c03 | pickup | Gwarinpa 3rd Avenue Gate | Gwarinpa Third Avenue Setraco Gate | name not in seed data; mapped to canonical name |
| c03 | drop | Federal Secretariat / Eagle Square | Federal Secretariat Eagle Square | mapped to exact canonical name on shared corridor BWR-DUT-WUS |
| c04 | pickup | Jabi Motor Park / Jabi Lake | Jabi Motor Park Garage | name not in seed data; mapped to canonical name |
| c04 | drop | Zuba Interchange / Motor Park | Zuba Motor Park Interchange | name not in seed data; mapped to canonical name |
| c05 | pickup | Area 1 Roundabout / Old Secretariat | Area 1 Roundabout Garki Old Secretariat | name not in seed data; mapped to canonical name |
| c05 | drop | Lugbe Police Signboard / FHA / Kapwa | Lugbe Police Signboard | name not in seed data; mapped to canonical name |
| c06 | pickup | Kubwa Arab Road / Gate 1 / Gate 2 | Kubwa Arab Road Junction | name not in seed data; mapped to canonical name |
| c06 | drop | Wuse Zone 4 / Sheraton Junction | Wuse Zone 4 Sheraton Bridge | name not in seed data; mapped to canonical name |
| c07 | pickup | Nyanya Underbridge / Kugbo | Nyanya Underbridge Motor Park | name not in seed data; mapped to canonical name |
| c08 | drop | Berger Roundabout / Underbridge | Berger Roundabout Underbridge | name not in seed data; mapped to canonical name |
| c09 | drop | Dawaki Junction | Dawaki Hillside Junction | name not in seed data; mapped to canonical name |
| c10 | pickup | Kubwa Arab Road / Gate 1 / Gate 2 | Kubwa Arab Road Junction | name not in seed data; mapped to canonical name |
| c10 | drop | Mabushi Interchange / VIO | Mabushi Interchange VIO | name not in seed data; mapped to canonical name |
| c11 | drop | Wuse Market | Wuse Market Main Gate | name not in seed data; mapped to canonical name |
| c12 | pickup | Zuba Interchange / Motor Park | Zuba Motor Park Interchange | name not in seed data; mapped to canonical name |
| c12 | drop | Dei-Dei Building Materials / Timber Market | Dei-Dei Building Materials Market | name not in seed data; mapped to canonical name |
| c13 | pickup | Lugbe Police Signboard / FHA / Kapwa | Lugbe Police Signboard | name not in seed data; mapped to canonical name |
| c13 | drop | Area 1 Roundabout / Old Secretariat | Area 1 Roundabout Garki Old Secretariat | name not in seed data; mapped to canonical name |
| c14 | pickup | Mararaba Orange Market / Sharp Corner | Mararaba Orange Market Junction | name not in seed data; mapped to canonical name |
| c15 | drop | Berger Roundabout / Underbridge | Berger Roundabout Underbridge | name not in seed data; mapped to canonical name |
| c16 | pickup | Wuse Market | Wuse Market Main Gate | name not in seed data; mapped to canonical name |
| c17 | pickup | Zuba Interchange / Motor Park | Zuba Motor Park Interchange | name not in seed data; mapped to canonical name |
| c17 | drop | Dei-Dei Building Materials / Timber Market | Dei-Dei Building Materials Market | name not in seed data; mapped to canonical name |
| c18 | pickup | Lugbe Police Signboard / FHA / Kapwa | Lugbe Police Signboard | name not in seed data; mapped to canonical name |
| c18 | drop | Area 1 Roundabout / Old Secretariat | Area 1 Roundabout Garki Old Secretariat | name not in seed data; mapped to canonical name |
| c19 | drop | Wuse Market | Wuse Market Main Gate | name not in seed data; mapped to canonical name |
| c20 | drop | Berger Roundabout / Underbridge | Berger Roundabout Underbridge | name not in seed data; mapped to canonical name |
| c21 | pickup | Dawaki Junction | Dawaki Hillside Junction | name not in seed data; mapped to canonical name |
| c21 | drop | Wuse Zone 4 / Sheraton Junction | Wuse Zone 4 Sheraton Bridge | name not in seed data; mapped to canonical name |
| c22 | pickup | Berger Roundabout / Underbridge | Berger Roundabout Underbridge | name not in seed data; mapped to canonical name |

## Tagged Rows (Step 3)

- c04: `label_uncertain: spoken place may differ from label; no_shared_corridor`
- c06: `no_shared_corridor`
- c07: `no_shared_corridor`
- c10: `no_shared_corridor`
- c22: `label_uncertain: spoken place may differ from label`
- c23: `no_shared_corridor`

## Unresolved Items (Step 6)

The following rows were left with label `Federal Secretariat / Eagle Square` unchanged per Step 2 Item 6:

1. **Row c07** (pickup: `Nyanya Underbridge Motor Park`, corridor: `MRB-NYA-CEN`):
   - Spoken destination mention: "Central Area"
   - Seed data contains 0 canonical landmarks/anchors mentioning "Central Area" on corridor `MRB-NYA-CEN` (all 5 seed Central Area landmarks/anchors are on `BWR-DUT-WUS`).
   - Candidates in seed data (all on `BWR-DUT-WUS`):
     - `NNPC Towers Central Area` (corridor: BWR-DUT-WUS, km: 34800)
     - `National Mosque Junction Central Area` (corridor: BWR-DUT-WUS, km: 35100)
     - `Ceddi Plaza Central Business District` (corridor: BWR-DUT-WUS, km: 35300)
     - `NNPC Mega Station (Central Area Outbound)` (anchor, corridor: BWR-DUT-WUS, km: 35900)
     - `Federal Secretariat Eagle Square` (corridor: BWR-DUT-WUS, km: 36000)
   - Status: Unresolved (0 shared corridor candidates). Left unchanged.

2. **Row c23** (pickup: `Katampe Extension Bridge`, corridor: `BWR-DUT-WUS`):
   - Spoken destination mention: "Central Area"
   - Seed data contains 5 canonical landmarks/anchors mentioning "Central Area" on shared corridor `BWR-DUT-WUS`:
     - `NNPC Towers Central Area` (corridor: BWR-DUT-WUS, km: 34800)
     - `National Mosque Junction Central Area` (corridor: BWR-DUT-WUS, km: 35100)
     - `Ceddi Plaza Central Business District` (corridor: BWR-DUT-WUS, km: 35300)
     - `NNPC Mega Station (Central Area Outbound)` (anchor, corridor: BWR-DUT-WUS, km: 35900)
     - `Federal Secretariat Eagle Square` (corridor: BWR-DUT-WUS, km: 36000)
   - Status: Unresolved (5 candidates exist on shared corridor; rule requires exactly 1). Left unchanged.
## Corridor Membership and Route Connectivity Analysis (Steps 2 to 4)

### Matcher Corridor Membership Rule (Step 2)
In the Along codebase, corridor membership and trip connectivity are evaluated as follows:
- **Seed Assignment**: Each landmark and anchor has a primary `corridor_id` and `zone_id` seeded in `supabase/seed/landmarks.csv` and `anchors.csv`.
- **Connecting Corridor Selection**: Implemented in `_select_shared_corridor(orig, dest, catalog)` (`backend/app/ai/landmarks/resolver.py`):
  1. If `orig.corridor_id == dest.corridor_id`, returns `orig.corridor_id`.
  2. If they differ, looks up `catalog.fare_matrix` rows connecting `orig.zone_id` and `dest.zone_id` (or symmetric reverse) and returns `row.corridor_id`.
  3. Falls back to `orig.corridor_id` if no matrix row pairs the zones.
- **Direction Inference**:
  - Same corridor: `infer_corridor_direction(origin_km_marker, dest_km_marker)` (`backend/app/matching/corridor.py`) checks `abs(dest_km_marker - origin_km_marker) < BusinessRules.MIN_TRIP_DISTANCE_M` (800 meters); raises `ShortTripError` if under 800m. Returns `S` if `delta > 0` else `N`.
  - Cross-corridor: `resolve_route_and_quote` (`backend/app/ai/landmarks/resolver.py`) checks `haversine_distance_m(orig_lmk.lat, orig_lmk.lng, dest_lmk.lat, dest_lmk.lng) < 800` (threshold 800m); direction is `S` if `dest_lmk.lat <= orig_lmk.lat` else `N`.
- **Anchor Snapping Thresholds**: `snap_to_anchor` (`backend/app/matching/anchors.py`) uses `snap_radius_m` (4500m passed in `resolver.py`, default 600m `BusinessRules.ANCHOR_SNAP_RADIUS_M`), `fallback_radius_m` (2500m `BusinessRules.ANCHOR_FALLBACK_RADIUS_M`), and checks all active network anchors if the closest same-corridor anchor exceeds 900.0m.
- **Polyline Geometric Projection**: `project_point_onto_polyline_m` (`backend/app/matching/corridor.py`) projects points onto GeoJSON polylines to compute `km_marker` linear referencing during offline preparation (`backend/scripts/fetch_osm_abuja.py`) and tests. Runtime corridor matching does not evaluate polyline distance threshold projections; it relies on seeded `corridor_id` values and fare matrix zone pairs.

### Federal Secretariat, Eagle Square, and Central Area Seed Rows (Step 3)
The seed CSVs contain 4 landmarks and 1 anchor matching "Federal Secretariat", "Eagle Square", or "Central Area":
- `NNPC Towers Central Area` | raw corridor_id: `BWR-DUT-WUS` | km_marker: 34800
- `National Mosque Junction Central Area` | raw corridor_id: `BWR-DUT-WUS` | km_marker: 35100
- `Ceddi Plaza Central Business District` | raw corridor_id: `BWR-DUT-WUS` | km_marker: 35300
- `Federal Secretariat Eagle Square` | raw corridor_id: `BWR-DUT-WUS` | km_marker: 36000
- `NNPC Mega Station (Central Area Outbound)` | raw corridor_id: `BWR-DUT-WUS` | km_marker: 35900 (anchor)

**Corridor Duplication**: None. Landmark and anchor names are unique across all rows in the seed CSVs.

### Corridor Evaluation for Evaluated Rows (Step 4)
Applying the matcher connectivity rule (`_select_shared_corridor` and `fare_matrix`):
- **c03**: `Gwarinpa Third Avenue Setraco Gate` to `Federal Secretariat Eagle Square`
  - Pickup corridor: `BWR-DUT-WUS` (`ZONE-GWA`, km 22400)
  - Drop corridor: `BWR-DUT-WUS` (`ZONE-CEN`, km 36000)
  - Shared corridor: `BWR-DUT-WUS` (forward / S, km delta +13600m). Single-corridor trip: YES.
- **c04**: `Jabi Motor Park Garage` to `Zuba Motor Park Interchange`
  - Pickup corridor: `ZUB-KRM-JAB` (`ZONE-JBI-UTK`, km 22900)
  - Drop corridor: `ZUB-KUB-WUS` (`ZONE-ZUB`, km 500)
  - Shared corridor: `ZUB-KRM-JAB` via fare matrix row connecting `ZONE-ZUB` and `ZONE-JBI-UTK` (reverse / N, Haversine 25.4km). Single-corridor trip: YES.
- **c06**: `Kubwa Arab Road Junction` to `Wuse Zone 4 Sheraton Bridge`
  - Pickup corridor: `ZUB-KUB-WUS` (`ZONE-KUB`, km 13300)
  - Drop corridor: `BWR-DUT-WUS` (`ZONE-WUS`, km 33650)
  - Shared corridor: `ZUB-KUB-WUS` via fare matrix row connecting `ZONE-KUB` and `ZONE-WUS` (forward / S, Haversine 19.6km). Single-corridor trip: YES.
- **c07**: `Nyanya Underbridge Motor Park` to `Federal Secretariat Eagle Square`
  - Pickup corridor: `MRB-NYA-CEN` (`ZONE-NYA-KUG`, km 10300)
  - Drop corridor: `BWR-DUT-WUS` (`ZONE-CEN`, km 36000)
  - Shared corridor: `MRB-NYA-CEN` via fare matrix row connecting `ZONE-NYA-KUG` and `ZONE-CEN` (forward / S, Haversine 8.8km). Single-corridor trip: YES.
- **c10**: `Kubwa Arab Road Junction` to `Mabushi Interchange VIO`
  - Pickup corridor: `ZUB-KUB-WUS` (`ZONE-KUB`, km 13300)
  - Drop corridor: `BWR-DUT-WUS` (`ZONE-MAB-BER`, km 28800)
  - Shared corridor: `ZUB-KUB-WUS` via fare matrix row connecting `ZONE-KUB` and `ZONE-MAB-BER` (forward / S, Haversine 15.3km). Single-corridor trip: YES.
- **c22**: `Berger Roundabout Underbridge` to `Oando Filling Station (After Katampe Ext Bridge)`
  - Pickup corridor: `BWR-DUT-WUS` (`ZONE-MAB-BER`, km 30200)
  - Drop corridor: `BWR-DUT-WUS` (`ZONE-KAT-OAN`, km 26100)
  - Shared corridor: `BWR-DUT-WUS` (reverse / N, km delta -4100m). Single-corridor trip: YES.
- **c23**: `Katampe Extension Bridge` to `Federal Secretariat Eagle Square`
  - Pickup corridor: `BWR-DUT-WUS` (`ZONE-KAT-OAN`, km 25600)
  - Drop corridor: `BWR-DUT-WUS` (`ZONE-CEN`, km 36000)
  - Shared corridor: `BWR-DUT-WUS` (forward / S, km delta +10400m). Single-corridor trip: YES.

### Contradictions with Previous Report
The previous report relied exclusively on checking equality between raw CSV `corridor_id` strings and reported that c04, c06, c07, c10, and c23 had no shared corridor:
- **c04**: Previously tagged `no_shared_corridor`. Contradiction: Shared corridor `ZUB-KRM-JAB` connects `ZONE-JBI-UTK` and `ZONE-ZUB` in the fare matrix.
- **c06**: Previously tagged `no_shared_corridor`. Contradiction: Shared corridor `ZUB-KUB-WUS` connects `ZONE-KUB` and `ZONE-WUS` in the fare matrix.
- **c07**: Previously tagged `no_shared_corridor`. Contradiction: Shared corridor `MRB-NYA-CEN` connects `ZONE-NYA-KUG` and `ZONE-CEN` in the fare matrix.
- **c10**: Previously tagged `no_shared_corridor`. Contradiction: Shared corridor `ZUB-KUB-WUS` connects `ZONE-KUB` and `ZONE-MAB-BER` in the fare matrix.
- **c23**: Previously tagged `no_shared_corridor`. Contradiction: Pickup and drop both sit on corridor `BWR-DUT-WUS` (`ZONE-KAT-OAN` to `ZONE-CEN`) with a shared corridor.
