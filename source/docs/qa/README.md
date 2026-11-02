# QA log · environment art

All images were rendered from the **actual game cameras** with the player placed at a representative spot (`tests/tune.mjs` → `window.__manor.shot`).
The final set is in `final/`: 18 room camera shots, plus 3 lightning-frame shots (`*_lightning.jpg`).
Earlier rounds (`r1`–`r5`) are kept to show how the problems were found and fixed.

## Problems found and fixed (in order)
| Round | Problem | Root cause | Fix |
|---|---|---|---|
| r1 | Whole frame nearly black | Physically based light units (cd) were calibrated far too low | Room light pool gets a global gain; exposure recalibrated |
| r1 | Huge twisted spikes in the foyer | The `.bin` for Poly Haven's `vintage_grandfather_clock_01` fails its own MD5 and is short by 128 bytes; the GPU was reading out-of-range data | Asset rejected (recorded in `ASSETS.md`) and replaced with a Gothic hall chair; added `tools/validate-models.mjs`; downloads now enforce MD5 |
| r1 | Blank screen with bloom enabled | Inf values from that corrupt geometry were spread across the whole frame by the bloom blur | Added a NaN/Inf sanitize pass before bloom |
| r2 | Large blue-black "voids" (foyer / gallery / study / living-room corner) | The conservatory and glass corridor's outdoor storm backdrop planes were placed inside the house | Backdrops limited to areas outside the building's footprint |
| r2 | Walnut wainscot looked milky, marble looked glaring white | The environment map is a daytime interior HDR, so reflections were too strong | Night calibration factor `ENV_K = 0.16` applied to env reflections |
| r2 | Study's `dark_paneled_wood` texture read as tiles | Texture choice | Replaced with real two-tier raised walnut panelling (`arch.js` automatically goes two-tier on tall wainscot) plus an olive plaster frieze |
| r2 | Conservatory lower glass read as milky slabs, camera clipped through tie rods, rain rendered as square points | Material / camera height / particle type | All glass switched to rain glass; camera lowered below the eaves; rain changed to line streaks |
| r3 | Overexposed and too orange | Global gain too high; firelight colour too saturated | Gain 16 → 8.5, warm colour desaturated, saturation 0.78 |
| r4 | Foyer / dining / study too dark | Neighbouring rooms' lights were taking the current room's light slots | Pool priority now favours the current room (+10) |
| r4 | Gallery cameras clipped through the wall / blown out by a sconce | Camera placement | Cameras moved |
| r4 | Kitchen tile wainscot looked like white board | UV repeat too small, glaze too bright | Repeat 1.3 m, aged off-white tone, stronger normals |
| r4 | Servants' corridor stains looked like camouflage | Texture plus water stains layered too heavily | Switched to painted plaster + a single water stain |
| r4 | Player looked bare-skinned | Olive clothing was too close to skin tone and too tight | Dark waxed jacket + dark denim, cloth bulk ×1.9 |
| r5/final | Half-torn curtain twisted like a ribbon, conservatory lightning blown out | Geometry tweak / flash strength | Removed / reduced |

## Functional checks
- `window.__manor.connectivity()`: with all unlocked doors open, runs A* pathfinding on a 0.25 m navigation grid from the foyer to every room's spawn point. It also checks that the jib door works one way from the service side, and that locked doors stay blocked.
- `tools/validate-models.mjs`: 83 runtime models pass all checks (index range / finite vertices / normals / UVs / plausible bounds).
- Page console errors: 0 (recorded in each round's `shots.json`).
