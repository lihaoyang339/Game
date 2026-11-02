// Three.js reference renders from the art slice's own fixed cameras (for Godot port comparison).
import fs from 'node:fs';
import { chromium } from 'playwright';
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 960, height: 540 } });
await page.goto('http://localhost:5175/index.html?q=high', { waitUntil: 'load' });
await page.waitForFunction(() => window.__manor && window.__manor.ready(), null, { timeout: 300000 });
const cams = await page.evaluate(() => window.__manor.manor.cams.cams.map((c) => ({ id: c.id, room: c.room, pos: c.pos.toArray(), look: c.look.toArray(), fov: c.fov })));
fs.writeFileSync('docs/port/three-cams.json', JSON.stringify(cams, null, 1));
for (const id of (process.argv[2] || '').split(',').filter(Boolean)) {
  const r = await page.evaluate((cid) => window.__manor.shot(cid, 100, 100, 0, 1.0, 0), id);
  if (r.img) fs.writeFileSync(`docs/port/three-${id}.jpg`, Buffer.from(r.img.split(',')[1], 'base64'));
  await page.evaluate(() => window.__manor.release());
}
console.log(cams.map((c) => c.id).join(' '));
await browser.close();
