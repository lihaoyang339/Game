// Capsule walk search over the built Wrenfield geometry (shared by tests/map-geo-test.mjs and the in-engine
// autopilot). Player capsule r=0.30 m, 1.70 m tall, max step 0.45 m; grid 0.2 m. Spec coordinates.
import { LEVELS } from './wrenfield.js';
import { floorAt } from './layout.js';

export const CAPSULE = { r: 0.3, h: 1.7, step: 0.45 };

export function makeWalker(L, { cell = 0.2, x0 = -36, y0 = -36 } = {}) {
  const R = CAPSULE.r; const voids = L.slabs.filter((s) => s.kind === 'void');
  const hash = new Map(); const HC = 2;
  for (const c of L.colliders) {
    const a0 = Math.floor((c.x - c.w / 2 - R) / HC), a1 = Math.floor((c.x + c.w / 2 + R) / HC), b0 = Math.floor((c.y - c.d / 2 - R) / HC), b1 = Math.floor((c.y + c.d / 2 + R) / HC);
    for (let i = a0; i <= a1; i++) for (let j = b0; j <= b1; j++) { const k = i * 100003 + j; if (!hash.has(k)) hash.set(k, []); hash.get(k).push(c); }
  }
  const blocked = (X, Y, z, openLocks) => {
    for (const c of hash.get(Math.floor(X / HC) * 100003 + Math.floor(Y / HC)) || []) {
      if (c.z1 < z + 0.3 || c.z0 > z + CAPSULE.h) continue; if (c.tag.startsWith('locked:') && openLocks) continue;
      const dx = Math.max(Math.abs(X - c.x) - c.w / 2, 0), dy = Math.max(Math.abs(Y - c.y) - c.d / 2, 0); if (dx * dx + dy * dy < R * R) return true;
    }
    return false;
  };
  const floor = (X, Y, zNow) => floorAt(L.surfaces, X, Y, zNow, voids);
  const lz = (r) => LEVELS[r.level].z;
  // BFS over (cell, z); returns the cell path (spec coords) when found
  function walk(start, goalFn, openLocks = true, maxN = 3e6) {
    const key = (i, j, z) => `${i},${j},${Math.round(z * 20)}`; const prev = new Map(); const q = []; let head = 0;
    const [sx, sy, sz] = start; const si = Math.round((sx - x0) / cell), sj = Math.round((sy - y0) / cell);
    const z0 = floor(sx, sy, sz + 0.05); if (!Number.isFinite(z0) || blocked(sx, sy, z0, openLocks)) return { ok: false, why: 'start not walkable' };
    const k0 = key(si, sj, z0); q.push([si, sj, z0, k0]); prev.set(k0, null); let n = 0;
    while (head < q.length && n++ < maxN) {
      const [i, j, z, k] = q[head++]; const X = x0 + i * cell, Y = y0 + j * cell;
      if (goalFn(X, Y, z)) {
        const path = []; for (let c = k; c; c = prev.get(c)) { const [a, b, zz] = c.split(','); path.push([x0 + +a * cell, y0 + +b * cell, +zz / 20]); }
        return { ok: true, steps: n, path: path.reverse() };
      }
      for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]]) {
        const ni = i + di, nj = j + dj; const NX = x0 + ni * cell, NY = y0 + nj * cell; const nz = floor(NX, NY, z);
        if (!Number.isFinite(nz) || nz < z - CAPSULE.step) continue;
        if (blocked(NX, NY, nz, openLocks)) continue;
        if (di && dj && (blocked(x0 + ni * cell, Y, z, openLocks) || blocked(X, y0 + nj * cell, z, openLocks))) continue; // no corner cutting
        const kk = key(ni, nj, nz); if (prev.has(kk)) continue; prev.set(kk, k); q.push([ni, nj, nz, kk]);
      }
    }
    return { ok: false, why: 'no path' };
  }
  const inRoom = (r) => (X, Y, z) => X > r.x[0] + 0.3 && X < r.x[1] - 0.3 && Y > r.y[0] + 0.3 && Y < r.y[1] - 0.3 && (r.ramp || Math.abs(z - lz(r)) < 0.6);
  const centre = (r) => {
    const cx = (r.x[0] + r.x[1]) / 2, cy = (r.y[0] + r.y[1]) / 2;
    for (let rad = 0; rad < 3; rad += 0.2) for (let a = 0; a < 6.28; a += 0.5) {
      const X = cx + Math.cos(a) * rad, Y = cy + Math.sin(a) * rad; const z = r.ramp ? floor(X, Y, lz(r) + 0.5) : lz(r);
      if (Number.isFinite(floor(X, Y, z + 0.05)) && !blocked(X, Y, z, true)) return [X, Y, z];
    }
    return [cx, cy, lz(r)];
  };
  return { walk, blocked, floor, inRoom, centre, lz, voids };
}
