// Geometric walk test (spec §11.3/§11.4): searches the built geometry — real walls, lintels, locked
// leaves, balustrades, under-stair mass, floors, stair ramps, slab voids — with the player capsule (r=0.3 m,
// 1.7 m tall, 0.45 m step). Checks every door, every required route, and that locks really block.
// Writes docs/map-geo-test.md and docs/map-paths.json (the found paths, replayed in-engine by tests/map-walk.mjs).
import fs from 'node:fs';
import { DOORS, ROUTES, roomById } from '../src/map/wrenfield.js';
import { buildLayout } from '../src/map/layout.js';
import { makeWalker } from '../src/map/walk.js';

const L = buildLayout(); const W = makeWalker(L);
const results = []; let fails = 0; const paths = []; const fullPaths = [];
// doors: from 0.75 m inside room a (in front of the door) to anywhere inside room b
for (const d of DOORS) {
  const a = roomById(d.a), b = roomById(d.b); const c = (d.span[0] + d.span[1]) / 2;
  const sideA = d.wall === 'x' ? (a.x[1] <= d.at + 1e-6 ? -1 : 1) : (a.y[1] <= d.at + 1e-6 ? -1 : 1);
  const p = d.wall === 'x' ? [d.at + sideA * 0.75, c] : [c, d.at + sideA * 0.75];
  const za = a.ramp ? W.floor(p[0], p[1], W.lz(a) + 0.5) : W.lz(a);
  const res = W.walk([p[0], p[1], za], W.inRoom(b), true, 400000);
  results.push({ t: 'door', id: d.id, label: `${a.name} → ${b.name}`, ok: res.ok, why: res.why }); if (!res.ok) fails++;
}
// routes (keys/puzzles assumed solved; one-way doors respected by direction of travel)
ROUTES.forEach((rt, n) => {
  for (let k = 0; k < rt.length - 1; k++) {
    const a = roomById(rt[k]), b = roomById(rt[k + 1]); const res = W.walk(W.centre(a), W.inRoom(b), true);
    results.push({ t: 'route', id: `R${n + 1}.${k + 1}`, label: `${a.name} → ${b.name}`, ok: res.ok, why: res.why }); if (!res.ok) fails++;
    if (res.ok) { paths.push({ id: `R${n + 1}.${k + 1}`, from: a.id, to: b.id, path: res.path.filter((_, i, arr) => i % 3 === 0 || i === arr.length - 1) }); fullPaths.push({ id: `R${n + 1}.${k + 1}`, from: a.id, to: b.id, path: res.path }); }
  }
});
// locks really block: with locks closed, Kitchen must be unreachable from the gallery, upper wing from stair hall
for (const [from, to, want] of [['G03', 'G10', false], ['G08', 'U07', false], ['G03', 'G06', true]]) {
  const res = W.walk(W.centre(roomById(from)), W.inRoom(roomById(to)), false); const okk = res.ok === want;
  results.push({ t: 'lock', id: `${from}→${to}`, label: `${roomById(from).name} → ${roomById(to).name} with no keys: ${want ? 'reachable' : 'blocked'} expected`, ok: okk }); if (!okk) fails++;
}
const md = ['# Wrenfield geometric walk test', '', `Capsule r=0.30 m, h=1.70 m, step 0.45 m, grid 0.2 m, no corner cutting. ${results.length} checks, **${fails} failures**.`, '', '| Check | Path | Result |', '|---|---|---|', ...results.map((r) => `| ${r.t} ${r.id} | ${r.label} | ${r.ok ? 'PASS' : 'FAIL ' + (r.why || '')} |`), ''];
fs.writeFileSync('docs/map-geo-test.md', md.join('\n'));
fs.writeFileSync('docs/map-paths.json', JSON.stringify(paths));
fs.writeFileSync('docs/map-paths-full.json', JSON.stringify(fullPaths));
console.log(`walls ${L.walls.length}, colliders ${L.colliders.length}, surfaces ${L.surfaces.length}`); console.log(`${results.length} checks, ${fails} failures`);
results.filter((r) => !r.ok).forEach((r) => console.log('FAIL', r.t, r.id, r.label, r.why || ''));
process.exitCode = fails ? 1 : 0;
