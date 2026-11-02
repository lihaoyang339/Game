// In-engine greybox validation (MAP V1.0 §11/§12 phase 1–2): loads wrenfield.html in Chromium,
// renders each level from above + perspective checks, then replays every walk-test route leg
// (docs/map-paths.json) with the REAL player controller, physics colliders and multi-level floors.
// Usage: node tests/map-walk.mjs [baseUrl]   (expects a dev/preview server; default http://localhost:5175)
import fs from 'node:fs';
import { chromium } from 'playwright';

const base = process.argv[2] || 'http://localhost:5175';
const out = 'docs/greybox'; fs.mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 860 } });
const errors = []; page.on('pageerror', (e) => errors.push(String(e))); page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
await page.goto(base + '/wrenfield.html?q=medium&scale=1', { waitUntil: 'load' });
await page.waitForFunction(() => window.__map && window.__map.ready(), null, { timeout: 240000 });
const save = (name, dataUrl) => fs.writeFileSync(`${out}/${name}`, Buffer.from(dataUrl.split(',')[1], 'base64'));

// 1. level overviews (orthographic, ceilings off)
for (const lvl of ['G', 'U', 'A', 'B', 'N']) save(`top-${lvl}.png`, await page.evaluate((l) => window.__map.top(l), lvl));

// 2. perspective check views (eye → look, spec coords)
const persp = [
  ['persp-stairhall', [21, 9, 2.6], [25.2, 12, 1.5], 60],
  ['persp-upper-landing', [21, 9, 6.0], [25, 13.5, 3.7], 60],
  ['persp-cellar-stair', [37, 17, 1.8], [40.2, 20, -1.5], 62],
  ['persp-cellar-landing', [37, 21, -1.4], [40.5, 17.5, -3.2], 62],
  ['persp-ground-overview', [-8, -14, 22], [18, 14, 0], 50],
  ['persp-basement-overview', [10, -6, 12], [22, 18, -3.2], 55],
];
for (const [n, eye, look, fov] of persp) save(`${n}.jpg`, await page.evaluate(([e, l, f]) => window.__map.view(e, l, f), [eye, look, fov]));

// 3. follow-camera shots at key spots
const follow = [['follow-portico', 18, -4, 0, 0], ['follow-vestibule', 18, 1.2, 0, 0], ['follow-gallery', 12, 6, 0, 90], ['follow-stair-foot', 23.5, 9.0, 0, 60], ['follow-kitchen', 28, 14, 0, 90], ['follow-cellar', 37.5, 20, -3.2, 120]];
await page.evaluate(() => window.__map.setUnlocked(true));
for (const [n, X, Y, Z, yaw] of follow) save(`${n}.jpg`, await page.evaluate(([a, b, c, d]) => window.__map.follow(a, b, c, d), [X, Y, Z, yaw]));

// 4. replay every route leg with the real controller (locks opened, as the geo test assumes keys held)
const paths = JSON.parse(fs.readFileSync('docs/map-paths.json', 'utf8'));
const res = [];
for (const p of paths) { const r = await page.evaluate((path) => window.__map.drive(path), p.path); res.push({ ...p, path: undefined, ...r }); }
// 5. ladder / shaft use (hatches): climb up, check level
const ladders = await page.evaluate(() => {
  const M = window.__map; M.setUnlocked(true); const out = [];
  for (const s of M.GB.ladders) {
    const u = s.use; M.teleport(u.x, u.y - 0.8, u.z0, 0); const b = M.where(); M.climb(); const a = M.where();
    out.push({ id: s.id, from: b, to: a, ok: Math.abs(a.Z - u.z1) < 0.05 || (u.oneWayFrom && Math.abs(a.Z - u.z0) < 0.05) });
  }
  return out;
});
const fails = res.filter((r) => !r.ok);
const md = ['# Wrenfield greybox — in-engine walk replay', '', `Real player controller (Physics.resolveCircle, multi-level floorY, 0.30 m capsule, run speed) replaying ${res.length} route legs found by the geometric walk test. **${fails.length} failures.** Page errors: ${errors.length}.`, '',
  '| Leg | From → To | Result | Sim time |', '|---|---|---|---|', ...res.map((r) => `| ${r.id} | ${r.from} → ${r.to} | ${r.ok ? 'PASS' : 'FAIL ' + r.why + ' at ' + JSON.stringify(r.at) + ` wp ${r.wp}/${r.of}`} | ${r.t ?? '-'} s |`), '',
  '## Ladders / hatches / shafts (E to climb)', '', '| Id | Before | After | Result |', '|---|---|---|---|', ...ladders.map((l) => `| ${l.id} | ${l.from.room} Z ${l.from.Z.toFixed(2)} | ${l.to.room} Z ${l.to.Z.toFixed(2)} | ${l.ok ? 'PASS' : 'FAIL'} |`), '',
  '## Screenshots', '', ...fs.readdirSync(out).filter((f) => /\.(png|jpg)$/.test(f)).sort().map((f) => `- greybox/${f}`), '', ...(errors.length ? ['## Page errors', '', ...errors.map((e) => '- ' + e)] : [])];
fs.writeFileSync('docs/map-walk.md', md.join('\n'));
console.log(`${res.length} legs, ${fails.length} failures; ladders ${ladders.filter((l) => l.ok).length}/${ladders.length}; errors ${errors.length}`);
fails.forEach((f) => console.log('FAIL', f.id, f.from, '→', f.to, f.why, JSON.stringify(f.at), f.wp, '/', f.of));
ladders.filter((l) => !l.ok).forEach((l) => console.log('LADDER FAIL', JSON.stringify(l)));
errors.slice(0, 5).forEach((e) => console.log('ERR', e));
await browser.close();
