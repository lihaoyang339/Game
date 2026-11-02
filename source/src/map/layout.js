// Pure geometry layout for Wrenfield (no DOM / no THREE): walls with openings, floor/ceiling slabs,
// stairs, colliders and walkable surfaces. Spec coordinates (X east, Y north, Z up).
// Wall rule (resolves "interior clear dims" vs shared boundaries): shared walls are centred on the
// boundary (0.20 m, each side loses 0.10 m), exterior walls are built outward (0.35 m).
import { ROOMS, DOORS, STAIRS, LEVELS, roomHeight } from './wrenfield.js';

const SHARED = 0.2, EXT = 0.35, E = 1e-6;
const zOf = (r) => LEVELS[r.level].z;
const solid = (r) => r.kind !== 'outdoor';

// collect door openings per wall line for quick lookup
function openingsOn(axis, at, level, s0, s1) {
  return DOORS.filter((d) => d.wall === axis && Math.abs(d.at - at) < E && [d.a, d.b].some((id) => ROOMS.find((r) => r.id === id).level === level || (ROOMS.find((r) => r.id === id).ramp)))
    .map((d) => ({ s0: Math.max(s0, d.span[0]), s1: Math.min(s1, d.span[1]), door: d })).filter((o) => o.s1 - o.s0 > 0.05);
}

// threshold height of a door: the higher of the two floors at the opening (ramp rooms: slope height there)
function doorBase(d, mid) {
  const at = (r) => { if (!r.ramp) return zOf(r); const v = r.ramp.axis === (d.wall === 'x' ? 'x' : 'y') ? d.at : mid; const t = Math.min(1, Math.max(0, (v - r.ramp.from) / (r.ramp.to - r.ramp.from))); return r.ramp.z0 + (r.ramp.z1 - r.ramp.z0) * t; };
  const a = ROOMS.find((r) => r.id === d.a), b = ROOMS.find((r) => r.id === d.b);
  return [Math.min(at(a), at(b)), Math.max(at(a), at(b))];
}

export function buildLayout() {
  const walls = []; const slabs = []; const colliders = []; const surfaces = []; const stairs = [];
  for (const r of ROOMS) {
    const z = zOf(r); const h = roomHeight(r);
    // floor surface (walkable) + slab
    if (r.ramp) surfaces.push({ room: r.id, x: r.x, y: r.y, ramp: r.ramp });
    else surfaces.push({ room: r.id, x: r.x, y: r.y, z });
    slabs.push({ room: r.id, kind: 'floor', x: r.x, y: r.y, z: r.ramp ? Math.min(r.ramp.z0, r.ramp.z1) : z, t: 0.15, outdoor: !solid(r), ramp: r.ramp });
    if (solid(r)) slabs.push({ room: r.id, kind: 'ceiling', x: r.x, y: r.y, z: (r.ramp ? Math.max(r.ramp.z0, r.ramp.z1) : z) + h, t: 0.15 });
    if (!solid(r)) continue;
    // four edges; split each into exterior vs shared runs
    const edges = [
      { axis: 'y', at: r.y[0], s: r.x, out: -1 }, { axis: 'y', at: r.y[1], s: r.x, out: 1 },
      { axis: 'x', at: r.x[0], s: r.y, out: -1 }, { axis: 'x', at: r.x[1], s: r.y, out: 1 },
    ];
    for (const e of edges) {
      const other = e.axis === 'y' ? 'x' : 'y';
      // neighbours across this edge on the same level (or ramp rooms), solid or outdoor
      const nb = ROOMS.filter((q) => q !== r && (q.level === r.level || q.ramp || r.ramp) && Math.abs((e.out > 0 ? q[e.axis][0] : q[e.axis][1]) - e.at) < E && Math.min(q[other][1], e.s[1]) - Math.max(q[other][0], e.s[0]) > E);
      // breakpoints
      const pts = new Set([e.s[0], e.s[1]]); for (const q of nb) { pts.add(Math.max(q[other][0], e.s[0])); pts.add(Math.min(q[other][1], e.s[1])); }
      const P = [...pts].sort((a, b) => a - b);
      for (let i = 0; i < P.length - 1; i++) {
        const a = P[i], b = P[i + 1]; if (b - a < E) continue; const mid = (a + b) / 2;
        const q = nb.find((n) => n[other][0] - E <= mid && n[other][1] + E >= mid);
        if (q && solid(q) && q.id < r.id && q.level === r.level) continue; // shared wall already built by the other room
        const shared = q && solid(q);
        const t = shared ? SHARED : EXT; const off = shared ? 0 : e.out * EXT / 2;
        // vertical extent covers both rooms (ramp rooms span their whole slope)
        const lowOf = (x) => (x.ramp ? Math.min(x.ramp.z0, x.ramp.z1) : zOf(x)), highOf = (x) => (x.ramp ? Math.max(x.ramp.z0, x.ramp.z1) : zOf(x)) + roomHeight(x);
        const wz0 = Math.min(lowOf(r), q && solid(q) ? lowOf(q) : Infinity), wz1 = Math.max(highOf(r), q && solid(q) ? highOf(q) : -Infinity);
        const ops = openingsOn(e.axis, e.at, r.level, a, b);
        walls.push({ room: r.id, neighbour: q?.id ?? null, axis: e.axis, at: e.at + off, s: [a, b], t, z0: wz0 - 0.15, z1: wz1 + 0.15, openings: ops.map((o) => ({ s: [o.s0, o.s1], h: o.door.kind === 'double' ? 2.6 : o.door.kind === 'hatch' ? 0 : 2.3, base: doorBase(o.door, (o.s0 + o.s1) / 2), door: o.door.id, lock: o.door.lock || null, kind: o.door.kind })), exterior: !shared });
      }
    }
  }
  // wall colliders: split around openings
  for (const w of walls) {
    let cur = w.s[0];
    const ops = [...w.openings].sort((p, q) => p.s[0] - q.s[0]);
    const push = (a, b, z0, z1, tag = 'wall') => { if (b - a < 0.01) return; const c = (a + b) / 2; colliders.push(w.axis === 'y' ? { x: c, y: w.at, w: b - a, d: w.t, z0, z1, tag, room: w.room } : { x: w.at, y: c, w: w.t, d: b - a, z0, z1, tag, room: w.room }); };
    for (const o of ops) {
      const [lo, hi] = o.base; push(cur, o.s[0], w.z0, w.z1); if (hi + o.h < w.z1) push(o.s[0], o.s[1], hi + o.h, w.z1, 'lintel');
      if (lo - 0.02 > w.z0) push(o.s[0], o.s[1], w.z0, lo - 0.02, 'sill'); // below the lower threshold (ramp / drop side)
      if (o.lock) push(o.s[0], o.s[1], lo - 0.02, hi + o.h, 'locked:' + o.lock); cur = o.s[1];
    }
    push(cur, w.s[1], w.z0, w.z1);
  }
  // stairs: dog-leg (two flights + half landing) inside the footprint; hatch ladders; shafts
  for (const s of STAIRS) {
    const a = ROOMS.find((r) => r.id === s.a), b = ROOMS.find((r) => r.id === s.b);
    const z0 = Math.min(zOf(a), zOf(b)), z1 = Math.max(zOf(a), zOf(b));
    const f = s.footprint; const rise = z1 - z0; const nSteps = Math.max(2, Math.round(rise / 0.175));
    if (s.type === 'straight') {
      const za = zOf(a), zb = zOf(b); const run = s.run; const len = Math.abs(run.to - run.from);
      const steps = Math.max(2, Math.round(Math.abs(zb - za) / 0.175));
      stairs.push({ id: s.id, kind: 'flight', x: f.x, y: f.y, run, za, zb, steps, tread: len / (steps - 1) });
      surfaces.push({ room: s.id, x: f.x, y: f.y, ramp: { axis: run.axis, from: run.from, to: run.to, z0: za, z1: zb } });
      // guards on every long side not against a wall; open over the first 0.6 m at the foot (side entry past
      // the newel) and the last 1.0 m at the head (step off onto the upper floor). Under-stair volume is solid.
      const hiEnd = zb > za ? run.to : run.from, loEnd = zb > za ? run.from : run.to; const dirS = Math.sign(hiEnd - loEnd);
      const gStart = loEnd + dirS * 0.6, gEnd = hiEnd - dirS * 1.0;
      const g0 = Math.min(gStart, gEnd), g1 = Math.max(gStart, gEnd);
      const host = s.host ? [ROOMS.find((r) => r.id === s.host)] : [a, b];
      const cross = run.axis === 'y' ? 'x' : 'y'; const fc = f[cross];
      for (const [edge, out] of [[fc[0], -1], [fc[1], 1]]) {
        const againstWall = host.some((r) => Math.abs(r[cross][out > 0 ? 1 : 0] - edge) < 0.15);
        if (againstWall) continue;
        const at = edge + out * 0.05;
        if (run.axis === 'y') colliders.push({ x: at, y: (g0 + g1) / 2, w: 0.08, d: g1 - g0, z0, z1: z1 + 1.0, tag: 'balustrade', stair: s.id });
        else colliders.push({ x: (g0 + g1) / 2, y: at, w: g1 - g0, d: 0.08, z0, z1: z1 + 1.0, tag: 'balustrade', stair: s.id });
      }
      const segN = 6;
      for (let k = 0; k < segN; k++) {
        const t0 = k / segN, t1 = (k + 1) / segN; const zLow = Math.min(za + (zb - za) * t0, za + (zb - za) * t1);
        if (zLow - z0 < 0.3) continue;
        const v0 = run.from + (run.to - run.from) * t0, v1 = run.from + (run.to - run.from) * t1; const a0 = Math.min(v0, v1), a1 = Math.max(v0, v1);
        if (run.axis === 'y') colliders.push({ x: (f.x[0] + f.x[1]) / 2, y: (a0 + a1) / 2, w: f.x[1] - f.x[0], d: a1 - a0, z0, z1: zLow - 0.02, tag: 'understair', stair: s.id });
        else colliders.push({ x: (a0 + a1) / 2, y: (f.y[0] + f.y[1]) / 2, w: a1 - a0, d: f.y[1] - f.y[0], z0, z1: zLow - 0.02, tag: 'understair', stair: s.id });
      }
      slabs.push({ room: s.id, kind: 'void', x: f.x, y: f.y, z: z1 });
    } else {
      stairs.push({ id: s.id, kind: s.type, x: f.x, y: f.y, z0, z1 });
      surfaces.push({ room: s.id, x: f.x, y: f.y, ladder: { z0, z1 } });
      slabs.push({ room: s.id, kind: 'void', x: f.x, y: f.y, z: z1 });
    }
  }
  return { walls, slabs, colliders, surfaces, stairs };
}

// Floor height under (X,Y) for an agent currently at height zNow (steps up to 0.45 m, never through slabs).
export function floorAt(surfaces, X, Y, zNow, voids = []) {
  let best = -Infinity;
  for (const s of surfaces) {
    if (X < s.x[0] - E || X > s.x[1] + E || Y < s.y[0] - E || Y > s.y[1] + E) continue;
    if (s.z !== undefined && voids.some((v) => Math.abs(v.z - s.z) < 0.01 && X > v.x[0] + 0.02 && X < v.x[1] - 0.02 && Y > v.y[0] + 0.02 && Y < v.y[1] - 0.02)) continue;
    let z;
    if (s.ramp) { const v = s.ramp.axis === 'x' ? X : Y; const t = Math.min(1, Math.max(0, (v - s.ramp.from) / (s.ramp.to - s.ramp.from))); z = s.ramp.z0 + (s.ramp.z1 - s.ramp.z0) * t; }
    else if (s.ladder) z = Math.min(s.ladder.z1, Math.max(s.ladder.z0, zNow));
    else z = s.z;
    if (z <= zNow + 0.45 && z > best) best = z;
  }
  return best;
}
