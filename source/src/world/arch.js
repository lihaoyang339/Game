// Architectural kit: period interior construction built from real profiles (not primitives as
// placeholders): profiled moldings, raised-panel wainscoting, walls with openings, door/window
// joinery, coffered/beamed ceilings. Static pieces are batched per material.
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

const V3 = THREE.Vector3;
export const UP = new V3(0, 1, 0);

// ---------------- molding profiles: [u = projection from wall, v = along lateral axis] ----------------
const arcPts = (cx, cy, r, a0, a1, n = 6) => Array.from({ length: n + 1 }, (_, i) => { const a = a0 + (a1 - a0) * i / n; return [cx + Math.cos(a) * r, cy + Math.sin(a) * r]; });
export const PROFILES = {
  // tall Victorian baseboard: plinth + ogee cap
  base: [[0, 0], [0.022, 0], [0.022, 0.16], [0.016, 0.168], ...arcPts(0.016, 0.185, 0.012, -Math.PI / 2, Math.PI / 2, 5).map(([u, v]) => [u + 0.0, v]), [0.008, 0.205], [0.008, 0.215], [0, 0.215]],
  // chair rail / dado cap
  chair: [[0, 0], [0.012, 0], [0.012, 0.008], ...arcPts(0.012, 0.022, 0.014, -Math.PI / 2, Math.PI / 2, 6), [0.018, 0.036], [0.018, 0.048], [0.006, 0.055], [0, 0.055]],
  // crown: cove + ogee + fillet (u from wall, v downward from ceiling handled by lat=-up)
  crown: [[0, 0], [0.01, 0], [0.01, 0.02], ...arcPts(0.01, 0.07, 0.05, -Math.PI / 2, 0, 6).map(([u, v]) => [u, 0.04 + (v - 0.02)]).map(([u, v]) => [u, v]), [0.11, 0.09], [0.135, 0.095], [0.15, 0.11], [0.16, 0.125], [0.16, 0.14], [0, 0.14]],
  // picture rail
  picture: [[0, 0], [0.008, 0], ...arcPts(0.014, 0.012, 0.01, -Math.PI / 2, Math.PI / 2, 5), [0.006, 0.026], [0.006, 0.032], [0, 0.032]],
  // door/window casing (architrave): stepped with bead on outer edge
  casing: [[0, 0], [0.018, 0], [0.018, 0.012], [0.024, 0.018], [0.024, 0.07], ...arcPts(0.02, 0.085, 0.012, -Math.PI / 2, Math.PI / 2, 5), [0.016, 0.1], [0.016, 0.11], [0, 0.11]],
  // small bolection / panel molding
  panel: [[0, 0], [0.006, 0], ...arcPts(0.006, 0.01, 0.008, -Math.PI / 2, Math.PI / 2, 4), [0.004, 0.02], [0, 0.02]],
  // mantel shelf edge (front nosing)
  nosing: [[0, 0], [0.03, 0], ...arcPts(0.03, 0.02, 0.02, -Math.PI / 2, Math.PI / 2, 6), [0.02, 0.045], [0.0, 0.05]],
};
function shapeFrom(pts) { const s = new THREE.Shape(); s.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) s.lineTo(pts[i][0], pts[i][1]); s.closePath(); return s; }
const shapeCache = new Map();
function profileShape(name) { if (!shapeCache.has(name)) shapeCache.set(name, shapeFrom(PROFILES[name])); return shapeCache.get(name); }

function normalizeGeo(g) {
  let ng = g.index ? g.toNonIndexed() : g;
  for (const k of Object.keys(ng.attributes)) if (!['position', 'normal', 'uv'].includes(k)) ng.deleteAttribute(k);
  if (!ng.attributes.uv) ng.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(ng.attributes.position.count * 2), 2));
  if (!ng.attributes.normal) ng.computeVertexNormals();
  return ng;
}

export class ArchKit {
  constructor(physics) { this.batches = new Map(); this.physics = physics; this.meshes = []; }

  add(geo, mat, matrix = null) {
    const g = normalizeGeo(geo.clone ? geo.clone() : geo);
    if (matrix) g.applyMatrix4(matrix);
    if (!this.batches.has(mat)) this.batches.set(mat, []);
    this.batches.get(mat).push(g);
    return g;
  }

  // box with world-scaled UVs (texture repeats every `tile` m), placed by center + yaw
  box(mat, cx, cy, cz, w, h, d, { yaw = 0, tile = 1.5, collide = false, uvRot = false } = {}) {
    const g = new THREE.BoxGeometry(w, h, d);
    const uv = g.attributes.uv; const dims = [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]];
    for (let f = 0; f < 6; f++) for (let v = 0; v < 4; v++) { const i = f * 4 + v; let a = uv.getX(i) * dims[f][0] / tile, b = uv.getY(i) * dims[f][1] / tile; if (uvRot) [a, b] = [b, a]; uv.setXY(i, a + cx * 0.37 / tile, b + cy * 0.21 / tile); }
    const m = new THREE.Matrix4().compose(new V3(cx, cy, cz), new THREE.Quaternion().setFromAxisAngle(UP, yaw), new V3(1, 1, 1));
    this.add(g, mat, m);
    if (collide && this.physics) this.physics.box(cx, cz, w, d, yaw, cy - h / 2, cy + h / 2, collide === true ? 'wall' : collide);
  }

  // Extrude a named profile: origin point, n = projection direction, lat = profile's v axis; runs along n x lat for len.
  profile(name, mat, origin, n, lat, len, tile = 0.6) {
    if (len <= 0.001) return;
    const g = new THREE.ExtrudeGeometry(profileShape(name), { depth: len, bevelEnabled: false, steps: 1, curveSegments: 4 });
    const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) / tile, uv.getY(i) / tile);
    const dir = new V3().crossVectors(n, lat).normalize();
    const m = new THREE.Matrix4().makeBasis(n.clone().normalize(), lat.clone().normalize(), dir);
    m.setPosition(origin);
    this.add(g, mat, m);
  }

  // Horizontal molding along a wall segment a->b (XZ) at height y; n = inward normal; flip = hang downward (crown)
  runH(name, mat, ax, az, bx, bz, y, n, { down = false } = {}) {
    const lat = down ? new V3(0, -1, 0) : UP.clone();
    const dir = new V3().crossVectors(n, lat);
    const a = new V3(ax, y, az), b = new V3(bx, y, bz);
    const start = b.clone().sub(a).dot(dir) > 0 ? a : b;
    this.profile(name, mat, start, n, lat, a.distanceTo(b));
  }

  // Raised panel (beveled) facing direction n at center c, size w x h
  raisedPanel(mat, c, n, w, h, depth = 0.018) {
    const s = new THREE.Shape(); const b = Math.min(0.035, w * 0.15, h * 0.15);
    s.moveTo(-w / 2 + b, -h / 2 + b); s.lineTo(w / 2 - b, -h / 2 + b); s.lineTo(w / 2 - b, h / 2 - b); s.lineTo(-w / 2 + b, h / 2 - b); s.closePath();
    const g = new THREE.ExtrudeGeometry(s, { depth: depth * 0.4, bevelEnabled: true, bevelThickness: depth * 0.6, bevelSize: b, bevelSegments: 2, curveSegments: 1 });
    const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) / 1.2, uv.getY(i) / 1.2);
    const lat = new V3().crossVectors(UP, n).normalize();
    const m = new THREE.Matrix4().makeBasis(lat, UP, n.clone().normalize()); m.setPosition(c);
    this.add(g, mat, m);
  }

  flush(parent) {
    for (const [mat, geos] of this.batches) {
      if (!geos.length) continue;
      const g = mergeGeometries(geos, false);
      g.computeBoundingSphere(); g.computeBoundingBox();
      const mesh = new THREE.Mesh(g, mat); mesh.castShadow = true; mesh.receiveShadow = true;
      mesh.matrixAutoUpdate = false; mesh.updateMatrix();
      parent.add(mesh); this.meshes.push(mesh);
    }
    this.batches.clear();
  }
}

// --------------------------------------------------------------------------------------------
// Room shell: floor, ceiling, walls with openings, wainscot, moldings.
// Walls: n (z=z0, inward +z), s (z=z1, inward -z), w (x=x0, inward +x), e (x=x1, inward -x)
// Openings: { at: center coordinate along wall axis, w, h, y0 = 0, kind }
// --------------------------------------------------------------------------------------------
export const SIDES = {
  n: { n: new V3(0, 0, 1), axis: 'x' }, s: { n: new V3(0, 0, -1), axis: 'x' },
  w: { n: new V3(1, 0, 0), axis: 'z' }, e: { n: new V3(-1, 0, 0), axis: 'z' },
};

export function wallLine(r, side) {
  if (side === 'n') return { a0: r.x0, a1: r.x1, fixed: r.z0 };
  if (side === 's') return { a0: r.x0, a1: r.x1, fixed: r.z1 };
  if (side === 'w') return { a0: r.z0, a1: r.z1, fixed: r.x0 };
  return { a0: r.z0, a1: r.z1, fixed: r.x1 };
}
// point on wall face at axis coordinate a, height y, offset d inward
export function wallPoint(r, side, a, y, d = 0) {
  const { fixed } = wallLine(r, side); const n = SIDES[side].n;
  return SIDES[side].axis === 'x' ? new V3(a, y, fixed + n.z * d) : new V3(fixed + n.x * d, y, a);
}

export function buildShell(kit, r, spec) {
  const H = r.h; const th = spec.wallThickness ?? 0.14;
  // floor
  if (spec.floor) {
    const f = spec.floor; const w = r.x1 - r.x0, d = r.z1 - r.z0;
    kit.box(f.mat, (r.x0 + r.x1) / 2, -0.05, (r.z0 + r.z1) / 2, w + 0.02, 0.1, d + 0.02, { tile: f.tile ?? 2 });
  }
  for (const side of ['n', 's', 'w', 'e']) {
    const ws = spec.walls?.[side]; if (!ws) continue;
    const { a0, a1 } = wallLine(r, side); const n = SIDES[side].n;
    const ops = (ws.openings || []).map((o) => ({ y0: 0, ...o, l: o.at - o.w / 2, r: o.at + o.w / 2 })).sort((p, q) => p.l - q.l);
    const upper = ws.upper ?? spec.upper;
    // wall slab segments (face at wall line, extends outward by th)
    const slab = (s0, s1, y0, y1) => {
      if (s1 - s0 < 0.005 || y1 - y0 < 0.005) return;
      const mid = (s0 + s1) / 2, cy = (y0 + y1) / 2;
      const p = wallPoint(r, side, mid, cy, -th / 2);
      const isX = SIDES[side].axis === 'x';
      kit.box(upper, p.x, cy, p.z, isX ? s1 - s0 : th, y1 - y0, isX ? th : s1 - s0, { tile: ws.tile ?? spec.upperTile ?? 1.2, collide: y0 < 0.5 ? 'wall' : false });
    };
    let cur = a0;
    for (const o of ops) { slab(cur, o.l, 0, H); slab(o.l, o.r, o.y0 + o.h, H); if (o.y0 > 0) slab(o.l, o.r, 0, o.y0); cur = o.r; }
    slab(cur, a1, 0, H);
    // physics for openings below window sills is included; door openings stay open.
    // --- trim ---
    const trim = ws.trim ?? spec.trim; if (!trim) continue;
    const segs = []; cur = a0;
    for (const o of ops) { segs.push([cur, o.l - (o.kind === 'window' ? 0 : (trim.casing ? 0.11 : 0)), o]); cur = o.r + (o.kind === 'window' ? 0 : (trim.casing ? 0.11 : 0)); }
    segs.push([cur, a1, null]);
    const P = (a, y, d = 0) => wallPoint(r, side, a, y, d);
    for (const [s0, s1] of segs) {
      if (s1 - s0 < 0.02) continue;
      if (trim.base) kit.runH('base', trim.base, ...xz(P(s0, 0)), ...xz(P(s1, 0)), 0, n);
      if (trim.wainscot) wainscot(kit, r, side, s0, s1, trim);
      if (trim.dado) { // flat cladding (glazed tile / painted band) with a rounded cap
        const dh = trim.dado.h; const mid = (s0 + s1) / 2; const pp = wallPoint(r, side, mid, dh / 2, 0.006); const isX = SIDES[side].axis === 'x';
        kit.box(trim.dado.mat, pp.x, dh / 2, pp.z, isX ? s1 - s0 : 0.012, dh, isX ? 0.012 : s1 - s0, { tile: trim.dado.tile ?? 0.9 });
        kit.runH('picture', trim.dado.cap ?? trim.dado.mat, ...xz(P(s0, 0)), ...xz(P(s1, 0)), dh - 0.012, n);
      }
      if (trim.picture) kit.runH('picture', trim.picture, ...xz(P(s0, 0)), ...xz(P(s1, 0)), trim.pictureY ?? H - 0.45, n);
    }
    // window sills interrupt wainscot only below sill: wainscot under windows
    for (const o of ops) if (o.kind === 'window' && trim.wainscot && o.y0 >= (trim.wainscotH ?? 1)) {
      // full wainscot already continuous through window segment? windows were excluded; add under-sill wainscot
      if (trim.base) kit.runH('base', trim.base, ...xz(P(o.l, 0)), ...xz(P(o.r, 0)), 0, n);
      wainscot(kit, r, side, o.l, o.r, trim);
    }
    if (trim.crown) kit.runH('crown', trim.crown, ...xz(P(a0, 0)), ...xz(P(a1, 0)), H, n, { down: true });
    if (trim.casing) for (const o of ops) casing(kit, r, side, o, trim.casing, trim.jamb ?? trim.casing, th);
  }
}
const xz = (p) => [p.x, p.z];

function wainscot(kit, r, side, s0, s1, t) {
  const n = SIDES[side].n; const H = t.wainscotH ?? 1.05; const len = s1 - s0; if (len < 0.25) return;
  const isX = SIDES[side].axis === 'x';
  // backing board
  const mid = (s0 + s1) / 2; const back = wallPoint(r, side, mid, H / 2, 0.006);
  kit.box(t.wainscot, back.x, H / 2, back.z, isX ? len : 0.012, H, isX ? 0.012 : len, { tile: 1.0 });
  // stiles and rails
  const st = 0.09, bot = 0.22, top = H - 0.07;
  const nPanels = Math.max(1, Math.round(len / (t.panelW ?? 0.72)));
  const pw = len / nPanels;
  const frame = t.frame ?? t.wainscot;
  for (let i = 0; i <= nPanels; i++) {
    const a = Math.min(s1 - st / 2, Math.max(s0 + st / 2, s0 + i * pw));
    const p = wallPoint(r, side, a, (bot + top) / 2, 0.022);
    kit.box(frame, p.x, (bot + top) / 2, p.z, isX ? st : 0.02, top - bot, isX ? 0.02 : st, { tile: 0.8, uvRot: true });
  }
  // rails: bottom, top, and a mid (lock) rail for tall two-tier paneling
  const rails = [bot + 0.045, top - 0.045]; const tiers = [];
  if (H > 1.6) { const midY = 0.98; rails.push(midY); tiers.push([bot + 0.09, midY - 0.06], [midY + 0.06, top - 0.09]); } else tiers.push([bot + 0.09, top - 0.09]);
  for (const y of rails) {
    const p = wallPoint(r, side, mid, y, 0.022);
    kit.box(frame, p.x, y, p.z, isX ? len : 0.02, y === rails[2] ? 0.12 : 0.09, isX ? 0.02 : len, { tile: 0.8 });
  }
  // raised panels with molding
  for (const [y0, y1] of tiers) for (let i = 0; i < nPanels; i++) {
    const a = s0 + (i + 0.5) * pw; const pwI = pw - st - 0.01, ph = y1 - y0 - 0.02;
    const c = wallPoint(r, side, a, (y0 + y1) / 2, 0.014);
    kit.raisedPanel(t.panel ?? t.wainscot, c, n, pwI, ph, 0.016);
  }
  kit.runH('chair', t.chair ?? frame, ...xz(wallPoint(r, side, s0, 0)), ...xz(wallPoint(r, side, s1, 0)), H - 0.02, n);
}

function casing(kit, r, side, o, mat, jambMat, th) {
  const n = SIDES[side].n; const along = SIDES[side].axis === 'x' ? new V3(1, 0, 0) : new V3(0, 0, 1);
  const top = o.y0 + o.h;
  // jamb linings (fill wall thickness)
  const isX = SIDES[side].axis === 'x';
  for (const a of [o.l, o.r]) {
    const p = wallPoint(r, side, a + (a === o.l ? 0.01 : -0.01), o.y0 + o.h / 2, -th / 2);
    kit.box(jambMat, p.x, o.y0 + o.h / 2, p.z, isX ? 0.02 : th + 0.02, o.h, isX ? th + 0.02 : 0.02, { tile: 0.8, uvRot: true });
  }
  const ph = wallPoint(r, side, o.at, top - 0.01, -th / 2);
  kit.box(jambMat, ph.x, top - 0.01, ph.z, isX ? o.w : th + 0.02, 0.02, isX ? th + 0.02 : o.w, { tile: 0.8 });
  if (o.kind === 'window') { // sill + apron
    const ps = wallPoint(r, side, o.at, o.y0 - 0.02, 0.03);
    kit.box(jambMat, ps.x, o.y0 - 0.02, ps.z, isX ? o.w + 0.26 : 0.16 + th, 0.04, isX ? 0.16 + th : o.w + 0.26, { tile: 0.8 });
  }
  // casings: vertical left/right, head
  const lat = (sgn) => along.clone().multiplyScalar(sgn);
  const y0 = o.kind === 'window' ? o.y0 - 0.0 : 0;
  // left: lateral points away from opening (-along), runs upward
  const left = wallPoint(r, side, o.l, y0, 0); const right = wallPoint(r, side, o.r, y0, 0);
  for (const [base, sgn] of [[left, -1], [right, 1]]) {
    const l = lat(sgn); const dir = new V3().crossVectors(n, l);
    const len = top + 0.11 - y0;
    const start = dir.y > 0 ? base : base.clone().add(new V3(0, len, 0));
    kit.profile('casing', mat, start, n, l, len);
    if (o.kind !== 'window') { // plinth block
      const pb = base.clone().add(along.clone().multiplyScalar(sgn * 0.055)).add(n.clone().multiplyScalar(0.016));
      kit.box(mat, pb.x, 0.12, pb.z, isX ? 0.125 : 0.034, 0.24, isX ? 0.034 : 0.125, { tile: 0.6 });
    }
  }
  const head = wallPoint(r, side, o.l - 0.11, top, 0); const headEnd = wallPoint(r, side, o.r + 0.11, top, 0);
  kit.runH('casing', mat, head.x, head.z, headEnd.x, headEnd.z, top, n);
  // cornice cap over door head
  if (o.kind !== 'window' && o.pediment !== false) {
    const cap = wallPoint(r, side, o.at, top + 0.13, 0);
    kit.runH('chair', mat, ...xz(wallPoint(r, side, o.l - 0.16, 0)), ...xz(wallPoint(r, side, o.r + 0.16, 0)), top + 0.11, n);
    kit.box(mat, cap.x, top + 0.17, cap.z + 0, isX ? o.w + 0.34 : 0.07, 0.03, isX ? 0.07 : o.w + 0.34, { tile: 0.6 });
  }
}

// Ceiling: flat with optional coffers or beams; medallion at center.
export function buildCeiling(kit, r, { mat, beamMat = null, type = 'flat', coffer = 1.6, beamD = 0.22, beamW = 0.18, medallion = null, trimMat = null } = {}) {
  const w = r.x1 - r.x0, d = r.z1 - r.z0, H = r.h;
  kit.box(mat, (r.x0 + r.x1) / 2, H + 0.05, (r.z0 + r.z1) / 2, w + 0.3, 0.1, d + 0.3, { tile: 2 });
  if (type === 'coffered' || type === 'beams') {
    const bm = beamMat || mat;
    const nx = Math.max(1, Math.round(w / coffer)), nz = type === 'beams' ? 0 : Math.max(1, Math.round(d / coffer));
    for (let i = 1; i < nx; i++) {
      const x = r.x0 + i * w / nx; kit.box(bm, x, H - beamD / 2, (r.z0 + r.z1) / 2, beamW, beamD, d, { tile: 1.2, uvRot: true });
      if (trimMat) for (const s of [-1, 1]) kit.profile('panel', trimMat, new V3(x + s * beamW / 2, H - beamD, s > 0 ? r.z1 : r.z0), new V3(s, 0, 0), new V3(0, 1, 0).multiplyScalar(1), 0.0001);
    }
    for (let j = 1; j < nz; j++) { const z = r.z0 + j * d / nz; kit.box(bm, (r.x0 + r.x1) / 2, H - beamD / 2 - 0.002, z, w, beamD, beamW, { tile: 1.2 }); }
    if (trimMat) { // small molding under beams' edges
      for (let i = 1; i < nx; i++) { const x = r.x0 + i * w / nx; for (const s of [-1, 1]) kit.runH('panel', trimMat, x + s * beamW / 2, r.z0, x + s * beamW / 2, r.z1, H - beamD, new V3(s, 0, 0), { down: false }); }
    }
  }
  if (medallion) {
    const pts = [[0.0, 0], [0.42, 0], [0.42, -0.01], [0.38, -0.025], [0.33, -0.03], [0.3, -0.045], [0.22, -0.05], [0.18, -0.065], [0.1, -0.07], [0.06, -0.09], [0.0, -0.095]].map(([x, y]) => new THREE.Vector2(x * medallion.scale, y * medallion.scale));
    const g = new THREE.LatheGeometry(pts, 48);
    kit.add(g, medallion.mat, new THREE.Matrix4().makeTranslation(medallion.x, H, medallion.z));
  }
}
