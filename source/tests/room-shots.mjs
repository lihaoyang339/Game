// Render game cameras for QA. Usage: node tests/room-shots.mjs outDir '[["foyer_entry",0.2,6.5,3.14], ...]' [quality]
import { chromium } from 'playwright';
import fs from 'node:fs';
const [out, json, quality = 'high', w = '1280', h = '720', pre = ''] = process.argv.slice(2);
fs.mkdirSync(out, { recursive: true });
const shots = JSON.parse(json);
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: +w, height: +h } });
p.setDefaultTimeout(900000);
const errs = []; p.on('pageerror', (e) => errs.push(String(e))); p.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
await p.goto(`http://localhost:${process.env.PORT || 5175}/?q=${quality}`);
await p.waitForFunction(() => window.__manor && window.__manor.ready(), null, { timeout: 300000 });
const res = [];
if (pre) console.log('pre:', JSON.stringify(await p.evaluate(pre)));
for (const [cam, px, pz, yaw, flash] of shots) {
  if (flash) await p.evaluate(() => { const s = window.__manor.manor; });
  const r = await p.evaluate(([c, x, z, y]) => window.__manor.shot(c, x, z, y), [cam, px, pz, yaw]);
  if (r.img) { fs.writeFileSync(`${out}/${cam}.jpg`, Buffer.from(r.img.split(',')[1], 'base64')); delete r.img; }
  res.push(r); console.log(JSON.stringify(r));
}
if (errs.length) console.log('PAGE ERRORS', errs.slice(0, 10));
fs.writeFileSync(`${out}/shots.json`, JSON.stringify({ res, errs }, null, 1));
await b.close();
