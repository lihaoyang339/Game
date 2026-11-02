// Interactive QA session: keeps the game loaded and reads commands from a FIFO-like file.
// Usage: node tests/tune.mjs  (then write JSON lines {"pre": "...js...", "shots": [[cam,x,z,yaw]], "out": "dir"} into /tmp/.../tune.in)
import { chromium } from 'playwright';
import fs from 'node:fs';
const IN = process.env.TUNE_IN, OUT = process.env.TUNE_OUT;
const [w, h, quality] = [+(process.env.W || 960), +(process.env.H || 540), process.env.Q || 'high'];
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await b.newPage({ viewport: { width: w, height: h } }); p.setDefaultTimeout(900000);
const errs = []; p.on('pageerror', (e) => errs.push(String(e))); p.on('console', (m) => { if (m.type() === 'error') errs.push(m.text().slice(0, 300)); });
await p.goto(`http://localhost:${process.env.PORT || 5175}/?q=${quality}`);
await p.waitForFunction(() => window.__manor && window.__manor.ready(), null, { timeout: 900000 });
fs.appendFileSync(OUT, 'READY\n');
let pos = 0;
for (;;) {
  const txt = fs.existsSync(IN) ? fs.readFileSync(IN, 'utf8') : '';
  const lines = txt.slice(pos).split('\n'); 
  if (lines.length > 1) {
    const line = lines[0]; pos += line.length + 1;
    if (line.trim() === 'QUIT') break;
    try {
      const cmd = JSON.parse(line);
      if (cmd.reload) { await p.reload(); await p.waitForFunction(() => window.__manor && window.__manor.ready(), null, { timeout: 900000 }); fs.appendFileSync(OUT, 'RELOADED\n'); continue; }
      if (cmd.pre) fs.appendFileSync(OUT, 'pre ' + JSON.stringify(await p.evaluate(cmd.pre)) + '\n');
      for (const [cam, x, z, yaw, settle, flash, name] of cmd.shots || []) {
        const r = await p.evaluate(([c, x, z, y, s, f]) => window.__manor.shot(c, x, z, y, s ?? 1.2, f || 0), [cam, x, z, yaw, settle, flash]);
        if (name) r.cam = name;
        fs.mkdirSync(cmd.out, { recursive: true });
        if (r.img) { fs.writeFileSync(`${cmd.out}/${name || cam}.jpg`, Buffer.from(r.img.split(',')[1], 'base64')); delete r.img; }
        fs.appendFileSync(OUT, JSON.stringify(r) + '\n');
      }
      if (errs.length) { fs.appendFileSync(OUT, 'ERRS ' + JSON.stringify(errs.splice(0))); fs.appendFileSync(OUT, '\n'); }
      fs.appendFileSync(OUT, 'DONE\n');
    } catch (e) { fs.appendFileSync(OUT, 'FAIL ' + e.message + '\n'); }
  } else await new Promise((r) => setTimeout(r, 300));
}
await b.close();
