// SERVICE WING: kitchen (厨房), butler's pantry (备餐间), servants' corridor (仆人走廊).
// Design language: utilitarian, lower ceilings, glazed white tile and whitewash, scrubbed wood,
// exposed pipes, bare bulbs. Story read: the only part of the house where someone was *living*
// recently — a pot on the range, food set aside, a candle stub burnt on the work table; the bell
// board in the corridor still lists the rooms the staff once answered to.
import * as THREE from 'three';
import { buildShell, buildCeiling } from '../world/arch.js';
import { Door, sashWindow } from '../world/fixtures.js';
import { kitchenRange, stoneSink, workTable } from '../world/furniture.js';
import { candle, papers, footprints } from './details.js';

export const MODELS = ['painted_wooden_cabinet', 'painted_wooden_cabinet_02', 'painted_wooden_shelves', 'painted_wooden_chair_01', 'painted_wooden_stool', 'painted_wooden_bench', 'dining_table',
  'pot_enamel_01', 'vintage_electric_kettle', 'wooden_cutting_board', 'wooden_bowl_01', 'wicker_basket_01', 'yellow_onion', 'sweet_potato', 'metal_jug', 'jug_01', 'ceramic_pot',
  'scandinavian_masonry_heater', 'vintage_telephone_wall_clock', 'wooden_bucket_01', 'wooden_broom', 'rubber_boots', 'wooden_crate_02', 'pull_chain_light_socket', 'lightbulb_01', 'wooden_stool_01', 'tea_set_01'];
export const KITCHEN = { x0: -24.5, x1: -17.8, z0: -11.6, z1: -3.6, h: 3.4 };
export const PANTRY = { x0: -17.5, x1: -16.0, z0: -11.0, z1: -8.2, h: 2.9 };
export const CORRIDOR = { x0: -24.5, x1: -16.3, z0: -3.3, z1: -1.5, h: 2.7 };

function bulb(ctx, x, y, z, cordLen) {
  const { place, scene } = ctx;
  const cord = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, cordLen, 5), new THREE.MeshStandardMaterial({ color: 0x15130f, roughness: 0.8 })); cord.position.set(x, y + cordLen / 2 + 0.12, z); scene.add(cord);
  place('pull_chain_light_socket', { x, y: y, z });
  const b = place('lightbulb_01', { x, y: y - 0.08, z, rx: Math.PI });
  const glowM = new THREE.MeshStandardMaterial({ color: 0xffe2b0, emissive: new THREE.Color(1, 0.75, 0.45), emissiveIntensity: 3, roughness: 0.3 });
  const glow = new THREE.Mesh(new THREE.SphereGeometry(0.018, 10, 8), glowM); glow.position.set(x, y - 0.12, z); scene.add(glow);
  return glowM;
}

// bell board: mahogany board with 8 bells on coiled springs and painted room labels
function bellBoard(M, scene, x, y, z, yaw) {
  const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.y = yaw; scene.add(g);
  const c = document.createElement('canvas'); c.width = 1024; c.height = 256; const gg = c.getContext('2d');
  gg.fillStyle = '#3a2016'; gg.fillRect(0, 0, 1024, 256); gg.strokeStyle = '#b89a5a'; gg.lineWidth = 6; gg.strokeRect(10, 10, 1004, 236);
  const names = ['DRAWING RM', 'DINING RM', 'LIBRARY', 'MORNING RM', 'BEDROOM 1', 'BEDROOM 2', 'NURSERY', 'FRONT DOOR'];
  gg.font = 'bold 22px Georgia'; gg.fillStyle = '#d8c79a'; gg.textAlign = 'center';
  names.forEach((n, i) => { gg.fillText(n, 70 + i * 126, 220); gg.strokeStyle = '#d8c79a'; gg.lineWidth = 1; gg.beginPath(); gg.arc(70 + i * 126, 120, 50, 0, 7); gg.stroke(); });
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  const board = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.4, 0.03), [M.walnutFrame, M.walnutFrame, M.walnutFrame, M.walnutFrame, new THREE.MeshStandardMaterial({ map: t, roughness: 0.6 }), M.walnutFrame]);
  board.castShadow = true; board.receiveShadow = true; g.add(board);
  const bells = [];
  const bellGeo = new THREE.LatheGeometry([[0, 0.05], [0.02, 0.048], [0.034, 0.03], [0.042, 0.0], [0.045, -0.005], [0, -0.005]].map(([a, b]) => new THREE.Vector2(a, b)), 20);
  for (let i = 0; i < 8; i++) {
    const piv = new THREE.Group(); piv.position.set(-0.69 + i * 0.197, 0.08, 0.04); g.add(piv);
    const spring = new THREE.Mesh(new THREE.TorusGeometry(0.012, 0.0025, 4, 10), M.brass); spring.rotation.y = Math.PI / 2; piv.add(spring);
    const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.002, 0.002, 0.07, 4), M.brass); arm.position.y = -0.045; piv.add(arm);
    const bell = new THREE.Mesh(bellGeo, M.brass); bell.position.y = -0.11; bell.rotation.x = Math.PI; bell.castShadow = true; piv.add(bell);
    bells.push(piv);
  }
  return bells;
}

export function build(ctx) {
  const { kit, M, place, scene } = ctx;
  // ================= KITCHEN =================
  const k = KITCHEN;
  buildShell(kit, k, {
    floor: { mat: M.terracotta, tile: 1.2 }, upper: M.whitePlaster, upperTile: 1.6,
    trim: { base: M.kitchenTile, dado: { mat: M.kitchenTile, h: 1.55, tile: 1.3 }, casing: M.painted, jamb: M.painted },
    walls: {
      n: { openings: [] },
      e: { openings: [{ at: -9.6, w: 0.95, h: 2.3, kind: 'door', pediment: false }] },
      s: { openings: [{ at: -21.0, w: 0.95, h: 2.3, kind: 'door', pediment: false }] },
      w: { openings: [{ at: -7.6, w: 1.15, h: 1.7, y0: 1.05, kind: 'window' }] },
    },
  });
  buildCeiling(kit, k, { mat: M.whitePlaster, beamMat: M.darkWood, type: 'beams', coffer: 1.7, beamD: 0.22, beamW: 0.18 });
  // range recess on the north wall: brick surround, oak bressummer beam, soot bloom
  const rx = -21.15;
  kit.box(M.brick, rx - 1.12, 1.15, k.z0 + 0.3, 0.42, 2.3, 0.6); kit.box(M.brick, rx + 1.12, 1.15, k.z0 + 0.3, 0.42, 2.3, 0.6);
  kit.box(M.darkWood, rx, 2.42, k.z0 + 0.33, 2.7, 0.26, 0.66);
  kit.box(M.brick, rx, (2.55 + k.h) / 2, k.z0 + 0.25, 2.66, k.h - 2.55, 0.5);
  kit.box(M.brick, rx, 1.15, k.z0 + 0.02, 1.86, 2.3, 0.04);
  const sootM = new THREE.MeshStandardMaterial({ color: 0x000000, transparent: true, opacity: 0.55, depthWrite: false, alphaMap: sootTex() });
  const soot = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 1.4), sootM); soot.position.set(rx, 1.75, k.z0 + 0.045); scene.add(soot);
  const range = kitchenRange(M, { w: 1.6 }); range.position.set(rx, 0, k.z0 + 0.05); scene.add(range);
  ctx.physics.box(rx, k.z0 + 0.35, 2.7, 0.75, 0, 0, 2.4, 'prop');
  place('pot_enamel_01', { x: rx + 0.25, y: 0.87, z: k.z0 + 0.42, yaw: 0.4 });
  place('vintage_electric_kettle', { x: rx - 0.45, y: 0.87, z: k.z0 + 0.4, yaw: 0.9, s: 0.9 });
  // copper pans hanging from an iron rail in front of the range hood
  const copper = new THREE.MeshStandardMaterial({ color: 0xb06a42, metalness: 1, roughness: 0.42 });
  const prail = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 2.0, 8), M.ironBlack); prail.rotation.z = Math.PI / 2; prail.position.set(rx, 2.18, k.z0 + 0.72); scene.add(prail);
  [[-0.75, 0.14], [-0.4, 0.11], [-0.05, 0.16], [0.35, 0.09], [0.7, 0.12]].forEach(([dx, rr], i) => {
    const pan = new THREE.Group(); pan.position.set(rx + dx, 2.14, k.z0 + 0.72); scene.add(pan);
    const hk = new THREE.Mesh(new THREE.TorusGeometry(0.018, 0.004, 5, 10), M.ironBlack); hk.position.y = -0.02; pan.add(hk);
    const handle = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.24, 0.01), copper); handle.position.y = -0.15; pan.add(handle);
    const body = new THREE.Mesh(new THREE.LatheGeometry([[0, 0], [rr * 0.85, 0], [rr, 0.01], [rr, rr * 0.55], [rr * 1.04, rr * 0.6]].map(([a, b]) => new THREE.Vector2(a, b)), 24), copper);
    body.rotation.x = Math.PI / 2; body.position.set(0, -0.27 - rr, -0.02); pan.add(body); pan.rotation.z = (i % 2 ? 1 : -1) * 0.03;
    pan.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  });
  // centre work table with the evidence of a recent meal prepared by candlelight
  const wt = workTable(M, { len: 2.2, w: 0.95 }); wt.position.set(-21.0, 0, -7.7); wt.rotation.y = Math.PI / 2; scene.add(wt);
  ctx.physics.box(-21.0, -7.7, 0.95, 2.2, 0, 0, 0.86, 'prop');
  const T = 0.84;
  place('wooden_cutting_board', { x: -21.1, y: T, z: -8.2, yaw: 1.4 });
  place('yellow_onion', { x: -21.25, y: T + 0.02, z: -8.25, s: 1.0 });
  place('yellow_onion', { x: -20.8, y: T, z: -8.45, s: 0.9, tint: 0x6a5a3a, rx: 1.2 });
  place('wicker_basket_01', { x: -20.85, y: T, z: -7.15, yaw: 0.5 });
  for (let i = 0; i < 4; i++) place('sweet_potato', { x: -20.9 + (i % 2) * 0.12, y: T + 0.06, z: -7.2 + i * 0.05, yaw: i * 0.8, tint: 0x6a5040 });
  place('wooden_bowl_01', { x: -21.25, y: T, z: -7.0, yaw: 0.2 });
  place('tea_set_01', { x: -21.3, y: T, z: -8.75, only: /plate_large_circular_03/, center: true });
  const cs = candle(0.16, 0.85); cs.position.set(-20.75, T, -8.0); scene.add(cs);
  const drip = new THREE.Mesh(new THREE.CircleGeometry(0.04, 12), new THREE.MeshStandardMaterial({ color: 0xe0d8c0, roughness: 0.5 })); drip.rotation.x = -Math.PI / 2; drip.position.set(-20.75, T + 0.002, -8.0); scene.add(drip);
  for (const [x, z, y] of [[-21.9, -7.2, 0.6], [-20.1, -8.4, 0.3]]) place('painted_wooden_stool', { x, z, yaw: y, collide: true });
  // west wall: sink under the window, plate shelves; bucket
  sashWindow(scene, M.painted, { x: k.x0 - 0.07, z: -7.6, yaw: -Math.PI / 2, w: 1.15, h: 1.7, y0: 1.05, panes: [2, 2] });
  const sink = stoneSink(M, { w: 1.05, d: 0.55 }); sink.position.set(k.x0 + 0.3, 0, -7.6); sink.rotation.y = Math.PI / 2; scene.add(sink);
  ctx.physics.box(k.x0 + 0.3, -7.6, 0.6, 1.1, 0, 0, 0.9, 'prop');
  place('wooden_bucket_01', { x: k.x0 + 0.45, z: -6.75, yaw: 0.3, collide: true });
  place('painted_wooden_shelves', { x: k.x0 + 0.22, z: -10.4, yaw: Math.PI / 2, s: 1.15, collide: true });
  place('jug_01', { x: k.x0 + 0.2, y: 0.47 * 1.15, z: -10.4, yaw: 1.4 });
  place('ceramic_pot', { x: k.x0 + 0.35, z: -11.1, s: 0.8, collide: true });
  // east wall: the tall dresser; south: servants' table; SW corner: tiled stove
  place('painted_wooden_cabinet_02', { x: k.x1 - 0.38, z: -5.3, yaw: -Math.PI / 2, collide: true, dust: 0.1 });
  place('metal_jug', { x: k.x1 - 0.42, y: 1.02, z: -5.0 });
  place('painted_wooden_cabinet', { x: k.x1 - 0.33, z: -11.0, yaw: -Math.PI / 2, s: 0.9, collide: true });
  place('dining_table', { x: -19.4, z: -5.0, yaw: Math.PI / 2, s: 0.8, collide: true });
  for (const [x, z, y] of [[-19.4, -5.95, 0.1], [-18.65, -4.65, -Math.PI / 2 + 0.3], [-20.25, -4.9, Math.PI / 2 - 0.2]]) place('painted_wooden_chair_01', { x, z, yaw: y, collide: true });
  place('scandinavian_masonry_heater', { x: k.x0 + 0.7, z: k.z1 - 0.75, yaw: Math.PI / 4, s: 0.85, collide: true });
  place('vintage_telephone_wall_clock', { x: -22.6, y: 1.55, z: k.z1 - 0.1, yaw: Math.PI });
  place('wooden_broom', { x: k.x1 - 0.2, z: -6.6, rz: 0.18, yaw: -Math.PI / 2 });
  ctx.door(new Door(scene, M.painted, { x: -21.0, z: k.z1 + 0.07, yaw: 0, w: 0.95, h: 2.3, open: 0.85, id: 'kitchen_corridor' }));
  ctx.door(new Door(scene, M.painted, { x: k.x1 + 0.07, z: -9.6, yaw: Math.PI / 2, w: 0.95, h: 2.3, open: 0.6, swing: -1, id: 'kitchen_pantry' }));
  footprints(scene, [[-17.9, -9.6], [-19.8, -9.0], [-20.3, -8.6]], { muddy: false, seed: 31, fade: 0.4 });
  const kb = bulb(ctx, -21.0, 2.55, -7.7, k.h - 2.67);
  ctx.light({ room: 'kitchen', type: 'spot', pos: [-21.0, 2.42, -7.7], target: [-21.0, 0, -7.6], color: 0xffcf96, intensity: 10, distance: 9, angle: 1.35, penumbra: 0.7, flicker: 0.2, mats: [kb], emissive: 3, prio: 6 });
  ctx.light({ room: 'kitchen', type: 'point', pos: [-21.0, 2.3, -7.7], color: 0xffcf96, intensity: 2, distance: 7, flicker: 0.2, prio: 5 });
  ctx.light({ room: 'kitchen', type: 'spot', pos: [-27.5, 2.2, -7.6], target: [-20.0, 0, -7.0], color: 0x7088b0, intensity: 3, distance: 12, angle: 0.32, penumbra: 0.5, flash: 700, prio: 4 });
  ctx.light({ room: 'kitchen', type: 'point', pos: [-16.8, 1.8, -9.6], color: 0xd8dce0, intensity: 1.0, distance: 4, flicker: 0.5, prio: 2 });
  ctx.cam({ id: 'kitchen_east', room: 'kitchen', pos: [-18.25, 2.95, -4.05], look: [-23.3, 0.75, -10.7], fov: 56, zone: [-24.5, -17.8, -7.6, -3.6], track: 0.12 });
  ctx.cam({ id: 'kitchen_range', room: 'kitchen', pos: [-24.05, 2.55, -4.1], look: [-19.6, 0.95, -11.2], fov: 56, zone: [-24.5, -17.8, -11.6, -7.6], track: 0.12 });

  // ================= BUTLER'S PANTRY =================
  const p = PANTRY;
  buildShell(kit, p, { floor: { mat: M.oldPlanks, tile: 1.5 }, upper: M.paintedCream, upperTile: 1.2, trim: { base: M.painted, casing: M.painted, jamb: M.painted },
    walls: { e: { openings: [{ at: -9.6, w: 0.95, h: 2.3, kind: 'door', pediment: false }] }, w: { openings: [{ at: -9.6, w: 0.95, h: 2.3, kind: 'door', pediment: false }] }, n: { openings: [] }, s: { openings: [] } } });
  buildCeiling(kit, p, { mat: M.whitePlaster });
  for (const z of [p.z0 + 0.2, p.z1 - 0.2]) for (const y of [0.9, 1.3, 1.7, 2.1]) kit.box(M.paintedCream, (p.x0 + p.x1) / 2, y, z, 1.4, 0.03, 0.34, { tile: 0.8 });
  for (const [z, s] of [[p.z0 + 0.2, 1], [p.z1 - 0.2, -1]]) for (const y of [0.9, 1.3, 1.7]) for (let i = 0; i < 5; i++) {
    const pl = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.09, 0.015, 24), new THREE.MeshPhysicalMaterial({ color: 0xece6d8, roughness: 0.2, clearcoat: 0.5 })); pl.position.set(p.x0 + 0.25 + i * 0.022, y + 0.13, z - s * 0.02); pl.rotation.x = Math.PI / 2 - s * 0.15; pl.rotation.z = 0; pl.castShadow = true; scene.add(pl);
  }
  const pb = bulb(ctx, -16.75, 2.5, -9.6, p.h - 2.62);
  ctx.light({ room: 'kitchen', type: 'point', pos: [-16.75, 2.35, -9.6], color: 0xe8e4dc, intensity: 1.5, distance: 4, flicker: 0.6, mats: [pb], emissive: 3, prio: 3 });

  // ================= SERVANTS' CORRIDOR =================
  const c = CORRIDOR;
  const green = M.painted.clone(); green.color = new THREE.Color(0x4f6a52);
  buildShell(kit, c, { floor: { mat: M.oldPlanks, tile: 1.4 }, upper: M.servicePlaster, upperTile: 1.4,
    trim: { base: green, dado: { mat: green, h: 1.25, tile: 1.2, cap: M.darkWood }, casing: M.painted, jamb: M.painted },
    walls: {
      n: { openings: [{ at: -21.0, w: 0.95, h: 2.3, kind: 'door', pediment: false }] },
      s: { openings: [{ at: -23.6, w: 0.9, h: 2.1, kind: 'door', pediment: false }] },
      e: { openings: [{ at: -2.3, w: 0.9, h: 2.3, kind: 'door', pediment: false }] },
      w: { openings: [{ at: -2.4, w: 0.9, h: 2.2, kind: 'door', pediment: false }] },
    } });
  buildCeiling(kit, c, { mat: M.servicePlaster });
  // exposed pipes along the ceiling: two iron, one lead/copper with brackets
  const pipeMats = [M.ironBlack, M.ironBlack, new THREE.MeshStandardMaterial({ color: 0x8a5a3a, metalness: 0.9, roughness: 0.45 })];
  [[-1.62, 2.52, 0.045], [-1.75, 2.42, 0.03], [-1.85, 2.56, 0.022]].forEach(([z, y, rr], i) => {
    const pp = new THREE.Mesh(new THREE.CylinderGeometry(rr, rr, c.x1 - c.x0, 12), pipeMats[i]); pp.rotation.z = Math.PI / 2; pp.position.set((c.x0 + c.x1) / 2, y, z); pp.castShadow = true; scene.add(pp);
  });
  for (let x = c.x0 + 0.6; x < c.x1; x += 1.4) kit.box(M.ironBlack, x, 2.6, -1.72, 0.03, 0.18, 0.35);
  // the bell board on the south wall, opposite the kitchen door
  const bells = bellBoard(M, scene, -19.3, 2.05, c.z1 - 0.03, Math.PI);
  ctx.update((dt) => { const t = performance.now() / 1000; bells[2].rotation.z = Math.sin(t * 9) * 0.06 * (0.5 + 0.5 * Math.sin(t * 0.7)); }); // the LIBRARY bell trembles
  // service clutter, ordered the way staff keep things
  place('painted_wooden_bench', { x: -17.6, z: c.z1 - 0.3, yaw: Math.PI, s: 0.9, collide: true, dust: 0.2 });
  place('rubber_boots', { x: -17.35, z: c.z1 - 0.32, only: /dirty_l|dirt_r/, center: true, yaw: Math.PI });
  place('wooden_crate_02', { x: -23.0, z: c.z0 + 0.32, yaw: Math.PI / 2, s: 0.9, collide: true });
  place('wooden_stool_01', { x: -22.2, z: c.z0 + 0.3, collide: true });
  place('wooden_broom', { x: -24.25, z: -1.75, rz: -0.12 });
  // heavy plank cellar door with strap hinges and a padlock (S wall, closed)
  const cd = new THREE.Group(); cd.position.set(-23.6, 0, c.z1 + 0.07); scene.add(cd);
  for (let i = 0; i < 5; i++) { const pl = new THREE.Mesh(new THREE.BoxGeometry(0.175, 2.08, 0.05), M.oak); pl.position.set(-0.36 + i * 0.18, 1.04, 0); pl.castShadow = pl.receiveShadow = true; cd.add(pl); }
  for (const y of [0.35, 1.75]) { const h = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.05, 0.012), M.ironBlack); h.position.set(-0.13, y, -0.032); cd.add(h); }
  const hasp = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.12, 0.02), M.ironBlack); hasp.position.set(0.36, 1.05, -0.04); cd.add(hasp);
  const lock = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.07, 0.025), M.brass); lock.position.set(0.36, 0.98, -0.06); cd.add(lock);
  ctx.physics.box(-23.6, c.z1 + 0.07, 0.9, 0.1, 0, 0, 2.1, 'door');
  ctx.interact({ id: 'cellar', x: -23.6, z: c.z1 - 0.3, r: 1.1, prompt: '检查', text: ['厚重的木门，挂着一把挂锁。', '挂锁很新……比这栋房子里的任何东西都新。'] });
  ctx.door(new Door(scene, M.painted, { x: c.x0 - 0.07, z: -2.4, yaw: Math.PI / 2, w: 0.9, h: 2.2, id: 'back_stair' }));
  const cb = bulb(ctx, -20.2, 2.25, -2.35, c.h - 2.37);
  ctx.light({ room: 'corridor', type: 'spot', pos: [-20.2, 2.13, -2.35], target: [-20.2, 0, -2.4], color: 0xffcf96, intensity: 8, distance: 8, angle: 1.4, penumbra: 0.6, flicker: 0.5, mats: [cb], emissive: 3, prio: 6 });
  ctx.light({ room: 'corridor', type: 'point', pos: [-21.0, 1.6, -3.0], color: 0xffcf96, intensity: 2.2, distance: 5, prio: 3 }); // kitchen light through the open door
  ctx.light({ room: 'corridor', type: 'point', pos: [-18.6, 1.9, -1.75], color: 0xffcf96, intensity: 0.9, distance: 4, prio: 2 }); // bounce off the bell board wall
  ctx.cam({ id: 'corridor_east', room: 'corridor', pos: [-16.75, 2.35, -1.72], look: [-24.3, 0.95, -2.75], fov: 50, zone: [-20.4, -16.3, -3.3, -1.5], track: 0.15 });
  ctx.cam({ id: 'corridor_west', room: 'corridor', pos: [-24.15, 2.3, -1.68], look: [-16.6, 1.0, -2.85], fov: 50, zone: [-24.5, -20.4, -3.3, -1.5], track: 0.15 });
  return [{ id: 'kitchen', bounds: k, neighbors: ['corridor'], spawn: [-21, -5], fill: 2.0 }, { id: 'corridor', bounds: c, neighbors: ['kitchen'], spawn: [-19, -2.4], fill: 0.6 }];
}

let _soot = null;
function sootTex() {
  if (_soot) return _soot; const c = document.createElement('canvas'); c.width = 256; c.height = 256; const g = c.getContext('2d');
  g.fillStyle = '#000'; g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 80; i++) { const x = 128 + (Math.random() - 0.5) * 140, y = 40 + Math.random() * 150; const grd = g.createRadialGradient(x, y, 0, x, y, 30 + Math.random() * 50); grd.addColorStop(0, 'rgba(255,255,255,0.18)'); grd.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = grd; g.fillRect(0, 0, 256, 256); }
  _soot = new THREE.CanvasTexture(c); return _soot;
}
