// Bind-pose mesh conditioning for painted clothing: Taubin (lambda/mu) smoothing of the body
// geometry in clothed regions (removes sculpted anatomy under fabric), boot shaping, and
// normal recomputation across UV seams. Runs once per body type and is cached.
import * as THREE from 'three';
const cache = new Map();
const sst = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
function clothWeight(x, y, z, o) {
  const ax = Math.abs(x);
  const arm = sst(0.17, 0.21, ax) * sst(1.18, 1.24, y);
  const torso = (1 - arm) * sst(0.93, 0.95, y) * (1 - sst(1.47, 1.53, y));
  const sleeveEnd = 0.36 + (0.695 - 0.36) * o.sleeve;
  const sleeve = arm * (1 - sst(sleeveEnd - 0.03, sleeveEnd, ax)) * (y > 1.25 ? 1 : 0);
  const legs = (1 - arm) * (1 - sst(0.935, 0.95, y));
  const boots = legs * (1 - sst(0.16, 0.2, y));
  return { torso: Math.min(1, torso + sleeve), legs, boots };
}
export function conditionBody(geometry, key, outfit) {
  const ck = key + '|' + outfit.sleeve + '|' + outfit.zombie;
  if (cache.has(ck)) return cache.get(ck);
  const g = geometry.clone();
  const pos = g.attributes.position; const n = pos.count;
  // weld by position
  const map = new Map(); const uid = new Int32Array(n); const uniq = [];
  for (let i = 0; i < n; i++) {
    const k = `${Math.round(pos.getX(i) * 1e4)},${Math.round(pos.getY(i) * 1e4)},${Math.round(pos.getZ(i) * 1e4)}`;
    let u = map.get(k); if (u === undefined) { u = uniq.length; map.set(k, u); uniq.push(i); }
    uid[i] = u;
  }
  const U = uniq.length; const P = new Float32Array(U * 3);
  for (let u = 0; u < U; u++) { P[u * 3] = pos.getX(uniq[u]); P[u * 3 + 1] = pos.getY(uniq[u]); P[u * 3 + 2] = pos.getZ(uniq[u]); }
  const nbr = Array.from({ length: U }, () => new Set());
  const idx = g.index.array;
  for (let t = 0; t < idx.length; t += 3) {
    const a = uid[idx[t]], b = uid[idx[t + 1]], c = uid[idx[t + 2]];
    nbr[a].add(b); nbr[a].add(c); nbr[b].add(a); nbr[b].add(c); nbr[c].add(a); nbr[c].add(b);
  }
  const W = new Float32Array(U); const boot = new Float32Array(U);
  for (let u = 0; u < U; u++) {
    const w = clothWeight(P[u * 3], P[u * 3 + 1], P[u * 3 + 2], outfit);
    // face/hands/neck untouched; torso strongest, legs medium
    W[u] = Math.max(w.torso * (outfit.zombie ? 0.5 : 1.0), w.legs * (outfit.zombie ? 0.4 : 0.75));
    boot[u] = w.boots;
  }
  const nbrA = nbr.map((s) => Int32Array.from(s));
  const tmp = new Float32Array(U * 3);
  const step = (lam) => {
    for (let u = 0; u < U; u++) {
      const nb = nbrA[u]; if (!nb.length || W[u] <= 0.001) { tmp[u * 3] = P[u * 3]; tmp[u * 3 + 1] = P[u * 3 + 1]; tmp[u * 3 + 2] = P[u * 3 + 2]; continue; }
      let x = 0, y = 0, z = 0; for (const v of nb) { x += P[v * 3]; y += P[v * 3 + 1]; z += P[v * 3 + 2]; }
      const k = lam * W[u]; const inv = 1 / nb.length;
      tmp[u * 3] = P[u * 3] + k * (x * inv - P[u * 3]);
      tmp[u * 3 + 1] = P[u * 3 + 1] + k * (y * inv - P[u * 3 + 1]);
      tmp[u * 3 + 2] = P[u * 3 + 2] + k * (z * inv - P[u * 3 + 2]);
    }
    P.set(tmp);
  };
  for (let it = 0; it < 14; it++) { step(0.55); step(-0.58); }
  // boots: merge toes into a rounded boot (pull toward foot center line, smooth heavily)
  for (let u = 0; u < U; u++) {
    if (boot[u] <= 0) continue;
    const x = P[u * 3], y = P[u * 3 + 1], z = P[u * 3 + 2];
    const cx = Math.sign(x) * 0.114;
    const toe = sst(0.0, 0.08, z) * (1 - sst(0.06, 0.1, y));
    P[u * 3] = x + (cx - x) * 0.25 * toe * boot[u];
    P[u * 3 + 1] = Math.max(y, 0.004 + (z > 0.1 ? (z - 0.1) * 0.3 : 0));
  }
  const bootW = boot;
  for (let it = 0; it < 10; it++) {
    for (let u = 0; u < U; u++) W[u] = bootW[u] * 1.0;
    step(0.6); step(-0.62);
  }
  for (let i = 0; i < n; i++) { const u = uid[i]; pos.setXYZ(i, P[u * 3], P[u * 3 + 1], P[u * 3 + 2]); }
  pos.needsUpdate = true;
  // seam-consistent normals
  const N = new Float32Array(U * 3); const va = new THREE.Vector3(), vb = new THREE.Vector3(), vc = new THREE.Vector3(), e1 = new THREE.Vector3(), e2 = new THREE.Vector3();
  for (let t = 0; t < idx.length; t += 3) {
    const a = uid[idx[t]], b = uid[idx[t + 1]], c = uid[idx[t + 2]];
    va.fromArray(P, a * 3); vb.fromArray(P, b * 3); vc.fromArray(P, c * 3);
    e1.subVectors(vb, va); e2.subVectors(vc, va); e1.cross(e2);
    for (const q of [a, b, c]) { N[q * 3] += e1.x; N[q * 3 + 1] += e1.y; N[q * 3 + 2] += e1.z; }
  }
  const nor = g.attributes.normal;
  for (let i = 0; i < n; i++) { const u = uid[i]; va.fromArray(N, u * 3).normalize(); nor.setXYZ(i, va.x, va.y, va.z); }
  nor.needsUpdate = true;
  cache.set(ck, g);
  return g;
}
