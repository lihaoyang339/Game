// STUDY (书房) — ordered, heavy, masculine: floor-to-ceiling walnut library on the west wall, dark
// paneling, beamed ceiling, cold black-marble fireplace (contrast with the living room's live fire).
// This is where the radio set lives. Story read: someone has been working here recently and
// methodically — a plan of the house spread on the desk, a shelf emptied of its volumes, the chair
// shoved back. The west library wall is visibly deeper than it should be (spatial puzzle seed).
import * as THREE from 'three';
import { buildShell, buildCeiling } from '../world/arch.js';
import { Door, sashWindow, rug, curtain, velvet, fireplace } from '../world/fixtures.js';
import { pedestalDesk, libraryCase } from '../world/furniture.js';
import { papers, candle } from './details.js';

export const MODELS = ['vintage_radio_transceiver', 'GreenChair_01', 'ArmChair_01', 'side_table_tall_01', 'Lantern_01', 'round_spectacles', 'magnifying_glass_01', 'pocket_watch',
  'vintage_wooden_drawer_01', 'vintage_microscope', 'carved_wooden_elephant', 'vintage_oil_lamp', 'mantel_clock_01', 'book_encyclopedia_set_01', 'wooden_candlestick'];
export const STUDY = { x0: -5.7, x1: 2.3, z0: -11.6, z1: -3.6, h: 3.6 };

// a hand-drawn architectural plan of the ground floor (the "old building plan" clue)
function planTexture() {
  const c = document.createElement('canvas'); c.width = 1024; c.height = 720; const g = c.getContext('2d');
  g.fillStyle = '#d8ccab'; g.fillRect(0, 0, 1024, 720);
  for (let i = 0; i < 200; i++) { g.fillStyle = `rgba(120,95,55,${Math.random() * 0.05})`; g.beginPath(); g.arc(Math.random() * 1024, Math.random() * 720, Math.random() * 60, 0, 7); g.fill(); }
  g.strokeStyle = '#2a3550'; g.lineWidth = 5;
  const R = (x, y, w, h) => g.strokeRect(x, y, w, h);
  R(80, 120, 260, 230); R(360, 120, 250, 230); R(630, 120, 300, 230); R(80, 370, 850, 80); R(380, 470, 240, 200); R(640, 400, 280, 280);
  g.lineWidth = 2; g.font = 'italic 22px Georgia'; g.fillStyle = '#2a3550';
  g.fillText('Kitchen', 140, 240); g.fillText('Dining Room', 410, 240); g.fillText('Library', 720, 240); g.fillText('Gallery', 470, 420); g.fillText('Hall', 470, 580); g.fillText('Drawing Room', 700, 560);
  g.font = 'bold 26px Georgia'; g.fillText('GROUND FLOOR  —  1887', 340, 60);
  // the pencil annotation: wall thickness circled, a question mark
  g.strokeStyle = 'rgba(60,50,40,0.85)'; g.lineWidth = 3; g.beginPath(); g.ellipse(622, 235, 40, 110, 0, 0, 7); g.stroke();
  g.font = '28px cursive'; g.fillStyle = 'rgba(60,50,40,0.85)'; g.fillText('1.2 m ?', 560, 380);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t;
}

export function build(ctx) {
  const { kit, M, place, scene, assets } = ctx; const r = STUDY;
  buildShell(kit, r, {
    floor: { mat: M.parquetRect, tile: 1.6 }, upper: M.studyFrieze, upperTile: 1.4,
    trim: { base: M.walnutFrame, wainscot: M.walnutPanel, frame: M.walnutFrame, panel: M.walnutPanel, chair: M.walnutFrame, wainscotH: 2.55, panelW: 0.62, crown: M.walnutFrame, casing: M.walnutFrame, jamb: M.walnutFrame },
    walls: {
      s: { openings: [{ at: -2.0, w: 1.05, h: 2.6, kind: 'door' }] },
      n: { openings: [{ at: -3.6, w: 1.2, h: 2.3, y0: 0.85, kind: 'window' }, { at: 0.4, w: 1.2, h: 2.3, y0: 0.85, kind: 'window' }] },
      w: { openings: [] }, e: { openings: [] },
    },
  });
  buildCeiling(kit, r, { mat: M.ceilingPlaster, beamMat: M.darkWood, type: 'beams', coffer: 1.6, beamD: 0.26, beamW: 0.2 });
  // ---- west wall: built-in library (the wall behind it is suspiciously thick)
  const lib = libraryCase(M, { len: 6.6, h: 3.3, d: 0.44, bays: 4, seed: 3, missing: [24] });
  lib.position.set(r.x0, 0, r.z1 - 0.7); lib.rotation.y = Math.PI / 2; scene.add(lib);
  ctx.physics.box(r.x0 + 0.24, -7.6, 0.48, 6.6, 0, 0, 3.3, 'prop');
  // rolling library ladder on a brass rail along the bookcase
  const rail = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 6.4, 10), M.brass); rail.rotation.x = Math.PI / 2; rail.position.set(r.x0 + 0.5, 2.75, -7.6); scene.add(rail);
  const lad = new THREE.Group(); lad.position.set(r.x0 + 1.05, 0, -6.1); lad.rotation.z = 0.22; scene.add(lad);
  for (const dz of [-0.24, 0.24]) { const st = new THREE.Mesh(new THREE.BoxGeometry(0.05, 2.85, 0.06), M.oak); st.position.set(0, 1.42, dz); st.castShadow = st.receiveShadow = true; lad.add(st); }
  for (let i = 0; i < 9; i++) { const rung = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.025, 0.5), M.oak); rung.position.set(0.0, 0.22 + i * 0.3, 0); rung.castShadow = true; lad.add(rung); }
  for (const dz of [-0.24, 0.24]) { const hook = new THREE.Mesh(new THREE.TorusGeometry(0.03, 0.008, 6, 10, Math.PI), M.brass); hook.position.set(0.02, 2.86, dz); hook.rotation.y = Math.PI / 2; lad.add(hook); const wh = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.02, 12), M.ironBlack); wh.rotation.x = Math.PI / 2; wh.position.set(0, 0.03, dz); lad.add(wh); }
  // ---- east wall: cold black marble chimneypiece, specimen chest
  const fp = fireplace(scene, kit, { marble: M.marbleDark, brick: M.brick, soot: M.soot, breast: M.studyFrieze, ceilingH: r.h, breastDepth: 0.3 }, { x: r.x1 - 0.28, z: -6.2, yaw: -Math.PI / 2, w: 1.6, h: 1.25 });
  ctx.physics.box(r.x1 - 0.25, -6.2, 0.6, 2.0, 0, 0, 3, 'wall');
  place('mantel_clock_01', { x: r.x1 - 0.42, y: 1.25, z: -6.2, yaw: -Math.PI / 2, dust: 0.4 });
  for (const dz of [-0.6, 0.6]) { place('wooden_candlestick', { x: r.x1 - 0.42, y: 1.25, z: -6.2 + dz, dust: 0.35 }); const cd = candle(0.16, 0.7); cd.position.set(r.x1 - 0.42, 1.47, -6.2 + dz); scene.add(cd); }
  place('vintage_wooden_drawer_01', { x: r.x1 - 0.5, z: -10.2, yaw: -Math.PI / 2, collide: true, dust: 0.25 });
  place('vintage_microscope', { x: r.x1 - 0.55, y: 1.09, z: -10.55, yaw: -Math.PI / 2 - 0.3, dust: 0.2 });
  place('carved_wooden_elephant', { x: r.x1 - 0.5, y: 1.09, z: -9.7, yaw: -2.0, dust: 0.3 });
  // ---- desk in front of the windows, facing the door; chair shoved back and turned
  const desk = pedestalDesk(M); desk.position.set(-1.6, 0, -9.3); scene.add(desk);
  ctx.physics.box(-1.6, -9.3, 1.7, 0.85, 0, 0, 0.8, 'prop');
  place('GreenChair_01', { x: -1.25, z: -10.45, yaw: 0.55, collide: true });
  const top = 0.785;
  place('vintage_radio_transceiver', { x: -2.15, y: top, z: -9.45, yaw: 0.25 });
  ctx.interact({ id: 'radio', x: -2.0, z: -8.5, r: 1.2, prompt: '调查', radio: true, text: ['旧式无线电收发报机。指示灯还亮着。', '……沙沙……如果你能听到这段话……', '……沙沙……地下室……', '信号断了。'] });
  ctx.interact({ id: 'plan', x: -1.2, z: -8.4, r: 1.0, prompt: '查看', text: ['一张庄园一层的旧建筑图，1887 年。', '有人用铅笔圈出了书房和餐厅之间的墙，旁边写着：“1.2 m ?”'] });
  const planM = new THREE.Mesh(new THREE.PlaneGeometry(0.62, 0.44), new THREE.MeshStandardMaterial({ map: planTexture(), roughness: 0.85 }));
  planM.rotation.x = -Math.PI / 2; planM.rotation.z = 0.12; planM.position.set(-1.25, top + 0.006, -9.2); planM.receiveShadow = true; scene.add(planM);
  place('round_spectacles', { x: -1.05, y: top + 0.008, z: -9.05, yaw: 0.8 });
  place('magnifying_glass_01', { x: -0.95, y: top + 0.01, z: -9.38, yaw: 1.4, rx: Math.PI / 2 });
  place('pocket_watch', { x: -0.82, y: top + 0.008, z: -9.55, rx: -Math.PI / 2, yaw: 0.3 });
  papers(scene, -0.95, top + 0.002, -9.05, { n: 5, spread: 0.3, seed: 21, kinds: ['typed', 'letter', 'typed'] });
  place('vintage_oil_lamp', { x: -0.85, y: top, z: -9.6 });
  // books pulled from the library: a stack on the floor by the shelves, one open
  const stack = new THREE.Group(); stack.position.set(r.x0 + 0.85, 0, -6.6); scene.add(stack);
  for (let i = 0; i < 6; i++) { const b = new THREE.Mesh(new THREE.BoxGeometry(0.2 - (i % 2) * 0.03, 0.045, 0.28), new THREE.MeshStandardMaterial({ color: [0x3a1d16, 0x23301f, 0x2c2a36, 0x4a3a20][i % 4], roughness: 0.7 })); b.position.set((i % 3) * 0.01, 0.023 + i * 0.046, (i % 2) * 0.02); b.rotation.y = (i * 0.37) % 0.6 - 0.3; b.castShadow = true; b.receiveShadow = true; stack.add(b); }
  // ---- reading corner by the fire
  const rg = rug(assets, 2.4, 3.2, { seed: 77, pal: { field: '#2a2f3a', border: '#5a2a20', guard: '#b8a070', motif: '#c9b58f', accent: '#3a4a3a', dark: '#14161c' } });
  rg.position.set(0.3, 0, -6.4); scene.add(rg);
  place('ArmChair_01', { x: 0.2, z: -5.1, yaw: Math.PI - 0.7 + Math.PI / 2 + 0.6, collide: true, dust: 0.15 });
  place('side_table_tall_01', { x: -0.55, z: -4.6, collide: true });
  place('Lantern_01', { x: -0.55, y: 0.765, z: -4.6, yaw: 0.4 });
  // ---- windows with heavy green velvet, drawn almost closed (one gap)
  const vel = velvet(assets, 0x223324);
  for (const x of [-3.6, 0.4]) {
    sashWindow(scene, M.walnutFrame, { x, z: r.z0 - 0.07, yaw: 0, w: 1.2, h: 2.3, y0: 0.85, panes: [3, 3] });
    const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 2.2, 10), M.brass); rod.rotation.z = Math.PI / 2; rod.position.set(x, 3.3, r.z0 + 0.12); scene.add(rod);
    for (const s of [-1, 1]) { const c = curtain(vel, x < 0 ? 0.95 : 0.75, 3.3, { gather: 0.1, tie: 0.4, side: s, seed: 3 + x + s }); c.position.set(x + s * (x < 0 ? 0.42 : 0.6), 0.0, r.z0 + 0.13); scene.add(c); }
  }
  // ---- lights: desk lamp (key, shadowed), radio dial, window gap, gallery spill, lightning
  ctx.light({ room: 'study', type: 'spot', pos: [-0.85, 1.22, -9.6], target: [-1.6, 0.0, -7.2], color: 0xffa65a, intensity: 4.5, distance: 9, angle: 1.25, penumbra: 0.85, fire: 0.25, prio: 6 });
  ctx.light({ room: 'study', type: 'point', pos: [-0.85, 1.2, -9.4], color: 0xffa65a, intensity: 1.2, distance: 5, fire: 0.25, prio: 5 });
  ctx.light({ room: 'study', type: 'point', pos: [-2.1, 0.95, -9.25], color: 0x9fd28a, intensity: 0.25, distance: 1.6, prio: 5 });
  ctx.light({ room: 'study', type: 'spot', pos: [0.4, 3.0, -14.5], target: [0.0, 0.0, -8.0], color: 0x7088b0, intensity: 2.5, distance: 13, angle: 0.3, penumbra: 0.5, flash: 700, prio: 4 });
  ctx.light({ room: 'study', type: 'point', pos: [-2.0, 1.8, -2.6], color: 0xb08a60, intensity: 1.2, distance: 4.5, prio: 2 });
  ctx.cam({ id: 'study_door', room: 'study', pos: [1.95, 3.05, -3.95], look: [-3.9, 0.85, -9.8], fov: 54, zone: [-5.7, 2.3, -7.4, -3.6], track: 0.12 });
  ctx.cam({ id: 'study_desk', room: 'study', pos: [-5.15, 2.35, -11.15], look: [1.4, 1.0, -4.8], fov: 54, zone: [-5.7, 2.3, -11.6, -7.4], track: 0.12 });
  return { id: 'study', bounds: r, neighbors: ['gallery'], spawn: [-2, -5], fill: 2.6 };
}
