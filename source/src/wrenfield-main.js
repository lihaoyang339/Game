// Wrenfield Manor — Phase 1/2 greybox build (MAP V1.0 §12): the whole house at true scale with the
// player, real collision, stairs, ladders and locks; follow camera + per-level overview; QA hooks that
// replay the walk-test paths with the real player controller.
import * as THREE from 'three';
import { Renderer } from './engine/renderer.js';
import { Assets } from './engine/assets.js';
import { Input } from './engine/input.js';
import { Player } from './actors/player.js';
import { buildGreybox } from './map/greybox.js';
import { ROOMS, LEVELS, DOORS, roomById } from './map/wrenfield.js';

const q = new URLSearchParams(location.search);
const R = new Renderer(document.body);
R.setQuality(q.get('q') || 'medium');
if (q.has('scale')) { R.q = { ...R.q, scale: +q.get('scale') }; R.onResize(); }
R.grade.uniforms.uExposure.value = 1.0; R.grade.uniforms.uVignette.value = 0.18; R.grade.uniforms.uSaturation.value = 0.9;
if (R.bloom) { R.bloom.strength = 0.05; R.bloom.threshold = 2.0; }
const scene = R.scene; scene.background = new THREE.Color(0x1c2026); scene.fog = new THREE.Fog(0x1c2026, 30, 90);
const hemi = new THREE.HemisphereLight(0xdfe6f0, 0x4a4036, 1.6); scene.add(hemi);
const sun = new THREE.DirectionalLight(0xfff1dc, 2.2); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, { left: -14, right: 14, top: 14, bottom: -14, near: 1, far: 60 }); sun.shadow.bias = -0.0005; scene.add(sun, sun.target);

const GB = buildGreybox(scene);
const assets = new Assets(R.renderer);
const input = new Input(R.renderer.domElement);
let player = null; const keys = new Set(); let allUnlocked = false; let mode = 'follow';
const hud = document.getElementById('hud'), msgEl = document.getElementById('msg'), promptEl = document.getElementById('prompt');
let msgT = 0; const say = (s) => { msgEl.textContent = s; msgEl.style.opacity = 1; msgT = 2.5; };
const spec = (p) => [p.x, -p.z, p.y]; // engine → spec
const roomAt = (X, Y, Z) => ROOMS.filter((r) => X >= r.x[0] && X <= r.x[1] && Y >= r.y[0] && Y <= r.y[1]).sort((a, b) => Math.abs(LEVELS[a.level].z - Z) - Math.abs(LEVELS[b.level].z - Z))[0];

function setUnlocked(on) {
  allUnlocked = on;
  for (const c of GB.physics.colliders) if (c.tag.startsWith('locked:')) c.enabled = !on;
  for (const lv of Object.values(GB.levels)) lv.traverse((o) => { if (o.userData.kind === 'locked') o.visible = !on; });
}
function levelVisibility(curLvl, showCeil) {
  const ci = GB.LEVEL_ORDER.indexOf(curLvl);
  GB.LEVEL_ORDER.forEach((k, i) => { GB.levels[k].visible = i <= ci; });
  for (const c of GB.ceilings) c.visible = showCeil && c.parent === GB.levels[curLvl];
}

async function main() {
  await Promise.all([
    assets.loadModel('body_male', 'characters/Superhero_Male_FullBody.glb'),
    assets.loadModel('Hair_SimpleParted', 'characters/Hair_SimpleParted.glb'),
    assets.loadClips('anims/UAL1.glb'),
    assets.loadPBR('rough_linen', ['nor_gl']),
  ]);
  player = new Player(assets, GB.physics, assets.textures.get('rough_linen').nor_gl, null);
  scene.add(player.root); player.root.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  teleport(18.0, -3.0, 0, 0); // Front Portico (spec G01), facing north
  document.getElementById('loading').style.opacity = 0; setTimeout(() => document.getElementById('loading').remove(), 800);
  R.renderer.domElement.addEventListener('click', () => input.requestLock());
  loop();
}
function teleport(X, Y, Z, yawDeg = 0) { GB.physics.lastY = Z; player.place(X, -Y, (yawDeg * Math.PI) / 180 + Math.PI); player.pos.y = GB.physics.floorY(X, -Y, Z); player.sync(); camPos = null; }

addEventListener('keydown', (e) => {
  if (e.code === 'KeyM') mode = mode === 'follow' ? 'top' : 'follow';
  if (e.code === 'KeyK') { setUnlocked(!allUnlocked); say(allUnlocked ? '调试：所有锁已打开' : '调试：锁已恢复'); }
});

// --- ladders/shafts (E to climb), locked-door feedback
function nearLadder() {
  const [X, Y, Z] = spec(player.pos);
  for (const s of GB.ladders) { const u = s.use; if (Math.abs(X - u.x) < 1.3 && Math.abs(Y - u.y) < 1.3 && (Math.abs(Z - u.z0) < 0.3 || Math.abs(Z - u.z1) < 0.3)) return s; }
  return null;
}
function nearLock() {
  const p = player.pos; let best = null;
  for (const c of GB.physics.near(p.x, p.z, 1.2)) { if (!c.enabled || !c.tag.startsWith('locked:') || c.y0 > p.y + 1 || c.y1 < p.y) continue; const [lx, lz] = c.toLocal(p.x, p.z); const dx = Math.max(Math.abs(lx) - c.hx, 0), dz = Math.max(Math.abs(lz) - c.hz, 0); if (Math.hypot(dx, dz) < 0.8) best = c; }
  return best;
}
function climb(s) {
  const u = s.use; const [, , Z] = spec(player.pos); const goingUp = Math.abs(Z - u.z0) < 0.3;
  const fromRoom = goingUp ? (LEVELS[roomById(u.a).level].z <= LEVELS[roomById(u.b).level].z ? u.a : u.b) : (LEVELS[roomById(u.a).level].z > LEVELS[roomById(u.b).level].z ? u.a : u.b);
  if (u.oneWayFrom && u.oneWayFrom !== fromRoom) return say('格栅从另一边闩住了。');
  if (u.lock && !allUnlocked && !keys.has(u.lock)) return say(`锁住了（需要：${u.lock}）`);
  const z = goingUp ? u.z1 : u.z0; GB.physics.lastY = z;
  // step off beside the opening, on whichever side has floor and no wall
  for (const [dx, dy] of [[0, 1.0], [0, -1.0], [1.0, 0], [-1.0, 0], [0, 1.4], [0, -1.4]]) {
    const X = u.x + dx, Y = u.y + dy; const f = GB.physics.floorY(X, -Y, z); if (Math.abs(f - z) > 0.05) continue;
    const v = new THREE.Vector3(X, f, -Y); const v0 = v.clone(); GB.physics.resolveCircle(v, 0.3, f); if (v.distanceTo(v0) > 0.05) continue;
    player.pos.copy(v); player.sync(); camPos = null; return;
  }
}

// --- cameras
const ortho = new THREE.OrthographicCamera(-30, 30, 20, -20, 0.1, 200);
let camPos = null; const camTarget = new THREE.Vector3(); const rc = new THREE.Raycaster();
const occluders = () => { const out = []; for (const lv of Object.values(GB.levels)) if (lv.visible) lv.traverse((o) => { if (o.isMesh && o.visible && (o.userData.kind === 'wall' || o.userData.kind === 'ext' || o.userData.kind === 'lintel' || o.userData.kind === 'ceiling' || o.userData.kind === 'stair')) out.push(o); }); return out; };
function followCam(dt) {
  const p = player.pos; const back = new THREE.Vector3(-Math.sin(player.yaw), 0, -Math.cos(player.yaw));
  const want = p.clone().addScaledVector(back, 3.0).add(new THREE.Vector3(0, 1.9, 0)); const look = p.clone().add(new THREE.Vector3(0, 1.25, 0));
  const dir = want.clone().sub(look); const dist = dir.length(); dir.normalize();
  rc.set(look, dir); rc.far = dist; const hit = rc.intersectObjects(occluders(), false)[0];
  if (hit) want.copy(look).addScaledVector(dir, Math.max(0.4, hit.distance - 0.25));
  if (!camPos) camPos = want.clone(); else camPos.lerp(want, Math.min(1, dt * 6));
  camTarget.lerp(look, camPos ? Math.min(1, dt * 10) : 1);
  R.camera.position.copy(camPos); R.camera.lookAt(look); R.camera.fov = 58; R.camera.updateProjectionMatrix();
}

let last = performance.now(), t = 0;
function frame(dt, st = input.poll()) {
  t += dt;
  player.update(dt, st, R.camera, false);
  const [X, Y, Z] = spec(player.pos); const lvl = GB.levelOfZ(Z + 0.3); const room = roomAt(X, Y, Z);
  levelVisibility(lvl, mode === 'follow');
  sun.position.set(player.pos.x + 12, player.pos.y + 30, player.pos.z + 8); sun.target.position.copy(player.pos);
  followCam(dt);
  const lad = nearLadder(), lock = nearLock();
  promptEl.style.display = lad || lock ? 'block' : 'none';
  if (lad) promptEl.textContent = 'E  攀爬'; else if (lock) promptEl.textContent = '锁住 · ' + lock.tag.slice(7);
  if (st.interact && lad) climb(lad);
  if (msgT > 0) { msgT -= dt; if (msgT <= 0) msgEl.style.opacity = 0; }
  hud.textContent = `${room ? room.id + ' ' + room.name + ' · ' + (room.zh || '') : '—'}   |   X ${X.toFixed(1)}  Y ${Y.toFixed(1)}  Z ${Z.toFixed(2)}   |   M 总览  K 调试解锁`;
}
function draw() {
  if (mode === 'top') { renderTop(GB.levelOfZ(player.pos.y + 0.3), player.pos.x, -player.pos.z, 26); return; }
  R.render(0, t);
}
function renderTop(lvl, cx, cy, half) {
  levelVisibility(lvl, false); GB.LEVEL_ORDER.forEach((k) => { GB.levels[k].visible = k === lvl; });
  if (cx === undefined) { // fit the level's rooms
    const rs = ROOMS.filter((r) => r.level === lvl); const x0 = Math.min(...rs.map((r) => r.x[0])), x1 = Math.max(...rs.map((r) => r.x[1])), y0 = Math.min(...rs.map((r) => r.y[0])), y1 = Math.max(...rs.map((r) => r.y[1]));
    cx = (x0 + x1) / 2; cy = (y0 + y1) / 2; half = Math.max((y1 - y0) / 2, (x1 - x0) / 2 / (innerWidth / innerHeight)) + 1.5;
  }
  const fog = scene.fog; scene.fog = null; sun.position.set(cx + 4, LEVELS[lvl].z + 40, -cy + 3); sun.target.position.set(cx, LEVELS[lvl].z, -cy);
  const a = innerWidth / innerHeight; Object.assign(ortho, { left: -half * a, right: half * a, top: half, bottom: -half }); ortho.updateProjectionMatrix();
  ortho.position.set(cx, LEVELS[lvl].z + 60, -cy); ortho.up.set(0, 0, -1); ortho.lookAt(cx, LEVELS[lvl].z, -cy);
  const r = R.renderer; const prev = r.outputColorSpace; r.outputColorSpace = THREE.SRGBColorSpace; r.setRenderTarget(null); r.render(scene, ortho); r.outputColorSpace = prev; scene.fog = fog;
}
function loop() {
  requestAnimationFrame(loop); if (window.__qaHold) return;
  const now = performance.now(); const dt = Math.min(0.05, (now - last) / 1000); last = now; frame(dt); draw();
}

// --- QA hooks
const FRAME = { f: new THREE.Vector3(0, 0, -1), r: new THREE.Vector3(1, 0, 0) }; // world north / east
window.__map = {
  ready: () => !!player, THREE, GB, R, get player() { return player; }, teleport, setUnlocked, climb: () => { const l = nearLadder(); if (l) climb(l); return !!l; },
  where: () => { const [X, Y, Z] = spec(player.pos); return { X, Y, Z, room: roomAt(X, Y, Z)?.id }; },
  // overview of a level (orthographic, ceilings off, upper levels hidden)
  top(lvl, cx, cy, half) { window.__qaHold = true; renderTop(lvl, cx, cy, half); return R.renderer.domElement.toDataURL('image/png'); },
  // perspective view from spec position → spec target, with the player placed
  view(eye, look, fov = 55, ceilings = false, place = null) {
    window.__qaHold = true; if (place) teleport(...place);
    const lvl = GB.levelOfZ(Math.min(eye[2], look[2] + 1.0)); levelVisibility(lvl, ceilings);
    if (!ceilings) GB.LEVEL_ORDER.forEach((k, i) => { GB.levels[k].visible = i <= GB.LEVEL_ORDER.indexOf(GB.levelOfZ(look[2] + 0.3)); });
    R.camera.position.set(eye[0], eye[2], -eye[1]); R.camera.lookAt(look[0], look[2], -look[1]); R.camera.fov = fov; R.camera.updateProjectionMatrix();
    sun.position.set(look[0] + 12, look[2] + 30, -look[1] + 8); sun.target.position.set(look[0], look[2], -look[1]);
    R.render(0, t); return R.renderer.domElement.toDataURL('image/jpeg', 0.9);
  },
  // follow-camera screenshot after settling at a spec position
  follow(X, Y, Z, yawDeg) { window.__qaHold = true; teleport(X, Y, Z, yawDeg); const st = { moveX: 0, moveY: 0 }; for (let i = 0; i < 40; i++) frame(1 / 30, st); R.render(0, t); return R.renderer.domElement.toDataURL('image/jpeg', 0.9); },
  // replay a walk-test path with the real player controller (run speed); reports reach/stuck
  drive(path, { run = true, timeout = 120 } = {}) {
    window.__qaHold = true; const [sx, sy, sz] = path[0]; teleport(sx, sy, sz, 0);
    let wi = 1, simT = 0, best = 1e9, lastBest = 0, maxErr = 0; const end = path[path.length - 1];
    while (simT < timeout) {
      const [X, Y, Z] = spec(player.pos);
      while (wi < path.length - 1 && Math.hypot(path[wi][0] - X, path[wi][1] - Y) < 0.45) wi++;
      const w = path[wi]; let dx = w[0] - X, dy = w[1] - Y; const d = Math.hypot(dx, dy) || 1; dx /= d; dy /= d;
      const dEnd = Math.hypot(end[0] - X, end[1] - Y);
      if (dEnd < 0.4 && Math.abs(Z - end[2]) < 0.35) return { ok: true, t: +simT.toFixed(1), maxErr: +maxErr.toFixed(2) };
      const prog = (path.length - wi) * 10 + d; if (prog < best - 0.05) { best = prog; lastBest = simT; }
      if (simT - lastBest > 5) return { ok: false, why: 'stuck', at: [X, Y, Z].map((v) => +v.toFixed(2)), wp: wi, of: path.length };
      player.frame = FRAME; // world-aligned stick: up = north, right = east
      player.update(1 / 30, { moveX: dx, moveY: dy, run }, R.camera, false); player.frame = FRAME;
      // deviation from the searched path (z): the controller must land on the same floor
      maxErr = Math.max(maxErr, Math.abs(spec(player.pos)[2] - w[2]) > 1.0 ? Math.abs(spec(player.pos)[2] - w[2]) : 0);
      simT += 1 / 30;
    }
    return { ok: false, why: 'timeout' };
  },
  release() { window.__qaHold = false; },
  rooms: ROOMS.map((r) => ({ id: r.id, level: r.level, x: r.x, y: r.y })), doors: DOORS.length,
};
main().catch((e) => { console.error(e); document.querySelector('#loading h1').textContent = 'ERROR: ' + e.message; });
