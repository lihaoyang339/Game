// Panelled-room joinery (Victorian drawing-room system): pilasters divide each wall into bays;
// each bay above the dado holds a wallpaper field inside a bolection-moulded walnut frame; a frieze
// band and the cornice cap the wall. All real geometry: frames are extruded profiles, pilasters
// have plinths, fluting and capitals.
import * as THREE from 'three';
import { SIDES, wallLine, wallPoint } from './arch.js';
const V3 = THREE.Vector3;

// Lay out bays between openings: returns [{a0,a1}] usable segments (openings + casings excluded).
export function wallSegments(r, side, openings = [], pad = 0.14) {
  const { a0, a1 } = wallLine(r, side); const ops = openings.map((o) => [o.at - o.w / 2 - pad, o.at + o.w / 2 + pad]).sort((p, q) => p[0] - q[0]);
  const out = []; let cur = a0;
  for (const [l, rr] of ops) { if (l - cur > 0.3) out.push({ a0: cur, a1: l }); cur = rr; }
  if (a1 - cur > 0.3) out.push({ a0: cur, a1: a1 });
  return out;
}

// Pilaster: plinth block, fluted shaft, moulded capital.
export function pilaster(kit, r, side, a, y0, y1, M, { w = 0.26, d = 0.07 } = {}) {
  const n = SIDES[side].n; const isX = SIDES[side].axis === 'x';
  const B = (y, h, ww, dd) => { const p = wallPoint(r, side, a, y + h / 2, dd / 2); kit.box(M.frame, p.x, y + h / 2, p.z, isX ? ww : dd, h, isX ? dd : ww, { tile: 0.9, uvRot: true }); };
  B(y0, 0.32, w + 0.06, d + 0.03);                 // plinth
  B(y0 + 0.32, 0.05, w + 0.04, d + 0.02);          // base moulding
  B(y0 + 0.37, y1 - y0 - 0.6, w, d);               // shaft
  for (const k of [-1, 0, 1]) {                     // flutes (recessed reeds suggested by raised fillets)
    const p = wallPoint(r, side, a + k * w * 0.28, (y0 + 0.45 + y1 - 0.3) / 2, d + 0.004);
    kit.box(M.frame, p.x, (y0 + 0.45 + y1 - 0.3) / 2, p.z, isX ? 0.022 : 0.012, y1 - y0 - 0.85, isX ? 0.012 : 0.022, { tile: 0.9, uvRot: true });
  }
  B(y1 - 0.23, 0.05, w + 0.03, d + 0.015);          // necking
  B(y1 - 0.18, 0.18, w + 0.08, d + 0.04);           // capital block
  kit.runH('chair', M.frame, ...xz(wallPoint(r, side, a - w / 2 - 0.05, 0)), ...xz(wallPoint(r, side, a + w / 2 + 0.05, 0)), y1 - 0.24, n);
}
const xz = (p) => [p.x, p.z];

// Bolection-moulded rectangular frame on the wall (four profile runs with mitred-length overlap).
export function wallFrame(kit, r, side, a0, a1, y0, y1, mat) {
  const n = SIDES[side].n; const along = SIDES[side].axis === 'x' ? new V3(1, 0, 0) : new V3(0, 0, 1);
  // horizontal: bottom rail (lat up), top rail (lat down)
  kit.runH('panel', mat, ...xz(wallPoint(r, side, a0, 0)), ...xz(wallPoint(r, side, a1, 0)), y0, n);
  kit.runH('panel', mat, ...xz(wallPoint(r, side, a0, 0)), ...xz(wallPoint(r, side, a1, 0)), y1, n, { down: true });
  // verticals: lateral points inward toward the field
  for (const [a, sgn] of [[a0, 1], [a1, -1]]) {
    const lat = along.clone().multiplyScalar(sgn); const dir = new V3().crossVectors(n, lat);
    const base = wallPoint(r, side, a, y0, 0); const len = y1 - y0;
    kit.profile('panel', mat, dir.y > 0 ? base : base.clone().add(new V3(0, len, 0)), n, lat, len);
  }
}

// Full upper-wall system for one side. opts: {openings, dadoH, friezeY, H, bay, pilasterAt (fn), M}
export function panelledUpperWall(kit, r, side, o) {
  const M = o.M; const isX = SIDES[side].axis === 'x';
  const yA = o.dadoH + 0.16, yB = o.friezeY - 0.16;
  for (const seg of wallSegments(r, side, o.openings, 0.16)) {
    const len = seg.a1 - seg.a0; const nb = Math.max(1, Math.round(len / o.bay)); const bw = len / nb;
    const pw = 0.26; // pilaster width
    for (let i = 0; i <= nb; i++) {
      const a = seg.a0 + i * bw; const atEdge = i === 0 || i === nb;
      if (o.pilasters !== false && !(atEdge && o.skipEdgePilasters)) pilaster(kit, r, side, Math.min(seg.a1 - pw / 2 - 0.02, Math.max(seg.a0 + pw / 2 + 0.02, a)), o.dadoH + 0.02, o.friezeY, M);
    }
    for (let i = 0; i < nb; i++) {
      const fa0 = seg.a0 + i * bw + pw / 2 + 0.11, fa1 = seg.a0 + (i + 1) * bw - pw / 2 - 0.11;
      if (fa1 - fa0 < 0.25) continue;
      // wallpaper insert (slightly proud of the walnut ground, so its edge reads under the frame)
      const mid = (fa0 + fa1) / 2; const p = wallPoint(r, side, mid, (yA + yB) / 2, 0.004);
      kit.box(o.paper, p.x, (yA + yB) / 2, p.z, isX ? fa1 - fa0 : 0.006, yB - yA, isX ? 0.006 : fa1 - fa0, { tile: o.paperTile ?? 0.53 });
      wallFrame(kit, r, side, fa0, fa1, yA, yB, M.frame);
    }
  }
  // frieze band + dentil course under the cornice
  const { a0, a1 } = wallLine(r, side); const mid = (a0 + a1) / 2;
  const fp = wallPoint(r, side, mid, (o.friezeY + o.H) / 2, 0.02);
  kit.box(M.frame, fp.x, (o.friezeY + o.H) / 2, fp.z, isX ? a1 - a0 : 0.04, o.H - o.friezeY, isX ? 0.04 : a1 - a0, { tile: 1.2 });
  kit.runH('chair', M.frame, ...xz(wallPoint(r, side, a0, 0)), ...xz(wallPoint(r, side, a1, 0)), o.friezeY - 0.01, SIDES[side].n);
  const nd = Math.floor((a1 - a0) / 0.11);
  for (let i = 0; i < nd; i++) { const a = a0 + 0.06 + i * 0.11; const dp = wallPoint(r, side, a, o.H - 0.2, 0.065); kit.box(M.frame, dp.x, o.H - 0.2, dp.z, isX ? 0.05 : 0.05, 0.07, isX ? 0.05 : 0.05, { tile: 0.5 }); }
}

// Ceiling tray: moulded rectangular frame inset from the walls, plus a raised flat band.
export function ceilingTray(kit, r, mat, inset = 0.75) {
  const H = r.h - 0.001; const x0 = r.x0 + inset, x1 = r.x1 - inset, z0 = r.z0 + inset, z1 = r.z1 - inset;
  const down = new V3(0, -1, 0);
  // runs on the ceiling plane: profile projects downward (n = -y), lateral points inward
  const run = (ax, az, bx, bz, lat) => {
    const dir = new V3().crossVectors(down, lat); const a = new V3(ax, H, az), b = new V3(bx, H, bz);
    kit.profile('chair', mat, b.clone().sub(a).dot(dir) > 0 ? a : b, down, lat, a.distanceTo(b));
  };
  run(x0, z0, x1, z0, new V3(0, 0, 1)); run(x0, z1, x1, z1, new V3(0, 0, -1));
  run(x0, z0, x0, z1, new V3(1, 0, 0)); run(x1, z0, x1, z1, new V3(-1, 0, 0));
}
