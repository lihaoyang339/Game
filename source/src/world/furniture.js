// Bespoke period furniture built with turned (lathe) legs, profiled edges and PBR woods, for pieces
// not covered by the CC0 model library: pedestal desk, dining table, built-in bookcases, cast-iron
// range, scullery sink, kitchen work table, conservatory staging.
import * as THREE from 'three';
import { bookRow } from './fixtures.js';
const V2 = THREE.Vector2;

function boxUV(w, h, d, tile = 0.8) {
  const g = new THREE.BoxGeometry(w, h, d); const uv = g.attributes.uv; const dims = [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]];
  for (let f = 0; f < 6; f++) for (let v = 0; v < 4; v++) { const i = f * 4 + v; uv.setXY(i, uv.getX(i) * dims[f][0] / tile, uv.getY(i) * dims[f][1] / tile); }
  return g;
}
function mesh(g, m, x, y, z, parent) { const me = new THREE.Mesh(g, m); me.position.set(x, y, z); me.castShadow = true; me.receiveShadow = true; parent.add(me); return me; }
// turned leg profile (baluster): radius along height h
export function turnedLeg(h, r = 0.045, style = 0) {
  const p = style === 0
    ? [[0, 0], [r * 0.55, 0], [r * 0.6, 0.02], [r * 0.45, 0.06], [r * 0.5, 0.12], [r * 0.95, 0.25], [r, 0.33], [r * 0.7, 0.45], [r * 0.55, 0.62], [r * 0.75, 0.7], [r * 0.6, 0.76], [r * 0.85, 0.8], [r, 0.82], [r, 1.0], [0, 1.0]]
    : [[0, 0], [r * 0.7, 0], [r * 0.7, 0.05], [r * 0.5, 0.1], [r * 0.6, 0.5], [r * 0.85, 0.75], [r, 0.8], [r, 1.0], [0, 1.0]];
  const g = new THREE.LatheGeometry(p.map(([a, b]) => new V2(a, b * h)), 16);
  return g;
}
function profileEdge(len, depth, mat, parent, x, y, z, rotY = 0) { // ogee-edged top rim strip
  const s = new THREE.Shape(); s.moveTo(0, 0); s.lineTo(depth, 0); s.quadraticCurveTo(depth + 0.012, 0.012, depth, 0.024); s.lineTo(depth - 0.006, 0.03); s.lineTo(0, 0.03); s.closePath();
  const g = new THREE.ExtrudeGeometry(s, { depth: len, bevelEnabled: false }); g.translate(0, 0, -len / 2);
  const m = mesh(g, mat, x, y, z, parent); m.rotation.y = rotY; return m;
}

// Pedestal desk: front (+z) faces visitors; kneehole on -z side for the sitter.
export function pedestalDesk(M, { w = 1.7, d = 0.85, h = 0.78 } = {}) {
  const g = new THREE.Group(); const wood = M.walnutFrame, top = M.walnutPanel;
  const pw = 0.48, ph = h - 0.05;
  for (const s of [-1, 1]) {
    const px = s * (w / 2 - pw / 2 - 0.02);
    mesh(boxUV(pw, ph - 0.08, d - 0.06), wood, px, (ph - 0.08) / 2 + 0.08, 0, g);
    mesh(boxUV(pw + 0.03, 0.08, d - 0.03), wood, px, 0.04, 0, g); // plinth
    for (let k = 0; k < 3; k++) { // drawers on the sitter side
      const dy = 0.16 + k * 0.2; mesh(boxUV(pw - 0.06, 0.17, 0.02), top, px, dy + 0.06, -(d - 0.06) / 2 - 0.01, g);
      const hd = mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.08, 8), M.brass, px, dy + 0.07, -(d - 0.06) / 2 - 0.03, g); hd.rotation.z = Math.PI / 2;
    }
    // raised panels on the visitor side
    mesh(boxUV(pw - 0.1, ph - 0.24, 0.015), top, px, ph / 2 + 0.04, (d - 0.06) / 2 + 0.008, g);
  }
  mesh(boxUV(w - 2 * pw - 0.04, 0.12, d - 0.1), wood, 0, h - 0.11, 0, g); // frieze drawer
  mesh(boxUV(w - 2 * pw - 0.04, ph - 0.12, 0.02), top, 0, (ph - 0.12) / 2, (d - 0.06) / 2 - 0.02, g); // modesty panel
  mesh(boxUV(w, 0.035, d), wood, 0, h - 0.0175, 0, g);
  const inlay = mesh(boxUV(w - 0.16, 0.004, d - 0.16, 0.5), M.leatherGreen, 0, h + 0.002, 0, g); inlay.castShadow = false;
  // tooled gilt border on the leather
  const gb = new THREE.MeshStandardMaterial({ color: 0x8a7040, metalness: 0.8, roughness: 0.45 });
  for (const [x, z, bw, bd] of [[0, (d - 0.18) / 2, w - 0.18, 0.006], [0, -(d - 0.18) / 2, w - 0.18, 0.006], [(w - 0.18) / 2, 0, 0.006, d - 0.18], [-(w - 0.18) / 2, 0, 0.006, d - 0.18]]) mesh(new THREE.BoxGeometry(bw, 0.001, bd), gb, x, h + 0.0045, z, g).castShadow = false;
  profileEdge(w, 0.0, wood, g, 0, h - 0.035, 0);
  return g;
}

// Formal dining table, long axis along z. 6 turned legs, apron, profiled top.
export function diningTable(M, { len = 3.6, w = 1.15, h = 0.76 } = {}) {
  const g = new THREE.Group(); const wood = M.walnutFrame;
  mesh(boxUV(w, 0.04, len, 1.2), M.walnutPanel, 0, h - 0.02, 0, g);
  for (const s of [-1, 1]) { mesh(boxUV(0.025, 0.11, len - 0.24), wood, s * (w / 2 - 0.09), h - 0.095, 0, g); mesh(boxUV(w - 0.2, 0.11, 0.025), wood, 0, h - 0.095, s * (len / 2 - 0.12), g); }
  const leg = turnedLeg(h - 0.04, 0.05, 0);
  for (const s of [-1, 1]) for (const z of [-len / 2 + 0.14, 0, len / 2 - 0.14]) mesh(leg, wood, s * (w / 2 - 0.1), 0, z, g);
  // edge moulding
  for (const s of [-1, 1]) { const e = mesh(boxUV(0.02, 0.02, len, 0.8), wood, s * (w / 2 + 0.006), h - 0.045, 0, g); }
  return g;
}

// Built-in library bookcase run (floor to near ceiling) along local +x, front facing +z.
export function libraryCase(M, { len = 3.0, h = 3.2, d = 0.42, bays = 3, seed = 1, missing = [] } = {}) {
  const g = new THREE.Group(); const wood = M.walnutFrame; const bw = len / bays;
  mesh(boxUV(len, h, 0.02), M.walnutPanel, len / 2, h / 2, 0.01, g); // back
  for (let i = 0; i <= bays; i++) mesh(boxUV(0.045, h, d), wood, Math.min(len - 0.0225, Math.max(0.0225, i * bw)), h / 2, d / 2, g);
  mesh(boxUV(len + 0.06, 0.16, d + 0.04), wood, len / 2, h - 0.08, d / 2 + 0.01, g); // cornice
  mesh(boxUV(len + 0.04, 0.12, d + 0.02), wood, len / 2, 0.06, d / 2, g); // plinth
  const shelves = [0.12, 0.56, 1.0, 1.42, 1.84, 2.26, 2.68].filter((y) => y < h - 0.3);
  // lower cupboards (doors) below 0.75, books above
  for (let b = 0; b < bays; b++) {
    const x0 = b * bw + 0.025;
    mesh(boxUV(bw - 0.05, 0.6, 0.02), M.walnutPanel, x0 + (bw - 0.05) / 2, 0.42, d - 0.005, g);
    mesh(boxUV(0.02, 0.6, 0.02), wood, x0 + (bw - 0.05) / 2, 0.42, d + 0.01, g);
    for (const s of [-1, 1]) { const k = mesh(new THREE.SphereGeometry(0.012, 10, 8), M.brass, x0 + (bw - 0.05) / 2 + s * 0.04, 0.5, d + 0.015, g); }
    for (let si = 0; si < shelves.length; si++) {
      const y = shelves[si]; if (y < 0.75) continue;
      mesh(boxUV(bw - 0.05, 0.03, d - 0.03), wood, x0 + (bw - 0.05) / 2, y, d / 2, g);
      const nextY = shelves[si + 1] ?? h - 0.18;
      if (missing.includes(b * 10 + si)) continue; // an emptied shelf
      const row = bookRow(bw - 0.07, d - 0.04, nextY - y - 0.04, { seed: seed * 31 + b * 7 + si, gaps: 0.04 + ((b + si) % 3) * 0.03 });
      row.position.set(x0 + 0.01, y + 0.015, 0.0); g.add(row);
    }
  }
  return g;
}

// Cast-iron kitchen range set in a brick recess: ovens with brass handles, hot plate, rail, flue.
export function kitchenRange(M, { w = 1.6 } = {}) {
  const g = new THREE.Group(); const iron = M.ironBlack;
  mesh(boxUV(w, 0.82, 0.68), iron, 0, 0.41, 0.34, g);
  mesh(boxUV(w + 0.04, 0.05, 0.72), iron, 0, 0.845, 0.35, g); // hot plate
  for (const [x, rr] of [[-0.45, 0.11], [-0.12, 0.09], [0.25, 0.12]]) { const ring = mesh(new THREE.TorusGeometry(rr, 0.012, 6, 28), iron, x, 0.872, 0.36, g); ring.rotation.x = Math.PI / 2; }
  for (const x of [-w / 4, w / 4]) {
    mesh(boxUV(w / 2 - 0.12, 0.42, 0.02), iron, x, 0.4, 0.69, g);
    const hd = mesh(new THREE.CylinderGeometry(0.01, 0.01, w / 2 - 0.25, 10), M.brass, x, 0.58, 0.73, g); hd.rotation.z = Math.PI / 2;
    mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.01, 16), M.brass, x, 0.3, 0.705, g).rotation.x = Math.PI / 2;
  }
  const rail = mesh(new THREE.CylinderGeometry(0.012, 0.012, w, 10), M.brass, 0, 0.75, 0.76, g); rail.rotation.z = Math.PI / 2;
  mesh(boxUV(0.22, 1.6, 0.22), iron, w / 2 - 0.25, 0.85 + 0.8, 0.15, g); // flue pipe (square)
  // ash pan / grate door
  mesh(boxUV(0.3, 0.12, 0.02), iron, 0, 0.12, 0.69, g);
  return g;
}

// Stone scullery sink on brick piers with a brass tap
export function stoneSink(M, { w = 1.0, d = 0.55 } = {}) {
  const g = new THREE.Group(); const s = M.stone;
  mesh(boxUV(w, 0.06, d), s, 0, 0.72, 0, g);
  for (const sx of [-1, 1]) mesh(boxUV(0.05, 0.2, d), s, sx * (w / 2 - 0.025), 0.85, 0, g);
  for (const sz of [-1, 1]) mesh(boxUV(w, 0.2, 0.05), s, 0, 0.85, sz * (d / 2 - 0.025), g);
  for (const sx of [-1, 1]) mesh(boxUV(0.2, 0.7, d - 0.1), M.brick, sx * (w / 2 - 0.15), 0.35, 0, g);
  const pipe = new THREE.CatmullRomCurve3([new THREE.Vector3(0, 1.3, -d / 2 + 0.02), new THREE.Vector3(0, 1.12, -d / 2 + 0.04), new THREE.Vector3(0, 1.1, -d / 2 + 0.18), new THREE.Vector3(0, 1.02, -d / 2 + 0.22)]);
  mesh(new THREE.TubeGeometry(pipe, 12, 0.012, 8), M.brass, 0, 0, 0, g);
  const water = mesh(new THREE.PlaneGeometry(w - 0.12, d - 0.12), new THREE.MeshStandardMaterial({ color: 0x0b0c0b, roughness: 0.02 }), 0, 0.78, 0, g); water.rotation.x = -Math.PI / 2; water.castShadow = false;
  return g;
}

// Heavy scrubbed-top kitchen work table with a drawer.
export function workTable(M, { len = 2.1, w = 0.95, h = 0.84 } = {}) {
  const g = new THREE.Group();
  mesh(boxUV(len, 0.06, w, 1.2), M.tableWorn, 0, h - 0.03, 0, g);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) mesh(turnedLeg(h - 0.06, 0.042, 1), M.kitchenWood, sx * (len / 2 - 0.08), 0, sz * (w / 2 - 0.08), g);
  mesh(boxUV(len - 0.2, 0.13, w - 0.2), M.kitchenWood, 0, h - 0.13, 0, g);
  mesh(boxUV(len - 0.25, 0.022, w - 0.25), M.kitchenWood, 0, 0.14, 0, g); // pot shelf
  const knob = mesh(new THREE.SphereGeometry(0.018, 10, 8), M.kitchenWood, 0, h - 0.13, w / 2 - 0.09, g);
  return g;
}

// Slatted conservatory staging bench (2 tiers)
export function staging(M, { len = 2.4, d = 0.7 } = {}) {
  const g = new THREE.Group(); const wood = M.painted;
  for (const [y, z, dd] of [[0.8, 0, d], [1.1, -d * 0.3, d * 0.4]]) {
    for (let i = 0; i < 6; i++) mesh(boxUV(len, 0.025, dd / 6 - 0.012), wood, 0, y, z - dd / 2 + (i + 0.5) * dd / 6, g);
    for (const sx of [-1, 0, 1]) mesh(boxUV(0.05, y, 0.05), M.ironGreen, sx * (len / 2 - 0.05), y / 2, z - dd / 2 + 0.03, g), mesh(boxUV(0.05, y, 0.05), M.ironGreen, sx * (len / 2 - 0.05), y / 2, z + dd / 2 - 0.03, g);
  }
  return g;
}
