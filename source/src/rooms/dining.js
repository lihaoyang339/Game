// DINING ROOM (餐厅) — formal and frozen in time: oxblood silk damask over walnut, walnut coffered
// ceiling, long table running from the doors to the windows. Story read: a birthday dinner laid for
// eight that never happened — one place used, the cake cut once and left to rot, the head chair
// knocked over backward, the dust on the other seven settings undisturbed.
import * as THREE from 'three';
import { buildShell, buildCeiling } from '../world/arch.js';
import { Door, sashWindow, rug, curtain, velvet, sconce } from '../world/fixtures.js';
import { diningTable } from '../world/furniture.js';
import { candle, ghostFrame } from './details.js';

export const MODELS = ['dining_chair_02', 'GothicCabinet_01', 'vintage_cabinet_01', 'Chandelier_02', 'brass_candleholders', 'strawberry_chocolate_cake', 'wine_bottles_01', 'tea_set_01', 'fancy_picture_frame_01', 'jug_01', 'bananas', 'lemon'];
export const DINING = { x0: -15.7, x1: -7.0, z0: -11.6, z1: -3.6, h: 3.9 };

const china = new THREE.MeshPhysicalMaterial({ color: 0xf0ece2, roughness: 0.18, clearcoat: 0.6 });
const silver = new THREE.MeshStandardMaterial({ color: 0xb8b4ac, metalness: 1, roughness: 0.38 });
const crystal = new THREE.MeshPhysicalMaterial({ color: 0xd8e2e0, roughness: 0.05, transparent: true, opacity: 0.25, envMapIntensity: 1.5, depthWrite: false });
function plateGeo() { return new THREE.LatheGeometry([[0, 0], [0.09, 0], [0.1, 0.006], [0.13, 0.012], [0.135, 0.016], [0.128, 0.017], [0.095, 0.01], [0, 0.009]].map(([x, y]) => new THREE.Vector2(x, y)), 32); }
function glassGeo() { return new THREE.LatheGeometry([[0, 0], [0.035, 0], [0.036, 0.004], [0.004, 0.01], [0.004, 0.09], [0.03, 0.11], [0.038, 0.16], [0.036, 0.2], [0.033, 0.2], [0.034, 0.16], [0.026, 0.115], [0.0, 0.1]].map(([x, y]) => new THREE.Vector2(x, y)), 20); }
const PG = plateGeo(), GG = glassGeo();
function setting(parent, x, z, yaw, { used = false } = {}) {
  const g = new THREE.Group(); g.position.set(x, 0.762, z); g.rotation.y = yaw; parent.add(g);
  const p = new THREE.Mesh(PG, china); p.receiveShadow = true; p.castShadow = true; g.add(p);
  const p2 = new THREE.Mesh(PG, china); p2.scale.setScalar(0.72); p2.position.y = 0.016; g.add(p2);
  for (const [dx, len] of [[-0.18, 0.2], [-0.21, 0.19], [0.18, 0.21], [0.21, 0.17]]) { const c = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.004, len), silver); c.position.set(dx, 0.003, 0); c.castShadow = true; g.add(c); }
  const gl = new THREE.Mesh(GG, crystal); gl.position.set(0.2, 0, -0.2); g.add(gl);
  // folded napkin
  const n = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.12, 3), new THREE.MeshStandardMaterial({ color: 0xe8e2d2, roughness: 0.9 })); n.position.set(0, 0.075, 0.02); n.visible = !used; g.add(n);
  return g;
}

export function build(ctx) {
  const { kit, M, place, scene, assets } = ctx; const r = DINING;
  const floorM = M.herringbone.clone(); floorM.color = new THREE.Color(0x9a6e58);
  buildShell(kit, r, {
    floor: { mat: floorM, tile: 2.0 }, upper: M.damaskRed, upperTile: 1.0,
    trim: { base: M.walnutFrame, wainscot: M.walnutPanel, frame: M.walnutFrame, panel: M.walnutPanel, chair: M.walnutFrame, wainscotH: 1.25, panelW: 0.7, crown: M.walnutFrame, casing: M.walnutFrame, jamb: M.walnutFrame, picture: M.walnutFrame, pictureY: 3.3 },
    walls: {
      s: { openings: [{ at: -11.35, w: 1.8, h: 2.9, kind: 'door' }] },
      n: { openings: [{ at: -13.5, w: 1.25, h: 2.5, y0: 0.85, kind: 'window' }, { at: -9.2, w: 1.25, h: 2.5, y0: 0.85, kind: 'window' }] },
      w: { openings: [{ at: -9.6, w: 0.95, h: 2.4, kind: 'door', pediment: false }] },
      e: { openings: [] },
    },
  });
  buildCeiling(kit, r, { mat: M.ceilingPlaster, beamMat: M.walnutFrame, type: 'coffered', coffer: 1.45, beamD: 0.24, beamW: 0.18, trimMat: M.walnutFrame });
  const cx = -11.35, cz = -7.75;
  const rg = rug(assets, 3.0, 5.2, { seed: 88, pal: { field: '#1f2a3a', border: '#5b1d1a', guard: '#b39a62', motif: '#cdb88e', accent: '#2f4535', dark: '#12161f' } }); rg.position.set(cx, 0, cz); scene.add(rg);
  const table = diningTable(M, { len: 3.6, w: 1.15 }); table.position.set(cx, 0, cz); scene.add(table);
  ctx.physics.box(cx, cz, 1.15, 3.6, 0, 0, 0.78, 'prop');
  // linen runner
  const run = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.003, 3.5), M.linen); run.position.set(cx, 0.761, cz); run.receiveShadow = true; scene.add(run);
  // chairs: 3 per side + both heads; north head knocked over backward, one side chair pulled out
  const sideZ = [-1.05, 0, 1.05];
  for (const s of [-1, 1]) for (const [i, dz] of sideZ.entries()) {
    const pulled = s > 0 && i === 2 ? 0.35 : 0; place('dining_chair_02', { x: cx + s * (0.78 + pulled), z: cz + dz, yaw: s > 0 ? -Math.PI / 2 : Math.PI / 2, collide: true, dust: pulled ? 0.05 : 0.3 });
  }
  place('dining_chair_02', { x: cx, z: cz + 2.15, yaw: Math.PI, collide: true, dust: 0.3 });
  place('dining_chair_02', { x: cx + 0.15, z: cz - 2.55, yaw: 0.25, rx: -1.45, y: 0.12, collide: true }); // toppled
  // place settings: eight laid, only the north head was used
  for (const s of [-1, 1]) for (const dz of sideZ) setting(scene, cx + s * 0.38, cz + dz, s > 0 ? -Math.PI / 2 : Math.PI / 2);
  setting(scene, cx, cz + 1.6, Math.PI); setting(scene, cx, cz - 1.6, 0, { used: true });
  // the cake: cut once, candles burnt down, gone bad (darkened, mould bloom)
  const cake = place('strawberry_chocolate_cake', { x: cx, y: 0.765, z: cz - 0.35, s: 1.6, tint: 0x8a8a70 });
  for (let i = 0; i < 7; i++) { const a = i / 7 * 6.283; const cd = candle(0.07, 0.75); cd.scale.setScalar(0.6); cd.position.set(cx + Math.cos(a) * 0.09, 0.765 + 0.12, cz - 0.35 + Math.sin(a) * 0.09); scene.add(cd); }
  place('tea_set_01', { x: cx + 0.08, y: 0.775, z: cz - 1.6, only: /plate_large_circular_03/, center: true });
  place('bananas', { x: cx - 0.25, y: 0.79, z: cz - 1.35, only: /bananas_bunch/, center: true, tint: 0x4a3a20, yaw: 1.2 });
  place('lemon', { x: cx + 0.3, y: 0.8, z: cz + 0.6, tint: 0x6a7a40 });
  for (const dz of [-1.0, 0.85]) place('brass_candleholders', { x: cx, y: 0.762, z: cz + dz, only: /brass_candleholder_03/, center: true, dust: 0.3 });
  // spilled wine glass + bottle near the used place
  place('wine_bottles_01', { x: cx - 0.32, y: 0.763, z: cz - 1.85, only: /bordeaux/, center: true });
  // ---- sideboard + painting on the east wall; china hutch on the west wall
  place('GothicCabinet_01', { x: r.x1 - 0.5, z: cz, yaw: -Math.PI / 2, s: 0.85, collide: true, dust: 0.25 });
  place('jug_01', { x: r.x1 - 0.5, y: 2.36 * 0.85 + 0.0, z: cz - 0.5, yaw: -1.2, dust: 0.3 });
  place('fancy_picture_frame_01', { x: r.x1 - 0.03, y: 2.45 + 0.3, z: cz, yaw: -Math.PI / 2, s: 1.9, dust: 0.1 });
  place('vintage_cabinet_01', { x: r.x0 + 0.36, z: -6.0, yaw: Math.PI / 2, s: 0.95, collide: true, dust: 0.2 });
  ghostFrame(scene, new THREE.Vector3(r.x0 + 0.002, 2.6, -10.7), new THREE.Vector3(1, 0, 0), 0.7, 0.9);
  // ---- chandelier over the table
  place('Chandelier_02', { x: cx, y: r.h - 1.25, z: cz, dust: 0.35 });
  const chain = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.34, 6), M.brass); chain.position.set(cx, r.h - 0.17, cz); scene.add(chain);
  // ---- windows with oxblood drapes drawn open
  const vel = velvet(assets, 0x3c1214);
  for (const x of [-13.5, -9.2]) {
    sashWindow(scene, M.walnutFrame, { x, z: r.z0 - 0.07, yaw: 0, w: 1.25, h: 2.5, y0: 0.85, panes: [3, 3] });
    const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 2.3, 10), M.brass); rod.rotation.z = Math.PI / 2; rod.position.set(x, 3.5, r.z0 + 0.12); scene.add(rod);
    for (const s of [-1, 1]) { const c = curtain(vel, 0.7, 3.5, { gather: 0.55, tie: 0.38, side: -s, seed: 70 + x + s }); c.position.set(x + s * 0.88, 0.0, r.z0 + 0.13); scene.add(c); }
  }
  // ---- doors: swing door to the butler's pantry (ajar, cold light behind)
  ctx.door(new Door(scene, M.walnutFrame, { x: r.x0 - 0.07, z: -9.6, yaw: Math.PI / 2, w: 0.95, h: 2.4, open: 0.2, id: 'pantry_swing' }));
  // ---- sconces flanking the painting (one works, weak)
  const sc = [];
  for (const dz of [-1.35, 1.35]) { const s = sconce(); s.group.position.set(r.x1, 2.2, cz + dz); s.group.rotation.y = -Math.PI / 2; scene.add(s.group); sc.push(s); }
  ctx.light({ room: 'dining', type: 'point', pos: [r.x1 - 0.35, 2.4, cz - 1.35], color: 0xffa860, intensity: 3.4, distance: 7, flicker: 0.3, mats: sc[0].mats, emissive: 2.2, prio: 3 });
  ctx.light({ room: 'dining', type: 'spot', pos: [-13.5, 3.3, -15.0], target: [-12.5, 0.0, -8.0], color: 0x7088b0, intensity: 40, distance: 16, angle: 0.36, penumbra: 0.5, flash: 900, prio: 5 });
  ctx.light({ room: 'dining', type: 'spot', pos: [-9.2, 3.3, -15.0], target: [-10.2, 0.0, -8.0], color: 0x7088b0, intensity: 32, distance: 16, angle: 0.36, penumbra: 0.5, flash: 900, prio: 4 });
  ctx.light({ room: 'dining', type: 'point', pos: [r.x0 - 0.8, 1.9, -9.6], color: 0xc8d0d8, intensity: 1.2, distance: 4, flicker: 0.5, prio: 2 }); // pantry bulb
  ctx.cam({ id: 'dining_door', room: 'dining', pos: [-7.45, 3.35, -4.05], look: [-13.9, 0.8, -10.3], fov: 54, zone: [-11.35, -7.0, -11.6, -3.6], track: 0.12 });
  ctx.cam({ id: 'dining_window', room: 'dining', pos: [-15.25, 2.05, -11.15], look: [-8.4, 1.0, -4.6], fov: 54, zone: [-15.7, -11.35, -11.6, -3.6], track: 0.12 });
  return { id: 'dining', bounds: r, neighbors: ['gallery'], spawn: [-11.35, -4.4], fill: 3.6 };
}
