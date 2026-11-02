# Wrenfield greybox — in-engine walk replay

Real player controller (Physics.resolveCircle, multi-level floorY, 0.30 m capsule, run speed) replaying 38 route legs found by the geometric walk test. **0 failures.** Page errors: 0.

| Leg | From → To | Result | Sim time |
|---|---|---|---|
| R1.1 | G01 → G02 | PASS | 0.8 s |
| R1.2 | G02 → G03 | PASS | 0.6 s |
| R1.3 | G03 → G04 | PASS | 2.5 s |
| R2.1 | G03 → G06 | PASS | 1.8 s |
| R2.2 | G06 → G13 | PASS | 1.7 s |
| R2.3 | G13 → G14 | PASS | 1 s |
| R2.4 | G14 → G15 | PASS | 1.6 s |
| R3.1 | G06 → G09 | PASS | 1.8 s |
| R3.2 | G09 → G10 | PASS | 1 s |
| R3.3 | G10 → G11 | PASS | 1.7 s |
| R4.1 | G10 → G11 | PASS | 1.7 s |
| R4.2 | G11 → G12 | PASS | 0.9 s |
| R5.1 | G12 → G16 | PASS | 1 s |
| R5.2 | G16 → G20 | PASS | 1.3 s |
| R5.3 | G20 → G21 | PASS | 1 s |
| R6.1 | G10 → G16 | PASS | 4.8 s |
| R6.2 | G16 → G17 | PASS | 1.1 s |
| R7.1 | G05 → G22 | PASS | 1.6 s |
| R7.2 | G22 → O01 | PASS | 1.6 s |
| R7.3 | O01 → O02 | PASS | 1.6 s |
| R8.1 | G08 → U01 | PASS | 2.3 s |
| R8.2 | U01 → U07 | PASS | 0.9 s |
| R8.3 | U07 → U02 | PASS | 4.2 s |
| R8.4 | U02 → U03 | PASS | 3.9 s |
| R8.5 | U03 → U04 | PASS | 6 s |
| R8.6 | U04 → U09 | PASS | 7 s |
| R8.7 | U09 → U10 | PASS | 4.4 s |
| R8.8 | U10 → U11 | PASS | 3.7 s |
| R8.9 | U11 → U08 | PASS | 8.8 s |
| R9.1 | U10 → A01 | PASS | 18.4 s |
| R9.2 | A01 → A04 | PASS | 2.6 s |
| R10.1 | G11 → B01 | PASS | 3.5 s |
| R10.2 | B01 → B04 | PASS | 0.9 s |
| R10.3 | B04 → B06 | PASS | 2.8 s |
| R11.1 | B08 → B09 | PASS | 2 s |
| R11.2 | B09 → B10 | PASS | 1.9 s |
| R11.3 | B10 → B11 | PASS | 0.7 s |
| R12.1 | B13 → B10 | PASS | 2.8 s |

## Ladders / hatches / shafts (E to climb)

| Id | Before | After | Result |
|---|---|---|---|
| S04 | U10 Z 3.70 | A01 Z 7.00 | PASS |
| S06 | B11 Z -3.20 | B11 Z 0.00 | PASS |
| S07 | B13 Z -3.20 | O01 Z 0.00 | PASS |

## Screenshots

- greybox/follow-cellar.jpg
- greybox/follow-gallery.jpg
- greybox/follow-kitchen.jpg
- greybox/follow-portico.jpg
- greybox/follow-stair-foot.jpg
- greybox/follow-vestibule.jpg
- greybox/persp-basement-overview.jpg
- greybox/persp-cellar-landing.jpg
- greybox/persp-cellar-stair.jpg
- greybox/persp-ground-overview.jpg
- greybox/persp-stairhall.jpg
- greybox/persp-upper-landing.jpg
- greybox/top-A.png
- greybox/top-B.png
- greybox/top-G.png
- greybox/top-N.png
- greybox/top-U.png
