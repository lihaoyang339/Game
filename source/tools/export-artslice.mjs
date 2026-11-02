// Exports the built Three.js art slice (the exact scene graph the game renders) to the Godot port:
//   godot/assets/artslice/<room>.glb     — all architecture, props, doors (named DOOR__/LEAF__ nodes)
//   godot/data/artslice.json            — rooms, light fixtures, colliders, doors, interactables, effects
// Custom ShaderMaterials become placeholder materials named SHADER__<kind> whose params travel in
// glTF extras; texture repeat/offset is baked into UVs; instanced book rows are expanded.
// Usage: node tools/export-artslice.mjs [baseUrl]   (QA dev server, default http://localhost:5175)
import fs from 'node:fs';
import { chromium } from 'playwright';

const base = process.argv[2] || 'http://localhost:5175';
const OUT_DIR = 'godot/assets/artslice', JSON_OUT = 'godot/data/artslice.json';
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 640, height: 400 } });
const errors = []; page.on('pageerror', (e) => errors.push(String(e)));
await page.goto(base + '/index.html?q=high', { waitUntil: 'load' });
await page.waitForFunction(() => window.__manor && window.__manor.ready(), null, { timeout: 300000 });

const info = await page.evaluate(async () => {
  const { THREE, manor } = window.__manor;
  const { GLTFExporter } = await import('/node_modules/three/examples/jsm/exporters/GLTFExporter.js');
  const root = manor.root; root.updateMatrixWorld(true);
  const stats = { shader: {}, baked: 0, books: 0, removed: 0 };
  const hex = (c) => c.getHex();

  // ---- doors: stable names so Godot can find and animate the leaves
  const doors = manor.doors.map((d) => {
    d.root.name = 'DOOR__' + d.id; d.leaves.forEach((l, i) => { l.name = `LEAF__${d.id}__${i}`; });
    return { id: d.id, x: d.p.x, z: d.p.z, yaw: d.p.yaw, w: d.p.w, h: d.p.h, open: d.open, swing: d.swing, sides: d.leaves.map((l) => l.userData.side) };
  });
  doors.forEach((d) => { const leaf = manor.doors.find((x) => x.id === d.id); leaf.open = 0; leaf.apply(); }); // export leaves closed; Godot re-applies `open`

  // ---- light fixtures (emissive materials they drive get unique names)
  const lights = manor.lights.defs.map((d, i) => {
    d.mats.forEach((m, k) => { m.name = `EMIT__${i}__${k}`; m.userData.emitBase = d.emissive; });
    return { room: d.room, type: d.type, pos: d.pos.toArray(), target: d.target ? d.target.toArray() : null, color: hex(d.color), intensity: d.intensity, distance: d.distance,
      angle: d.angle, penumbra: d.penumbra, prio: d.prio, flicker: d.flicker, fire: d.fire, flash: d.flash, shadow: d.shadow !== false, emissive: d.emissive, on: d.on, mats: d.mats.map((m) => m.name) };
  });

  // ---- shader materials -> tagged placeholders
  const shaderKind = (m) => {
    const f = m.fragmentShader || '';
    if (f.includes('running droplets')) return 'rain_glass';
    if (f.includes('uniform sampler2D map') && f.includes('sil')) return 'storm_backdrop';
    if (f.includes('vec3(0.9,0.18,0.02)')) return 'flame';
    if (f.includes('char = vec3(0.025')) return 'ember';
    if (f.includes('fade = pow(vH')) return 'light_cone';
    return 'unknown';
  };
  const remove = [];
  root.traverse((o) => {
    if (o.isLine || o.isPoints || o.isSprite) { remove.push(o); return; }
    if (!o.isMesh) return;
    const mats = Array.isArray(o.material) ? o.material : [o.material];
    const conv = mats.map((m) => {
      if (!m.isShaderMaterial) return m;
      const kind = shaderKind(m); stats.shader[kind] = (stats.shader[kind] || 0) + 1;
      const u = m.uniforms || {}; const extras = { shader: kind };
      if (u.uColor) extras.color = hex(u.uColor.value); if (u.uStrength) extras.strength = u.uStrength.value;
      const p = new THREE.MeshBasicMaterial({ name: 'SHADER__' + kind, map: kind === 'storm_backdrop' ? u.map.value : null, transparent: true, side: m.side });
      p.userData = extras; return p;
    });
    o.material = Array.isArray(o.material) ? conv : conv[0];
  });
  for (const o of remove) { o.removeFromParent(); stats.removed++; }

  // ---- instanced book rows -> one merged mesh each, atlas cell baked into UVs, page edges via vertex colour
  const inst = []; root.traverse((o) => { if (o.isInstancedMesh) inst.push(o); });
  for (const im of inst) {
    const g = im.geometry; const cells = g.getAttribute('aCell'); const pos = [], nor = [], uv = [], col = [], idx = [];
    const m4 = new THREE.Matrix4(), n3 = new THREE.Matrix3(), v = new THREE.Vector3(), n = new THREE.Vector3();
    const P = g.getAttribute('position'), N = g.getAttribute('normal'), U = g.getAttribute('uv'), I = g.index;
    for (let k = 0; k < im.count; k++) {
      im.getMatrixAt(k, m4); n3.getNormalMatrix(m4); const cell = cells.getX(k); const base = pos.length / 3;
      for (let i = 0; i < P.count; i++) {
        v.fromBufferAttribute(P, i).applyMatrix4(m4); pos.push(v.x, v.y, v.z);
        n.fromBufferAttribute(N, i); const nz = n.z, ny = n.y; n.applyMatrix3(n3).normalize(); nor.push(n.x, n.y, n.z);
        const cu = cell % 8, cv = Math.floor(cell / 8); const su = nz > 0.5 ? U.getX(i) : 0.02, sv = nz > 0.5 ? U.getY(i) : 0.5;
        uv.push((cu + su) / 8, 1 - (cv + sv) / 4); // matches the vMapUv rewrite in bookRow() (flipY handled by exporter)
        const page = Math.abs(ny) > 0.5; col.push(...(page ? [0.78 * 0.8 / 0.6, 0.74 * 0.8 / 0.56, 0.62 * 0.8 / 0.5] : [1, 1, 1]));
      }
      for (let i = 0; i < I.count; i++) idx.push(base + I.getX(i));
    }
    const mg = new THREE.BufferGeometry(); mg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); mg.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
    mg.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); mg.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); mg.setIndex(idx);
    const mat = im.material.clone(); mat.onBeforeCompile = () => {}; mat.vertexColors = true; mat.name = 'BOOKS';
    const mesh = new THREE.Mesh(mg, mat); mesh.name = 'Books'; mesh.position.copy(im.position); mesh.quaternion.copy(im.quaternion); mesh.scale.copy(im.scale);
    im.parent.add(mesh); im.removeFromParent(); stats.books++;
  }

  // ---- bake texture transforms into UVs (Godot gets identity sampling, exact same look)
  const MAPS = ['map', 'normalMap', 'roughnessMap', 'metalnessMap', 'aoMap', 'emissiveMap', 'alphaMap', 'bumpMap', 'sheenColorMap', 'clearcoatNormalMap'];
  const jobs = []; const allTex = new Set();
  root.traverse((o) => {
    if (!o.isMesh) return; const m = Array.isArray(o.material) ? o.material[0] : o.material; if (!m) return;
    const tex = MAPS.map((k) => m[k]).filter(Boolean); tex.forEach((t) => allTex.add(t));
    const t = tex[0]; if (!t) return; t.updateMatrix();
    const ident = t.matrix.elements.every((e, i) => Math.abs(e - [1, 0, 0, 0, 1, 0, 0, 0, 1][i]) < 1e-6);
    if (!ident) jobs.push({ o, mtx: t.matrix.clone(), channel: t.channel || 0 });
  });
  const done = new Map();
  for (const { o, mtx, channel } of jobs) {
    const key = o.geometry.uuid + mtx.elements.join(',');
    if (!done.has(key)) {
      const g = o.geometry.clone(); const name = channel === 0 ? 'uv' : 'uv' + channel; const a = g.getAttribute(name) || g.getAttribute('uv');
      if (a) { const v2 = new THREE.Vector2(); for (let i = 0; i < a.count; i++) { v2.fromBufferAttribute(a, i).applyMatrix3(mtx); a.setXY(i, v2.x, v2.y); } }
      done.set(key, g);
    }
    o.geometry = done.get(key); stats.baked++;
  }
  for (const t of allTex) { t.repeat.set(1, 1); t.offset.set(0, 0); t.rotation = 0; t.center.set(0, 0); t.matrixAutoUpdate = true; t.updateMatrix(); }

  // ---- gameplay data
  const rooms = [...manor.rooms.values()].map((r) => ({ id: r.id, name: r.name || r.id, bounds: r.bounds, spawn: r.spawn, neighbors: r.neighbors || [], fill: r.fill ?? 0.9 }));
  const colliders = manor.physics.colliders.map((c) => ({ x: c.x, z: c.z, hx: c.hx, hz: c.hz, rot: c.rot, y0: c.y0, y1: c.y1, tag: c.tag, door: manor.doors.find((d) => d.collider === c)?.id ?? null }));
  const interactables = manor.interactables.map((i) => ({ x: i.x, z: i.z, r: i.r, prompt: i.prompt, text: i.text, y: i.y ?? null }));
  const env = { fog: manor.scene.fog ? { color: manor.scene.fog.color.getHex(), density: manor.scene.fog.density } : null, envIntensity: manor.scene.environmentIntensity, lightGain: manor.lights.gain, hemi: { sky: manor.lights.hemi.color.getHex(), ground: manor.lights.hemi.groundColor.getHex(), base: manor.lights.hemiBase } };

  // ---- materials -> JSON table (Godot rebuilds them); textures -> one image file each; GLB keeps geometry only
  const matTable = {}; const texTable = {}; const imgIds = new Map(); const matIds = new Map(); window.__tex = {};
  const SLOT_CH = { roughnessMap: 'g', metalnessMap: 'b', aoMap: 'r' };
  const texId = (t, slot) => {
    const img = t.image; if (!img || !(img.width > 0)) return null;
    let id = imgIds.get(img);
    if (!id) {
      id = 'T' + String(imgIds.size).padStart(4, '0'); imgIds.set(img, id);
      const s = Math.min(1, 2048 / Math.max(img.width, img.height)); const w = Math.max(1, Math.round(img.width * s)), h = Math.max(1, Math.round(img.height * s));
      const cv = document.createElement('canvas'); cv.width = w; cv.height = h; const g2 = cv.getContext('2d');
      if (t.flipY) { g2.translate(0, h); g2.scale(1, -1); }
      try { g2.drawImage(img, 0, 0, w, h); } catch (e) { imgIds.delete(img); return null; }
      const png = slot === 'normalMap' || slot === 'alphaMap' || /canvas/i.test(img.constructor.name);
      texTable[id] = { file: id + (png ? '.png' : '.jpg'), w, h, srgb: t.colorSpace === 'srgb', wrapS: t.wrapS, wrapT: t.wrapT, slot };
      window.__tex[id] = cv.toDataURL(png ? 'image/png' : 'image/jpeg', 0.92);
    }
    return id;
  };
  root.traverse((o) => {
    if (!o.isMesh) return;
    const ms = Array.isArray(o.material) ? o.material : [o.material];
    for (const m of ms) {
      if (!m || matIds.has(m)) continue;
      let name = m.name && /^(EMIT__|SHADER__|BOOKS)/.test(m.name) ? m.name : 'M' + String(matIds.size).padStart(4, '0');
      if (name.startsWith('SHADER__') || name === 'BOOKS') name += '__' + matIds.size;
      matIds.set(m, name);
      const d = { type: m.type, color: m.color ? m.color.getHex() : 0xffffff, opacity: m.opacity, transparent: m.transparent, alphaTest: m.alphaTest, side: m.side, depthWrite: m.depthWrite,
        blending: m.blending, vertexColors: !!m.vertexColors, flatShading: !!m.flatShading, roughness: m.roughness ?? 1, metalness: m.metalness ?? 0,
        emissive: m.emissive ? m.emissive.getHex() : 0, emissiveIntensity: m.emissiveIntensity ?? 0, normalScale: m.normalScale ? m.normalScale.toArray() : [1, 1],
        aoMapIntensity: m.aoMapIntensity ?? 1, envMapIntensity: m.envMapIntensity ?? 1, sheen: m.sheen ?? 0, sheenColor: m.sheenColor ? m.sheenColor.getHex() : 0,
        sheenRoughness: m.sheenRoughness ?? 1, clearcoat: m.clearcoat ?? 0, clearcoatRoughness: m.clearcoatRoughness ?? 0, transmission: m.transmission ?? 0,
        age: m.userData.age || null, shader: m.userData.shader ? m.userData : null, emitBase: m.userData.emitBase ?? null, maps: {} };
      for (const slot of MAPS) { const t = m[slot]; if (!t) continue; const id = texId(t, slot); if (id) d.maps[slot] = { tex: id, ch: SLOT_CH[slot] || null }; }
      matTable[name] = d;
    }
  });
  for (const [m, name] of matIds) { m.name = name; for (const slot of MAPS) if (m[slot]) m[slot] = null; if (m.isShaderMaterial) m.map = null; if (m.map) m.map = null; }

  // ---- split top-level children by room (bounding-box centre) -> one GLB per room (streamable in Godot)
  const groups = new Map(); const bb = new THREE.Box3(), c = new THREE.Vector3();
  for (const ch of [...root.children]) {
    bb.setFromObject(ch); if (bb.isEmpty()) continue; bb.getCenter(c);
    const r = rooms.find((q) => c.x >= q.bounds.x0 - 0.3 && c.x <= q.bounds.x1 + 0.3 && c.z >= q.bounds.z0 - 0.3 && c.z <= q.bounds.z1 + 0.3);
    const id = r ? r.id : 'exterior'; if (!groups.has(id)) groups.set(id, new THREE.Group()); groups.get(id).add(ch);
  }
  window.__glbs = {}; const parts = [];
  let tris = 0, meshes = 0;
  for (const [id, g] of groups) {
    g.name = 'ROOM__' + id; let t = 0; g.traverse((o) => { if (o.isMesh) { meshes++; t += (o.geometry.index ? o.geometry.index.count : o.geometry.getAttribute('position').count) / 3; } }); tris += t;
    const glb = await new GLTFExporter().parseAsync(g, { binary: true, onlyVisible: true });
    window.__glbs[id] = new Uint8Array(glb); parts.push({ id, size: glb.byteLength, tris: Math.round(t) });
  }
  return { parts, stats, meshes, tris: Math.round(tris), texIds: Object.keys(texTable), data: { version: 2, source: 'three.js art slice (src/main.js ROOMS)', parts, rooms, lights, colliders, ramps: manor.physics.ramps, doors, interactables, env, materials: matTable, textures: texTable } };
});

fs.mkdirSync(`${OUT_DIR}/tex`, { recursive: true });
for (const id of info.texIds) {
  const url = await page.evaluate((k) => window.__tex[k], id); const f = info.data.textures[id].file;
  fs.writeFileSync(`${OUT_DIR}/tex/${f}`, Buffer.from(url.split(',')[1], 'base64'));
}

// pull each GLB out in chunks
for (const p of info.parts) {
  const fd = fs.openSync(`${OUT_DIR}/${p.id}.glb`, 'w'); const CH = 4 << 20;
  for (let o = 0; o < p.size; o += CH) {
    const b64 = await page.evaluate(([id, a, b]) => { const s = window.__glbs[id].subarray(a, b); let bin = ''; for (let i = 0; i < s.length; i += 0x8000) bin += String.fromCharCode.apply(null, s.subarray(i, i + 0x8000)); return btoa(bin); }, [p.id, o, Math.min(p.size, o + CH)]);
    fs.writeSync(fd, Buffer.from(b64, 'base64'));
  }
  fs.closeSync(fd);
}
fs.writeFileSync(JSON_OUT, JSON.stringify(info.data, null, 1));
console.log(info.parts.map((p) => `${p.id} ${(p.size / 1048576).toFixed(1)}MB ${p.tris}tri`).join(' | '));
console.log(` meshes ${info.meshes}, tris ${info.tris}`, JSON.stringify(info.stats));
console.log(`rooms ${info.data.rooms.length}, lights ${info.data.lights.length}, colliders ${info.data.colliders.length}, doors ${info.data.doors.length}, interactables ${info.data.interactables.length}; page errors ${errors.length}`);
errors.slice(0, 5).forEach((e) => console.log('ERR', e));
await browser.close();
