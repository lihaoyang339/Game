# Wrenfield — Godot in-engine walk replay

Godot 4.7.2-stable (official), Jolt physics, real `Player` controller (capsule r 0.30 m, 1.72 m), keys held, running. 38 route legs, **0 failures**; ladders 2/3. Wall time 9.1 s.

| Leg | From → To | Result | Sim time |
|---|---|---|---|
| R1.1 | G01 → G02 | PASS | 2.0 s |
| R1.2 | G02 → G03 | PASS | 1.7 s |
| R1.3 | G03 → G04 | PASS | 6.1 s |
| R2.1 | G03 → G06 | PASS | 4.2 s |
| R2.2 | G06 → G13 | PASS | 4.4 s |
| R2.3 | G13 → G14 | PASS | 2.4 s |
| R2.4 | G14 → G15 | PASS | 3.9 s |
| R3.1 | G06 → G09 | PASS | 4.4 s |
| R3.2 | G09 → G10 | PASS | 2.4 s |
| R3.3 | G10 → G11 | PASS | 4.1 s |
| R4.1 | G10 → G11 | PASS | 4.1 s |
| R4.2 | G11 → G12 | PASS | 2.5 s |
| R5.1 | G12 → G16 | PASS | 2.6 s |
| R5.2 | G16 → G20 | PASS | 2.8 s |
| R5.3 | G20 → G21 | PASS | 2.4 s |
| R6.1 | G10 → G16 | PASS | 11.7 s |
| R6.2 | G16 → G17 | PASS | 2.7 s |
| R7.1 | G05 → G22 | PASS | 3.9 s |
| R7.2 | G22 → O01 | PASS | 3.8 s |
| R7.3 | O01 → O02 | PASS | 3.9 s |
| R8.1 | G08 → U01 | PASS | 5.9 s |
| R8.2 | U01 → U07 | PASS | 2.5 s |
| R8.3 | U07 → U02 | PASS | 10.5 s |
| R8.4 | U02 → U03 | PASS | 9.9 s |
| R8.5 | U03 → U04 | PASS | 15.1 s |
| R8.6 | U04 → U09 | PASS | 17.6 s |
| R8.7 | U09 → U10 | PASS | 10.5 s |
| R8.8 | U10 → U11 | PASS | 8.8 s |
| R8.9 | U11 → U08 | PASS | 21.6 s |
| R9.1 | U10 → A01 | PASS | 45.4 s |
| R9.2 | A01 → A04 | PASS | 6.6 s |
| R10.1 | G11 → B01 | PASS | 9.2 s |
| R10.2 | B01 → B04 | PASS | 2.5 s |
| R10.3 | B04 → B06 | PASS | 6.7 s |
| R11.1 | B08 → B09 | PASS | 4.9 s |
| R11.2 | B09 → B10 | PASS | 4.6 s |
| R11.3 | B10 → B11 | PASS | 2.0 s |
| R12.1 | B13 → B10 | PASS | 6.8 s |

| Ladder | Z before | Z after | Result |
|---|---|---|---|
| S04 | 3.70 | 7.00 | PASS |
| S06 | -3.20 | -3.20 | FAIL no walkable surface at the top in MAP V1.0 (exit shaft, handled as ending) |
| S07 | -3.24 | 0.00 | PASS |