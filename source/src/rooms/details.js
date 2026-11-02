// Small environmental-detail builders shared by rooms: decals (footprints, scuffs, clean
// silhouettes where objects were removed), paper items, plaster debris, picture hanging wire.
import * as THREE from 'three';

function canvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return [c, c.getContext('2d')]; }
export function rng(seed) { let s = (seed * 2654435761) >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
const texCache = new Map();
function cached(key, fn) { if (!texCache.has(key)) texCache.set(key, fn()); return texCache.get(key); }

export function footprintTex(muddy = true) {
  return cached('fp' + muddy, () => {
    const [c, g] = canvas(128, 256); const r = rng(muddy ? 3 : 4);
    g.fillStyle = muddy ? 'rgba(48,36,24,0.85)' : 'rgba(20,20,22,0.6)';
    g.beginPath(); g.ellipse(64, 80, 34, 58, 0, 0, 7); g.fill(); // sole
    g.beginPath(); g.ellipse(64, 200, 28, 36, 0, 0, 7); g.fill(); // heel
    g.globalCompositeOperation = 'destination-out';
    for (let y = 30; y < 140; y += 12) { g.fillStyle = 'rgba(0,0,0,0.7)'; g.fillRect(34, y, 60, 4); } // tread
    for (let i = 0; i < 260; i++) { g.fillStyle = `rgba(0,0,0,${r() * 0.8})`; g.beginPath(); g.arc(r() * 128, r() * 256, r() * 6, 0, 7); g.fill(); }
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
  });
}
// trail of footprints along points [[x,z],...] spaced ~0.36 m
export function footprints(parent, pts, { muddy = true, y = 0.004, fade = 0.0, seed = 1, scale = 1 } = {}) {
  const r = rng(seed); const mat = new THREE.MeshStandardMaterial({ map: footprintTex(muddy), transparent: true, roughness: muddy ? 0.95 : 0.2, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 });
  const geo = new THREE.PlaneGeometry(0.11 * scale, 0.27 * scale); geo.rotateX(-Math.PI / 2);
  let left = true; const out = new THREE.Group();
  for (let i = 0; i < pts.length - 1; i++) {
    const [ax, az] = pts[i], [bx, bz] = pts[i + 1]; const len = Math.hypot(bx - ax, bz - az); const n = Math.floor(len / 0.36);
    const yaw = Math.atan2(bx - ax, bz - az);
    for (let k = 0; k < n; k++) {
      const t = (k + 0.5) / n; const px = ax + (bx - ax) * t, pz = az + (bz - az) * t;
      const off = left ? -0.09 : 0.09; left = !left;
      const m = new THREE.Mesh(geo, mat.clone());
      m.material.opacity = (1 - fade * (i + t) / pts.length) * (0.55 + r() * 0.35);
      m.position.set(px + Math.cos(yaw) * off, y, pz - Math.sin(yaw) * off); m.rotation.y = yaw + (r() - 0.5) * 0.2;
      m.receiveShadow = true; out.add(m);
    }
  }
  parent.add(out); return out;
}

export function paperTex(kind = 'letter', seed = 1) {
  return cached('paper' + kind + seed, () => {
    const [c, g] = canvas(256, 340); const r = rng(seed);
    g.fillStyle = kind === 'old' ? '#d9ccaa' : '#ebe3cf'; g.fillRect(0, 0, 256, 340);
    for (let i = 0; i < 60; i++) { g.fillStyle = `rgba(120,90,50,${r() * 0.05})`; g.beginPath(); g.arc(r() * 256, r() * 340, r() * 40, 0, 7); g.fill(); }
    g.strokeStyle = kind === 'typed' ? 'rgba(30,30,30,0.75)' : 'rgba(25,30,60,0.7)'; g.lineWidth = kind === 'typed' ? 2 : 1.4;
    for (let y = 40; y < 320; y += 14) { if (r() < 0.08) continue; let x = 22; g.beginPath(); g.moveTo(x, y); while (x < 230 - r() * 40) { x += 4 + r() * 10; g.lineTo(x, y + (kind === 'typed' ? 0 : (r() - 0.5) * 3)); if (r() < 0.12) { x += 6; g.moveTo(x, y); } } g.stroke(); }
    if (kind === 'envelope') { g.fillStyle = '#e4dcc4'; g.fillRect(0, 0, 256, 340); g.strokeStyle = 'rgba(25,30,60,0.8)'; g.beginPath(); g.moveTo(60, 170); g.lineTo(200, 170); g.moveTo(60, 190); g.lineTo(180, 190); g.moveTo(60, 210); g.lineTo(150, 210); g.stroke(); g.fillStyle = '#7a2a2a'; g.fillRect(190, 20, 44, 52); }
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
  });
}
export function papers(parent, x, y, z, { n = 4, spread = 0.25, seed = 1, kinds = ['letter', 'typed', 'envelope'], yaw = 0, size = [0.21, 0.28] } = {}) {
  const r = rng(seed); const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.y = yaw;
  for (let i = 0; i < n; i++) {
    const kind = kinds[i % kinds.length]; const env = kind === 'envelope';
    const m = new THREE.Mesh(new THREE.BoxGeometry(env ? 0.22 : size[0], 0.0015, env ? 0.11 : size[1]), new THREE.MeshStandardMaterial({ map: paperTex(kind, seed + i), roughness: 0.9 }));
    m.position.set((r() - 0.5) * spread, 0.001 + i * 0.0016, (r() - 0.5) * spread); m.rotation.y = (r() - 0.5) * 1.2; m.castShadow = true; m.receiveShadow = true; g.add(m);
  }
  parent.add(g); return g;
}

// fallen plaster chunks + dust patch
export function plasterDebris(parent, x, z, { seed = 1, n = 18, r: rad = 0.5, mat = null } = {}) {
  const r = rng(seed); const g = new THREE.Group(); g.position.set(x, 0, z);
  const m = mat || new THREE.MeshStandardMaterial({ color: 0xd6cfc0, roughness: 1 });
  for (let i = 0; i < n; i++) {
    const s = 0.015 + r() * 0.06; const geo = new THREE.DodecahedronGeometry(s, 0); geo.scale(1, 0.35 + r() * 0.3, 0.7 + r() * 0.6);
    const mesh = new THREE.Mesh(geo, m); const a = r() * 6.28, d = Math.pow(r(), 1.5) * rad;
    mesh.position.set(Math.cos(a) * d, s * 0.3, Math.sin(a) * d); mesh.rotation.set(r(), r() * 6, r()); mesh.castShadow = true; mesh.receiveShadow = true; g.add(mesh);
  }
  const dust = new THREE.Mesh(new THREE.CircleGeometry(rad * 1.2, 24), new THREE.MeshStandardMaterial({ color: 0xbfb8a8, roughness: 1, transparent: true, opacity: 0.35, alphaMap: radialTex(), depthWrite: false }));
  dust.rotation.x = -Math.PI / 2; dust.position.y = 0.003; g.add(dust);
  parent.add(g); return g;
}
export function radialTex() {
  return cached('radial', () => { const [c, g] = canvas(128, 128); const grd = g.createRadialGradient(64, 64, 0, 64, 64, 64); grd.addColorStop(0, '#fff'); grd.addColorStop(1, '#000'); g.fillStyle = grd; g.fillRect(0, 0, 128, 128); return new THREE.CanvasTexture(c); });
}

// darker (unfaded) rectangle on a wall where a picture used to hang + the nail
export function ghostFrame(parent, p, n, w, h) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ color: 0x000000, transparent: true, opacity: 0.22, alphaMap: softRectTex(), depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 }));
  m.position.copy(p).addScaledVector(n, 0.004); m.lookAt(m.position.clone().add(n)); parent.add(m);
  const nail = new THREE.Mesh(new THREE.CylinderGeometry(0.003, 0.003, 0.025, 6), new THREE.MeshStandardMaterial({ color: 0x3a3028, metalness: 0.8, roughness: 0.5 }));
  nail.position.copy(p).add(new THREE.Vector3(0, h / 2 + 0.06, 0)).addScaledVector(n, 0.012); nail.lookAt(nail.position.clone().add(n)); nail.rotateX(Math.PI / 2); parent.add(nail);
  return m;
}
function softRectTex() { return cached('softrect', () => { const [c, g] = canvas(128, 128); g.fillStyle = '#000'; g.fillRect(0, 0, 128, 128); g.filter = 'blur(6px)'; g.fillStyle = '#fff'; g.fillRect(14, 14, 100, 100); return new THREE.CanvasTexture(c); }); }

// picture hung from picture rail: two cords converging to a hook on the rail
export function pictureCord(parent, railP, frameTopL, frameTopR) {
  const mat = new THREE.MeshStandardMaterial({ color: 0x8a7a5a, metalness: 0.6, roughness: 0.5 });
  for (const end of [frameTopL, frameTopR]) {
    const d = end.clone().sub(railP); const len = d.length();
    const c = new THREE.Mesh(new THREE.CylinderGeometry(0.0015, 0.0015, len, 4), mat);
    c.position.copy(railP).addScaledVector(d, 0.5); c.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize()); parent.add(c);
  }
  const hook = new THREE.Mesh(new THREE.TorusGeometry(0.012, 0.003, 6, 12, Math.PI), new THREE.MeshStandardMaterial({ color: 0xa8854f, metalness: 1, roughness: 0.35 }));
  hook.position.copy(railP); parent.add(hook);
}

// thin wax candle with drips (lathe), optionally burnt down
export function candle(h = 0.18, burnt = 0) {
  const hh = h * (1 - burnt);
  const pts = [[0, 0], [0.011, 0], [0.011, hh * 0.98], [0.012, hh], [0.004, hh + 0.004], [0, hh + 0.004]].map(([x, y]) => new THREE.Vector2(x, y));
  const m = new THREE.Mesh(new THREE.LatheGeometry(pts, 12), new THREE.MeshStandardMaterial({ color: 0xe8e0c8, roughness: 0.5 }));
  const wick = new THREE.Mesh(new THREE.CylinderGeometry(0.0012, 0.0012, 0.012, 4), new THREE.MeshStandardMaterial({ color: 0x111111 })); wick.position.y = hh + 0.008; m.add(wick);
  m.castShadow = true; return m;
}
