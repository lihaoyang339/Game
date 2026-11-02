# Wrenfield Manor — Phase 1 greybox (MAP V1.0 §12)

Status: **built and verified by actually walking it in the engine.**

| Check | Tool | Result |
|---|---|---|
| Map data vs spec rules (overlaps, doors on shared walls, widths, stairs, typewriters, connectivity, 12 routes) | `npm run map:validate` → docs/map-validation.md | 0 errors · 30 notes (documented spec conflicts/assumptions) |
| Geometric capsule search over real walls/lintels/locked leaves/guards/under-stair mass/voids (every door, every route leg, locks really block) | `npm run map:geo` → docs/map-geo-test.md | 105 checks, 0 failures |
| In-engine replay with the real player controller (Physics.resolveCircle + multi-level floors), every route leg; ladders/hatches/shafts | `npm run map:walk` → docs/map-walk.md | 38/38 legs, 3/3 ladders, 0 page errors (dev server, production build, and the packaged zip served by `python -m http.server`) |

Run it: `npx vite` then open `/wrenfield.html` (or the packaged launchers 「启动地图灰盒-Windows.bat」 / `start-greybox-mac-linux.sh`).
Controls: WASD, Shift run, E climb, M level plan view, K debug unlock-all.

Screenshots: `docs/greybox/` — `top-{G,U,A,B,N}.png` level plans, `persp-*.jpg` stair checks, `follow-*.jpg` player views.

## Changes made during phase 1 (all geometric, no room or stair moved to another room)
- Straight flights: guards on every open long side, open for the first 0.6 m (side entry at the foot) and last 1.0 m (step off at the head); the under-stair volume is solid.
- S03 (cellar stair) held 1.1 m off the east wall of G12/B01 — against the wall it would bury Pump Room door B-D02. Still inside the Cellar Stair room, same direction, same chain lock.
- B10 drainage tunnel ramp finishes at X=3.4 (was 1.5) so the Outer Sluice door B-D13 sits on level floor instead of a 0.44 m step.
- Assumed shed path O04 widened to X −22…−10, Y 25…30 with D-O04 on its south side (a 2 m strip was too narrow once wall thickness exists).
- Door thresholds: walls on ramp/drop rooms get a sill below the lower floor and a lintel 2.3 m (2.6 m double) above the higher floor.
- Player controller refuses to step onto missing floor (multi-level maps).

## Not done yet (next phases, spec order)
Phase 2 fixed camera zones per room (spec camera ids CF/CU/CA/CB) and sightline review · phase 3 architectural detail
(moving the drawing-room joinery/chimney/window kit into G04 etc.) · phase 4 furniture/narrative · phase 5 story, items,
puzzles, typewriter saves, The Listener AI, threat director, endings, UI, audio · phase 6 full acceptance tests.
