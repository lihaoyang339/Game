// Collision world: oriented boxes (yaw-only) with vertical extents; circle-vs-box character
// collision, 3D ray casting, floor height (ramp), and a grid navigation mesh with A* + smoothing.
import * as THREE from 'three';

export class Collider {
  constructor(x, z, hx, hz, rot = 0, y0 = 0, y1 = 3, tag = 'wall') {
    this.x = x; this.z = z; this.hx = hx; this.hz = hz; this.rot = rot; this.y0 = y0; this.y1 = y1; this.tag = tag;
    this.c = Math.cos(rot); this.s = Math.sin(rot); this.enabled = true; this.blocksNav = y0 < 1.2; this.blocksSight = true; this.user = null;
  }
  set(x, z, rot = this.rot) { this.x = x; this.z = z; this.rot = rot; this.c = Math.cos(rot); this.s = Math.sin(rot); }
  // world -> local (rotate by -rot around center)
  toLocal(px, pz) { const dx = px - this.x, dz = pz - this.z; return [dx * this.c - dz * this.s, dx * this.s + dz * this.c]; }
  toWorldDir(lx, lz) { return [lx * this.c + lz * this.s, -lx * this.s + lz * this.c]; }
  radius() { return Math.hypot(this.hx, this.hz); }
}

export class Physics {
  constructor() {
    this.colliders = [];
    this.ramps = []; // {x0,x1,z0,z1,y0,y1, axis:'x'}
    this.cell = 4; this.hash = new Map();
  }
  add(c) { this.colliders.push(c); this._dirty = true; return c; }
  box(x, z, w, d, rot = 0, y0 = 0, y1 = 3, tag = 'wall') { return this.add(new Collider(x, z, w / 2, d / 2, rot, y0, y1, tag)); }
  remove(c) { const i = this.colliders.indexOf(c); if (i >= 0) this.colliders.splice(i, 1); this._dirty = true; }

  rebuildHash() {
    this.hash.clear();
    for (const c of this.colliders) {
      const r = c.radius();
      const x0 = Math.floor((c.x - r) / this.cell), x1 = Math.floor((c.x + r) / this.cell);
      const z0 = Math.floor((c.z - r) / this.cell), z1 = Math.floor((c.z + r) / this.cell);
      for (let i = x0; i <= x1; i++) for (let j = z0; j <= z1; j++) {
        const k = i * 10007 + j; let a = this.hash.get(k); if (!a) { a = []; this.hash.set(k, a); } a.push(c);
      }
    }
    this._dirty = false;
  }
  near(x, z, r) {
    if (this._dirty) this.rebuildHash();
    const out = new Set();
    const x0 = Math.floor((x - r) / this.cell), x1 = Math.floor((x + r) / this.cell);
    const z0 = Math.floor((z - r) / this.cell), z1 = Math.floor((z + r) / this.cell);
    for (let i = x0; i <= x1; i++) for (let j = z0; j <= z1; j++) { const a = this.hash.get(i * 10007 + j); if (a) for (const c of a) out.add(c); }
    return out;
  }

  floorY(x, z) {
    for (const r of this.ramps) {
      if (x >= r.x0 && x <= r.x1 && z >= r.z0 && z <= r.z1) {
        const t = (x - r.x0) / (r.x1 - r.x0);
        return r.y0 + (r.y1 - r.y0) * Math.min(1, Math.max(0, t));
      }
    }
    return 0;
  }

  // Push a circle out of all colliders it overlaps. Returns true if any contact.
  resolveCircle(pos, radius, y = 0, height = 1.7) {
    let hit = false;
    for (let iter = 0; iter < 3; iter++) {
      let moved = false;
      for (const c of this.near(pos.x, pos.z, radius + 1)) {
        if (!c.enabled || c.y1 < y + 0.35 || c.y0 > y + height) continue;
        const [lx, lz] = c.toLocal(pos.x, pos.z);
        const cx = Math.max(-c.hx, Math.min(c.hx, lx)), cz = Math.max(-c.hz, Math.min(c.hz, lz));
        let dx = lx - cx, dz = lz - cz; let d2 = dx * dx + dz * dz;
        if (d2 >= radius * radius) continue;
        let nx, nz, pen;
        if (d2 < 1e-9) { // center inside box: push along min axis
          const px = c.hx - Math.abs(lx), pz = c.hz - Math.abs(lz);
          if (px < pz) { nx = Math.sign(lx) || 1; nz = 0; pen = px + radius; } else { nx = 0; nz = Math.sign(lz) || 1; pen = pz + radius; }
        } else { const d = Math.sqrt(d2); nx = dx / d; nz = dz / d; pen = radius - d; }
        const [wx, wz] = c.toWorldDir(nx, nz);
        pos.x += wx * pen; pos.z += wz * pen; moved = true; hit = true;
      }
      if (!moved) break;
    }
    return hit;
  }

  // Ray vs boxes. dir must be normalized. Returns {dist, point, normal, collider} or null.
  raycast(origin, dir, maxDist = 100, filter = null) {
    let best = null; let bestT = maxDist;
    // broadphase: walk cells along ray (coarse): just test colliders near segment bbox
    const ex = origin.x + dir.x * maxDist, ez = origin.z + dir.z * maxDist;
    const cx = (origin.x + ex) / 2, cz = (origin.z + ez) / 2, r = maxDist / 2 + 1;
    const cand = maxDist > 30 ? this.colliders : this.near(cx, cz, r);
    for (const c of cand) {
      if (!c.enabled || (filter && !filter(c))) continue;
      const [ox, oz] = c.toLocal(origin.x, origin.z);
      // rotate dir
      const dx = dir.x * c.c - dir.z * c.s, dz = dir.x * c.s + dir.z * c.c;
      const o = [ox, origin.y, oz], d = [dx, dir.y, dz];
      const mn = [-c.hx, c.y0, -c.hz], mx = [c.hx, c.y1, c.hz];
      let t0 = 0, t1 = bestT, axis = -1, sgn = 0;
      let ok = true;
      for (let a = 0; a < 3; a++) {
        if (Math.abs(d[a]) < 1e-9) { if (o[a] < mn[a] || o[a] > mx[a]) { ok = false; break; } continue; }
        let ta = (mn[a] - o[a]) / d[a], tb = (mx[a] - o[a]) / d[a];
        let s = -1; if (ta > tb) { const tmp = ta; ta = tb; tb = tmp; s = 1; }
        if (ta > t0) { t0 = ta; axis = a; sgn = s; }
        if (tb < t1) t1 = tb;
        if (t0 > t1) { ok = false; break; }
      }
      if (!ok || axis < 0 || t0 >= bestT) continue;
      bestT = t0;
      const nl = [0, 0, 0]; nl[axis] = sgn;
      const [nx, nz] = c.toWorldDir(nl[0], nl[2]);
      best = { dist: t0, collider: c, normal: new THREE.Vector3(nx, nl[1], nz) };
    }
    if (best) best.point = origin.clone().addScaledVector(dir, best.dist);
    return best;
  }

  lineOfSight(a, b, filter = (c) => c.blocksSight) {
    const d = b.clone().sub(a); const len = d.length(); if (len < 1e-4) return true;
    d.divideScalar(len);
    return !this.raycast(a, d, len, filter);
  }
}

// --------------------------------------------------------------------------------------------
// Grid navigation
// --------------------------------------------------------------------------------------------
export class NavGrid {
  constructor(physics, minX, minZ, maxX, maxZ, cell = 0.5, agentR = 0.38) {
    this.p = physics; this.minX = minX; this.minZ = minZ; this.cell = cell; this.r = agentR;
    this.w = Math.ceil((maxX - minX) / cell); this.h = Math.ceil((maxZ - minZ) / cell);
    this.blocked = new Uint8Array(this.w * this.h);
    this.rebuild();
  }
  idx(i, j) { return j * this.w + i; }
  toCell(x, z) { return [Math.floor((x - this.minX) / this.cell), Math.floor((z - this.minZ) / this.cell)]; }
  center(i, j) { return [this.minX + (i + 0.5) * this.cell, this.minZ + (j + 0.5) * this.cell]; }
  cellBlocked(i, j) {
    const [x, z] = this.center(i, j); const y = this.p.floorY(x, z);
    for (const c of this.p.near(x, z, this.r + 1)) {
      if (!c.enabled || !c.blocksNav || c.y1 < y + 0.3 || c.y0 > y + 1.6) continue;
      const [lx, lz] = c.toLocal(x, z);
      const dx = Math.max(Math.abs(lx) - c.hx, 0), dz = Math.max(Math.abs(lz) - c.hz, 0);
      if (dx * dx + dz * dz < this.r * this.r) return true;
    }
    return false;
  }
  rebuild(region = null) {
    let i0 = 0, i1 = this.w - 1, j0 = 0, j1 = this.h - 1;
    if (region) { [i0, j0] = this.toCell(region.x0, region.z0); [i1, j1] = this.toCell(region.x1, region.z1); i0 = Math.max(0, i0 - 1); j0 = Math.max(0, j0 - 1); i1 = Math.min(this.w - 1, i1 + 1); j1 = Math.min(this.h - 1, j1 + 1); }
    for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) this.blocked[this.idx(i, j)] = this.cellBlocked(i, j) ? 1 : 0;
  }
  rebuildAround(c) { const r = c.radius() + 1; this.rebuild({ x0: c.x - r, z0: c.z - r, x1: c.x + r, z1: c.z + r }); }
  walkable(i, j) { return i >= 0 && j >= 0 && i < this.w && j < this.h && !this.blocked[this.idx(i, j)]; }
  nearestWalkable(i, j) {
    if (this.walkable(i, j)) return [i, j];
    for (let r = 1; r < 6; r++) for (let dj = -r; dj <= r; dj++) for (let di = -r; di <= r; di++) if (this.walkable(i + di, j + dj)) return [i + di, j + dj];
    return null;
  }
  // straight-line walkability on grid (supercover sampling)
  clear(ax, az, bx, bz) {
    const d = Math.hypot(bx - ax, bz - az); const n = Math.ceil(d / (this.cell * 0.5));
    for (let k = 0; k <= n; k++) {
      const t = k / Math.max(1, n); const [i, j] = this.toCell(ax + (bx - ax) * t, az + (bz - az) * t);
      if (!this.walkable(i, j)) return false;
    }
    return true;
  }
  findPath(ax, az, bx, bz, maxIter = 6000) {
    const s = this.nearestWalkable(...this.toCell(ax, az)); const g = this.nearestWalkable(...this.toCell(bx, bz));
    if (!s || !g) return null;
    if (this.clear(ax, az, bx, bz)) return [[bx, bz]];
    const W = this.w; const N = W * this.h;
    if (!this._g || this._g.length !== N) { this._g = new Float32Array(N); this._from = new Int32Array(N); this._closed = new Uint8Array(N); this._open = new Uint8Array(N); }
    const gS = this._g, from = this._from, closed = this._closed, open = this._open;
    gS.fill(Infinity); closed.fill(0); open.fill(0);
    const si = this.idx(s[0], s[1]), gi = this.idx(g[0], g[1]);
    const heap = []; const push = (n, f) => { heap.push([f, n]); let i = heap.length - 1; while (i > 0) { const p = (i - 1) >> 1; if (heap[p][0] <= heap[i][0]) break; [heap[p], heap[i]] = [heap[i], heap[p]]; i = p; } };
    const pop = () => { const top = heap[0]; const last = heap.pop(); if (heap.length) { heap[0] = last; let i = 0; for (;;) { const l = 2 * i + 1, r = l + 1; let m = i; if (l < heap.length && heap[l][0] < heap[m][0]) m = l; if (r < heap.length && heap[r][0] < heap[m][0]) m = r; if (m === i) break; [heap[m], heap[i]] = [heap[i], heap[m]]; i = m; } } return top[1]; };
    const hfn = (n) => { const dx = Math.abs((n % W) - g[0]), dz = Math.abs(Math.floor(n / W) - g[1]); return (dx + dz) + (Math.SQRT2 - 2) * Math.min(dx, dz); };
    gS[si] = 0; push(si, hfn(si)); open[si] = 1;
    let it = 0; let found = false;
    while (heap.length && it++ < maxIter) {
      const n = pop(); if (closed[n]) continue; closed[n] = 1;
      if (n === gi) { found = true; break; }
      const ni = n % W, nj = Math.floor(n / W);
      for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) {
        if (!di && !dj) continue;
        const ii = ni + di, jj = nj + dj; if (!this.walkable(ii, jj)) continue;
        if (di && dj && (!this.walkable(ni + di, nj) || !this.walkable(ni, nj + dj))) continue;
        const m = this.idx(ii, jj); if (closed[m]) continue;
        const ng = gS[n] + (di && dj ? Math.SQRT2 : 1);
        if (ng < gS[m]) { gS[m] = ng; from[m] = n; push(m, ng + hfn(m)); }
      }
    }
    if (!found) return null;
    const cells = []; let n = gi; while (n !== si) { cells.push(n); n = from[n]; }
    cells.reverse();
    const pts = cells.map((c) => this.center(c % W, Math.floor(c / W)));
    pts[pts.length - 1] = [bx, bz];
    // string pulling
    const out = []; let cur = [ax, az]; let k = 0;
    while (k < pts.length) {
      let far = k;
      for (let m = pts.length - 1; m > k; m--) if (this.clear(cur[0], cur[1], pts[m][0], pts[m][1])) { far = m; break; }
      out.push(pts[far]); cur = pts[far]; k = far + 1;
    }
    return out;
  }
}
