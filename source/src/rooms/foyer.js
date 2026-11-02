// FOYER (前厅) — first interior the player sees. Double-height, black/white marble, dark walnut
// wainscot under faded green silk damask, coffered ceiling with a dead crystal chandelier.
// Story read: an estate keeping up appearances that stopped a while ago; a recent visitor (dried
// mud prints, a suitcase left by the door); a roof leak someone tried to deal with (bucket).
import * as THREE from 'three';
import { buildShell, buildCeiling, wallPoint } from '../world/arch.js';
import { Door, sashWindow, rug, sconce } from '../world/fixtures.js';
import { footprints, papers, plasterDebris, pictureCord, candle } from './details.js';
import { lightConeMaterial } from '../world/materials.js';
import { storm } from '../world/fixtures.js';

export const MODELS = ['ClassicConsole_01', 'ornate_mirror_01', 'brass_candleholders', 'standing_picture_frame_01', 'WoodenChair_01', 'side_table_tall_01', 'marble_bust_01', 'potted_plant_02', 'vintage_suitcase', 'wooden_bucket_01', 'fancy_picture_frame_01', 'Chandelier_03', 'Lantern_01'];
export const FOYER = { x0: -4, x1: 4, z0: 0, z1: 8, h: 5.2 };

export function build(ctx) {
  const { kit, M, place, scene } = ctx; const r = FOYER;
  buildShell(kit, r, {
    floor: { mat: M.marbleChecker, tile: 1.2 }, upper: M.damaskGreen, upperTile: 1.1,
    trim: { base: M.walnutFrame, wainscot: M.walnutPanel, frame: M.walnutFrame, chair: M.walnutFrame, panel: M.walnutPanel, wainscotH: 1.45, panelW: 0.62, crown: M.paintedCream, casing: M.walnutFrame, jamb: M.walnutFrame, picture: M.walnutFrame, pictureY: 3.9 },
    walls: {
      s: { openings: [{ at: 0, w: 1.8, h: 2.9, kind: 'door' }, { at: 0, w: 1.6, h: 0.85, y0: 3.25, kind: 'window' }, { at: -2.65, w: 0.85, h: 2.45, y0: 0.95, kind: 'window' }, { at: 2.65, w: 0.85, h: 2.45, y0: 0.95, kind: 'window' }] },
      e: { openings: [{ at: 4.5, w: 1.9, h: 3.0, kind: 'door' }] },
      n: { openings: [{ at: 0, w: 2.4, h: 3.4, kind: 'arch' }] },
      w: { openings: [{ at: 4.5, w: 1.05, h: 2.6, kind: 'door' }] },
    },
  });
  buildCeiling(kit, r, { mat: M.ceilingFoyer, beamMat: M.paintedCream, type: 'coffered', coffer: 2.0, beamD: 0.28, beamW: 0.22, trimMat: M.paintedCream, medallion: { x: 0, z: 4, scale: 1.6, mat: M.paintedCream } });

  // ---- doors
  const entry = ctx.door(new Door(scene, M.oak, { x: 0, z: 8.07, yaw: 0, w: 1.8, h: 2.9, double: true, id: 'entrance' }));
  ctx.door(new Door(scene, M.walnutFrame, { x: 4.07, z: 4.5, yaw: Math.PI / 2, w: 1.9, h: 3.0, double: true, open: 0.62, swing: -1, id: 'foyer_living' }));
  ctx.door(new Door(scene, M.walnutFrame, { x: -4.07, z: 4.5, yaw: Math.PI / 2, w: 1.05, h: 2.6, id: 'parlor', open: 0 }));
  // arch keystone + pilasters framing the gallery arch (marble)
  kit.box(M.marble, 0, 3.52, 0.05, 0.28, 0.32, 0.12);
  for (const s of [-1, 1]) { kit.box(M.marble, s * 1.42, 1.7, 0.06, 0.24, 3.4, 0.12); kit.box(M.marble, s * 1.42, 3.46, 0.08, 0.32, 0.12, 0.16); kit.box(M.marble, s * 1.42, 0.15, 0.08, 0.3, 0.3, 0.16); }

  // ---- windows (storm outside)
  for (const x of [-2.65, 2.65]) sashWindow(scene, M.paintedCream, { x, z: 8.07, yaw: Math.PI, w: 0.85, h: 2.45, y0: 0.95, panes: [2, 3] });
  sashWindow(scene, M.paintedCream, { x: 0, z: 8.07, yaw: Math.PI, w: 1.6, h: 0.85, y0: 3.25, panes: [4, 1] });

  // ---- chandelier (crystal, dead) on chain from the medallion
  place('Chandelier_03', { x: 0, y: 4.15, z: 4, dust: 0.25 });
  const chain = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 1.05, 6), M.brass); chain.position.set(0, 4.15 + 0.525, 4); scene.add(chain);

  // ---- west wall: console + mirror + candelabra + family photo + letters; grandfather clock
  place('ClassicConsole_01', { x: -3.68, z: 2.1, yaw: Math.PI / 2, dust: 0.3, collide: true });
  place('ornate_mirror_01', { x: -3.94, y: 1.6, z: 2.1, yaw: Math.PI / 2, s: 1.55 });
  place('brass_candleholders', { x: -3.7, y: 0.95, z: 1.65, yaw: Math.PI / 2, only: /brass_candleholder_03/, center: true, dust: 0.2 });
  place('standing_picture_frame_01', { x: -3.78, y: 0.95, z: 1.95, yaw: Math.PI / 2 + 0.35, dust: 0.1 });
  // a hurricane lantern left burning on the console: someone meant to come back for it
  place('Lantern_01', { x: -3.68, y: 0.952, z: 2.62, yaw: 0.5 });
  ctx.light({ room: 'foyer', type: 'point', pos: [-3.62, 1.12, 2.62], color: 0xffa050, intensity: 2.2, distance: 6, fire: 0.5, prio: 4 });
  papers(scene, -3.62, 0.952, 2.15, { n: 3, spread: 0.12, seed: 7, kinds: ['envelope', 'envelope', 'letter'] });
  place('WoodenChair_01', { x: -3.62, z: 6.9, yaw: Math.PI / 2, dust: 0.35, collide: true });

  // ---- east wall north corner: marble bust on pedestal; plant by the arch (left), wilting
  place('side_table_tall_01', { x: 3.45, z: 1.0, yaw: 0, collide: true, dust: 0.25 });
  place('marble_bust_01', { x: 3.45, y: 0.765, z: 1.0, yaw: -Math.PI / 2 - 0.4, dust: 0.45 });
  place('potted_plant_02', { x: -1.95, z: 0.55, yaw: 0.6, tint: 0x9a8a60, collide: true });

  // ---- by the entrance: visitor's suitcase (recent), and the leak bucket in the NW corner
  place('vintage_suitcase', { x: 3.35, z: 7.45, yaw: -0.3, only: /suitcase_01/, center: true, collide: true, dust: 0 });
  place('wooden_bucket_01', { x: -3.15, z: 0.85, yaw: 0.8, collide: true });
  plasterDebris(scene, -3.25, 1.45, { seed: 3, n: 14, r: 0.45 });
  const water = new THREE.Mesh(new THREE.CircleGeometry(0.14, 20), new THREE.MeshStandardMaterial({ color: 0x15130f, roughness: 0.02, metalness: 0.2 })); water.rotation.x = -Math.PI / 2; water.position.set(-3.15, 0.42, 0.85); scene.add(water);

  // ---- runner rug, dried mud prints of someone who came in before (toward the gallery and back)
  const runner = rug(ctx.assets, 1.35, 4.6, { seed: 11, kick: 0.25, pal: { field: '#3e1a17', border: '#1b2236', guard: '#b39a62', motif: '#c9b48c', accent: '#2c3f33', dark: '#1f0d0b' } });
  runner.position.set(0.08, 0, 4.2); runner.rotation.y = 0.025; scene.add(runner);
  footprints(scene, [[0.35, 7.7], [0.55, 5.6], [0.9, 3.0], [0.6, 0.4], [0.4, -0.6]], { muddy: true, fade: 0.6, seed: 2 });
  footprints(scene, [[-0.6, -0.4], [-0.9, 2.4], [-1.6, 5.2], [-2.6, 6.8]], { muddy: true, fade: 0.3, seed: 5, y: 0.0045 });
  // rain blown under the door: fresh wet patch
  const wet = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 0.7), new THREE.MeshStandardMaterial({ color: 0x0a0908, roughness: 0.03, transparent: true, opacity: 0.45, depthWrite: false })); wet.rotation.x = -Math.PI / 2; wet.position.set(0, 0.003, 7.6); scene.add(wet);

  // ---- portrait above the console? No: a landscape hung from the picture rail on the east wall
  const pic = place('fancy_picture_frame_01', { x: 3.95, y: 2.35, z: 2.6, yaw: -Math.PI / 2, s: 1.7 });
  pictureCord(scene, new THREE.Vector3(3.97, 3.92, 2.6), new THREE.Vector3(3.97, 2.75, 2.15), new THREE.Vector3(3.97, 2.75, 3.05));

  // ---- sconces flanking the arch (left one flickers, right bulb dead)
  const sc = [];
  for (const x of [-2.0, 2.0]) { const s = sconce(); s.group.position.set(x, 2.15, 0.02); scene.add(s.group); sc.push(s); }
  // ---- lights
  ctx.light({ room: 'foyer', type: 'point', pos: [-2.0, 2.35, 0.3], color: 0xffb06a, intensity: 3, distance: 8, flicker: 0.55, mats: sc[0].mats, emissive: 2.5, prio: 2 });
  ctx.light({ room: 'foyer', type: 'point', pos: [4.7, 1.3, 4.5], color: 0xff8a3c, intensity: 9, distance: 7, fire: 1, prio: 3 }); // fire glow spilling from the living room
  ctx.light({ room: 'foyer', type: 'spot', pos: [-2.65, 3.6, 11.5], target: [-1.2, 0, 4.0], color: 0x7d93b8, intensity: 55, distance: 16, angle: 0.42, penumbra: 0.5, flash: 900, prio: 4 });
  ctx.light({ room: 'foyer', type: 'spot', pos: [2.65, 3.6, 11.5], target: [1.4, 0, 4.0], color: 0x7d93b8, intensity: 45, distance: 16, angle: 0.42, penumbra: 0.5, flash: 900, prio: 3, shadow: false });
  ctx.light({ room: 'foyer', type: 'spot', pos: [0, 4.6, 11.8], target: [0, 0, 2.5], color: 0x8aa0c4, intensity: 9, distance: 16, angle: 0.38, penumbra: 0.4, flash: 700, prio: 2 });
  ctx.light({ room: 'foyer', type: 'point', pos: [0, 2.6, -1.6], color: 0xbfa27a, intensity: 0.45, distance: 4, prio: 1 }); // gallery spill

  // ---- volumetric shafts through the tall windows (follow the moon spots; flare with lightning)
  const shafts = [];
  for (const [wx, tx] of [[-2.65, -1.2], [2.65, 1.4]]) {
    const from = new THREE.Vector3(wx, 2.2, 8.0), to = new THREE.Vector3(tx, 0, 4.0); const len = from.distanceTo(to) + 0.6;
    const g = new THREE.CylinderGeometry(0.42, 1.0, len, 4, 1, true); g.rotateY(Math.PI / 4); g.translate(0, -len / 2, 0);
    const m = lightConeMaterial(0x9fb4d8, 0.05); const mesh = new THREE.Mesh(g, m);
    mesh.position.copy(from); mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, -1, 0), to.clone().sub(from).normalize()); mesh.renderOrder = 9; scene.add(mesh); shafts.push(m);
  }
  ctx.update((dt) => { for (const m of shafts) { m.uniforms.uTime.value += dt; m.uniforms.uStrength.value = 0.045 + storm.flash * 0.35; } });
  // ---- fixed cameras
  ctx.cam({ id: 'foyer_entry', room: 'foyer', pos: [3.25, 3.95, 0.75], look: [-0.7, 1.05, 6.7], fov: 52, zone: [-4, 4, 3.9, 8.2], track: 0.12 });
  ctx.cam({ id: 'foyer_north', room: 'foyer', pos: [-3.3, 2.25, 7.55], look: [0.9, 1.45, 0.4], fov: 56, zone: [-4, 4, -0.3, 3.9], track: 0.1 });
  return { id: 'foyer', bounds: r, neighbors: ['living', 'gallery'], spawn: [0.2, 6.9], fill: 1.6 };
}
