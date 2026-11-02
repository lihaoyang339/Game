// Manor material library: each room family gets its own material identity. Aging is applied with
// purpose (dust settles on up-facing surfaces, grime rises from floors, water stains under leaks,
// fading under windows) rather than as a uniform dirt overlay.
import * as THREE from 'three';

const AGE_GLSL = /* glsl */`
float ah(vec3 p){ p = fract(p*0.1031); p += dot(p, p.zyx+31.32); return fract((p.x+p.y)*p.z); }
float an(vec3 p){ vec3 i=floor(p); vec3 f=fract(p); f=f*f*(3.0-2.0*f);
  return mix(mix(mix(ah(i),ah(i+vec3(1,0,0)),f.x),mix(ah(i+vec3(0,1,0)),ah(i+vec3(1,1,0)),f.x),f.y),
             mix(mix(ah(i+vec3(0,0,1)),ah(i+vec3(1,0,1)),f.x),mix(ah(i+vec3(0,1,1)),ah(i+vec3(1,1,1)),f.x),f.y),f.z); }
float afbm(vec3 p){ float a=0.5,s=0.0; for(int i=0;i<4;i++){ s+=a*an(p); p*=2.07; a*=0.5; } return s; }
`;

// Aging options: dust (0..1) on up-facing surfaces; grime (0..1) near floor; stains: [{x,y,z,r}] water stains
// (run downward); fade (0..1) washes color; checker: {a: color, b: color, size} marble checkerboard.
export function age(mat, o = {}) {
  const u = {
    uDust: { value: o.dust ?? 0 }, uGrime: { value: o.grime ?? 0 }, uFade: { value: o.fade ?? 0 },
    uTint2: { value: new THREE.Color(o.checker?.b ?? 0xffffff) }, uChecker: { value: o.checker ? o.checker.size : 0 },
    uTint1: { value: new THREE.Color(o.checker?.a ?? 0xffffff) },
    uStains: { value: Array.from({ length: 4 }, (_, i) => o.stains?.[i] ? new THREE.Vector4(o.stains[i].x, o.stains[i].y, o.stains[i].z, o.stains[i].r) : new THREE.Vector4(0, -99, 0, 0)) },
    uWet: { value: o.wet ?? 0 }, uWetY: { value: o.wetY ?? 0.02 },
  };
  const key = JSON.stringify([o.dust, o.grime, o.fade, o.checker, o.stains, o.wet]);
  mat.userData.age = { dust: o.dust ?? 0, grime: o.grime ?? 0, fade: o.fade ?? 0, checker: o.checker ? { a: new THREE.Color(o.checker.a).getHex(), b: new THREE.Color(o.checker.b).getHex(), size: o.checker.size } : null, stains: (o.stains || []).slice(0, 4), wet: o.wet ?? 0, wetY: o.wetY ?? 0.02 };
  mat.customProgramCacheKey = () => 'age1';
  mat.onBeforeCompile = (s) => {
    Object.assign(s.uniforms, u);
    s.vertexShader = s.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vAgeW; varying vec3 vAgeN;')
      .replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\nvAgeW = (modelMatrix * vec4(transformed, 1.0)).xyz; vAgeN = normalize(mat3(modelMatrix) * objectNormal);');
    // #include <worldpos_vertex> only computes worldPosition under some defines; compute ourselves above.
    s.fragmentShader = s.fragmentShader.replace('#include <common>', `#include <common>
      varying vec3 vAgeW; varying vec3 vAgeN; uniform float uDust, uGrime, uFade, uChecker, uWet, uWetY; uniform vec3 uTint1, uTint2; uniform vec4 uStains[4];
      float gAgeRough; ${AGE_GLSL}`)
      .replace('#include <map_fragment>', `#include <map_fragment>
      {
        gAgeRough = 0.0;
        vec3 w = vAgeW; vec3 n = normalize(vAgeN);
        if (uChecker > 0.0) { vec2 c = floor(w.xz / uChecker); float k = mod(c.x + c.y, 2.0); diffuseColor.rgb *= mix(uTint1, uTint2, k);
          vec2 f = fract(w.xz / uChecker); float grout = 1.0 - smoothstep(0.0, 0.006/uChecker, min(min(f.x,1.0-f.x), min(f.y,1.0-f.y)));
          diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb*0.55, grout*0.7); gAgeRough += grout*0.3; }
        float lum = dot(diffuseColor.rgb, vec3(0.3,0.59,0.11));
        diffuseColor.rgb = mix(diffuseColor.rgb, vec3(lum)*vec3(1.02,0.98,0.9) + 0.03, uFade * (0.6 + 0.4*afbm(w*1.3)));
        float up = smoothstep(0.55, 0.95, n.y);
        float dn = afbm(w*7.0);
        float dust = up * uDust * (0.55 + 0.45*dn);
        diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.42,0.39,0.35), clamp(dust*0.75, 0.0, 0.85));
        gAgeRough += dust*0.5;
        float grime = uGrime * (1.0 - smoothstep(0.0, 0.55 + 0.25*afbm(w*2.0), w.y)) * (1.0 - up);
        diffuseColor.rgb *= 1.0 - grime*0.45;
        for (int i=0;i<4;i++){ vec4 st = uStains[i]; if (st.w <= 0.0) continue;
          vec3 d = w - st.xyz; float horiz = length(d.xz) + abs(d.x)*0.0;
          float run = smoothstep(st.w, 0.0, horiz + max(d.y, 0.0)*2.0 + (afbm(w*3.0)-0.5)*st.w*0.8) * smoothstep(-2.6*st.w-1.2, 0.0, d.y);
          float edge = smoothstep(0.08, 0.0, abs(run - 0.25)) * 0.5;
          diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb*vec3(0.62,0.55,0.42), clamp(run*0.8 + edge, 0.0, 0.9));
        }
        float wet = uWet * (1.0 - smoothstep(uWetY, uWetY + 0.01, abs(w.y))) * smoothstep(0.45, 0.6, afbm(w*1.7));
        diffuseColor.rgb *= 1.0 - wet*0.35; gAgeRough -= wet*0.8;
      }`)
      .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\n roughnessFactor = clamp(roughnessFactor + gAgeRough, 0.04, 1.0);');
  };
  mat.userData.age = u; mat.userData.ageKey = key;
  mat.needsUpdate = true;
  return mat;
}

// Victorian striped wallpaper with floral sprigs (one pattern repeat = 0.53 m, standard roll width)
export function wallpaperTexture() {
  const c = document.createElement('canvas'); c.width = 512; c.height = 512; const g = c.getContext('2d');
  g.fillStyle = '#9c9474'; g.fillRect(0, 0, 512, 512);
  for (let x = 0; x < 512; x += 128) { g.fillStyle = '#8a8466'; g.fillRect(x, 0, 52, 512); g.fillStyle = '#b3a882'; g.fillRect(x + 52, 0, 4, 512); g.fillRect(x + 124, 0, 4, 512); }
  const sprig = (cx, cy, s) => { g.strokeStyle = '#5a6448'; g.lineWidth = 2.5 * s; g.beginPath(); g.moveTo(cx, cy + 22 * s); g.bezierCurveTo(cx - 6 * s, cy + 6 * s, cx + 6 * s, cy - 6 * s, cx, cy - 20 * s); g.stroke();
    for (const [dx, dy, a] of [[-9, 6, -0.6], [9, -2, 0.6], [-8, -10, -0.8]]) { g.fillStyle = '#5f6b4c'; g.beginPath(); g.ellipse(cx + dx * s, cy + dy * s, 7 * s, 3 * s, a, 0, 7); g.fill(); }
    g.fillStyle = '#8c4a3e'; g.beginPath(); g.arc(cx, cy - 22 * s, 6 * s, 0, 7); g.fill(); g.fillStyle = '#b07a5e'; g.beginPath(); g.arc(cx - 2 * s, cy - 24 * s, 2.5 * s, 0, 7); g.fill(); };
  for (let y = 0; y < 512; y += 128) for (let x = 0; x < 512; x += 128) { sprig(x + 90, y + 50, 1.1); sprig(x + 90 + (x % 256 ? 0 : 0), y + 114, 0.8); }
  const img = g.getImageData(0, 0, 512, 512); const d = img.data;
  for (let i = 0; i < d.length; i += 4) { const n = 0.92 + Math.random() * 0.12; d[i] *= n; d[i + 1] *= n; d[i + 2] *= n; }
  g.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8;
  return t;
}

// Tone-on-tone damask (half-drop repeat): returns { map, rough } canvas textures. The printed motif
// is slightly glossier than the ground, as on real flock/satin damask papers.
export function damaskTextures(ground = '#3d5048', ink = '#55695c', seed = 3) {
  const N = 512; const mk = () => { const c = document.createElement('canvas'); c.width = N; c.height = N; return c; };
  const col = mk(), rgh = mk(); const g = col.getContext('2d'), r = rgh.getContext('2d');
  g.fillStyle = ground; g.fillRect(0, 0, N, N); r.fillStyle = '#e6e6e6'; r.fillRect(0, 0, N, N);
  const motif = (ctx, cx, cy, s, fill) => {
    ctx.fillStyle = fill;
    for (const side of [-1, 1]) {
      ctx.save(); ctx.translate(cx, cy); ctx.scale(side, 1);
      ctx.beginPath(); ctx.moveTo(0, 0.48 * s); ctx.bezierCurveTo(0.42 * s, 0.38 * s, 0.5 * s, -0.02 * s, 0.16 * s, -0.12 * s); ctx.bezierCurveTo(0.34 * s, -0.24 * s, 0.22 * s, -0.42 * s, 0.04 * s, -0.5 * s); ctx.lineTo(0, -0.5 * s); ctx.closePath(); ctx.fill();
      ctx.globalCompositeOperation = 'destination-out';
      ctx.beginPath(); ctx.moveTo(0.02 * s, 0.36 * s); ctx.bezierCurveTo(0.3 * s, 0.28 * s, 0.34 * s, 0.02 * s, 0.1 * s, -0.04 * s); ctx.bezierCurveTo(0.2 * s, 0.1 * s, 0.14 * s, 0.24 * s, 0.02 * s, 0.26 * s); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.ellipse(0.13 * s, -0.27 * s, 0.05 * s, 0.11 * s, 0.5, 0, 7); ctx.fill();
      ctx.globalCompositeOperation = 'source-over';
      ctx.beginPath(); ctx.ellipse(0.24 * s, 0.12 * s, 0.035 * s, 0.09 * s, -0.6, 0, 7); ctx.fill();
      ctx.lineWidth = 0.018 * s; ctx.strokeStyle = fill; ctx.beginPath(); ctx.arc(0.36 * s, -0.36 * s, 0.07 * s, 0.5, 4.2); ctx.stroke();
      ctx.restore();
    }
    ctx.beginPath(); ctx.ellipse(cx, cy - 0.06 * s, 0.05 * s, 0.13 * s, 0, 0, 7); ctx.fill();
  };
  for (const [cx, cy, sc] of [[N / 2, N / 4, 230], [0, 3 * N / 4, 230], [N, 3 * N / 4, 230], [N / 2, -N / 4, 230], [N / 2, 5 * N / 4, 230], [0, N / 4, 90], [N, N / 4, 90], [N / 2, 3 * N / 4, 90]]) { motif(g, cx, cy, sc, ink); motif(r, cx, cy, sc, '#9a9a9a'); }
  const img = g.getImageData(0, 0, N, N); const d = img.data; let st = seed;
  for (let i = 0; i < d.length; i += 4) { st = (st * 1103515245 + 12345) >>> 0; const n = 0.95 + (st / 4294967296) * 0.1; d[i] *= n; d[i + 1] *= n; d[i + 2] *= n; }
  g.putImageData(img, 0, 0);
  const map = new THREE.CanvasTexture(col); map.colorSpace = THREE.SRGBColorSpace; map.wrapS = map.wrapT = THREE.RepeatWrapping; map.anisotropy = 8;
  const rough = new THREE.CanvasTexture(rgh); rough.wrapS = rough.wrapT = THREE.RepeatWrapping;
  return { map, rough };
}
export function laceTexture() {
  const c = document.createElement('canvas'); c.width = 256; c.height = 256; const g = c.getContext('2d');
  g.fillStyle = '#000'; g.fillRect(0, 0, 256, 256); g.strokeStyle = '#fff'; g.lineWidth = 1.2;
  for (let y = 0; y < 256; y += 8) for (let x = (y / 8) % 2 ? 4 : 0; x < 256; x += 8) { g.beginPath(); g.arc(x, y, 3.2, 0, 7); g.stroke(); }
  g.fillStyle = '#fff';
  for (const [cx, cy] of [[64, 64], [192, 192], [192, 64], [64, 192]]) { for (let k = 0; k < 8; k++) { const a = k / 8 * 6.283; g.beginPath(); g.ellipse(cx + Math.cos(a) * 18, cy + Math.sin(a) * 18, 10, 4, a, 0, 7); g.fill(); } g.beginPath(); g.arc(cx, cy, 7, 0, 7); g.fill(); }
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; return t;
}

export const ENV_K = 0.16; // night calibration for the daylight interior HDR
export function buildManorMaterials(assets, envMap) {
  const T = (id) => assets.textures.get(id) || {};
  const pbr = (id, o = {}) => {
    const t = T(id);
    const m = new THREE.MeshStandardMaterial({
      map: t.diff || null, normalMap: t.nor_gl || null, roughnessMap: t.arm || null, aoMap: o.ao === false ? null : (t.arm || null), aoMapIntensity: 0.8,
      metalnessMap: o.metal ? t.arm : null, color: o.tint ?? 0xffffff, roughness: o.rough ?? 1, metalness: o.metal ?? 0,
      normalScale: new THREE.Vector2(o.ns ?? 1, o.ns ?? 1), envMap, envMapIntensity: (o.env ?? 0.25) * ENV_K,
    });
    m.name = (o.name || id);
    if (o.age) age(m, o.age);
    return m;
  };
  const M = {};
  // --- floors
  M.marbleChecker = pbr('marble_01', { name: 'foyer_marble', rough: 0.55, env: 0.6, age: { checker: { a: 0xa8a092, b: 0x3e3832, size: 0.6 }, dust: 0.0, grime: 0.22, fade: 0.1 } });
  M.herringbone = pbr('herringbone_parquet', { name: 'living_parquet', tint: 0xb59a7e, rough: 0.9, env: 0.35, age: { fade: 0.08 } });
  M.parquetDiag = pbr('diagonal_parquet', { name: 'gallery_parquet', tint: 0xa88b70, env: 0.3 });
  M.parquetRect = pbr('rectangular_parquet', { name: 'study_parquet', tint: 0x8f7462, env: 0.3, age: { dust: 0.15 } });
  M.oldPlanks = pbr('old_wood_floor', { name: 'service_planks', tint: 0xb0a090, age: { grime: 0.5 } });
  M.terracotta = pbr('terracotta_floor_tiles', { name: 'kitchen_terracotta', tint: 0xc8b0a0, age: { grime: 0.4 } });
  M.conservFloor = pbr('patio_tiles', { name: 'conserv_floor', tint: 0xb8b8b0, age: { wet: 0.6, wetY: 0.0, grime: 0.3 } });
  M.soil = pbr('brown_mud_leaves_01', { name: 'soil', tint: 0x8a7a68, ns: 1.2 });
  // --- walls
  M.damaskGreen = pbr('quatrefoil_jacquard_fabric', { name: 'foyer_damask', tint: 0x55704f, rough: 0.9, env: 0.15, age: { fade: 0.2, stains: [{ x: -3.9, y: 4.9, z: 0.4, r: 0.75 }, { x: 3.0, y: 5.1, z: 0.05, r: 0.5 }] } });
  M.damaskRed = pbr('quatrefoil_jacquard_fabric', { name: 'dining_damask', tint: 0x7a2a26, rough: 0.9, env: 0.12, age: { fade: 0.12, stains: [{ x: -15.7, y: 3.8, z: -10.8, r: 0.6 }] } });
  M.livingWall = pbr('rough_linen', { name: 'living_wallpaper', tint: 0xffffff, rough: 0.92, env: 0.08, ns: 0.4, age: { fade: 0.18, stains: [{ x: 13.25, y: 4.1, z: 8.6, r: 0.6 }] } });
  M.livingWall.map = wallpaperTexture(); M.livingWall.map.repeat.set(1, 1);
  M.galleryPlaster = pbr('painted_plaster_wall', { name: 'gallery_plaster', tint: 0xb8ad94, env: 0.1, age: { fade: 0.1, grime: 0.2 } });
  M.servicePlaster = pbr('painted_plaster_wall', { name: 'service_plaster', tint: 0xc9c0a6, env: 0.06, age: { grime: 0.6, fade: 0.1, stains: [{ x: -22.4, y: 2.7, z: -1.5, r: 0.45 }] } });
  M.whitePlaster = pbr('white_plaster_rough_01', { name: 'kitchen_plaster', tint: 0xe2dccd, env: 0.08, age: { grime: 0.3 } });
  M.kitchenTile = pbr('long_white_tiles', { name: 'kitchen_tiles', tint: 0xcfc8b8, rough: 0.7, env: 0.35, ns: 1.6, age: { grime: 0.6, stains: [{ x: -21.15, y: 2.4, z: -11.6, r: 0.8 }] } });
  M.brick = pbr('red_brick', { name: 'brick', tint: 0x9a7a6a });
  M.brickPlinth = pbr('castle_brick_01', { name: 'conserv_brick', tint: 0xa08070, age: { wet: 0.5, wetY: 0.25 } });
  // --- woods
  M.walnutPanel = pbr('black_walnut_veneer_01', { name: 'walnut_panel', tint: 0x9a7a62, rough: 0.7, env: 0.4 });
  M.walnutFrame = pbr('black_walnut_veneer_01', { name: 'walnut_frame', tint: 0x7a5c48, rough: 0.6, env: 0.45 });
  M.oak = pbr('oak_veneer_01', { name: 'oak', tint: 0x9c8064, rough: 0.7, env: 0.35 });
  M.studyFrieze = pbr('painted_plaster_wall', { name: 'study_frieze', tint: 0x4a5442, env: 0.05, age: { fade: 0.15, stains: [{ x: 0.4, y: 3.6, z: -11.6, r: 0.5 }] } });
  M.darkPanel = pbr('dark_paneled_wood', { name: 'study_panels', tint: 0x8a6e58, rough: 0.75, env: 0.3, age: { dust: 0.2 } });
  M.cherry = pbr('lacquered_cherry_wood', { name: 'cherry', tint: 0x9a6a58, rough: 0.5, env: 0.5 });
  M.darkWood = pbr('dark_wood', { name: 'dark_wood_beams', tint: 0x6a5444, rough: 0.8, env: 0.2 });
  M.painted = pbr('wood_cabinet_worn_long', { name: 'service_paint', tint: 0xb4b8a0, age: { grime: 0.5 } });
  M.paintedCream = pbr('wood_cabinet_worn_long', { name: 'cream_paint', tint: 0xe8e0c8, rough: 0.65, env: 0.2 });
  M.tableWorn = pbr('wood_table_worn', { name: 'kitchen_table', tint: 0xc8b8a0 });
  M.kitchenWood = pbr('kitchen_wood', { name: 'kitchen_wood', tint: 0xa89070 });
  // --- stone / plaster ceilings
  M.marble = pbr('marble_01', { name: 'marble_trim', tint: 0xe6e0d6, rough: 0.35, env: 0.6 });
  M.marbleDark = pbr('marble_01', { name: 'marble_dark', tint: 0x4a4440, rough: 0.3, env: 0.6 });
  M.ceilingPlaster = pbr('white_plaster_rough_01', { name: 'ceiling', tint: 0xddd6c6, env: 0.05, age: { fade: 0.1 } });
  M.ceilingFoyer = pbr('white_plaster_rough_01', { name: 'ceiling_foyer', tint: 0xd8d0be, env: 0.05, age: { stains: [{ x: -3.2, y: 5.25, z: 0.8, r: 0.9 }] } });
  M.stone = pbr('stone_tiles', { name: 'stone', tint: 0xb8b0a4 });
  M.soot = new THREE.MeshStandardMaterial({ color: 0x0b0a09, roughness: 1 });
  M.ironGreen = pbr('green_metal_rust', { name: 'conserv_iron', tint: 0x9ab09a, rough: 0.6, metal: 0.3, env: 0.3 });
  M.ironBlack = new THREE.MeshStandardMaterial({ color: 0x141312, metalness: 0.8, roughness: 0.5, envMap, envMapIntensity: 0.4 * ENV_K });
  M.brass = new THREE.MeshStandardMaterial({ color: 0xa8854f, metalness: 1, roughness: 0.35, envMap, envMapIntensity: 0.8 * ENV_K });
  M.leatherGreen = pbr('leather_red_02', { name: 'desk_leather', tint: 0x3a5a40, rough: 0.55, env: 0.3 });
  M.linen = pbr('rough_linen', { name: 'linen', tint: 0xe8e0cc, rough: 1, env: 0.05, age: { dust: 0.35 } });
  M.glass = new THREE.MeshPhysicalMaterial({ color: 0xa8b8b4, roughness: 0.06, transparent: true, opacity: 0.18, envMap, envMapIntensity: 1.2 * ENV_K, depthWrite: false });
  M.glassDirty = new THREE.MeshPhysicalMaterial({ color: 0x8f9f94, roughness: 0.35, transparent: true, opacity: 0.35, envMap, envMapIntensity: 0.6 * ENV_K, depthWrite: false, side: THREE.DoubleSide });
  // --- drawing room identity
  const dam = damaskTextures('#3a4b44', '#46594f');
  M.damaskSage = new THREE.MeshStandardMaterial({ map: dam.map, roughnessMap: dam.rough, roughness: 0.95, normalMap: T('rough_linen').nor_gl || null, normalScale: new THREE.Vector2(0.25, 0.25), envMap, envMapIntensity: 0.25 * ENV_K, name: 'drawing_damask' });
  age(M.damaskSage, { fade: 0.22, stains: [{ x: 10.7, y: 0.75, z: 9.0, r: 0.55 }] });
  M.walnutRich = pbr('black_walnut_veneer_01', { name: 'walnut_rich', tint: 0xb48a6a, rough: 0.55, env: 0.55 });
  M.walnutGround = pbr('black_walnut_veneer_01', { name: 'walnut_ground', tint: 0x9c7a60, rough: 0.62, env: 0.4, age: { dust: 0.25, grime: 0.15 } });
  M.oakFloor = pbr('herringbone_parquet', { name: 'drawing_oak', tint: 0x86705a, rough: 1, env: 0.3, age: { fade: 0.12 } });
  M.hearthStone = pbr('stone_tiles', { name: 'hearth_stone', tint: 0x9a9286, rough: 0.9, env: 0.15, age: { grime: 0.6 } });
  M.castIron = new THREE.MeshStandardMaterial({ color: 0x1b1a19, metalness: 0.7, roughness: 0.62, envMap, envMapIntensity: 0.6 * ENV_K, name: 'cast_iron' });
  M.wax = new THREE.MeshStandardMaterial({ color: 0xe9e0c8, roughness: 0.45, emissive: 0x2a1a08, emissiveIntensity: 0.4 });
  M.candleFlame = new THREE.MeshBasicMaterial({ color: new THREE.Color(1.0, 0.72, 0.35).multiplyScalar(4) });
  M.lace = new THREE.MeshStandardMaterial({ color: 0xe8e2d4, alphaMap: laceTexture(), transparent: true, alphaTest: 0.25, side: THREE.DoubleSide, roughness: 0.9, emissive: new THREE.Color(0x7d8aa6), emissiveIntensity: 0.06 });
  M.lace.alphaMap.repeat.set(5, 9);
  return M;
}

// Dust variant of an imported prop material (shared per material+level)
const dustCache = new Map();
export function dusty(mat, level) {
  if (!level) return mat;
  const k = mat.uuid + level;
  if (!dustCache.has(k)) { const m = mat.clone(); age(m, { dust: level }); dustCache.set(k, m); }
  return dustCache.get(k);
}
