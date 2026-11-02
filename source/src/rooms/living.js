// DRAWING ROOM (大客厅) — reference quality level for the manor interiors.
// Design: a panelled Victorian drawing room. Pilasters divide every wall into bays; walnut raised-
// panel dado; sage tone-on-tone damask fields in bolection frames; frieze with dentils and a deep
// cornice; plaster ceiling with a moulded tray and medallion. The walnut chimneypiece + overmantel is
// the single focal point; the seating is a conversation group (sofa facing the fire, a matched pair
// of armchairs facing each other across the tea table) on one large rug.
// Light: warm interior (dimmed chandelier, the fire, a table lamp, two candle sconces) against the
// cold storm (lace sheers lit from outside, the conservatory door).
// Story (chosen, coherent): someone waited here tonight for a car that never came — tea for two, one
// cup untouched; the window chair turned to face the drive with the lace pushed aside; the mantel clock
// stopped; the family photograph laid face down; and the cracked pane that has been letting the rain in.
import * as THREE from 'three';
import { buildShell, buildCeiling } from '../world/arch.js';
import { Door, rug, bookRow, windowBay, storm } from '../world/fixtures.js';
import { panelledUpperWall, ceilingTray } from '../world/joinery.js';
import { chimneypiece } from '../world/chimney.js';
import { libraryCase } from '../world/furniture.js';
import { footprints, radialTex } from './details.js';

export const MODELS = ['sofa_03', 'ArmChair_01', 'GreenChair_01', 'gothic_coffee_table', 'tea_set_01', 'ClassicNightstand_01', 'vintage_oil_lamp',
  'fancy_picture_frame_01', 'fancy_picture_frame_02', 'mantel_clock_01', 'standing_picture_frame_01', 'Chandelier_01', 'wicker_basket_01', 'side_table_tall_01'];
export const LIVING = { x0: 4.3, x1: 13.3, z0: -1, z1: 9, h: 4.2 };

export function build(ctx) {
  const { kit, M, place, scene, assets } = ctx; const r = LIVING;
  const J = { frame: M.walnutRich };
  const OPEN = {
    w: [{ at: 4.5, w: 1.9, h: 3.0, kind: 'door', pediment: false }],
    s: [{ at: 6.9, w: 1.3, h: 2.55, y0: 0.75, kind: 'window' }, { at: 10.7, w: 1.3, h: 2.55, y0: 0.75, kind: 'window' }],
    n: [{ at: 6.2, w: 1.05, h: 2.6, kind: 'door' }, { at: 11.2, w: 1.2, h: 2.7, kind: 'door' }],
    e: [],
  };
  buildShell(kit, r, {
    floor: { mat: M.oakFloor, tile: 2.4 }, upper: M.walnutGround, upperTile: 1.4,
    trim: { base: M.walnutRich, wainscot: M.walnutGround, frame: M.walnutRich, panel: M.walnutGround, chair: M.walnutRich, wainscotH: 1.0, panelW: 0.62, crown: M.walnutRich, casing: M.walnutRich, jamb: M.walnutRich },
    walls: { w: { openings: OPEN.w }, s: { openings: OPEN.s }, n: { openings: OPEN.n }, e: { openings: OPEN.e } },
  });
  // upper-wall joinery: bays of framed damask between pilasters (bookcase and chimney breast excluded)
  const sys = { M: J, paper: M.damaskSage, paperTile: 0.36, dadoH: 1.0, friezeY: 3.62, H: r.h, bay: 2.1 };
  panelledUpperWall(kit, r, 'w', { ...sys, openings: OPEN.w });
  panelledUpperWall(kit, r, 's', { ...sys, openings: OPEN.s.map((o) => ({ ...o, w: o.w + 1.0 })) }); // leave room for drapes
  panelledUpperWall(kit, r, 'n', { ...sys, openings: [...OPEN.n, { at: 8.85, w: 3.3 }] });
  panelledUpperWall(kit, r, 'e', { ...sys, openings: [{ at: 4.0, w: 2.75 }] });
  buildCeiling(kit, r, { mat: M.ceilingPlaster, medallion: { x: 8.85, z: 4.0, scale: 1.7, mat: M.paintedCream } });
  ceilingTray(kit, r, M.paintedCream, 0.8);

  // ---- the focal point: walnut chimneypiece + overmantel with the portrait
  const cp = chimneypiece(scene, kit, { panel: M.walnutGround, frame: M.walnutRich, brick: M.brick, soot: M.soot, iron: M.castIron, stone: M.hearthStone, brass: M.brass, wax: M.wax, candleFlame: M.candleFlame },
    { x: r.x1, z: 4.0, yaw: -Math.PI / 2, H: r.h, portrait: (p) => place('fancy_picture_frame_02', { x: p.x, y: p.y - 0.7, z: p.z, yaw: -Math.PI / 2, s: 1.75, dust: 0.1 }) });
  ctx.physics.box(r.x1 - 0.45, 4.0, 0.95, 2.75, 0, 0, 3, 'wall');
  // mantel: the stopped clock, the photograph laid face down, a pair of candlesticks long since burnt out
  const mx = r.x1 - 0.42 - 0.17, my = 1.56;
  place('mantel_clock_01', { x: mx, y: my, z: 4.0, yaw: -Math.PI / 2, dust: 0.15 });
  place('standing_picture_frame_01', { x: mx + 0.02, y: my + 0.01, z: 4.62, yaw: -Math.PI / 2, rx: -Math.PI / 2 + 0.02 });
  // log basket at the hearth (fireplace furniture, half used)
  place('wicker_basket_01', { x: r.x1 - 0.75, z: 5.95, yaw: 0.3, s: 1.3 });
  for (let i = 0; i < 5; i++) { const lg = new THREE.Mesh(new THREE.CylinderGeometry(0.045 + (i % 3) * 0.01, 0.05, 0.42, 9), M.darkWood); lg.rotation.set(0, 0.3 + (i % 2) * 0.15, Math.PI / 2); lg.position.set(r.x1 - 0.75 + ((i % 3) - 1) * 0.1, 0.1 + Math.floor(i / 3) * 0.09, 5.95 + ((i % 2) - 0.5) * 0.05); lg.castShadow = lg.receiveShadow = true; scene.add(lg); }

  // ---- conversation group on one large rug: sofa faces the fire; matched armchairs face each other
  const rg = rug(assets, 3.9, 5.0, { seed: 31, style: 'aubusson' });
  rg.position.set(9.25, 0, 4.0); rg.rotation.y = Math.PI / 2; scene.add(rg);
  place('sofa_03', { x: 7.7, z: 4.0, yaw: Math.PI / 2, collide: true });
  place('gothic_coffee_table', { x: 9.35, z: 4.0, yaw: 0, s: 0.74, collide: true });
  place('ArmChair_01', { x: 10.45, z: 2.45, yaw: -0.32, collide: true, tint: 0xd8c8ae });
  place('ArmChair_01', { x: 10.45, z: 5.55, yaw: Math.PI + 0.32, collide: true, tint: 0xd8c8ae });
  // tea for two, abandoned: one cup drunk and pushed aside, the other never touched
  const teaY = 0.56 * 0.74;
  place('tea_set_01', { x: 9.2, y: teaY, z: 3.78, only: /teapot_01$|teapot_01_lid/, center: true, yaw: 0.6 });
  place('tea_set_01', { x: 9.72, y: teaY, z: 3.38, only: /cup_small_01|saucer_circular_04/, center: true, yaw: 2.1 });
  place('tea_set_01', { x: 9.7, y: teaY, z: 4.62, only: /cup_small_02|saucer_circular_03/, center: true, yaw: -0.4 });
  const tea = new THREE.Mesh(new THREE.CircleGeometry(0.034, 18), new THREE.MeshStandardMaterial({ color: 0x3a1c0a, roughness: 0.1 })); tea.rotation.x = -Math.PI / 2; tea.position.set(9.7, teaY + 0.055, 4.62); scene.add(tea);
  // the reading lamp at the sofa's end, still lit
  place('ClassicNightstand_01', { x: 7.75, z: 2.05, yaw: Math.PI / 2, collide: true });
  place('vintage_oil_lamp', { x: 7.75, y: 0.7, z: 2.02 });
  // ---- built-in walnut library on the north wall between the doors
  const lib = libraryCase({ ...M, walnutFrame: M.walnutRich, walnutPanel: M.walnutGround }, { len: 3.2, h: 3.0, d: 0.42, bays: 3, seed: 9 });
  lib.position.set(8.85 - 1.6, 0, r.z0); scene.add(lib); ctx.physics.box(8.85, r.z0 + 0.22, 3.2, 0.44, 0, 0, 3, 'prop');
  // ---- window bays (south); the east one is the cracked pane — damp stain, swollen boards
  windowBay(scene, kit, M, assets, { x: 6.9, faceZ: r.z1, dir: 1, w: 1.3, h: 2.55, y0: 0.75, velvetColor: 0x4a1a1c });
  const wb = windowBay(scene, kit, M, assets, { x: 10.7, faceZ: r.z1, dir: 1, w: 1.3, h: 2.55, y0: 0.75, velvetColor: 0x4a1a1c, cracked: true, laceOpen: 1 });
  const damp = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.45), new THREE.MeshStandardMaterial({ color: 0x150f0a, roughness: 0.45, transparent: true, opacity: 0.22, alphaMap: radialTex(), depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 }));
  damp.rotation.x = -Math.PI / 2; damp.position.set(10.55, 0.004, r.z1 - 0.3); scene.add(damp);
  // the window chair, turned to face the drive (someone was watching for headlights)
  place('GreenChair_01', { x: 10.15, z: 7.75, yaw: 0.35, collide: true });
  // ---- a single landscape in the bay beside the entrance doors
  place('fancy_picture_frame_01', { x: r.x0 + 0.03, y: 1.95, z: 7.0, yaw: Math.PI / 2, s: 1.35, dust: 0.1 });
  // ---- doors on the north wall: glazed door to the conservatory (ajar), music room (shut)
  ctx.door(new Door(scene, M.walnutRich, { x: 11.2, z: r.z0 - 0.07, yaw: 0, w: 1.2, h: 2.7, glass: true, open: 0.18, id: 'living_glass' }));
  ctx.door(new Door(scene, M.walnutRich, { x: 6.2, z: r.z0 - 0.07, yaw: 0, w: 1.05, h: 2.6, id: 'music', open: 0 }));
  footprints(scene, [[11.2, -0.8], [10.6, 1.0], [9.0, 2.0], [6.4, 3.6], [4.4, 4.5]], { muddy: false, seed: 9, fade: 0.9 });
  // ---- chandelier, dimmed (the shades glow; only some lamps still work)
  const ch = place('Chandelier_01', { x: 8.85, y: r.h - 0.2, z: 4.0, dust: 0.15 });
  const glowMats = [];
  ch.traverse((o) => { if (o.isMesh) { o.material = o.material.clone(); o.material.emissive = new THREE.Color(1.0, 0.72, 0.45); o.material.emissiveMap = o.material.map; o.material.emissiveIntensity = 0.5; glowMats.push(o.material); } });
  const chain = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.2, 6), M.brass); chain.position.set(8.85, r.h - 0.1, 4); scene.add(chain);
  // lace catches lightning
  ctx.update(() => { M.lace.emissiveIntensity = 0.06 + storm.flash * 1.2; });

  // ---- lighting: warm interior vs cold storm
  ctx.light({ room: 'living', type: 'spot', pos: cp.firePos.clone().add(new THREE.Vector3(-0.3, 0.05, 0)), target: [7.4, 0.3, 4.0], color: 0xffa060, intensity: 11, distance: 11, angle: 1.2, penumbra: 1.0, fire: 1, prio: 7 });
  ctx.light({ room: 'living', type: 'spot', pos: [8.85, 3.35, 4.0], target: [9.1, 0, 4.0], color: 0xffd2a8, intensity: 7, distance: 8, angle: 1.05, penumbra: 1.0, mats: glowMats, emissive: 0.32, prio: 6 });
  ctx.light({ room: 'living', type: 'point', pos: [8.85, 3.2, 4.0], color: 0xffd6b0, intensity: 4.2, distance: 11, prio: 6 }); // chandelier omni: lifts walls/ceiling
  ctx.light({ room: 'living', type: 'point', pos: [7.75, 1.18, 2.02], color: 0xffb070, intensity: 1.5, distance: 5, fire: 0.25, prio: 6 });
  for (const p of cp.sconceLights) ctx.light({ room: 'living', type: 'point', pos: p, color: 0xffa04a, intensity: 0.55, distance: 3.2, fire: 0.5, prio: 5 });
  ctx.light({ room: 'living', type: 'point', pos: [r.x1 - 1.1, 0.5, 4.0], color: 0xff8a45, intensity: 1.6, distance: 5, fire: 1, prio: 5 });
  ctx.light({ room: 'living', type: 'spot', pos: [6.9, 3.6, 13.0], target: [7.6, 0.0, 6.2], color: 0x7d92b8, intensity: 16, distance: 16, angle: 0.36, penumbra: 0.6, flash: 900, prio: 5 });
  ctx.light({ room: 'living', type: 'spot', pos: [10.7, 3.6, 13.0], target: [10.2, 0.0, 6.2], color: 0x7d92b8, intensity: 13, distance: 16, angle: 0.36, penumbra: 0.6, flash: 900, prio: 4 });
  ctx.light({ room: 'living', type: 'point', pos: [11.2, 1.9, -2.2], color: 0x6f82a6, intensity: 1.0, distance: 5, flash: 120, prio: 3 });
  // ---- cameras: longer lenses, high corner positions, fireplace as the anchor
  ctx.cam({ id: 'living_west', room: 'living', pos: [4.75, 3.55, -0.6], look: [10.9, 0.65, 4.9], fov: 44, zone: [4.0, 9.0, -1, 9.0], track: 0.08 });
  ctx.cam({ id: 'living_fire', room: 'living', pos: [12.85, 3.2, 8.55], look: [7.2, 0.85, 2.0], fov: 46, zone: [9.0, 13.3, 2.4, 9.0], track: 0.08 });
  ctx.cam({ id: 'living_glass', room: 'living', pos: [4.8, 3.0, 8.55], look: [11.0, 1.0, 0.2], fov: 46, zone: [9.0, 13.3, -1.0, 2.4], track: 0.08 });
  return { id: 'living', bounds: r, neighbors: ['foyer'], spawn: [6.0, 4.5], fill: 0.9 };
}
