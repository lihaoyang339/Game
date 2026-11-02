// Renders every runtime model in the viewer and records size/tri counts + screenshots.
import { chromium } from 'playwright';
import fs from 'node:fs';
const base = process.env.BASE || 'http://localhost:5173';
const out = process.argv[2] || 'docs/asset-check';
fs.mkdirSync(out, { recursive: true });
const names = fs.readdirSync('public/assets/models').filter(f => f.endsWith('.glb')).map(f => f.replace('.glb', ''));
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 480, height: 360 } });
const errors = []; page.on('pageerror', e => errors.push(String(e))); page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
const results = [];
for (const n of names) {
  await page.goto(`${base}/viewer.html?mode=model&name=${n}`);
  await page.waitForFunction(() => window.__ready, null, { timeout: 60000 });
  const info = await page.evaluate(() => window.__info || { error: window.__error });
  await page.screenshot({ path: `${out}/${n}.png` });
  results.push(info); console.log(JSON.stringify(info));
}
fs.writeFileSync(`${out}/results.json`, JSON.stringify({ results, errors }, null, 1));
console.log('errors', errors.length, errors.slice(0, 5));
await browser.close();
