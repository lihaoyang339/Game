// LONG GALLERY (长廊) — the spine connecting the formal rooms. No windows: lit only by sconces,
// two working, one flickering, one dead, leaving a dark middle stretch where you can see the far end
// but not what stands in it. Transverse beams give a rhythm that makes distance hard to judge.
import * as THREE from 'three';
import { buildShell, buildCeiling } from '../world/arch.js';
import { Door, rug, sconce } from '../world/fixtures.js';
import { ghostFrame, pictureCord, footprints } from './details.js';

export const MODELS = ['WoodenChair_01', 'lantern_chandelier_01', 'fancy_picture_frame_01', 'fancy_picture_frame_02', 'lion_head', 'ClassicNightstand_01', 'potted_plant_01'];
export const GALLERY = { x0: -16.0, x1: 3.7, z0: -3.3, z1: -0.3, h: 3.6 };

export function build(ctx) {
  const { kit, M, place, scene, assets } = ctx; const r = GALLERY;
  buildShell(kit, r, {
    floor: { mat: M.parquetDiag, tile: 1.8 }, upper: M.galleryPlaster, upperTile: 1.6,
    trim: { base: M.walnutFrame, wainscot: M.walnutPanel, frame: M.walnutFrame, panel: M.walnutPanel, chair: M.walnutFrame, wainscotH: 0.9, panelW: 0.75, crown: M.paintedCream, casing: M.walnutFrame, jamb: M.walnutFrame, picture: M.walnutFrame, pictureY: 3.05 },
    walls: {
      s: { openings: [{ at: 0, w: 2.4, h: 3.4, kind: 'arch', pediment: false }] },
      n: { openings: [{ at: -2.0, w: 1.05, h: 2.6, kind: 'door' }, { at: -11.35, w: 1.8, h: 2.9, kind: 'door' }] },
      w: { openings: [{ at: -2.3, w: 0.9, h: 2.3, kind: 'door', pediment: false }] },
      e: { openings: [] },
    },
  });
  buildCeiling(kit, r, { mat: M.ceilingPlaster, beamMat: M.paintedCream, type: 'beams', coffer: 2.2, beamD: 0.24, beamW: 0.2 });
  // runners (two lengths, the joint slightly misaligned)
  for (const [x, len, seed] of [[-2.6, 8.4, 51], [-11.2, 8.6, 52]]) { const rg = rug(assets, 1.1, len, { seed, pal: { field: '#3a1b18', border: '#202838', guard: '#ae935e', motif: '#c4ae86', accent: '#2a3c31', dark: '#1d0c0a' } }); rg.position.set(x, 0, -1.8); rg.rotation.y = Math.PI / 2 + (seed === 52 ? 0.012 : 0); scene.add(rg); }
  // doors: study (ajar, light inside), dining (double, closed), service jib door (flush, papered — only a keyhole gives it away)
  ctx.door(new Door(scene, M.walnutFrame, { x: -2.0, z: r.z0 - 0.07, yaw: 0, w: 1.05, h: 2.6, open: 0.12, id: 'study' }));
  ctx.door(new Door(scene, M.walnutFrame, { x: -11.35, z: r.z0 - 0.07, yaw: 0, w: 1.8, h: 2.9, double: true, open: 0.0, id: 'dining' }));
  ctx.door(new Door(scene, M.galleryPlaster, { x: r.x0 - 0.07, z: -2.3, yaw: Math.PI / 2, w: 0.9, h: 2.3, id: 'service_jib' }));
  // a pair of Gothic hall chairs flanking the dining doors
  for (const s of [-1, 1]) place('WoodenChair_01', { x: -11.35 + s * 1.55, z: r.z0 + 0.4, yaw: 0, collide: true, dust: 0.3 });
  // paintings on the south wall; one removed (clean ghost rectangle + nail), one hanging crooked
  const S = r.z1 - 0.02;
  place('fancy_picture_frame_02', { x: -5.2, y: 1.55, z: S, yaw: Math.PI, s: 1.3, dust: 0.2 });
  pictureCord(scene, new THREE.Vector3(-5.2, 3.06, S - 0.01), new THREE.Vector3(-5.6, 2.55, S - 0.01), new THREE.Vector3(-4.8, 2.55, S - 0.01));
  ghostFrame(scene, new THREE.Vector3(-8.6, 2.0, r.z1), new THREE.Vector3(0, 0, -1), 0.95, 0.75);
  const crooked = place('fancy_picture_frame_01', { x: -13.4, y: 1.75, z: S, yaw: Math.PI, rz: 0.06, s: 1.5, dust: 0.25 });
  // east end vista: lion head on a stand under a painting
  place('ClassicNightstand_01', { x: r.x1 - 0.3, z: -1.8, yaw: -Math.PI / 2, collide: true, dust: 0.3 });
  place('lion_head', { x: r.x1 - 0.32, y: 0.7, z: -1.8, yaw: -Math.PI / 2, dust: 0.3 });
  place('fancy_picture_frame_01', { x: r.x1 - 0.03, y: 1.75, z: -1.8, yaw: -Math.PI / 2, s: 1.6 });
  place('potted_plant_01', { x: -14.9, z: -0.85, tint: 0x6f6448, collide: true });
  // lantern pendants (dead)
  for (const x of [-6.6, -15.0 + 4.4]) { place('lantern_chandelier_01', { x, y: r.h - 0.05, z: -1.8, dust: 0.3 }); }
  // sconces on the north wall piers: [working, flicker, dead, working]
  const sc = [];
  for (const x of [1.6, -5.4, -8.6, -14.2]) { const s = sconce(); s.group.position.set(x, 1.95, r.z0 + 0.0); scene.add(s.group); sc.push(s); }
  ctx.light({ room: 'gallery', type: 'point', pos: [1.6, 2.15, r.z0 + 0.3], color: 0xffaa66, intensity: 2.0, distance: 6.5, mats: sc[0].mats, emissive: 2.4, prio: 3 });
  ctx.light({ room: 'gallery', type: 'point', pos: [-5.4, 2.15, r.z0 + 0.3], color: 0xffaa66, intensity: 2.6, distance: 6, flicker: 0.9, mats: sc[1].mats, emissive: 2.4, prio: 3 });
  ctx.light({ room: 'gallery', type: 'point', pos: [-14.2, 2.15, r.z0 + 0.3], color: 0xffaa66, intensity: 2.0, distance: 6.5, mats: sc[3].mats, emissive: 2.4, prio: 3 });
  ctx.light({ room: 'gallery', type: 'point', pos: [0, 1.6, 0.6], color: 0x8aa0c4, intensity: 0.8, distance: 6, flash: 140, prio: 2 }); // foyer through the arch
  ctx.light({ room: 'gallery', type: 'spot', pos: [-2.0, 1.4, -4.4], target: [-2.4, 0, -1.0], color: 0xffb070, intensity: 3.5, distance: 6, angle: 0.5, penumbra: 0.8, prio: 4 }); // study lamp spilling through the ajar door
  footprints(scene, [[-0.4, -0.4], [-1.8, -2.0], [-2.0, -3.2]], { muddy: true, seed: 12, fade: 0.5 });
  ctx.cam({ id: 'gallery_east', room: 'gallery', pos: [3.2, 2.45, -1.05], look: [-14.0, 0.95, -2.0], fov: 48, zone: [-6.5, 3.7, -3.3, -0.3], track: 0.18 });
  ctx.cam({ id: 'gallery_west', room: 'gallery', pos: [-15.5, 2.45, -0.75], look: [1.5, 1.0, -2.2], fov: 48, zone: [-16, -6.5, -3.3, -0.3], track: 0.18 });
  return { id: 'gallery', bounds: r, neighbors: ['foyer', 'study'], spawn: [-1, -1.8] };
}
