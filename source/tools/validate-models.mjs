// Validates every runtime GLB: index ranges, NaN/Inf positions, degenerate bounds, missing UV/normals.
import { NodeIO, getBounds } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import fs from 'node:fs';
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
const dir = 'public/assets/models'; let bad = 0; const report = [];
for (const f of fs.readdirSync(dir).filter((x) => x.endsWith('.glb'))) {
  const doc = await io.read(`${dir}/${f}`); const issues = [];
  for (const m of doc.getRoot().listMeshes()) for (const p of m.listPrimitives()) {
    const pos = p.getAttribute('POSITION'); const n = pos.getCount(); const idx = p.getIndices();
    if (idx) { const arr = idx.getArray(); let mx = 0; for (const v of arr) if (v > mx) mx = v; if (mx >= n) issues.push(`${m.getName()}: index ${mx} >= vertex count ${n}`); }
    const a = pos.getArray(); for (let i = 0; i < a.length; i++) if (!Number.isFinite(a[i])) { issues.push(`${m.getName()}: non-finite position`); break; }
    if (!p.getAttribute('NORMAL')) issues.push(`${m.getName()}: no normals`);
    if (!p.getAttribute('TEXCOORD_0') && p.getMaterial()?.getBaseColorTexture()) issues.push(`${m.getName()}: textured without UVs`);
  }
  const b = getBounds(doc.getRoot().listScenes()[0]); const size = b.max.map((v, i) => v - b.min[i]);
  if (size.some((s) => !Number.isFinite(s) || s > 25)) issues.push('suspicious bounds ' + size.map((s) => s.toFixed(2)));
  report.push({ file: f, ok: issues.length === 0, issues }); if (issues.length) { bad++; console.log('FAIL', f, issues.slice(0, 4)); }
}
fs.writeFileSync('docs/model-validation.json', JSON.stringify(report, null, 1));
console.log(`${report.length} models checked, ${bad} with issues`);
