// Phase-1 greybox of Wrenfield (MAP V1.0 §12): every wall, lintel, locked leaf, floor slab (with stair
// voids), stair flight, ladder/shaft and guard built from buildLayout() — the same data the walk test checks —
// plus engine colliders and multi-level floors. Spec (X east, Y north, Z up) → engine (x=X, y=Z, z=-Y).
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { ROOMS, DOORS, STAIRS, LEVELS, roomHeight } from './wrenfield.js';
import { buildLayout, floorAt } from './layout.js';
import { Physics } from '../engine/physics.js';

const LEVEL_ORDER = ['N', 'B', 'G', 'U', 'A'];
const levelOfZ = (z) => { let best = 'N'; for (const k of LEVEL_ORDER) if (LEVELS[k].z <= z + 0.25) best = k; return best; };
const ZONE = { stair: 0x9a8f7c, corridor: 0x8b8578, room: 0xa89c86, service: 0x7f8a8c, outdoor: 0x4f6044, secret: 0x7a5c6c };
const LEVEL_TINT = { N: 0x5d6670, B: 0x6e7378, G: 0xb3a58c, U: 0xa9a1b0, A: 0x9c8a74 };

// rectangle minus rectangles (axis aligned) → list of rectangles
function subtract(rect, holes) {
  let out = [rect];
  for (const h of holes) {
    const next = [];
    for (const r of out) {
      const ix0 = Math.max(r.x[0], h.x[0]), ix1 = Math.min(r.x[1], h.x[1]), iy0 = Math.max(r.y[0], h.y[0]), iy1 = Math.min(r.y[1], h.y[1]);
      if (ix1 - ix0 <= 1e-6 || iy1 - iy0 <= 1e-6) { next.push(r); continue; }
      if (r.y[0] < iy0) next.push({ x: r.x, y: [r.y[0], iy0] });
      if (iy1 < r.y[1]) next.push({ x: r.x, y: [iy1, r.y[1]] });
      if (r.x[0] < ix0) next.push({ x: [r.x[0], ix0], y: [iy0, iy1] });
      if (ix1 < r.x[1]) next.push({ x: [ix1, r.x[1]], y: [iy0, iy1] });
    }
    out = next;
  }
  return out;
}

// box in spec coords → geometry in engine space
function boxGeo(x0, x1, y0, y1, z0, z1) {
  const g = new THREE.BoxGeometry(Math.max(0.001, x1 - x0), Math.max(0.001, z1 - z0), Math.max(0.001, y1 - y0));
  g.translate((x0 + x1) / 2, (z0 + z1) / 2, -(y0 + y1) / 2); return g;
}
function label(text, sub, color = '#f3ead6') {
  const c = document.createElement('canvas'); c.width = 512; c.height = 128; const g = c.getContext('2d');
  g.fillStyle = 'rgba(12,10,8,0.55)'; g.fillRect(0, 0, 512, 128);
  g.fillStyle = color; g.font = 'bold 46px Georgia'; g.textAlign = 'center'; g.fillText(text, 256, 56);
  g.font = '30px Georgia'; g.fillStyle = '#d7cbb0'; g.fillText(sub, 256, 104);
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
  const m = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 0.65), new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false }));
  m.rotation.x = -Math.PI / 2; m.renderOrder = 5; return m;
}

// Physics with multi-level floors (walkable surfaces + voids from the layout)
export class MapPhysics extends Physics {
  constructor(L) { super(); this.L = L; this.voids = L.slabs.filter((s) => s.kind === 'void'); this.lastY = 0; }
  floorY(x, z, yNow = this.lastY) { const f = floorAt(this.L.surfaces, x, -z, yNow + 0.05, this.voids); this.noFloor = !Number.isFinite(f) || f < yNow - 0.5; const y = this.noFloor ? yNow : f; this.lastY = y; return y; }
}

export function buildGreybox(scene) {
  const L = buildLayout();
  const physics = new MapPhysics(L);
  const levels = {}; for (const k of LEVEL_ORDER) { const g = new THREE.Group(); g.name = 'level-' + k; levels[k] = g; scene.add(g); }
  const geo = {}; const push = (lvl, kind, g) => { const k = lvl + '|' + kind; (geo[k] ||= []).push(g); };
  const mats = {
    wall: (lvl) => new THREE.MeshStandardMaterial({ color: LEVEL_TINT[lvl], roughness: 0.9 }),
    ext: (lvl) => new THREE.MeshStandardMaterial({ color: new THREE.Color(LEVEL_TINT[lvl]).multiplyScalar(0.72), roughness: 0.95 }),
    lintel: () => new THREE.MeshStandardMaterial({ color: 0x6d6457, roughness: 0.9 }),
    locked: () => new THREE.MeshStandardMaterial({ color: 0xa3302a, roughness: 0.6, emissive: 0x2a0806 }),
    guard: () => new THREE.MeshStandardMaterial({ color: 0x3d342b, roughness: 0.7 }),
    stair: () => new THREE.MeshStandardMaterial({ color: 0x8a7458, roughness: 0.85 }),
    ladder: () => new THREE.MeshStandardMaterial({ color: 0x5a5148, roughness: 0.6, metalness: 0.3 }),
    ceiling: () => new THREE.MeshStandardMaterial({ color: 0x8c8679, roughness: 1, side: THREE.DoubleSide }),
  };
  // --- walls/lintels/locked leaves from colliders (exact collision geometry)
  const wallById = new Map(L.walls.map((w) => [w.room + w.axis + w.at, w]));
  for (const c of L.colliders) {
    if (c.tag === 'understair') continue;
    const lvl = levelOfZ(c.z0 + 0.15);
    const g = boxGeo(c.x - c.w / 2, c.x + c.w / 2, c.y - c.d / 2, c.y + c.d / 2, c.z0, c.tag === 'balustrade' ? c.z0 + 0.06 : c.z1);
    const kind = c.tag.startsWith('locked:') ? 'locked' : c.tag === 'lintel' ? 'lintel' : c.tag === 'balustrade' ? 'guard' : (Math.min(c.w, c.d) > 0.3 ? 'ext' : 'wall');
    if (c.tag !== 'balustrade') push(lvl, kind, g);
    physics.box(c.x, -c.y, c.w, c.d, 0, c.z0, c.z1, c.tag);
  }
  // --- floors: room slabs minus stair voids at that height; ramps as sloped slabs
  const floorMats = new Map();
  const fm = (r) => { const k = r.kind + r.level; if (!floorMats.has(k)) floorMats.set(k, new THREE.MeshStandardMaterial({ color: new THREE.Color(ZONE[r.kind] ?? ZONE.room).lerp(new THREE.Color(LEVEL_TINT[r.level]), 0.35), roughness: 0.92 })); return floorMats.get(k); };
  const roomFloors = [];
  for (const r of ROOMS) {
    const lvl = r.level; const z = LEVELS[lvl].z;
    if (r.ramp) {
      const { axis, from, to, z0, z1 } = r.ramp; const g = new THREE.PlaneGeometry(1, 1, 1, 1); const p = g.attributes.position;
      const corners = [[r.x[0], r.y[1]], [r.x[1], r.y[1]], [r.x[0], r.y[0]], [r.x[1], r.y[0]]];
      corners.forEach(([X, Y], i) => { const v = axis === 'x' ? X : Y; const t = Math.min(1, Math.max(0, (v - from) / (to - from))); p.setXYZ(i, X, z0 + (z1 - z0) * t, -Y); });
      g.computeVertexNormals(); const m = new THREE.Mesh(g, fm(r)); m.receiveShadow = true; levels[lvl].add(m); roomFloors.push(m); continue;
    }
    const holes = L.slabs.filter((s) => s.kind === 'void' && Math.abs(s.z - z) < 0.01).map((s) => ({ x: s.x, y: s.y }));
    const parts = subtract({ x: r.x, y: r.y }, holes);
    const t = r.kind === 'outdoor' ? 0.05 : 0.15;
    const gs = parts.map((p) => boxGeo(p.x[0] - (r.kind === 'outdoor' ? 0 : 0.1), p.x[1] + (r.kind === 'outdoor' ? 0 : 0.1), p.y[0] - (r.kind === 'outdoor' ? 0 : 0.1), p.y[1] + (r.kind === 'outdoor' ? 0 : 0.1), z - t, z));
    if (!gs.length) continue;
    const m = new THREE.Mesh(mergeGeometries(gs), fm(r)); m.receiveShadow = true; m.userData.room = r.id; levels[lvl].add(m); roomFloors.push(m);
    // label on the floor
    const lb = label(`${r.id}  ${r.name}`, r.zh || ''); lb.scale.setScalar(Math.min(3, Math.max(1, Math.min(r.x[1] - r.x[0], r.y[1] - r.y[0]) / 2.8))); lb.position.set((r.x[0] + r.x[1]) / 2, z + 0.02, -(r.y[0] + r.y[1]) / 2); levels[lvl].add(lb);
    // ceiling (hidden in cutaway/overview views)
    if (r.kind !== 'outdoor') { const cg = boxGeo(r.x[0], r.x[1], r.y[0], r.y[1], z + roomHeight(r), z + roomHeight(r) + 0.01); push(lvl, 'ceiling', cg); }
  }
  // --- stairs: stepped solid flights; ladders/shafts
  for (const s of L.stairs) {
    const def = STAIRS.find((q) => q.id === s.id);
    if (s.kind === 'flight') {
      const { run, za, zb, steps } = s; const lo = Math.min(za, zb); const gs = [];
      for (let i = 0; i < steps; i++) {
        const v0 = run.from + (run.to - run.from) * (i / steps), v1 = run.from + (run.to - run.from) * ((i + 1) / steps);
        const top = za + (zb - za) * ((zb > za ? i + 1 : i) / steps);
        const a0 = Math.min(v0, v1), a1 = Math.max(v0, v1);
        gs.push(run.axis === 'y' ? boxGeo(s.x[0], s.x[1], a0, a1, lo - 0.15, top) : boxGeo(a0, a1, s.y[0], s.y[1], lo - 0.15, top));
      }
      push(levelOfZ(lo), 'stair', mergeGeometries(gs));
      // guards: sloped rails following the flight
      for (const c of L.colliders.filter((q) => q.tag === 'balustrade' && q.stair === s.id)) {
        const along = run.axis; const a0 = along === 'y' ? c.y - c.d / 2 : c.x - c.w / 2, a1 = along === 'y' ? c.y + c.d / 2 : c.x + c.w / 2;
        const zAt = (v) => za + (zb - za) * Math.min(1, Math.max(0, (v - run.from) / (run.to - run.from)));
        const n = Math.max(2, Math.round((a1 - a0) / 0.9)); const gg = [];
        for (let i = 0; i <= n; i++) { const v = a0 + (a1 - a0) * (i / n); const zz = zAt(v); gg.push(along === 'y' ? boxGeo(c.x - 0.03, c.x + 0.03, v - 0.03, v + 0.03, zz, zz + 0.95) : boxGeo(v - 0.03, v + 0.03, c.y - 0.03, c.y + 0.03, zz, zz + 0.95)); }
        { // one continuous sloped handrail
          const za0 = zAt(a0) + 0.95, za1 = zAt(a1) + 0.95; const len = Math.hypot(a1 - a0, za1 - za0); const rail = new THREE.BoxGeometry(0.07, 0.07, len);
          const ang = Math.atan2(za1 - za0, a1 - a0); const mid = [(a0 + a1) / 2, (za0 + za1) / 2];
          if (along === 'y') { rail.rotateX(ang); rail.translate(c.x, mid[1], -mid[0]); } else { rail.rotateY(Math.PI / 2); rail.rotateZ(ang); rail.translate(mid[0], mid[1], -c.y); }
          gg.push(rail);
        }
        push(levelOfZ(lo), 'guard', mergeGeometries(gg));
      }
    } else {
      const gs = []; const cx = (s.x[0] + s.x[1]) / 2, cy = (s.y[0] + s.y[1]) / 2;
      for (const off of [-0.22, 0.22]) gs.push(boxGeo(cx + off - 0.025, cx + off + 0.025, s.y[1] - 0.12, s.y[1] - 0.06, s.z0, s.z1 + 1.0));
      for (let z = s.z0 + 0.3; z < s.z1 + 0.9; z += 0.3) gs.push(boxGeo(cx - 0.22, cx + 0.22, s.y[1] - 0.11, s.y[1] - 0.07, z, z + 0.03));
      // hatch/shaft frame at the top
      gs.push(boxGeo(s.x[0], s.x[1], s.y[0], s.y[0] + 0.06, s.z1 - 0.15, s.z1 + 0.04), boxGeo(s.x[0], s.x[1], s.y[1] - 0.06, s.y[1], s.z1 - 0.15, s.z1 + 0.04));
      push(levelOfZ(s.z0), 'ladder', mergeGeometries(gs));
      s.use = { x: cx, y: cy, z0: s.z0, z1: s.z1, oneWayFrom: def.oneWayFrom, a: def.a, b: def.b, lock: def.lock };
    }
  }
  // door thresholds: colour-coded (open / locked / one-way / hidden)
  const thr = { normal: 0xd9b45a, locked: 0xc0392b, oneway: 0x8e5bd1, hidden: 0x3fae6a };
  for (const d of DOORS) {
    const a = ROOMS.find((r) => r.id === d.a), b = ROOMS.find((r) => r.id === d.b); const z = Math.max(a.ramp ? -99 : LEVELS[a.level].z, b.ramp ? -99 : LEVELS[b.level].z);
    const k = d.lock ? 'locked' : d.oneWayFrom ? 'oneway' : d.kind === 'hidden' ? 'hidden' : 'normal';
    const g = d.wall === 'x' ? boxGeo(d.at - 0.14, d.at + 0.14, d.span[0], d.span[1], z, z + 0.025) : boxGeo(d.span[0], d.span[1], d.at - 0.14, d.at + 0.14, z, z + 0.025);
    push(levelOfZ(z), 'thr-' + k, g);
  }
  // merge into one mesh per level+kind
  const ceilings = [];
  for (const [k, gs] of Object.entries(geo)) {
    const [lvl, kind] = k.split('|');
    let mat;
    if (kind.startsWith('thr-')) mat = new THREE.MeshBasicMaterial({ color: thr[kind.slice(4)] });
    else mat = (mats[kind] || mats.wall)(lvl);
    const m = new THREE.Mesh(mergeGeometries(gs), mat); m.name = k; m.castShadow = kind !== 'ceiling'; m.receiveShadow = true; m.userData.kind = kind;
    levels[lvl].add(m); if (kind === 'ceiling') ceilings.push(m);
  }
  physics.rebuildHash();
  const ladders = L.stairs.filter((s) => s.use);
  return { L, physics, levels, ceilings, ladders, levelOfZ, LEVEL_ORDER };
}
