// Builds runtime assets (public/assets) from assets_src: GLB + WebP textures, texture sets, HDRI.
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { dedup, prune, textureCompress } from '@gltf-transform/functions';
import sharp from 'sharp';
import fs from 'node:fs/promises';
import path from 'node:path';
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
const OUT = 'public/assets';
const only = process.argv[2];
const hero = { ArmChair_01: 2048, sofa_03: 2048, ClassicConsole_01: 2048, vintage_grandfather_clock_01: 2048, vintage_cabinet_01: 2048 };
const small = new Set(['pocket_watch', 'round_spectacles', 'magnifying_glass_01', 'lightbulb_01', 'trowel_01', 'postcard_set_01']);
const PH = 'assets_src/polyhaven/models';
if (!only || only === 'models') {
  await fs.mkdir(`${OUT}/models`, { recursive: true });
  for (const id of await fs.readdir(PH)) {
    const out = `${OUT}/models/${id}.glb`;
    try { await fs.access(out); continue; } catch {}
    const gl = (await fs.readdir(path.join(PH, id))).find((f) => f.endsWith('.gltf'));
    const doc = await io.read(path.join(PH, id, gl));
    const s = hero[id] || (small.has(id) ? 512 : 1024);
    await doc.transform(dedup(), prune(), textureCompress({ encoder: sharp, targetFormat: 'webp', resize: [s, s], quality: 86 }));
    await io.write(out, doc);
  }
}
if (!only || only === 'textures') {
  const T = 'assets_src/polyhaven/textures';
  for (const id of await fs.readdir(T)) {
    await fs.mkdir(`${OUT}/textures/${id}`, { recursive: true });
    for (const f of await fs.readdir(path.join(T, id))) {
      const m = f.match(/_(diff|nor_gl|arm)_(\dk)\.jpg$/); if (!m) continue;
      const out = `${OUT}/textures/${id}/${m[1]}.webp`;
      try { await fs.access(out); continue; } catch {}
      await sharp(path.join(T, id, f)).resize(2048, 2048, { fit: 'inside' }).webp({ quality: m[1] === 'nor_gl' ? 92 : 86 }).toFile(out);
    }
  }
  await fs.mkdir(`${OUT}/hdri`, { recursive: true });
  for (const f of await fs.readdir('assets_src/polyhaven/hdri')) await fs.copyFile(`assets_src/polyhaven/hdri/${f}`, `${OUT}/hdri/${f}`);
}
console.log('ok');
