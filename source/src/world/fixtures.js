// Fixtures: doors, sash windows with rain glass + storm backdrop, velvet curtains, fireplace with
// live embers/flames, Persian rugs (procedural weave patterns), shelf books, wall sconces.
import * as THREE from 'three';
import { UP } from './arch.js';
const V3 = THREE.Vector3;

function canvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return [c, c.getContext('2d')]; }
function rng(seed) { let s = (seed * 2654435761) >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
export const brass = () => new THREE.MeshStandardMaterial({ color: 0xb08d57, metalness: 1, roughness: 0.32 });
const _brass = brass();
const _ironDark = new THREE.MeshStandardMaterial({ color: 0x1a1918, metalness: 0.85, roughness: 0.55 });

// ----------------------------------- Doors -----------------------------------
// Six-panel door leaf (stiles, rails, beveled raised panels both faces), brass knob + escutcheon + hinges.
export function doorLeaf(mat, w, h, { glass = false, t = 0.045 } = {}) {
  const g = new THREE.Group();
  const st = Math.min(0.12, w * 0.16), railT = 0.12, lock = 0.18, bot = 0.24;
  const add = (geo, m, x, y, z) => { const mesh = new THREE.Mesh(geo, m); mesh.position.set(x, y, z); mesh.castShadow = mesh.receiveShadow = true; g.add(mesh); return mesh; };
  const bx = (x, y, bw, bh) => add(new THREE.BoxGeometry(bw, bh, t), mat, x, y, 0);
  bx(st / 2, h / 2, st, h); bx(w - st / 2, h / 2, st, h);
  bx(w / 2, h - railT / 2, w - 2 * st, railT); bx(w / 2, bot / 2, w - 2 * st, bot);
  const lockY = h * 0.46; bx(w / 2, lockY, w - 2 * st, lock);
  bx(w / 2, h * 0.73, 0.08, h - railT - lockY - lock / 2 - 0.02); // muntin upper
  const panel = (cx, cy, pw, ph) => {
    if (glass) {
      const gl = add(new THREE.BoxGeometry(pw, ph, 0.006), new THREE.MeshPhysicalMaterial({ color: 0x9fb2b8, roughness: 0.08, metalness: 0, transparent: true, opacity: 0.28, envMapIntensity: 1.2 }), cx, cy, 0);
      gl.castShadow = false;
      for (let k = 1; k < 3; k++) add(new THREE.BoxGeometry(0.025, ph, t * 0.6), mat, cx - pw / 2 + pw * k / 3, cy, 0);
      return;
    }
    const s = new THREE.Shape(); const b = Math.min(0.04, pw * 0.18);
    s.moveTo(-pw / 2 + b, -ph / 2 + b); s.lineTo(pw / 2 - b, -ph / 2 + b); s.lineTo(pw / 2 - b, ph / 2 - b); s.lineTo(-pw / 2 + b, ph / 2 - b); s.closePath();
    const geo = new THREE.ExtrudeGeometry(s, { depth: t * 0.35, bevelEnabled: true, bevelThickness: t * 0.18, bevelSize: b, bevelSegments: 2 });
    geo.translate(0, 0, -t * 0.175);
    const uv = geo.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * 0.8, uv.getY(i) * 0.8);
    add(geo, mat, cx, cy, 0);
  };
  const upH = h - railT - lockY - lock / 2, loH = lockY - lock / 2 - bot;
  const pw = (w - 2 * st - 0.08) / 2;
  panel(st + pw / 2, lockY + lock / 2 + upH / 2, pw, upH - 0.01); panel(w - st - pw / 2, lockY + lock / 2 + upH / 2, pw, upH - 0.01);
  if (!glass) { panel(st + pw / 2 + 0, bot + loH / 2, pw, loH); panel(w - st - pw / 2, bot + loH / 2, pw, loH); bx(w / 2, bot + loH / 2, 0.08, loH); }
  else { panel(st + pw / 2, bot + loH / 2, pw, loH); panel(w - st - pw / 2, bot + loH / 2, pw, loH); bx(w / 2, bot + loH / 2, 0.08, loH); }
  // hardware: knob + escutcheon (both faces), hinges
  const knobPts = [[0, 0], [0.012, 0], [0.012, 0.03], [0.008, 0.045], [0.022, 0.06], [0.026, 0.075], [0.02, 0.085], [0, 0.088]].map(([x, y]) => new THREE.Vector2(x, y));
  const knobGeo = new THREE.LatheGeometry(knobPts, 20);
  for (const s of [1, -1]) {
    const k = add(knobGeo, _brass, w - st * 0.55, lockY, s * t / 2); k.rotation.x = s * Math.PI / 2;
    const esc = add(new THREE.BoxGeometry(0.05, 0.16, 0.006), _brass, w - st * 0.55, lockY - 0.02, s * (t / 2 + 0.003));
    const kh = add(new THREE.CylinderGeometry(0.006, 0.006, 0.008, 10), _ironDark, w - st * 0.55, lockY - 0.07, s * (t / 2 + 0.006)); kh.rotation.x = Math.PI / 2;
    esc.castShadow = false;
  }
  for (const y of [0.25, h - 0.25]) add(new THREE.CylinderGeometry(0.008, 0.008, 0.1, 10), _brass, -0.002, y, t / 2);
  return g;
}

// A hinged door (single or double) set into an opening. pivot at hinge side.
export class Door {
  constructor(parent, mat, { x, z, yaw, w, h, double = false, glass = false, open = 0, swing = 1, id = '' }) {
    this.id = id; this.leaves = []; this.open = open; this.target = open; this.swing = swing; this.p = { x, z, w, h, yaw }; this.collider = null;
    const make = (lw, side) => {
      const pivot = new THREE.Group();
      const leaf = doorLeaf(mat, lw - 0.006, h - 0.012, { glass });
      if (side < 0) { leaf.scale.x = -1; }
      leaf.position.set(side > 0 ? 0.003 : -0.003, 0.006, 0);
      pivot.add(leaf); pivot.userData.side = side;
      return pivot;
    };
    this.root = new THREE.Group(); this.root.position.set(x, 0, z); this.root.rotation.y = yaw; parent.add(this.root);
    if (double) {
      const l = make(w / 2, 1); l.position.x = -w / 2; this.root.add(l); this.leaves.push(l);
      const r = make(w / 2, -1); r.position.x = w / 2; this.root.add(r); this.leaves.push(r);
    } else { const l = make(w, 1); l.position.x = -w / 2; this.root.add(l); this.leaves.push(l); }
    this.apply();
  }
  apply() { for (const l of this.leaves) l.rotation.y = -this.open * 1.75 * l.userData.side * this.swing; }
  update(dt) {
    if (Math.abs(this.target - this.open) > 1e-3) { this.open += Math.sign(this.target - this.open) * Math.min(Math.abs(this.target - this.open), dt * 0.9); this.apply(); }
    if (this.collider) this.collider.enabled = this.open < 0.3;
  }
  toggle() { this.target = this.target > 0.3 ? 0 : 0.75; return this.target > 0; }
}

// ----------------------------------- Storm / windows -----------------------------------
export const storm = { flash: 0, time: 0, rain: 1 };
export function updateStorm(dt) {
  storm.time += dt;
  storm.flash *= Math.exp(-dt * 7);
  if (storm.next === undefined) storm.next = 4;
  storm.next -= dt;
  if (storm.next <= 0) {
    storm.flash = 1; storm.double = Math.random() < 0.5 ? 0.12 : -1; storm.next = 9 + Math.random() * 14;
    storm.onStrike?.();
  }
  if (storm.double > 0) { storm.double -= dt; if (storm.double <= 0) storm.flash = Math.max(storm.flash, 0.7); }
  return storm.flash;
}

const rainUniforms = { uTime: { value: 0 }, uFlash: { value: 0 } };
export function rainGlassMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: rainUniforms, transparent: true, depthWrite: false, side: THREE.DoubleSide,
    vertexShader: `varying vec2 vUv; varying vec3 vW; void main(){ vUv = uv; vec4 w = modelMatrix*vec4(position,1.0); vW = w.xyz; gl_Position = projectionMatrix*viewMatrix*w; }`,
    fragmentShader: /* glsl */`uniform float uTime, uFlash; varying vec2 vUv; varying vec3 vW;
      float h(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7)))*43758.5453); }
      void main(){
        vec2 uv = vW.xy*vec2(1.0, 1.0) + vec2(vW.z, 0.0);
        // running droplets: columns with falling heads and trails
        vec2 g = uv*vec2(26.0, 6.0); vec2 id = floor(g); float r = h(id.xx);
        float y = fract(g.y + uTime*(0.35+r*0.6) + r*7.0);
        float x = fract(g.x) - 0.5 + sin(g.y*4.0 + r*6.0)*0.08;
        float head = smoothstep(0.08, 0.0, length(vec2(x*1.6, (y-0.9)*0.9)));
        float trail = smoothstep(0.035, 0.0, abs(x)) * smoothstep(0.9, 0.2, y) * 0.35 * step(0.6, r);
        // static beads
        vec2 b = uv*48.0; vec2 bi = floor(b); float br = h(bi);
        float bead = step(0.82, br) * smoothstep(0.22, 0.0, length(fract(b)-0.5 - (br-0.5)*0.3));
        float wet = clamp(head + trail + bead*0.7, 0.0, 1.0);
        vec3 base = vec3(0.025, 0.03, 0.04);
        vec3 col = base + vec3(0.45,0.5,0.6)*wet*(0.15 + uFlash*1.2) + vec3(0.7,0.75,0.9)*uFlash*0.25;
        gl_FragColor = vec4(col, 0.35 + wet*0.35 + uFlash*0.2);
      }`,
  });
}

// Night storm backdrop: sky gradient, swaying tree silhouettes; lit up by lightning.
let _backdropTex = null;
function backdropTexture() {
  if (_backdropTex) return _backdropTex;
  const [c, g] = canvas(1024, 512); const r = rng(11);
  const grd = g.createLinearGradient(0, 0, 0, 512); grd.addColorStop(0, '#1a2230'); grd.addColorStop(0.6, '#0d121a'); grd.addColorStop(1, '#05070a');
  g.fillStyle = grd; g.fillRect(0, 0, 1024, 512);
  for (let i = 0; i < 40; i++) { g.fillStyle = `rgba(60,70,90,${r() * 0.15})`; g.beginPath(); g.ellipse(r() * 1024, r() * 200, 120 + r() * 200, 30 + r() * 50, 0, 0, 7); g.fill(); }
  g.fillStyle = '#020304';
  const tree = (x, base, h, w) => { g.beginPath(); g.moveTo(x - 6, base); g.lineTo(x - 3, base - h); g.lineTo(x + 3, base - h); g.lineTo(x + 6, base); g.fill();
    for (let k = 0; k < 60; k++) { const yy = base - h * (0.25 + r() * 0.8); const s = (1 - (base - yy) / h) * w + 10; g.beginPath(); g.ellipse(x + (r() - 0.5) * s, yy, s * 0.35, s * 0.18, r(), 0, 7); g.fill(); } };
  for (let i = 0; i < 9; i++) tree(r() * 1024, 512, 200 + r() * 260, 120 + r() * 100);
  g.fillRect(0, 470, 1024, 42);
  _backdropTex = new THREE.CanvasTexture(c); _backdropTex.colorSpace = THREE.SRGBColorSpace;
  return _backdropTex;
}
export function stormBackdrop(w, h) {
  const m = new THREE.ShaderMaterial({
    uniforms: { map: { value: backdropTexture() }, uFlash: rainUniforms.uFlash, uTime: rainUniforms.uTime },
    vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
    fragmentShader: `uniform sampler2D map; uniform float uFlash, uTime; varying vec2 vUv;
      void main(){ vec2 uv = vUv; uv.x += sin(uTime*0.7 + uv.y*3.0)*0.004*(1.0-uv.y);
        vec3 c = texture2D(map, uv).rgb; c = pow(c, vec3(2.2));
        float sil = 1.0 - smoothstep(0.0, 0.05, length(c));
        c = c*(0.35 + uFlash*5.0) + vec3(0.25,0.3,0.45)*uFlash*(1.0-sil)*0.6;
        gl_FragColor = vec4(c, 1.0); }`,
  });
  return new THREE.Mesh(new THREE.PlaneGeometry(w, h), m);
}
export function updateWindows(dt) { rainUniforms.uTime.value += dt; rainUniforms.uFlash.value = storm.flash; }

// Sash window assembly in an opening: frame, two sashes with muntins, rain glass, backdrop outside.
export function sashWindow(parent, frameMat, { x, z, yaw, w, h, y0, panes = [3, 2] }) {
  const g = new THREE.Group(); g.position.set(x, y0, z); g.rotation.y = yaw; parent.add(g);
  const add = (geo, m, px, py, pz) => { const me = new THREE.Mesh(geo, m); me.position.set(px, py, pz); me.castShadow = true; me.receiveShadow = true; g.add(me); return me; };
  const fd = 0.08; // frame depth, local +z = into room
  add(new THREE.BoxGeometry(0.07, h, fd), frameMat, -w / 2 + 0.035, h / 2, -0.03);
  add(new THREE.BoxGeometry(0.07, h, fd), frameMat, w / 2 - 0.035, h / 2, -0.03);
  add(new THREE.BoxGeometry(w, 0.08, fd), frameMat, 0, h - 0.04, -0.03);
  add(new THREE.BoxGeometry(w, 0.06, fd + 0.02), frameMat, 0, 0.03, -0.03);
  const meet = h * 0.5;
  for (const [sy, sh, dz] of [[0.06, meet - 0.06, -0.01], [meet, h - 0.08 - meet, -0.05]]) {
    const sw = w - 0.14;
    add(new THREE.BoxGeometry(sw, 0.05, 0.04), frameMat, 0, sy + 0.025, dz);
    add(new THREE.BoxGeometry(sw, 0.05, 0.04), frameMat, 0, sy + sh - 0.025, dz);
    add(new THREE.BoxGeometry(0.05, sh, 0.04), frameMat, -sw / 2 + 0.025, sy + sh / 2, dz);
    add(new THREE.BoxGeometry(0.05, sh, 0.04), frameMat, sw / 2 - 0.025, sy + sh / 2, dz);
    for (let i = 1; i < panes[0]; i++) add(new THREE.BoxGeometry(0.02, sh - 0.1, 0.03), frameMat, -sw / 2 + sw * i / panes[0], sy + sh / 2, dz);
    for (let j = 1; j < panes[1]; j++) add(new THREE.BoxGeometry(sw - 0.1, 0.02, 0.03), frameMat, 0, sy + sh * j / panes[1], dz);
    const glass = add(new THREE.PlaneGeometry(sw - 0.06, sh - 0.06), rainGlassMaterial(), 0, sy + sh / 2, dz - 0.004);
    glass.castShadow = false; glass.renderOrder = 5;
  }
  const bd = stormBackdrop(w * 4, h * 2.6); bd.position.set(0, h * 0.55, -3.0); bd.castShadow = false; bd.receiveShadow = false; g.add(bd);
  return g;
}

// ----------------------------------- Curtains -----------------------------------
// Pleated drape: a dense plane displaced with pleats, gathered toward the tieback, pooling on floor.
export function curtain(mat, w, h, opts = {}) {
  const { gather = 0.5, tie = 0.55, side = 1, pool = 0.06, seed = 1 } = opts;
  const sx = 48, sy = 60; const g = new THREE.PlaneGeometry(w, h, sx, sy);
  const p = g.attributes.position; const r = rng(seed);
  const ph = Array.from({ length: 8 }, () => r() * 6.28);
  for (let i = 0; i < p.count; i++) {
    let x = p.getX(i), y = p.getY(i) + h / 2; const u = (x + w / 2) / w; const v = y / h;
    // gather toward the tieback height: compress width
    const tieV = tie; const pinch = Math.exp(-Math.pow((v - tieV) / 0.18, 2));
    const squeeze = 1 - gather * pinch;
    const anchor = side > 0 ? -w / 2 : w / 2;
    x = anchor + (x - anchor) * (squeeze + (1 - squeeze) * 0);
    const folds = opts.folds ?? (9 + gather * 4);
    let zz = Math.sin(u * folds * 6.283 + ph[0]) * (opts.amp ?? 0.045) * (1 + pinch * 0.8) + Math.sin(u * 31 + ph[1]) * 0.01 * (opts.amp != null ? 0.3 : 1);
    zz += Math.sin(u * 4 + v * 3 + ph[2]) * 0.02;
    if (v < 0.04) zz += (0.04 - v) * pool * 10 * Math.max(0, Math.sin(u * folds * 6.283)); // pooling
    p.setXYZ(i, x, y, zz);
  }
  g.computeVertexNormals();
  const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * w * 1.2, uv.getY(i) * h * 1.2);
  const m = new THREE.Mesh(g, mat); m.castShadow = true; m.receiveShadow = true;
  return m;
}

export function velvet(assets, color, { rough = 0.85 } = {}) {
  const t = assets.textures.get('velour_velvet') || {};
  return new THREE.MeshPhysicalMaterial({ color, map: t.diff || null, normalMap: t.nor_gl || null, roughness: rough, sheen: 1, sheenColor: new THREE.Color(color).lerp(new THREE.Color(1, 1, 1), 0.35), sheenRoughness: 0.45, side: THREE.DoubleSide });
}

// ----------------------------------- Fireplace -----------------------------------
const fireUniforms = { uTime: { value: 0 }, uLevel: { value: 1 } };
export function updateFire(dt) { fireUniforms.uTime.value += dt; }
export function flameMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: fireUniforms, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
    fragmentShader: /* glsl */`uniform float uTime, uLevel; varying vec2 vUv;
      float h(vec2 p){ return fract(sin(dot(p, vec2(12.9898,78.233)))*43758.5453); }
      float n(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f); return mix(mix(h(i),h(i+vec2(1,0)),f.x), mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x), f.y); }
      void main(){ vec2 uv = vUv; float t = uTime;
        float f = n(vec2(uv.x*5.0, uv.y*3.0 - t*2.4))*0.6 + n(vec2(uv.x*11.0, uv.y*6.0 - t*4.1))*0.4;
        float shape = (1.0 - uv.y*1.25) - abs(uv.x-0.5)*1.6 + f*0.55 - 0.35;
        float a = smoothstep(0.0, 0.25, shape) * uLevel;
        vec3 col = mix(vec3(0.9,0.18,0.02), vec3(1.0,0.62,0.18), smoothstep(0.1,0.6,shape)) * 3.2;
        gl_FragColor = vec4(col*a, 1.0); }`,
  });
}
export function emberMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: fireUniforms,
    vertexShader: `varying vec3 vP; varying vec3 vN; void main(){ vP = position; vN = normal; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
    fragmentShader: /* glsl */`uniform float uTime; varying vec3 vP; varying vec3 vN;
      float h(vec3 p){ return fract(sin(dot(p, vec3(12.9898,78.233,45.164)))*43758.5453); }
      float n(vec3 p){ vec3 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f);
        return mix(mix(mix(h(i),h(i+vec3(1,0,0)),f.x),mix(h(i+vec3(0,1,0)),h(i+vec3(1,1,0)),f.x),f.y),mix(mix(h(i+vec3(0,0,1)),h(i+vec3(1,0,1)),f.x),mix(h(i+vec3(0,1,1)),h(i+vec3(1,1,1)),f.x),f.y),f.z); }
      void main(){ float c = n(vP*38.0) * n(vP*9.0 + vec3(0.0, uTime*0.3, 0.0));
        float glow = smoothstep(0.22, 0.6, c) * (0.6 + 0.4*sin(uTime*3.0 + vP.x*40.0));
        vec3 char = vec3(0.025,0.02,0.018) * (0.5 + n(vP*60.0));
        vec3 col = char + vec3(1.0,0.28,0.04)*glow*2.5;
        gl_FragColor = vec4(col, 1.0); }`,
  });
}

// Marble chimneypiece with firebox, cast-iron grate, logs with embers and low flames.
export function fireplace(parent, kit, mats, { x, z, yaw, w = 1.9, h = 1.35, depth = 0.5 }) {
  const root = new THREE.Group(); root.position.set(x, 0, z); root.rotation.y = yaw; parent.add(root);
  root.updateMatrixWorld(true);
  const M = root.matrixWorld;
  const box = (mat, cx, cy, cz, bw, bh, bd, tile = 0.8) => {
    const g = new THREE.BoxGeometry(bw, bh, bd); const uv = g.attributes.uv; const dims = [[bd, bh], [bd, bh], [bw, bd], [bw, bd], [bw, bh], [bw, bh]];
    for (let f = 0; f < 6; f++) for (let v = 0; v < 4; v++) { const i = f * 4 + v; uv.setXY(i, uv.getX(i) * dims[f][0] / tile, uv.getY(i) * dims[f][1] / tile); }
    kit.add(g, mat, new THREE.Matrix4().makeTranslation(cx, cy, cz).premultiply(M));
  };
  const ow = 0.95, oh = 0.85; // firebox opening
  const pil = (w - ow) / 2;
  // pilasters (local +z toward room), with plinths and capitals
  for (const s of [-1, 1]) {
    const cx = s * (ow / 2 + pil / 2);
    box(mats.marble, cx, oh / 2 + 0.05, 0.1, pil - 0.04, oh, 0.18);
    box(mats.marble, cx, 0.07, 0.11, pil, 0.14, 0.21);
    box(mats.marble, cx, oh + 0.09, 0.115, pil + 0.02, 0.08, 0.22);
  }
  // frieze + mantel shelf with molding
  box(mats.marble, 0, oh + 0.24, 0.1, w - 0.02, 0.24, 0.18);
  box(mats.marble, 0, h - 0.04, 0.16, w + 0.18, 0.06, 0.32);
  kit.profile('crown', mats.marble, new V3(w / 2 + 0.06, h - 0.07, 0.0).applyMatrix4(M), new V3(0, 0, 1).transformDirection(M), new V3(0, -1, 0), w + 0.12);
  // hearth slab + firebox
  box(mats.marble, 0, 0.02, 0.45, w + 0.3, 0.04, 0.6);
  box(mats.brick, 0, oh / 2 + 0.05, -depth + 0.02, ow, oh, 0.04, 0.5);
  for (const s of [-1, 1]) { const g = new THREE.BoxGeometry(0.04, oh, depth); g.rotateY(s * 0.25); kit.add(g, mats.brick, new THREE.Matrix4().makeTranslation(s * (ow / 2 - 0.06), oh / 2 + 0.05, -depth / 2 + 0.01).premultiply(M)); }
  box(mats.brick, 0, oh + 0.06, -depth / 2 + 0.01, ow, 0.03, depth);
  box(mats.soot, 0, 0.055, -depth / 2 + 0.04, ow - 0.04, 0.012, depth - 0.06, 0.5);
  // chimney breast: projects `breastDepth` from the wall; split around the firebox below the mantel
  const bd = mats.breastDepth ?? 0.24, BW = w + 0.3, H = mats.ceilingH;
  box(mats.breast, 0, (h + H) / 2, -bd / 2 + 0.02, BW, H - h, bd, 1.2);
  for (const s of [-1, 1]) box(mats.breast, s * (ow / 2 + (BW - ow) / 4), h / 2, -bd / 2 - 0.02, (BW - ow) / 2, h, bd - 0.08, 1.2);
  // cast-iron grate
  const grate = new THREE.Group(); grate.position.set(0, 0.06, -0.2); root.add(grate);
  for (let i = 0; i < 7; i++) { const b = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.012, 0.36), _ironDark); b.position.set(-0.27 + i * 0.09, 0.12, 0); grate.add(b); }
  for (const s of [-1, 1]) { const l = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.016, 0.16, 8), _ironDark); l.position.set(s * 0.3, 0.06, 0.15); grate.add(l); const f = new THREE.Mesh(new THREE.SphereGeometry(0.025, 10, 8), _brass); f.position.set(s * 0.3, 0.16, 0.17); grate.add(f); }
  // logs: two charred logs with ember shader, a broken one
  const em = emberMaterial();
  for (const [lx, ly, lz, ry, len, rad] of [[0, 0.2, -0.22, 0.15, 0.55, 0.06], [0.05, 0.25, -0.12, -0.3, 0.5, 0.055], [-0.18, 0.19, -0.05, 1.2, 0.3, 0.045]]) {
    const lg = new THREE.Mesh(new THREE.CylinderGeometry(rad, rad * 1.1, len, 12, 4), em); lg.rotation.set(0, ry, Math.PI / 2); lg.position.set(lx, ly, lz); root.add(lg);
  }
  // ash bed glow
  const ash = new THREE.Mesh(new THREE.PlaneGeometry(0.62, 0.32), em); ash.rotation.x = -Math.PI / 2; ash.position.set(0, 0.075, -0.2); root.add(ash);
  // low flames: crossed quads
  const fm = flameMaterial();
  for (let i = 0; i < 3; i++) { const q = new THREE.Mesh(new THREE.PlaneGeometry(0.45, 0.32), fm); q.position.set(-0.06 + i * 0.05, 0.38, -0.18); q.rotation.y = i * 1.05; q.renderOrder = 6; root.add(q); }
  // fireside tools stand
  const tools = new THREE.Group(); tools.position.set(w / 2 + 0.28, 0, 0.35); root.add(tools);
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.7, 8), _brass); pole.position.y = 0.38; tools.add(pole);
  const baseT = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.11, 0.025, 20), _brass); baseT.position.y = 0.012; tools.add(baseT);
  for (let i = 0; i < 3; i++) { const t = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.62, 6), _ironDark); t.position.set(Math.cos(i * 2.1) * 0.035, 0.36, Math.sin(i * 2.1) * 0.035); t.rotation.z = Math.cos(i * 2.1) * 0.06; tools.add(t); }
  root.traverse((o) => { if (o.isMesh) { o.castShadow = o.material !== fm; o.receiveShadow = true; } });
  return { root, firePos: new V3(0, 0.45, -0.05).applyMatrix4(M), dir: new V3(0, 0, 1).transformDirection(M) };
}

// ----------------------------------- Rugs -----------------------------------
// Persian-style rug texture: border bands, guard stripes, central medallion, field motifs, wear.
export function rugTexture(seed = 1, pal = null) {
  const [c, g] = canvas(1024, 1536); const r = rng(seed);
  const P = pal || { field: '#6b1d1d', border: '#1d2a4a', guard: '#c9a86a', motif: '#d7c6a0', accent: '#2f4a3a', dark: '#2a1010' };
  const W = 1024, H = 1536;
  g.fillStyle = P.field; g.fillRect(0, 0, W, H);
  // field lattice of small motifs
  for (let y = 180; y < H - 180; y += 64) for (let x = 180; x < W - 180; x += 64) {
    const o = ((y / 64) % 2) * 32; g.save(); g.translate(x + o, y); g.rotate(Math.PI / 4);
    g.fillStyle = P.dark; g.fillRect(-12, -12, 24, 24); g.fillStyle = P.motif; g.fillRect(-5, -5, 10, 10); g.restore();
    g.fillStyle = P.accent; g.fillRect(x + o - 2, y + 18, 4, 10);
  }
  // medallion
  g.save(); g.translate(W / 2, H / 2);
  for (const [rx, ry, col] of [[300, 420, P.dark], [270, 380, P.border], [230, 330, P.guard], [200, 290, P.field], [140, 200, P.accent], [90, 130, P.motif], [40, 60, P.dark]]) {
    g.fillStyle = col; g.beginPath(); for (let k = 0; k < 16; k++) { const a = k / 16 * 6.283; const rr = k % 2 ? 0.86 : 1; g.lineTo(Math.cos(a) * rx * rr, Math.sin(a) * ry * rr); } g.closePath(); g.fill();
  }
  g.restore();
  // corner spandrels
  for (const [cx, cy] of [[160, 160], [W - 160, 160], [160, H - 160], [W - 160, H - 160]]) { g.fillStyle = P.border; g.beginPath(); g.arc(cx, cy, 140, 0, 7); g.fill(); g.fillStyle = P.guard; g.beginPath(); g.arc(cx, cy, 70, 0, 7); g.fill(); }
  // borders
  const band = (inset, wdt, col) => { g.strokeStyle = col; g.lineWidth = wdt; g.strokeRect(inset, inset, W - inset * 2, H - inset * 2); };
  band(40, 70, P.border); band(84, 10, P.guard); band(100, 14, P.dark); band(120, 8, P.guard);
  for (let i = 0; i < 2 * (W + H) / 40; i++) { // border boteh motifs
    const t = i * 40; let x, y; if (t < W) { x = t; y = 40; } else if (t < W + H) { x = W - 40; y = t - W; } else if (t < 2 * W + H) { x = 2 * W + H - t; y = H - 40; } else { x = 40; y = 2 * (W + H) - t; }
    g.fillStyle = P.motif; g.beginPath(); g.ellipse(x, y, 9, 14, i, 0, 7); g.fill(); g.fillStyle = P.field; g.beginPath(); g.arc(x, y, 4, 0, 7); g.fill();
  }
  // weave texture + abrash (dye variation) + wear path
  const img = g.getImageData(0, 0, W, H); const d = img.data;
  for (let y = 0; y < H; y++) { const ab = 0.92 + 0.08 * Math.sin(y * 0.013 + seed); for (let x = 0; x < W; x++) {
    const i = (y * W + x) * 4; const weave = ((x + (y & 1)) % 2) ? 0.94 : 1.0; const n = 0.9 + r() * 0.2;
    const wear = Math.exp(-Math.pow((x - W * 0.55) / (W * 0.18), 2) - Math.pow((y - H * 0.5) / (H * 0.5), 2)) * 0.35;
    for (let ch = 0; ch < 3; ch++) d[i + ch] = Math.min(255, d[i + ch] * weave * n * ab * (1 - wear * 0.3) + wear * 40);
  } }
  g.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  return t;
}
export function aubussonTexture(seed = 1, P = {}) {
  const W = 1024, H = 1344; const [c, g] = canvas(W, H); const r = rng(seed);
  const C = { field: '#1f3236', field2: '#283d40', border: '#6e5434', band: '#8c7048', cream: '#ad9a74', rose: '#7a4236', leaf: '#4f5f42', gold: '#93763f', dark: '#141e20', ...P };
  g.fillStyle = C.field; g.fillRect(0, 0, W, H);
  // field: dense floral lattice (rosettes + leaves) in low contrast
  const lattice = (sp, rr) => { for (let y = 40; y < H; y += sp) for (let x = 40; x < W; x += sp) {
    const ox = ((y / sp) % 2) * sp / 2; const cx = x + ox, cy = y;
    g.fillStyle = C.field2; g.beginPath(); g.arc(cx, cy, rr, 0, 7); g.fill();
    for (let k = 0; k < 4; k++) { const a = k * Math.PI / 2 + 0.785; g.fillStyle = C.leaf; g.beginPath(); g.ellipse(cx + Math.cos(a) * 14, cy + Math.sin(a) * 14, 9, 3.5, a, 0, 7); g.fill(); }
    for (let k = 0; k < 6; k++) { const a = k / 6 * 6.283; g.fillStyle = r() < 0.5 ? C.rose : C.gold; g.beginPath(); g.arc(cx + Math.cos(a) * 5, cy + Math.sin(a) * 5, 3.4, 0, 7); g.fill(); }
    g.fillStyle = C.cream; g.beginPath(); g.arc(cx, cy, 2.4, 0, 7); g.fill();
  } };
  lattice(64, 24);
  // central medallion: lobed cartouche of scrolls
  g.save(); g.translate(W / 2, H / 2);
  for (const [rx, ry, col, lobes] of [[330, 420, C.dark, 12], [310, 400, C.band, 12], [292, 378, C.field, 12], [210, 270, C.gold, 8], [194, 252, C.field2, 8], [120, 150, C.rose, 8], [104, 132, C.cream, 8], [50, 62, C.gold, 6]]) {
    g.fillStyle = col; g.beginPath();
    for (let k = 0; k <= 96; k++) { const a = k / 96 * 6.283; const lob = 1 + 0.07 * Math.cos(a * lobes); g.lineTo(Math.cos(a) * rx * lob, Math.sin(a) * ry * lob); }
    g.fill();
  }
  for (let k = 0; k < 16; k++) { const a = k / 16 * 6.283; g.fillStyle = k % 2 ? C.rose : C.leaf; g.beginPath(); g.ellipse(Math.cos(a) * 160, Math.sin(a) * 205, 26, 10, a, 0, 7); g.fill(); }
  g.restore();
  // fine pattern inside the outer medallion field ring
  g.save(); g.beginPath(); g.ellipse(W / 2, H / 2, 290, 376, 0, 0, 7); g.ellipse(W / 2, H / 2, 214, 274, 0, 0, 7, true); g.clip('evenodd');
  for (let y = 0; y < H; y += 26) for (let x = 0; x < W; x += 26) { g.fillStyle = (x + y) % 52 ? C.gold : C.rose; g.globalAlpha = 0.55; g.beginPath(); g.arc(x + ((y / 26) % 2) * 13, y, 4, 0, 7); g.fill(); }
  g.globalAlpha = 1; g.restore();
  // corner quarter-medallions
  for (const [cx, cy] of [[0, 0], [W, 0], [0, H], [W, H]]) { g.fillStyle = C.band; g.beginPath(); g.ellipse(cx, cy, 260, 300, 0, 0, 7); g.fill(); g.fillStyle = C.field2; g.beginPath(); g.ellipse(cx, cy, 236, 276, 0, 0, 7); g.fill(); g.fillStyle = C.rose; g.beginPath(); g.ellipse(cx, cy, 120, 140, 0, 0, 7); g.fill(); }
  // border: guard stripes + scrolling vine band
  const bw = 120;
  g.fillStyle = C.border; g.fillRect(0, 0, W, bw); g.fillRect(0, H - bw, W, bw); g.fillRect(0, 0, bw, H); g.fillRect(W - bw, 0, bw, H);
  g.strokeStyle = C.dark; g.lineWidth = 8; g.strokeRect(bw, bw, W - 2 * bw, H - 2 * bw); g.strokeStyle = C.cream; g.lineWidth = 4; g.strokeRect(bw + 10, bw + 10, W - 2 * bw - 20, H - 2 * bw - 20);
  g.strokeStyle = C.dark; g.lineWidth = 5; g.strokeRect(14, 14, W - 28, H - 28);
  const vine = (x0, y0, x1, y1) => { const L = Math.hypot(x1 - x0, y1 - y0); const ux = (x1 - x0) / L, uy = (y1 - y0) / L; const nx = -uy, ny = ux; g.strokeStyle = C.gold; g.lineWidth = 2.5; g.beginPath();
    for (let t = 0; t <= L; t += 6) { const off = Math.sin(t / 40) * 22; g.lineTo(x0 + ux * t + nx * off, y0 + uy * t + ny * off); } g.stroke();
    for (let t = 20; t < L; t += 40) { const off = Math.sin(t / 40) * 22; const px = x0 + ux * t + nx * off, py = y0 + uy * t + ny * off; g.fillStyle = (t / 40) % 2 < 1 ? C.rose : C.cream; g.beginPath(); g.arc(px + nx * 18 * Math.sign(Math.cos(t / 40)), py + ny * 18 * Math.sign(Math.cos(t / 40)), 9, 0, 7); g.fill(); g.fillStyle = C.leaf; g.beginPath(); g.ellipse(px - nx * 12, py - ny * 12, 11, 4, Math.atan2(uy, ux) + 0.6, 0, 7); g.fill(); } };
  vine(bw / 2, bw / 2, W - bw / 2, bw / 2); vine(bw / 2, H - bw / 2, W - bw / 2, H - bw / 2); vine(bw / 2, bw / 2, bw / 2, H - bw / 2); vine(W - bw / 2, bw / 2, W - bw / 2, H - bw / 2);
  // weave + abrash + traffic wear in front of the sofa
  const img = g.getImageData(0, 0, W, H); const d = img.data;
  for (let y = 0; y < H; y++) { const ab = 0.94 + 0.06 * Math.sin(y * 0.011 + seed); for (let x = 0; x < W; x++) {
    const i = (y * W + x) * 4; const weave = ((x + (y & 1)) & 1) ? 0.95 : 1.0; const n = 0.92 + r() * 0.16;
    const wear = Math.exp(-Math.pow((x - W * 0.5) / (W * 0.22), 2) - Math.pow((y - H * 0.5) / (H * 0.35), 2)) * 0.22;
    for (let ch = 0; ch < 3; ch++) d[i + ch] = Math.min(255, d[i + ch] * weave * n * ab * (1 - wear * 0.25) + wear * 22);
  } }
  g.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t;
}
export function rug(assets, w, d, { seed = 1, pal = null, kick = 0, style = 'persian' } = {}) {
  const fab = assets.textures.get('poly_wool_herringbone') || {};
  const nrm = fab.nor_gl ? fab.nor_gl.clone() : null; if (nrm) { nrm.repeat.set(w * 3, d * 3); nrm.needsUpdate = true; }
  const m = new THREE.MeshPhysicalMaterial({ map: style === 'aubusson' ? aubussonTexture(seed, pal || {}) : rugTexture(seed, pal), normalMap: nrm, normalScale: new THREE.Vector2(0.6, 0.6), roughness: 0.95, sheen: 0.6, sheenColor: new THREE.Color(0.4, 0.3, 0.25), sheenRoughness: 0.6 });
  const g = new THREE.PlaneGeometry(w, d, 40, 40); g.rotateX(-Math.PI / 2);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), z = p.getZ(i); let y = 0.006 + Math.sin(x * 3.1) * Math.sin(z * 2.3) * 0.002;
    if (kick) { const dx = x - w / 2, dz = z - d / 2; const k = Math.max(0, 1 - Math.hypot(dx, dz) / (kick)); y += k * k * 0.05; } // a kicked-up corner
    p.setY(i, y);
  }
  g.computeVertexNormals();
  const mesh = new THREE.Mesh(g, m); mesh.receiveShadow = true;
  // fringe
  const fr = new THREE.Mesh(new THREE.PlaneGeometry(w, 0.06), new THREE.MeshStandardMaterial({ color: 0xcbbf9f, roughness: 1, alphaMap: fringeTex(), transparent: true, alphaTest: 0.4, side: THREE.DoubleSide }));
  fr.rotation.x = -Math.PI / 2; for (const s of [-1, 1]) { const f = fr.clone(); f.position.set(0, 0.004, s * (d / 2 + 0.03)); mesh.add(f); }
  return mesh;
}
let _fr = null;
function fringeTex() { if (_fr) return _fr; const [c, g] = canvas(256, 16); g.fillStyle = '#000'; g.fillRect(0, 0, 256, 16); g.fillStyle = '#fff'; for (let i = 0; i < 256; i += 3) g.fillRect(i, 0, 1.5, 12 + Math.random() * 4); _fr = new THREE.CanvasTexture(c); _fr.wrapS = THREE.RepeatWrapping; _fr.repeat.x = 6; return _fr; }

// ----------------------------------- Books -----------------------------------
// Spine atlas: 8x4 cells of cloth/leather spines with gilt bands and title blocks.
let _spines = null;
function spineAtlas() {
  if (_spines) return _spines;
  const [c, g] = canvas(1024, 1024); const r = rng(5);
  const cols = ['#5a1a14', '#2c3b2a', '#1e2a40', '#6b4a22', '#3b2418', '#7a6a4a', '#202020', '#4a1f2e', '#5c5236', '#2a3a3e', '#8a2a1a', '#3d3d2a'];
  for (let i = 0; i < 32; i++) {
    const cx = (i % 8) * 128, cy = Math.floor(i / 8) * 256; const col = cols[Math.floor(r() * cols.length)];
    g.fillStyle = col; g.fillRect(cx, cy, 128, 256);
    const gilt = r() < 0.7; g.fillStyle = gilt ? '#b89a5a' : '#d8cdb0';
    const bands = 2 + Math.floor(r() * 3);
    for (let b = 0; b < bands; b++) { const y = cy + 20 + b * (216 / bands) + (r() * 6); g.fillRect(cx + 6, y, 116, 4); g.fillRect(cx + 6, y + 8, 116, 2); }
    g.fillRect(cx + 20, cy + 70 + r() * 40, 88, 10); g.fillRect(cx + 30, cy + 90 + r() * 40, 68, 6);
    // scuffs
    for (let k = 0; k < 40; k++) { g.fillStyle = `rgba(0,0,0,${r() * 0.25})`; g.fillRect(cx + r() * 128, cy + r() * 256, r() * 10, r() * 4); }
    g.fillStyle = 'rgba(255,255,255,0.05)'; g.fillRect(cx, cy, 128, 6); g.fillRect(cx, cy + 250, 128, 6);
  }
  _spines = new THREE.CanvasTexture(c); _spines.colorSpace = THREE.SRGBColorSpace; _spines.anisotropy = 8;
  return _spines;
}
// Fill a shelf (local frame: x along shelf, y up, z toward front) with books; returns InstancedMesh.
export function bookRow(len, depth, maxH, { seed = 1, gaps = 0.05, lean = 0.1, fill = 0.92 } = {}) {
  const r = rng(seed); const items = []; let x = 0.02;
  while (x < len * fill) {
    if (r() < gaps) { x += 0.04 + r() * 0.12; continue; } // missing books
    const t = 0.02 + r() * 0.035, h = Math.min(maxH - 0.01, 0.17 + r() * 0.12), d = Math.min(depth - 0.02, 0.13 + r() * 0.08);
    items.push({ x: x + t / 2, t, h, d, cell: Math.floor(r() * 32), lean: 0 }); x += t + 0.002;
  }
  // a leaning book at the end of the row
  if (items.length && r() < lean * 4) { const it = items[items.length - 1]; it.lean = 0.25 + r() * 0.2; it.x += Math.sin(it.lean) * it.h * 0.5; }
  const g = new THREE.BoxGeometry(1, 1, 1);
  // uv: map spine face (+z) to atlas cell via instance attribute
  const mat = new THREE.MeshStandardMaterial({ map: spineAtlas(), roughness: 0.72, color: 0x9a8e80 });
  mat.onBeforeCompile = (s) => {
    s.vertexShader = s.vertexShader.replace('#include <common>', '#include <common>\nattribute float aCell; varying float vFace;')
      .replace('#include <uv_vertex>', '#include <uv_vertex>\n#ifdef USE_MAP\n vec2 cellUv = vec2(mod(aCell, 8.0), floor(aCell/8.0)); vMapUv = (cellUv + (normal.z > 0.5 ? uv : vec2(0.02,0.5))*vec2(1.0, 1.0)) / vec2(8.0, 4.0);\n vMapUv.y = 1.0 - vMapUv.y;\n#endif\n vFace = (abs(normal.y) > 0.5) ? 1.0 : 0.0;')
    s.fragmentShader = s.fragmentShader.replace('#include <common>', '#include <common>\nvarying float vFace;')
      .replace('#include <map_fragment>', '#include <map_fragment>\n if (vFace > 0.5) diffuseColor.rgb = vec3(0.78,0.74,0.62)*0.8;');
  };
  const mesh = new THREE.InstancedMesh(g, mat, items.length);
  const cells = new Float32Array(items.length); const m = new THREE.Matrix4(); const q = new THREE.Quaternion();
  items.forEach((it, i) => {
    q.setFromAxisAngle(new V3(0, 0, 1), -it.lean);
    m.compose(new V3(it.x, it.h / 2 * Math.cos(it.lean), depth - it.d / 2 - 0.01), q, new V3(it.t, it.h, it.d));
    mesh.setMatrixAt(i, m); cells[i] = it.cell;
  });
  g.setAttribute('aCell', new THREE.InstancedBufferAttribute(cells, 1));
  mesh.castShadow = true; mesh.receiveShadow = true;
  return mesh;
}

// ----------------------------------- Lamps -----------------------------------
// Wall sconce: brass backplate, arm, fabric shade with emissive bulb glow.
export function sconce(shadeColor = 0xe8d2a8) {
  const g = new THREE.Group();
  const plate = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 0.02, 20), _brass); plate.rotation.x = Math.PI / 2; plate.position.z = 0.01; g.add(plate);
  const curve = new THREE.QuadraticBezierCurve3(new V3(0, 0, 0.01), new V3(0, -0.02, 0.16), new V3(0, 0.08, 0.2));
  const arm = new THREE.Mesh(new THREE.TubeGeometry(curve, 12, 0.008, 8), _brass); g.add(arm);
  const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.018, 0.04, 16), _brass); cup.position.set(0, 0.1, 0.2); g.add(cup);
  const shadeMat = new THREE.MeshStandardMaterial({ color: shadeColor, roughness: 0.9, side: THREE.DoubleSide, emissive: new THREE.Color(1.0, 0.72, 0.42), emissiveIntensity: 0, transparent: true, opacity: 0.96 });
  const shade = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.085, 0.13, 24, 1, true), shadeMat); shade.position.set(0, 0.17, 0.2); g.add(shade);
  g.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  return { group: g, mats: [shadeMat], lightPos: new V3(0, 0.17, 0.2) };
}

// ----------------------------------- Deep window bay dressing -----------------------------------
// For a window opening in a wall whose room face is at `faceZ` (window in an s/n wall; dir = +1 if the
// outside is +z). Builds: panelled reveals (0.42 deep) with folded box shutters, sill board, sash set
// back in the reveal, walnut pelmet with a velvet valance, lace sheer, tied-back velvet drapes.
export function windowBay(scene, kit, M, assets, { x, faceZ, dir = 1, w, h, y0, velvetColor = 0x4a1a1c, cracked = false, laceOpen = 0 }) {
  const D = 0.42; const zIn = faceZ, zOut = faceZ + dir * D; const zc = (zIn + zOut) / 2;
  const B = (mat, cx, cy, cz, bw, bh, bd, tile = 0.8) => kit.box(mat, cx, cy, cz, bw, bh, bd, { tile });
  // reveals (side linings, head, sill) in walnut with raised shutter panels folded into them
  for (const s of [-1, 1]) {
    B(M.walnutGround, x + s * (w / 2 + 0.01), y0 + h / 2, zc, 0.02, h, D);
    for (const k of [0, 1]) { // two shutter leaves folded flat against each reveal
      const p = new THREE.Vector3(x + s * (w / 2 - 0.012), y0 + 0.05 + k * (h / 2), zIn + dir * 0.2);
      kit.raisedPanel(M.walnutRich, p.clone().add(new THREE.Vector3(0, h / 4 - 0.03, 0)), new THREE.Vector3(-s, 0, 0), D - 0.08, h / 2 - 0.1, 0.014);
    }
  }
  B(M.walnutGround, x, y0 + h + 0.01, zc, w + 0.04, 0.02, D);
  B(M.walnutRich, x, y0 - 0.025, zc - dir * 0.04, w + 0.12, 0.05, D + 0.1); // sill board, nosed into the room
  // sash set back in the reveal
  sashWindow(scene, M.paintedCream, { x, z: zOut - dir * 0.04, yaw: dir > 0 ? Math.PI : 0, w, h, y0, panes: [3, 3] });
  if (cracked) { // a cracked lower pane: tape across it, water got in
    const crack = new THREE.Mesh(new THREE.PlaneGeometry(0.34, 0.012), new THREE.MeshStandardMaterial({ color: 0xd8d0b8, roughness: 0.8 }));
    crack.position.set(x - w * 0.22, y0 + h * 0.28, zOut - dir * 0.065); crack.rotation.z = 0.6; scene.add(crack);
    const c2 = crack.clone(); c2.rotation.z = -0.5; c2.position.x += 0.06; scene.add(c2);
  }
  // pelmet box + valance
  const pw = w + 1.0, py = y0 + h + 0.45;
  B(M.walnutRich, x, py, zIn - dir * 0.11, pw, 0.3, 0.2, 0.9);
  kit.runH('crown', M.walnutRich, x - pw / 2, zIn - dir * 0.21, x + pw / 2, zIn - dir * 0.21, py + 0.15, new THREE.Vector3(0, 0, -dir), { down: true });
  const vel = velvet(assets, velvetColor);
  const val = curtain(vel, pw - 0.04, 0.42, { gather: 0.0, tie: 0.9, side: 1, seed: x * 3, pool: 0 }); val.position.set(x - (pw - 0.04) / 2 + (pw - 0.04) / 2, py - 0.15 - 0.42 + 0.0, zIn - dir * 0.215); val.position.x = x; val.geometry.translate(0, 0, 0); scene.add(val);
  // lace sheer across the window (slightly parted on one side), catches the cold light
  const lace = curtain(M.lace, w + 0.25, h + 0.35, { gather: 0.0, tie: 0.5, side: 1, seed: x * 7, pool: 0, folds: 4.5, amp: 0.018 });
  lace.position.set(x + laceOpen * 0.25, y0 - 0.12, zIn - dir * 0.02); if (dir < 0) lace.rotation.y = Math.PI; lace.castShadow = false; scene.add(lace);
  // heavy velvet drapes tied back
  for (const s of [-1, 1]) {
    const c = curtain(vel, 0.75, py - 0.15, { gather: 0.6, tie: 0.38, side: -s, seed: x * 11 + s, pool: 0.08 });
    c.position.set(x + s * (w / 2 + 0.3), 0.0, zIn - dir * 0.12); if (dir > 0) c.rotation.y = Math.PI; scene.add(c);
    const tie = new THREE.Mesh(new THREE.TorusGeometry(0.035, 0.012, 6, 14), M.brass); tie.position.set(x + s * (w / 2 + 0.42), 1.32, zIn - dir * 0.08); tie.rotation.y = Math.PI / 2; scene.add(tie);
  }
  return { lace };
}
