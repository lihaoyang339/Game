// PBR material library (Poly Haven CC0 texture sets) + procedural canvas textures for
// signage, painted lines, blood decals, puddles and the flashlight cookie.
import * as THREE from 'three';

export class MaterialLib {
  constructor(assets, envMap) {
    this.assets = assets; this.envMap = envMap; this.cache = new Map();
  }

  pbr(id, { tint = 0xffffff, rough = 1, metal = 0, normalScale = 1, envInt = 0.35, aoInt = 1, emissive = null } = {}) {
    const key = id + tint + rough + metal + normalScale + envInt;
    if (this.cache.has(key)) return this.cache.get(key);
    const t = this.assets.textures.get(id) || {};
    const m = new THREE.MeshStandardMaterial({
      map: t.diff || null, normalMap: t.nor_gl || null, roughnessMap: t.arm || null, metalnessMap: metal > 0 ? (t.arm || null) : null,
      aoMap: t.arm || null, aoMapIntensity: aoInt, color: tint, roughness: rough, metalness: metal,
      normalScale: new THREE.Vector2(normalScale, normalScale), envMap: this.envMap, envMapIntensity: envInt,
    });
    if (emissive) { m.emissive = new THREE.Color(emissive); }
    m.name = id;
    this.cache.set(key, m);
    return m;
  }
}

// --- Box geometry with world-scaled UVs (texture repeats every `tile` meters) ---
export function worldBox(w, h, d, tile = 2, uvOff = [0, 0]) {
  const g = new THREE.BoxGeometry(w, h, d);
  const uv = g.attributes.uv;
  // face order: +x, -x, +y, -y, +z, -z (4 verts each)
  const dims = [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]];
  for (let f = 0; f < 6; f++) {
    for (let v = 0; v < 4; v++) {
      const i = f * 4 + v;
      uv.setXY(i, uv.getX(i) * dims[f][0] / tile + uvOff[0], uv.getY(i) * dims[f][1] / tile + uvOff[1]);
    }
  }
  g.setAttribute('uv1', uv.clone());
  return g;
}

export function worldPlane(w, d, tile = 2, off = [0, 0]) {
  const g = new THREE.PlaneGeometry(w, d);
  const uv = g.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * w / tile + off[0], uv.getY(i) * d / tile + off[1]);
  g.rotateX(-Math.PI / 2);
  return g;
}

// ---------------- canvas textures ----------------
function canvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return [c, c.getContext('2d')]; }
function tex(c, srgb = true) { const t = new THREE.CanvasTexture(c); t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace; t.anisotropy = 8; return t; }
function rng(seed) { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }

// Worn paint mask (white = paint present)
export function paintWearTexture(seed = 3) {
  const [c, g] = canvas(512, 64); const r = rng(seed);
  g.fillStyle = '#fff'; g.fillRect(0, 0, 512, 64);
  for (let i = 0; i < 900; i++) { g.fillStyle = `rgba(0,0,0,${r() * 0.6})`; const s = r() * 10 + 1; g.fillRect(r() * 512, r() * 64, s * 2, s); }
  for (let i = 0; i < 40; i++) { g.fillStyle = 'rgba(0,0,0,0.9)'; g.beginPath(); g.ellipse(r() * 512, r() * 64, r() * 18 + 3, r() * 8 + 2, r() * 3, 0, 7); g.fill(); }
  const t = tex(c, false); t.wrapS = t.wrapT = THREE.RepeatWrapping; return t;
}

export function pillarTexture(label = 'B2', accent = '#2f7d5a') {
  const [c, g] = canvas(256, 512);
  g.fillStyle = '#d8d6cc'; g.fillRect(0, 0, 256, 512);
  // accent band + label
  g.fillStyle = accent; g.fillRect(0, 120, 256, 70);
  g.fillStyle = '#eee'; g.font = 'bold 54px Arial'; g.textAlign = 'center'; g.fillText(label, 128, 175);
  g.fillStyle = '#1b1b1b'; g.font = 'bold 120px Arial'; g.fillText(label, 128, 330);
  // hazard stripes bottom
  for (let i = -4; i < 12; i++) { g.fillStyle = i % 2 ? '#111' : '#d9a514'; g.beginPath(); g.moveTo(i * 40, 512); g.lineTo(i * 40 + 40, 512); g.lineTo(i * 40 + 100, 430); g.lineTo(i * 40 + 60, 430); g.fill(); }
  // grime
  const r = rng(label.charCodeAt(0) * 7 + label.length);
  for (let i = 0; i < 1400; i++) { g.fillStyle = `rgba(40,35,25,${r() * 0.08})`; g.beginPath(); g.arc(r() * 256, r() * 512, r() * 14, 0, 7); g.fill(); }
  for (let i = 0; i < 30; i++) { g.strokeStyle = `rgba(30,25,20,${0.1 + r() * 0.15})`; g.lineWidth = r() * 3; g.beginPath(); const x = r() * 256; g.moveTo(x, 380 + r() * 60); g.lineTo(x + r() * 6 - 3, 512); g.stroke(); }
  return tex(c);
}

export function signTexture(text, { w = 512, h = 160, bg = '#0b5d2a', fg = '#e8ffe8', font = 'bold 84px Arial', sub = null, arrow = null } = {}) {
  const [c, g] = canvas(w, h);
  g.fillStyle = bg; g.fillRect(0, 0, w, h);
  g.strokeStyle = 'rgba(255,255,255,0.5)'; g.lineWidth = 6; g.strokeRect(8, 8, w - 16, h - 16);
  g.fillStyle = fg; g.font = font; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText(text, arrow ? w / 2 - 40 : w / 2, sub ? h * 0.4 : h / 2);
  if (sub) { g.font = `bold ${Math.round(h * 0.18)}px Arial`; g.fillText(sub, w / 2, h * 0.78); }
  if (arrow) { g.beginPath(); const x = w - 90, y = h / 2; g.moveTo(x, y - 34); g.lineTo(x + 60, y); g.lineTo(x, y + 34); g.closePath(); g.fill(); }
  return tex(c);
}

export function stencilTexture(text, color = '#e6e1d0') {
  const [c, g] = canvas(512, 512);
  g.clearRect(0, 0, 512, 512); g.fillStyle = color; g.font = 'bold 300px Arial'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText(text, 256, 270);
  // wear
  g.globalCompositeOperation = 'destination-out'; const r = rng(text.length * 13);
  for (let i = 0; i < 1600; i++) { g.fillStyle = `rgba(0,0,0,${r()})`; g.fillRect(r() * 512, r() * 512, r() * 8, r() * 5); }
  return tex(c);
}

export function arrowTexture(color = '#e9e4d2') {
  const [c, g] = canvas(256, 512); g.fillStyle = color;
  g.beginPath(); g.moveTo(128, 20); g.lineTo(236, 170); g.lineTo(165, 170); g.lineTo(165, 490); g.lineTo(91, 490); g.lineTo(91, 170); g.lineTo(20, 170); g.closePath(); g.fill();
  g.globalCompositeOperation = 'destination-out'; const r = rng(77);
  for (let i = 0; i < 1500; i++) { g.fillStyle = `rgba(0,0,0,${r()})`; g.fillRect(r() * 256, r() * 512, r() * 7, r() * 5); }
  return tex(c);
}

export function bloodTexture(seed = 1, kind = 'pool') {
  const [c, g] = canvas(512, 512); const r = rng(seed);
  const col = (a) => `rgba(${70 + r() * 30},${4 + r() * 6},${3 + r() * 4},${a})`;
  if (kind === 'pool') {
    for (let i = 0; i < 26; i++) { g.fillStyle = col(0.5 + r() * 0.5); g.beginPath(); g.ellipse(256 + (r() - 0.5) * 160, 256 + (r() - 0.5) * 160, 30 + r() * 110, 25 + r() * 80, r() * 3, 0, 7); g.fill(); }
    for (let i = 0; i < 90; i++) { g.fillStyle = col(0.9); const a = r() * 6.28, d = 140 + r() * 100; g.beginPath(); g.arc(256 + Math.cos(a) * d, 256 + Math.sin(a) * d, r() * 9 + 1, 0, 7); g.fill(); }
  } else if (kind === 'smear') {
    for (let i = 0; i < 60; i++) { g.strokeStyle = col(0.15 + r() * 0.35); g.lineWidth = 6 + r() * 30; g.beginPath(); const y = 160 + r() * 190; g.moveTo(20, y); g.bezierCurveTo(180, y + (r() - 0.5) * 60, 330, y + (r() - 0.5) * 60, 490, y + (r() - 0.5) * 40); g.stroke(); }
  } else { // splatter
    for (let i = 0; i < 160; i++) { g.fillStyle = col(0.85); const a = r() * 6.28, d = Math.pow(r(), 0.6) * 230; g.beginPath(); g.ellipse(256 + Math.cos(a) * d, 256 + Math.sin(a) * d, r() * 14 + 2, r() * 6 + 1, a, 0, 7); g.fill(); }
    g.fillStyle = col(1); g.beginPath(); g.arc(256, 256, 40, 0, 7); g.fill();
  }
  return tex(c);
}

export function puddleTexture(seed = 5) {
  const [c, g] = canvas(256, 256); const r = rng(seed);
  const grd = g.createRadialGradient(128, 128, 10, 128, 128, 128); grd.addColorStop(0, '#fff'); grd.addColorStop(0.6, '#ddd'); grd.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = grd; g.fillRect(0, 0, 256, 256);
  g.globalCompositeOperation = 'destination-out';
  for (let i = 0; i < 40; i++) { g.fillStyle = `rgba(0,0,0,${r() * 0.9})`; g.beginPath(); g.ellipse(r() * 256, r() * 256, r() * 40, r() * 30, r() * 3, 0, 7); g.fill(); }
  return tex(c, false);
}

export function cookieTexture() {
  const [c, g] = canvas(256, 256);
  g.fillStyle = '#000'; g.fillRect(0, 0, 256, 256);
  const grd = g.createRadialGradient(128, 128, 0, 128, 128, 128);
  grd.addColorStop(0, '#fff'); grd.addColorStop(0.18, '#f4f0e8'); grd.addColorStop(0.28, '#b8b4ad'); grd.addColorStop(0.36, '#d0ccc4');
  grd.addColorStop(0.55, '#6e6b66'); grd.addColorStop(0.85, '#2a2826'); grd.addColorStop(1, '#000');
  g.fillStyle = grd; g.fillRect(0, 0, 256, 256);
  const r = rng(9); for (let i = 0; i < 300; i++) { g.fillStyle = `rgba(0,0,0,${r() * 0.08})`; g.beginPath(); g.arc(r() * 256, r() * 256, r() * 12, 0, 7); g.fill(); }
  return tex(c);
}

export function noteTexture(lines, { w = 512, h = 640, title = '' } = {}) {
  const [c, g] = canvas(w, h);
  g.fillStyle = '#e9e2cf'; g.fillRect(0, 0, w, h);
  g.fillStyle = '#2b2b2b'; g.font = 'bold 26px Courier New'; g.fillText(title, 30, 50);
  g.font = '20px Courier New'; lines.forEach((l, i) => g.fillText(l, 30, 100 + i * 28));
  const r = rng(lines.length); for (let i = 0; i < 300; i++) { g.fillStyle = `rgba(90,70,40,${r() * 0.06})`; g.beginPath(); g.arc(r() * w, r() * h, r() * 30, 0, 7); g.fill(); }
  return tex(c);
}

export function screenTexture(label) {
  const [c, g] = canvas(256, 192);
  g.fillStyle = '#0a120d'; g.fillRect(0, 0, 256, 192);
  g.fillStyle = '#8fd19e'; g.font = 'bold 16px Courier New'; g.fillText(label, 10, 22); g.fillText('REC ●', 190, 22);
  g.font = '12px Courier New'; g.fillText('04:12:37', 10, 180);
  return tex(c);
}

export function glintTexture() {
  const [c, g] = canvas(128, 128);
  const grd = g.createRadialGradient(64, 64, 0, 64, 64, 64); grd.addColorStop(0, 'rgba(255,255,240,1)'); grd.addColorStop(0.15, 'rgba(255,250,220,0.6)'); grd.addColorStop(1, 'rgba(255,250,220,0)');
  g.fillStyle = grd; g.fillRect(0, 0, 128, 128);
  g.fillStyle = 'rgba(255,255,240,0.9)'; g.fillRect(62, 4, 4, 120); g.fillRect(4, 62, 120, 4);
  return tex(c);
}

export function dustTexture() {
  const [c, g] = canvas(64, 64);
  const grd = g.createRadialGradient(32, 32, 0, 32, 32, 32); grd.addColorStop(0, 'rgba(255,255,255,1)'); grd.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grd; g.fillRect(0, 0, 64, 64); return tex(c);
}

// Volumetric light cone shader (additive, soft falloff, animated dust)
export function lightConeMaterial(color = 0xdfe9ff, strength = 0.12) {
  return new THREE.ShaderMaterial({
    uniforms: { uColor: { value: new THREE.Color(color) }, uStrength: { value: strength }, uTime: { value: 0 } },
    vertexShader: `varying vec3 vN; varying vec3 vV; varying float vH; varying vec3 vW;
      void main(){ vec4 wp = modelMatrix*vec4(position,1.0); vW = wp.xyz; vN = normalize(mat3(modelMatrix)*normal); vV = normalize(cameraPosition-wp.xyz); vH = uv.y; gl_Position = projectionMatrix*viewMatrix*wp; }`,
    fragmentShader: `uniform vec3 uColor; uniform float uStrength; uniform float uTime; varying vec3 vN; varying vec3 vV; varying float vH; varying vec3 vW;
      float h(vec3 p){ return fract(sin(dot(p, vec3(12.9898,78.233,37.719)))*43758.5453); }
      float n3(vec3 p){ vec3 i=floor(p); vec3 f=fract(p); f=f*f*(3.0-2.0*f);
        return mix(mix(mix(h(i),h(i+vec3(1,0,0)),f.x),mix(h(i+vec3(0,1,0)),h(i+vec3(1,1,0)),f.x),f.y),mix(mix(h(i+vec3(0,0,1)),h(i+vec3(1,0,1)),f.x),mix(h(i+vec3(0,1,1)),h(i+vec3(1,1,1)),f.x),f.y),f.z); }
      void main(){ float f = pow(abs(dot(normalize(vN), normalize(vV))), 2.2);
        float fade = pow(vH, 1.4) * smoothstep(0.0, 0.12, 1.0-vH);
        float dust = 0.7 + 0.6*n3(vW*2.2 + vec3(0.0, uTime*0.15, uTime*0.05));
        float a = f*fade*uStrength*dust; gl_FragColor = vec4(uColor*a, 1.0); }`,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.FrontSide,
  });
}
