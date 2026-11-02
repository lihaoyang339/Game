// Inspect a glTF/GLB: meshes, tri counts, skins, bones, animations, textures, bounds.
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { getBounds } from '@gltf-transform/core';
import sharp from 'sharp';
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
const file = process.argv[2];
const doc = await io.read(file);
const root = doc.getRoot();
let tris = 0;
const meshes = root.listMeshes().map(m => {
  let t = 0; const attrs = new Set();
  for (const p of m.listPrimitives()) {
    const idx = p.getIndices(); const pos = p.getAttribute('POSITION');
    t += idx ? idx.getCount() / 3 : pos.getCount() / 3;
    p.listSemantics().forEach(s => attrs.add(s));
  }
  tris += t; return `${m.getName()} tris=${t} attrs=[${[...attrs].join(',')}] mats=[${m.listPrimitives().map(p => p.getMaterial()?.getName()).join(',')}]`;
});
console.log('FILE', file);
console.log('scenes', root.listScenes().length, 'nodes', root.listNodes().length, 'tris total', tris);
meshes.forEach(m => console.log('  mesh', m));
for (const s of root.listSkins()) console.log('  skin', s.getName(), 'joints', s.listJoints().length, 'first', s.listJoints().slice(0, 6).map(j => j.getName()).join(','));
const anims = root.listAnimations();
console.log('animations', anims.length);
if (process.argv.includes('--anims')) for (const a of anims) {
  let dur = 0; for (const s of a.listSamplers()) { const i = s.getInput(); if (i) dur = Math.max(dur, i.getMax([])[0]); }
  console.log(`  anim ${a.getName()} dur=${dur.toFixed(2)} ch=${a.listChannels().length}`);
}
for (const m of root.listMaterials()) {
  const t = (tex) => tex ? `${tex.getName() || tex.getURI()}(${tex.getSize()?.join('x')})` : '-';
  console.log(`  mat ${m.getName()} base=${t(m.getBaseColorTexture())} n=${t(m.getNormalTexture())} mr=${t(m.getMetallicRoughnessTexture())} color=${m.getBaseColorFactor().map(v=>v.toFixed(2))} rough=${m.getRoughnessFactor()} metal=${m.getMetallicFactor()} alpha=${m.getAlphaMode()}`);
}
const sc = root.listScenes()[0];
if (sc) { const b = getBounds(sc); console.log('bounds min', b.min.map(v => v.toFixed(3)), 'max', b.max.map(v => v.toFixed(3))); }
if (process.argv.includes('--bones')) for (const s of root.listSkins()) console.log(s.listJoints().map(j => j.getName()).join(' '));
