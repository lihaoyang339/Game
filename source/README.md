# The Manor · 风暴宅邸 — Environment vertical slice

A survival-horror vertical slice with a third-person character and fixed cameras, built with **Three.js**: the ground-floor priority spaces of the manor
(foyer, living room, long gallery, study, dining room, kitchen, butler's pantry, servants' corridor, glass corridor, conservatory).
The focus of this stage is **environment art**: building construction, materials, composition, lighting and environmental storytelling.

## Running

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # output to dist/
npm run preview    # serve dist/
```
Controls: `WASD`/arrow keys to move (relative to the fixed camera; direction is held across cuts), `Shift` to run. Gamepad supported.
Append `?debug` to the URL to show FPS / camera / draw calls. Append `?q=low|medium|high|ultra` to set quality.

## Asset pipeline
```bash
npm run assets     # download from Poly Haven (MD5-checked), convert to GLB/WebP
node tools/validate-models.mjs   # model integrity checks (index range / NaN / normals / scale)
node tools/floorplan.mjs         # regenerate docs/floorplan-ground.svg from the room data in code
python3 tools/gen-assets-md.py   # regenerate ASSETS.md
```
Sources and licenses (all CC0): see `ASSETS.md`. Rejected assets and the reasons are also recorded there.

## Code structure
| Path | Contents |
|---|---|
| `src/world/arch.js` | Architecture kit: profile-extruded mouldings (skirting / dado rail / cornice / picture rail / architraves), raised-panel wainscot (two-tier when tall), walls with openings, coffered / beamed ceilings |
| `src/world/fixtures.js` | Doors (stiles, rails, panels + brass hardware), sash windows + rain glass + storm backdrop, velvet curtains, marble chimneypiece + embers / flames, Persian rugs, books, wall sconces |
| `src/world/furniture.js` | Pedestal desk, dining table (turned legs), library bookcases, cast-iron range, stone sink, work table, potting staging |
| `src/world/manormats.js` | Material library + ageing system (dust / grime / water stains / fading / checkerboard marble, all driven by world position) |
| `src/world/manor.js` | World assembly, room-scoped light pool (fixed light count, flicker / fire / lightning), fixed-camera director |
| `src/rooms/*.js` | One module per room. The header comment states its design intent |
| `src/actors/` | CC0 base characters + painted-on clothing shader + UAL animation |
| `tests/` | QA scripts (render actual game camera shots, model checks) |
| `docs/` | `rooms.md` environment design notes, `floorplan-ground.png`, `qa/` camera screenshots, `asset-contact-sheet.jpg` |

## QA
Each room was checked from its actual game cameras (18 fixed cameras in total) with the player placed in the room. The process is in `tests/tune.mjs`; screenshots are in `docs/qa/`.
The cloud environment has no GPU (SwiftShader software rendering), so QA images are 960×540; on a real GPU the game runs at full resolution.

## Wrenfield Manor (The Hollow Signal · MAP V1.0) — greybox
- Map data: `src/map/wrenfield.js` (spec coordinates, assumptions marked), layout: `src/map/layout.js`, greybox + physics: `src/map/greybox.js`, entry `wrenfield.html`.
- Tests: `npm run test:map` (validator → geometric walk → in-engine replay; the last needs a server on :5175, e.g. `SCRATCH=/tmp/qa tools/qa-server.sh`).
- Report: `docs/wrenfield-phase1.md`.

## macOS app
`tools/package-mac.sh <electron download dir>` → `release/mac/TheManor-mac-{AppleSilicon,Intel}.zip`: the unmodified,
SHA256-verified Electron 44.10.1 runtime + `mac-app/` (main.cjs serves `dist/` over an `app://` scheme, launcher menu) + the game.
Not signed/notarized (no Apple Developer ID available): first launch needs `Start-First-Time.command` or `xattr -cr`.
Tested by running the identical app payload in Electron 44 (Linux build, Xvfb): launcher, greybox 38/38 route legs, art slice — 0 errors.
