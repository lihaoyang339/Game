// Validates src/map/wrenfield.js against MAP V1.0 rules (§0, §6, §7, §11). Writes docs/map-validation.md.
import fs from 'node:fs';
import { ROOMS, DOORS, STAIRS, TYPEWRITERS, ROUTES, LEVELS, roomById, roomHeight } from '../src/map/wrenfield.js';

const E = 1e-6; const issues = []; const notes = []; const pass = [];
const err = (m) => issues.push(m), note = (m) => notes.push(m), ok = (m) => pass.push(m);
const ov = (a, b) => Math.min(a[1], b[1]) - Math.max(a[0], b[0]);
const lz = (r) => LEVELS[r.level].z;

// 1. overlaps (plan overlap AND vertical overlap)
let overl = 0;
for (let i = 0; i < ROOMS.length; i++) for (let j = i + 1; j < ROOMS.length; j++) {
  const a = ROOMS[i], b = ROOMS[j]; const ox = ov(a.x, b.x), oy = ov(a.y, b.y);
  if (ox <= E || oy <= E) continue;
  const az = [lz(a), lz(a) + roomHeight(a)], bz = [lz(b), lz(b) + roomHeight(b)];
  if (ov(az, bz) > 0.05) { err(`Room overlap ${a.id} ${a.name} × ${b.id} ${b.name}: ${ox.toFixed(1)}×${oy.toFixed(1)} m in plan, vertical overlap ${ov(az, bz).toFixed(2)} m`); overl++; }
}
if (!overl) ok('No two rooms overlap in plan within the same vertical band.');

// 2. doors on shared walls, inside both rooms, clear of corners, widths
const widthRule = { single: [1.0, 1.4], double: [1.6, 2.0], service: [0.8, 1.2], hidden: [0.9, 1.4], exterior: [0.9, 2.0], arch: [0.9, 4.0] };
for (const d of DOORS) {
  const a = roomById(d.a), b = roomById(d.b);
  if (!a || !b) { err(`${d.id}: unknown room ${!a ? d.a : d.b}`); continue; }
  const axis = d.wall === 'x' ? 'x' : 'y', other = d.wall === 'x' ? 'y' : 'x';
  const onA = Math.abs(a[axis][0] - d.at) < E || Math.abs(a[axis][1] - d.at) < E, onB = Math.abs(b[axis][0] - d.at) < E || Math.abs(b[axis][1] - d.at) < E;
  if (!onA || !onB) err(`${d.id} ${a.name}→${b.name}: wall ${d.wall.toUpperCase()}=${d.at} is not a boundary of ${!onA ? a.id : b.id}`);
  const opposite = (a[axis][0] - d.at) * (b[axis][0] - d.at) < 0 || Math.abs(a[axis][1] - b[axis][0]) < E || Math.abs(b[axis][1] - a[axis][0]) < E;
  if (!opposite) err(`${d.id}: rooms ${d.a} and ${d.b} are on the same side of the wall`);
  for (const r of [a, b]) {
    const lo = d.span[0] - r[other][0], hi = r[other][1] - d.span[1];
    if (lo < -E || hi < -E) err(`${d.id}: opening ${other.toUpperCase()}=${d.span.join('–')} extends outside ${r.id} ${r.name} (${other.toUpperCase()}=${r[other].join('–')})`);
    else if (Math.min(lo, hi) < 0.15 && r.kind !== 'outdoor') note(`${d.id}: opening is ${Math.min(lo, hi).toFixed(2)} m from a corner of ${r.id} — architrave will be trimmed`);
  }
  const za = a.ramp ? null : lz(a), zb = b.ramp ? null : lz(b);
  if (a.level !== b.level && !d.drop && za !== null && zb !== null) err(`${d.id}: joins different levels without a stair (${a.level}/${b.level})`);
  const w = d.span[1] - d.span[0]; const rule = widthRule[d.kind];
  if (rule && (w < rule[0] - E || w > rule[1] + E)) note(`${d.id}: width ${w.toFixed(2)} m outside the ${d.kind} range ${rule.join('–')} m (§0.2); kept as specified in the door table`);
  if (w < 0.8) err(`${d.id}: ${w.toFixed(2)} m is too narrow for the player (0.6 m capsule + clearance)`);
}
ok(`${DOORS.length} doors checked against shared walls.`);

// 3. stairs: footprint inside both rooms' plan, rise matches levels
for (const s of STAIRS) {
  const a = roomById(s.a), b = roomById(s.b);
  for (const r of (s.host ? [roomById(s.host)] : [a, b])) {
    if (r.kind === 'outdoor') continue;
    if (s.footprint.x[0] < r.x[0] - E || s.footprint.x[1] > r.x[1] + E || s.footprint.y[0] < r.y[0] - E || s.footprint.y[1] > r.y[1] + E) err(`${s.id}: footprint outside ${r.id} ${r.name}`);
  }
  const rise = Math.abs(lz(b) - lz(a));
  if (Math.abs(rise - s.rise) > 0.05) err(`${s.id}: stated rise ${s.rise} m but levels differ by ${rise.toFixed(2)} m`);
  if (s.type === 'straight') { const steps = Math.round(s.rise / 0.175); const len = Math.abs(s.run.to - s.run.from); const tread = len / (steps - 1); const riser = s.rise / steps;
    if (riser < 0.155 || riser > 0.195 || tread < 0.245 || tread > 0.305) err(`${s.id}: riser ${(riser * 100).toFixed(1)} cm / tread ${(tread * 100).toFixed(1)} cm outside §6 (16–19 / 25–30 cm)`); else ok(`${s.id}: ${steps} risers of ${(riser * 100).toFixed(1)} cm on ${(tread * 100).toFixed(1)} cm treads (§6).`); }
  if (s.type === 'dogleg') { const steps = Math.round(s.rise / 0.175); const run = (steps / 2) * 0.27; const len = Math.max(s.footprint.x[1] - s.footprint.x[0], s.footprint.y[1] - s.footprint.y[0]);
    if (run + 1.2 > len + E) err(`${s.id}: ${steps} risers need ${run.toFixed(2)} m per flight + 1.2 m landing > ${len.toFixed(2)} m available`); else ok(`${s.id}: ${steps} risers of ${(s.rise / steps * 100).toFixed(1)} cm, two flights of ${run.toFixed(2)} m fit in ${len.toFixed(1)} m (§6: 16–19 cm risers, 25–30 cm treads).`); }
}

// 4. typewriters
for (const t of TYPEWRITERS) {
  const r = roomById(t.room); const [x, y, z] = t.at;
  if (x < r.x[0] || x > r.x[1] || y < r.y[0] || y > r.y[1]) err(`${t.id}: (${x}, ${y}) not inside ${r.name}`);
  if (Math.abs(z - lz(r)) > 0.01) err(`${t.id}: Z=${z} but ${r.name} floor is Z=${lz(r)} (spec §7 lists ${z})`);
  const dw = Math.min(x - r.x[0], r.x[1] - x, y - r.y[0], r.y[1] - y);
  if (dw > 1.2) note(`${t.id}: ${dw.toFixed(2)} m from the nearest wall of ${r.name}; spec wants it against a wall/desk — desk will be placed to meet it`);
}

// 5. vertical support: upper rooms must sit over something
const covered = (r, lower) => { const N = 20; let miss = 0; for (let i = 0; i <= N; i++) for (let j = 0; j <= N; j++) { const x = r.x[0] + (r.x[1] - r.x[0]) * (0.02 + 0.96 * i / N), y = r.y[0] + (r.y[1] - r.y[0]) * (0.02 + 0.96 * j / N); if (!lower.some((q) => x >= q.x[0] - 0.4 && x <= q.x[1] + 0.4 && y >= q.y[0] - 0.4 && y <= q.y[1] + 0.4)) miss++; } return miss / ((N + 1) * (N + 1)); };
for (const [up, down] of [['U', 'G'], ['A', 'U']]) {
  const lower = ROOMS.filter((q) => q.level === down && q.kind !== 'outdoor');
  for (const r of ROOMS.filter((q) => q.level === up)) { const m = covered(r, lower); if (m > 0.05) note(`${r.id} ${r.name}: ${(m * 100).toFixed(0)}% of its floor has no ${down}-level room below — needs an external wall/structure beneath (built as a solid masonry base)`); }
}

// 6. connectivity graph
const edges = new Map(); const add = (a, b, lock, kind) => { if (!edges.has(a)) edges.set(a, []); edges.get(a).push({ to: b, lock, kind }); };
for (const d of DOORS) { add(d.a, d.b, d.lock, 'door'); if (!d.oneWayFrom || d.oneWayFrom === d.b) add(d.b, d.a, d.lock, 'door'); else add(d.b, d.a, 'one_way:' + d.oneWayFrom, 'door'); }
for (const s of STAIRS) { add(s.a, s.b, s.lock, 'stair'); add(s.b, s.a, s.oneWayFrom ? 'one_way:' + s.oneWayFrom : s.lock, 'stair'); }
const reach = (start, haveAll) => { const seen = new Set([start]); const q = [start]; while (q.length) { const c = q.shift(); for (const e of edges.get(c) || []) { if (e.lock && !haveAll) continue; if (e.lock && e.lock.startsWith('one_way') && haveAll !== 'ignoreOneWay') continue; if (!seen.has(e.to)) { seen.add(e.to); q.push(e.to); } } } return seen; };
const all = reach('G01', true); const unreached = ROOMS.filter((r) => !all.has(r.id));
if (unreached.length) err('Unreachable from the front portico even with every key: ' + unreached.map((r) => `${r.id} ${r.name}`).join(', ')); else ok(`All ${ROOMS.length} spaces reachable from the Front Portico once keys/puzzles are obtained.`);
const initial = reach('G01', false); note(`At game start (no keys): ${initial.size} spaces reachable — ${[...initial].join(' ')}`);
const path = (a, b) => { const prev = new Map([[a, null]]); const q = [a]; while (q.length) { const c = q.shift(); if (c === b) break; for (const e of edges.get(c) || []) { if (e.lock && e.lock.startsWith('one_way')) continue; if (!prev.has(e.to)) { prev.set(e.to, c); q.push(e.to); } } } if (!prev.has(b)) return null; const out = []; for (let c = b; c; c = prev.get(c)) out.unshift(c); return out; };
ROUTES.forEach((rt, i) => {
  const legs = []; let okR = true;
  for (let k = 0; k < rt.length - 1; k++) { const p = path(rt[k], rt[k + 1]); if (!p) { okR = false; legs.push(`${rt[k]}→${rt[k + 1]} NO PATH`); } else legs.push(p.join('→')); }
  if (okR) ok(`Route ${i + 1}: ${legs.join(' | ')}`); else err(`Route ${i + 1} fails: ${legs.join(' | ')}`);
});
// dead ends
for (const r of ROOMS) { const n = (edges.get(r.id) || []).length; if (n === 1 && r.kind !== 'outdoor') note(`${r.id} ${r.name} has a single connection (dead end by design?)`); }

const md = ['# Wrenfield map validation', '', `Source: \`src/map/wrenfield.js\` (transcribed from MAP V1.0). Generated by \`tools/validate-map.mjs\`.`, '',
  `**${issues.length} errors · ${notes.length} notes · ${pass.length} passes**`, '', '## Errors', ...(issues.length ? issues.map((x) => '- ' + x) : ['- none']), '', '## Notes (spec inconsistencies resolved, or deviations kept as specified)', ...notes.map((x) => '- ' + x), '', '## Assumptions (spec silent)',
  ...ROOMS.filter((r) => r.assumed).map((r) => `- ${r.id} ${r.name}: ${r.assumed}`), ...DOORS.filter((d) => d.assumed || d.note).map((d) => `- ${d.id}: ${d.assumed || d.note}`), ...STAIRS.filter((s) => s.assumed).map((s) => `- ${s.id}: ${s.assumed}`), '', '## Passes', ...pass.map((x) => '- ' + x), ''];
fs.writeFileSync('docs/map-validation.md', md.join('\n'));
console.log(md.slice(4, 6).join('\n')); issues.forEach((x) => console.log('ERR', x)); notes.slice(0, 40).forEach((x) => console.log('note', x));
process.exitCode = issues.length ? 1 : 0;
