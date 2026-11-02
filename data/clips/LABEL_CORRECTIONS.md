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
