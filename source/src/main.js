// The Manor — entry point: renderer, asset loading, world build, fixed-camera game loop, QA hooks.
import * as THREE from 'three';
import { Renderer } from './engine/renderer.js';
import { Assets } from './engine/assets.js';
import { Input } from './engine/input.js';
import { Manor } from './world/manor.js';
import { Player } from './actors/player.js';
import { StormAudio } from './engine/storm-audio.js';
import { storm } from './world/fixtures.js';
import { NavGrid } from './engine/physics.js';
import * as foyer from './rooms/foyer.js';
import * as living from './rooms/living.js';
import * as gallery from './rooms/gallery.js';
import * as study from './rooms/study.js';
import * as dining from './rooms/dining.js';
import * as service from './rooms/service.js';
import * as conservatory from './rooms/conservatory.js';

const ROOMS = [foyer, living, gallery, study, dining, service, conservatory];
const q = new URLSearchParams(location.search);
const R = new Renderer(document.body);
R.setQuality(q.get('q') || 'high');
// manor-specific light budget
Object.assign(R.q, { points: R.q.points, spotShadows: R.q.spotShadows });
R.grade.uniforms.uExposure.value = 1.3; R.grade.uniforms.uSaturation.value = 0.78; R.grade.uniforms.uVignette.value = 0.3;
R.grade.uniforms.uLift.value.set(0.008, 0.007, 0.006); R.grade.uniforms.uGain.value.set(1.0, 0.97, 0.9);
if (R.bloom) { R.bloom.strength = 0.16; R.bloom.threshold = 1.5; R.bloom.radius = 0.4; }

const assets = new Assets(R.renderer);
assets.onProgress = (p) => { document.querySelector('#bar i').style.width = (p * 100).toFixed(0) + '%'; };
const input = new Input(R.renderer.domElement);
const manor = new Manor(R, assets);
let player = null; let roomId = 'foyer';
const sound = new StormAudio();
const EXPOSURE = { conservatory: 1, glass: 0.9, foyer: 0.45, living: 0.4, dining: 0.35, study: 0.3, kitchen: 0.3, gallery: 0.12, corridor: 0.1 };
for (const ev of ['pointerdown', 'keydown']) addEventListener(ev, () => sound.start(), { once: false });
const debug = document.getElementById('debug'); if (q.has('debug')) debug.style.display = 'block';

async function main() {
  const models = [...new Set(ROOMS.flatMap((m) => m.MODELS || []))];
  await Promise.all([
    manor.load(models),
    assets.loadModel('body_male', 'characters/Superhero_Male_FullBody.glb'),
    assets.loadModel('Hair_SimpleParted', 'characters/Hair_SimpleParted.glb'),
    assets.loadClips('anims/UAL1.glb'),
    assets.loadPBR('rough_linen', ['nor_gl']),
  ]);
  manor.build(ROOMS);
  player = new Player(assets, manor.physics, assets.textures.get('rough_linen').nor_gl, null);
  manor.scene.add(player.root);
  const sp = manor.rooms.get('foyer').spawn; player.place(sp[0], sp[1], Math.PI);
  document.getElementById('loading').style.opacity = 0;
  setTimeout(() => document.getElementById('loading').remove(), 1000);
  R.renderer.domElement.addEventListener('click', () => input.requestLock());
  loop();
}

// --- interaction: doors + examine points
const LOCKS = {
  entrance: ['外面风雨太大了。', '在找到电话之前，没有理由再出去。'],
  parlor: ['门锁着。'],
  music: ['锁住了。门的另一边好像有东西顶着。'],
  back_stair: ['楼梯间的门卡死了。'],
};
const promptEl = document.getElementById('prompt'), msgEl = document.getElementById('msg');
let msgQueue = [], msgTimer = 0, current = null;
function say(lines) { msgQueue = [...lines]; msgTimer = 0; nextMsg(); }
function nextMsg() { const l = msgQueue.shift(); if (l === undefined) { msgEl.style.opacity = 0; return; } msgEl.textContent = l; msgEl.style.opacity = 1; msgTimer = 2.2 + l.length * 0.06; }
function findTarget() {
  const p = player.pos; const fwd = new THREE.Vector3(Math.sin(player.yaw), 0, Math.cos(player.yaw)); let best = null, bd = 1e9;
  for (const d of manor.doors) { if (!d.p) continue; const dx = d.p.x - p.x, dz = d.p.z - p.z; const dist = Math.hypot(dx, dz); if (dist > 1.6) continue; const facing = (dx * fwd.x + dz * fwd.z) / (dist || 1); if (facing < 0.2) continue; if (dist < bd) { bd = dist; best = { kind: 'door', d }; } }
  for (const it of manor.interactables) { const dx = it.x - p.x, dz = it.z - p.z; const dist = Math.hypot(dx, dz); if (dist > it.r) continue; if (dist < bd) { bd = dist; best = { kind: 'it', it }; } }
  return best;
}
function interact(t) {
  if (t.kind === 'door') {
    const d = t.d;
    if (LOCKS[d.id]) return say(LOCKS[d.id]);
    if (d.id === 'service_jib' && player.pos.x > d.p.x) return say(['墙上有一道几乎看不见的缝。', '这边没有把手。']);
    d.toggle();
  } else say(t.it.text);
}
let last = performance.now(), t = 0, fpsAcc = 0, fpsN = 0, fps = 0;
function frame(dt) {
  t += dt;
  const st = input.poll();
  const cutBefore = manor.cams.cutCount;
  player.update(dt, st, R.camera, false);
  const cam = manor.cams.update(dt, player.pos);
  roomId = cam.room;
  if (manor.cams.cutCount !== cutBefore && Math.hypot(st.moveX, st.moveY) < 0.1) player.frame = null;
  manor.update(dt, player.pos, roomId);
  sound.update(dt, R.camera, EXPOSURE[roomId] ?? 0.2);
  current = findTarget();
  promptEl.style.display = current ? 'block' : 'none';
  if (current) promptEl.textContent = (current.kind === 'door' ? (current.d.target > 0.3 ? 'E  关门' : 'E  开门') : 'E  ' + current.it.prompt);
  if (st.interact && current) interact(current);
  if (msgTimer > 0) { msgTimer -= dt; if (msgTimer <= 0) nextMsg(); }
  R.render(dt, t);
}
function loop() {
  requestAnimationFrame(loop);
  if (window.__qaHold) return;
  const now = performance.now(); const dt = Math.min(0.05, (now - last) / 1000); last = now;
  frame(dt);
  fpsAcc += dt; fpsN++; if (fpsAcc > 0.5) { fps = fpsN / fpsAcc; fpsAcc = 0; fpsN = 0; }
  if (q.has('debug')) { const i = R.renderer.info; debug.textContent = `${fps.toFixed(0)} fps\ncam ${manor.cams.current?.id}\ncalls ${i.render.calls} tris ${i.render.triangles}\npos ${player.pos.x.toFixed(2)},${player.pos.z.toFixed(2)}`; }
}

// --- QA hooks used by tests/room-shots.mjs: render an exact game camera with the player placed.
window.__manor = {
  ready: () => !!player,
  cameras: () => manor.cams.cams.map((c) => ({ id: c.id, room: c.room })),
  shot(camId, px, pz, yaw = 0, settle = 1.2, flash = 0) {
    window.__qaHold = true;
    const c = manor.cams.cams.find((x) => x.id === camId); if (!c) return { error: 'no cam ' + camId };
    player.place(px, pz, yaw); manor.cams.lock = camId;
    const steps = Math.round(settle / (1 / 30));
    for (let i = 0; i < steps; i++) frame(1 / 30);
    if (flash) { storm.flash = flash; storm.next = 99; manor.update(0.0001, player.pos, manor.cams.current.room); } // freeze a lightning strike for QA
    const t0 = performance.now(); R.render(0, t); const ms = performance.now() - t0; const i = R.renderer.info.render;
    const img = R.renderer.domElement.toDataURL('image/jpeg', 0.92);
    return { cam: camId, calls: i.calls, tris: i.triangles, renderMs: +ms.toFixed(1), img };
  },
  release() { manor.cams.lock = null; window.__qaHold = false; },
  // what does the camera centre ray hit? (QA: find occluders)
  probe(nx = 0, ny = 0) {
    const rc = new THREE.Raycaster(); rc.setFromCamera(new THREE.Vector2(nx, ny), R.camera);
    return rc.intersectObjects(manor.scene.children, true).slice(0, 6).map((h) => {
      const o = h.object; const b = new THREE.Box3().setFromObject(o); const sz = b.getSize(new THREE.Vector3());
      let n = o.name, p = o.parent; while (!n && p) { n = p.name; p = p.parent; }
      return { d: +h.distance.toFixed(2), name: n, type: o.type, mat: o.material?.name || o.material?.type, size: sz.toArray().map((v) => +v.toFixed(2)) };
    });
  },
  THREE,
  manor, R, get player() { return player; },
  // Connectivity test: open all unlocked doors, path-find foyer -> every room spawn on a 0.25 m nav grid.
  connectivity() {
    const ph = manor.physics; const saved = manor.doors.map((d) => d.collider && d.collider.enabled);
    for (const d of manor.doors) if (d.collider) d.collider.enabled = !!LOCKS[d.id] || d.id === 'service_jib';
    ph._dirty = true;
    const nav = new NavGrid(ph, -25.5, -13.5, 17.5, 12, 0.25, 0.3);
    const from = manor.rooms.get('foyer').spawn; const out = {};
    for (const [id, r] of manor.rooms) { const path = nav.findPath(from[0], from[1], r.spawn[0], r.spawn[1], 400000); out[id] = path ? 'reachable (' + path.length + ' waypoints)' : 'UNREACHABLE'; }
    const jib = manor.doors.find((d) => d.id === 'service_jib'); jib.collider.enabled = false; ph._dirty = true;
    const nav2 = new NavGrid(ph, -25.5, -13.5, 17.5, 12, 0.25, 0.3);
    out.shortcut_corridor_to_gallery = nav2.findPath(-22, -2.4, -14, -1.8, 400000) ? 'reachable via jib door' : 'blocked';
    out.locked_parlour_collider = !!manor.doors.find((d) => d.id === 'parlor').collider.enabled;
    manor.doors.forEach((d, i) => { if (d.collider) d.collider.enabled = saved[i]; }); ph._dirty = true;
    return out;
  },
};
main().catch((e) => { console.error(e); document.querySelector('#loading h1').textContent = 'ERROR: ' + e.message; });
