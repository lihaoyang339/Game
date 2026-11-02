// Victorian walnut chimneypiece with overmantel (drawing-room focal point):
// projecting panelled chimney breast, turned columns on plinths, aged stone slips around an arched
// cast-iron insert, carved frieze tablet, moulded mantel shelf, a tall overmantel with its own columns
// and cornice framing a portrait, brass candle sconces, stone hearth and brass fender, live embers.
import * as THREE from 'three';
import { flameMaterial, emberMaterial } from './fixtures.js';
const V2 = THREE.Vector2, V3 = THREE.Vector3;

function boxUV(w, h, d, tile = 0.8) {
  const g = new THREE.BoxGeometry(w, h, d); const uv = g.attributes.uv; const dims = [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]];
  for (let f = 0; f < 6; f++) for (let v = 0; v < 4; v++) { const i = f * 4 + v; uv.setXY(i, uv.getX(i) * dims[f][0] / tile, uv.getY(i) * dims[f][1] / tile); }
  return g;
}
function column(h, r) { // turned column: base, entasis shaft with rings, capital
  const p = [[0, 0], [r * 1.35, 0], [r * 1.35, 0.04], [r * 1.15, 0.06], [r * 1.2, 0.09], [r * 0.95, 0.12], [r, 0.2], [r * 1.02, 0.5], [r * 0.95, 0.8], [r * 0.85, 0.9], [r * 1.05, 0.915], [r * 0.9, 0.93], [r * 1.25, 0.96], [r * 1.35, 0.985], [r * 1.35, 1.0], [0, 1.0]];
  return new THREE.LatheGeometry(p.map(([a, b]) => new V2(a, b * h)), 20);
}

export function chimneypiece(scene, kit, M, { x, z, yaw, H, breastW = 2.7, breastD = 0.42, portrait = null }) {
  const root = new THREE.Group(); root.position.set(x, 0, z); root.rotation.y = yaw; scene.add(root); root.updateMatrixWorld(true);
  const W = root.matrixWorld;
  const S = (geo, mat, px, py, pz) => kit.add(geo, mat, new THREE.Matrix4().makeTranslation(px, py, pz).premultiply(W));
  const meshes = [];
  const mesh = (geo, mat, px, py, pz) => { const m = new THREE.Mesh(geo, mat); m.position.set(px, py, pz); m.castShadow = m.receiveShadow = true; root.add(m); meshes.push(m); return m; };
  const F = breastD; // front face of the breast
  const ow = 0.92, oh = 0.92; // firebox opening
  // --- chimney breast (walnut-panelled), split around the firebox
  S(boxUV(breastW, H - 1.0, breastD, 1.2), M.panel, 0, 1.0 + (H - 1.0) / 2, breastD / 2);
  for (const s of [-1, 1]) S(boxUV((breastW - ow) / 2, 1.0, breastD, 1.2), M.panel, s * (ow / 2 + (breastW - ow) / 4), 0.5, breastD / 2);
  // firebox (brick back/sides, sooted hearth floor)
  S(boxUV(ow, oh, 0.04, 0.5), M.brick, 0, oh / 2 + 0.04, -0.06);
  for (const s of [-1, 1]) { const g = boxUV(0.04, oh, F + 0.1, 0.5); g.rotateY(s * 0.22); S(g, M.brick, s * (ow / 2 - 0.08), oh / 2 + 0.04, F / 2 - 0.05); }
  S(boxUV(ow + 0.06, 0.04, F + 0.1), M.brick, 0, oh + 0.06, F / 2 - 0.05);
  S(boxUV(ow, 0.012, F, 0.5), M.soot, 0, 0.045, F / 2 - 0.04);
  // --- cast-iron arched insert (frame with arched opening), slightly proud of the breast
  const ins = new THREE.Shape(); const iw = 1.18, ih = 1.12; ins.moveTo(-iw / 2, 0.04); ins.lineTo(iw / 2, 0.04); ins.lineTo(iw / 2, ih); ins.lineTo(-iw / 2, ih); ins.closePath();
  const hole = new THREE.Path(); const aw = ow / 2, ah = 0.72; hole.moveTo(-aw, 0.05); hole.lineTo(aw, 0.05); hole.lineTo(aw, ah); hole.absarc(0, ah, aw, 0, Math.PI, false); hole.lineTo(-aw, 0.05); ins.holes.push(hole);
  const insG = new THREE.ExtrudeGeometry(ins, { depth: 0.03, bevelEnabled: true, bevelThickness: 0.008, bevelSize: 0.008, bevelSegments: 2, curveSegments: 24 });
  S(insG, M.iron, 0, 0, F + 0.0);
  // brass beading around the arch
  const bead = new THREE.Mesh(new THREE.TorusGeometry(aw + 0.012, 0.007, 6, 40, Math.PI), M.brass); bead.position.set(0, ah, F + 0.042); root.add(bead);
  for (const s of [-1, 1]) mesh(new THREE.CylinderGeometry(0.007, 0.007, ah - 0.05, 6), M.brass, s * (aw + 0.012), (ah + 0.05) / 2, F + 0.042);
  // --- aged stone slips framing the insert
  const sw = 0.16;
  S(boxUV(sw, ih + sw, 0.035, 0.6), M.stone, -(iw / 2 + sw / 2), (ih + sw) / 2, F + 0.012);
  S(boxUV(sw, ih + sw, 0.035, 0.6), M.stone, iw / 2 + sw / 2, (ih + sw) / 2, F + 0.012);
  S(boxUV(iw, sw, 0.035, 0.6), M.stone, 0, ih + sw / 2, F + 0.012);
  // --- columns on plinths, frieze with carved tablet, mantel shelf
  const cx = iw / 2 + sw + 0.13;
  for (const s of [-1, 1]) {
    S(boxUV(0.22, 0.24, 0.22), M.frame, s * cx, 0.12, F + 0.11);
    S(column(1.02, 0.068), M.frame, s * cx, 0.24, F + 0.11);
    S(boxUV(0.24, 0.12, 0.24), M.frame, s * cx, 1.32, F + 0.11);
  }
  S(boxUV(2 * cx + 0.24, 0.26, 0.12), M.frame, 0, 1.26 + 0.12 - 0.02, F + 0.06);
  S(boxUV(0.5, 0.17, 0.03), M.panel, 0, 1.36, F + 0.13); // carved tablet (raised)
  kit.profile('chair', M.frame, new V3(-0.25, 1.28, F + 0.145).applyMatrix4(W), new V3(0, 0, 1).transformDirection(W), new V3(0, 1, 0), 0.5);
  S(boxUV(2 * cx + 0.5, 0.06, 0.36), M.frame, 0, 1.53, F + 0.15);
  kit.profile('crown', M.frame, new V3(cx + 0.25, 1.5, F + 0.0).applyMatrix4(W), new V3(0, 0, 1).transformDirection(W), new V3(0, -1, 0), 2 * cx + 0.5);
  // --- overmantel: slender columns, panelled back, cornice with a low pediment
  const oy0 = 1.56, oy1 = Math.min(H - 0.6, 3.5); const ocx = 0.82;
  S(boxUV(2 * ocx + 0.3, oy1 - oy0, 0.05), M.panel, 0, (oy0 + oy1) / 2, F + 0.025);
  for (const s of [-1, 1]) { S(boxUV(0.16, 0.1, 0.16), M.frame, s * ocx, oy0 + 0.05, F + 0.1); S(column(oy1 - oy0 - 0.3, 0.045), M.frame, s * ocx, oy0 + 0.1, F + 0.1); S(boxUV(0.18, 0.1, 0.18), M.frame, s * ocx, oy1 - 0.15, F + 0.1); }
  S(boxUV(2 * ocx + 0.42, 0.16, 0.22), M.frame, 0, oy1 - 0.02, F + 0.1);
  kit.profile('crown', M.frame, new V3(ocx + 0.26, oy1 + 0.06, F).applyMatrix4(W), new V3(0, 0, 1).transformDirection(W), new V3(0, -1, 0), 2 * ocx + 0.52);
  const ped = new THREE.Shape(); ped.moveTo(-0.7, 0); ped.lineTo(0.7, 0); ped.lineTo(0, 0.26); ped.closePath();
  S(new THREE.ExtrudeGeometry(ped, { depth: 0.08, bevelEnabled: false }), M.frame, 0, oy1 + 0.2, F + 0.04);
  // portrait set into the overmantel
  // (placed by caller through `portrait` callback so it can use the shared model loader)
  if (portrait) portrait(new V3(0, (oy0 + oy1) / 2 + 0.02, F + 0.05).applyMatrix4(W));
  // --- hearth slab + brass fender
  S(boxUV(2 * cx + 0.6, 0.05, 0.62, 0.7), M.stone, 0, 0.025, F + 0.31);
  const fz = F + 0.5, fwd = 2 * cx + 0.3;
  mesh(new THREE.BoxGeometry(fwd, 0.09, 0.02), M.brass, 0, 0.1, fz);
  for (const s of [-1, 1]) mesh(new THREE.BoxGeometry(0.02, 0.09, 0.42), M.brass, s * fwd / 2, 0.1, fz - 0.21);
  const rail = mesh(new THREE.CylinderGeometry(0.012, 0.012, fwd, 10), M.brass, 0, 0.155, fz); rail.rotation.z = Math.PI / 2;
  // fire irons stand
  const tools = new THREE.Group(); tools.position.set(cx + 0.38, 0, F + 0.35); root.add(tools);
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.72, 8), M.brass); pole.position.y = 0.38; tools.add(pole);
  const tb = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.11, 0.025, 20), M.brass); tb.position.y = 0.012; tools.add(tb);
  for (let i = 0; i < 3; i++) { const t = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.64, 6), M.iron); t.position.set(Math.cos(i * 2.1) * 0.035, 0.36, Math.sin(i * 2.1) * 0.035); t.rotation.z = Math.cos(i * 2.1) * 0.06; tools.add(t); }
  // poker left leaning against the jamb (used tonight)
  const pk = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.7, 6), M.iron); pk.position.set(-(iw / 2 + sw) - 0.02, 0.35, F + 0.06); pk.rotation.z = 0.12; root.add(pk);
  // --- fire: grate, logs with ember shader, low flames
  const grate = new THREE.Group(); grate.position.set(0, 0.06, F * 0.35); root.add(grate);
  for (let i = 0; i < 7; i++) { const b = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.012, 0.34), M.iron); b.position.set(-0.27 + i * 0.09, 0.12, 0); grate.add(b); }
  const em = emberMaterial();
  for (const [lx, ly, lz, ry, len, rad] of [[0, 0.2, -0.02, 0.15, 0.55, 0.06], [0.05, 0.25, 0.08, -0.3, 0.5, 0.055], [-0.18, 0.19, 0.12, 1.2, 0.3, 0.045]]) {
    const lg = new THREE.Mesh(new THREE.CylinderGeometry(rad, rad * 1.1, len, 12, 4), em); lg.rotation.set(0, ry, Math.PI / 2); lg.position.set(lx, ly, F * 0.35 + lz); root.add(lg);
  }
  const ash = new THREE.Mesh(new THREE.PlaneGeometry(0.62, 0.32), em); ash.rotation.x = -Math.PI / 2; ash.position.set(0, 0.075, F * 0.35); root.add(ash);
  const fm = flameMaterial();
  for (let i = 0; i < 3; i++) { const q = new THREE.Mesh(new THREE.PlaneGeometry(0.4, 0.26), fm); q.position.set(-0.06 + i * 0.05, 0.36, F * 0.35); q.rotation.y = i * 1.05; q.renderOrder = 6; root.add(q); }
  // --- candle sconces on the breast, flanking the overmantel
  const sconceLights = [];
  for (const s of [-1, 1]) {
    const g = new THREE.Group(); g.position.set(s * 1.15, 2.2, F); root.add(g);
    const plate = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.06, 0.02, 16), M.brass); plate.rotation.x = Math.PI / 2; plate.position.z = 0.01; g.add(plate);
    for (const k of [-1, 1]) {
      const curve = new THREE.QuadraticBezierCurve3(new V3(0, 0, 0.01), new V3(k * 0.12, -0.08, 0.1), new V3(k * 0.16, 0.06, 0.14));
      g.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 10, 0.007, 6), M.brass));
      const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.016, 0.03, 12), M.brass); cup.position.set(k * 0.16, 0.075, 0.14); g.add(cup);
      const wax = new THREE.Mesh(new THREE.CylinderGeometry(0.011, 0.011, 0.12, 10), M.wax); wax.position.set(k * 0.16, 0.15, 0.14); g.add(wax);
      const flame = new THREE.Mesh(new THREE.SphereGeometry(0.009, 8, 6), M.candleFlame); flame.scale.y = 2.2; flame.position.set(k * 0.16, 0.225, 0.14); g.add(flame);
    }
    g.traverse((o) => { if (o.isMesh) { o.castShadow = o.material !== M.candleFlame; } });
    sconceLights.push(new V3(s * 1.15, 2.42, F + 0.18).applyMatrix4(W));
  }
  return { firePos: new V3(0, 0.42, F * 0.6).applyMatrix4(W), front: new V3(0, 0, 1).transformDirection(W), sconceLights, mantelY: 1.56, mantelFrontZ: F + 0.3 };
}
