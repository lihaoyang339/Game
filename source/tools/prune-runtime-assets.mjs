// Removes runtime assets (public/assets) that no room uses; sources remain in assets_src.
import fs from 'node:fs';
import { TEXTURES } from '../src/world/manor.js';
const rooms = ['foyer', 'living', 'gallery', 'study', 'dining', 'service', 'conservatory'];
const used = new Set();
for (const r of rooms) for (const m of (await import(`../src/rooms/${r}.js`)).MODELS || []) used.add(m);
const models = fs.readdirSync('public/assets/models').filter((f) => f.endsWith('.glb'));
let removed = 0;
for (const f of models) if (!used.has(f.replace('.glb', ''))) { fs.rmSync(`public/assets/models/${f}`); removed++; }
const tex = new Set([...TEXTURES]);
for (const d of fs.readdirSync('public/assets/textures')) if (!tex.has(d)) { fs.rmSync(`public/assets/textures/${d}`, { recursive: true }); removed++; }
for (const f of fs.readdirSync('public/assets/anims')) if (f === 'UAL2.glb') { fs.rmSync(`public/assets/anims/${f}`); removed++; }
console.log('kept models', used.size, 'removed', removed);
