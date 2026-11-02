// Exports the Wrenfield MAP V1.0 data and the built layout (walls/openings/colliders/surfaces/slabs/stairs)
// for the Godot port: godot/data/wrenfield.json (+ route paths found by tests/map-geo-test.mjs).
import fs from 'node:fs';
import { LEVELS, ROOMS, DOORS, STAIRS, TYPEWRITERS, KEY_ITEMS, ROUTES } from '../src/map/wrenfield.js';
import { buildLayout } from '../src/map/layout.js';
const L = buildLayout();
const paths = JSON.parse(fs.readFileSync(fs.existsSync('docs/map-paths-full.json') ? 'docs/map-paths-full.json' : 'docs/map-paths.json', 'utf8'));
const out = { version: 1, coords: 'spec: X east, Y north, Z up; engine x=X, y=Z, z=-Y', LEVELS, ROOMS, DOORS, STAIRS, TYPEWRITERS, KEY_ITEMS, ROUTES, layout: L, paths };
fs.writeFileSync('godot/data/wrenfield.json', JSON.stringify(out));
console.log(`rooms ${ROOMS.length}, doors ${DOORS.length}, stairs ${STAIRS.length}, walls ${L.walls.length}, colliders ${L.colliders.length}, surfaces ${L.surfaces.length}, slabs ${L.slabs.length}, paths ${paths.length}`);
