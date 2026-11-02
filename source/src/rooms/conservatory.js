// CONSERVATORY (温室) + GLASS CORRIDOR (玻璃廊) — the late-Victorian extension: green-painted cast
// iron and glass on a brick plinth, pitched glass roof, terracotta-and-stone floor, soil beds.
// Design language: vertical rhythm of iron mullions, everything seen through wet, fogged glass;
// the only "outside" light in the house. Story read: tended until recently (seed trays sown, a lit
// hurricane lantern on the potting bench), but the storm broke a roof pane — rain is coming in.
import * as THREE from 'three';
import { rainGlassMaterial, stormBackdrop, Door } from '../world/fixtures.js';
import { staging } from '../world/furniture.js';
import { plasterDebris, rng } from './details.js';

export const MODELS = ['pachira_aquatica_01', 'shrub_02', 'nettle_plant', 'periwinkle_plant', 'potted_plant_01', 'potted_plant_02', 'potted_plant_04', 'planter_box_01', 'planter_pot_clay',
  'watering_can_metal_01', 'trowel_01', 'rusted_spade_01', 'seeding_tray_01', 'metal_stool_01', 'wicker_basket_01', 'wooden_lantern_01', 'wooden_bucket_01'];
export const CONS = { x0: 6.5, x1: 16.5, z0: -12.5, z1: -4.5, eave: 3.2, ridge: 5.4 };
export const GLASSC = { x0: 10.5, x1: 11.9, z0: -4.5, z1: -1.14, h: 2.8 };

export function build(ctx) {
  const { kit, M, place, scene } = ctx; const r = CONS; const R = rng(5);
  const iron = M.ironGreen; const step = 1.25;
  const glassMats = [rainGlassMaterial(), rainGlassMaterial()];
  const pane = (w, h, mat) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat); m.renderOrder = 4; return m; };
  // ---------- floor: stone flag cross-paths, soil beds edged with brick on east & west
  kit.box(M.conservFloor, (r.x0 + r.x1) / 2, -0.05, (r.z0 + r.z1) / 2, r.x1 - r.x0, 0.1, r.z1 - r.z0, { tile: 1.3 });
  for (const [x0, x1] of [[r.x0 + 0.3, r.x0 + 2.4], [r.x1 - 2.4, r.x1 - 0.3]]) {
    kit.box(M.soil, (x0 + x1) / 2, 0.16, (r.z0 + r.z1) / 2 - 0.4, x1 - x0, 0.32, r.z1 - r.z0 - 1.4, { tile: 1.5 });
    for (const x of [x0, x1]) kit.box(M.brickPlinth, x, 0.18, (r.z0 + r.z1) / 2 - 0.4, 0.12, 0.36, r.z1 - r.z0 - 1.4, { tile: 0.8 });
    kit.box(M.brickPlinth, (x0 + x1) / 2, 0.18, r.z1 - 1.1, x1 - x0, 0.36, 0.12, { tile: 0.8 });
    ctx.physics.box((x0 + x1) / 2, (r.z0 + r.z1) / 2 - 0.4, x1 - x0, r.z1 - r.z0 - 1.4, 0, 0, 0.4, 'prop');
  }
  // ---------- brick plinth + cast-iron frame + glazing (walls n, e, w; s has the corridor opening)
  const plinthH = 0.65;
  const wallRun = (ax, az, bx, bz, nx, nz, gap = null) => {
    const len = Math.hypot(bx - ax, bz - az); const dx = (bx - ax) / len, dz = (bz - az) / len; const yaw = Math.atan2(dx, dz) - Math.PI / 2;
    const n = Math.round(len / step);
    for (let i = 0; i < n; i++) {
      const t0 = i / n, t1 = (i + 1) / n; const cx = ax + (bx - ax) * (t0 + t1) / 2, cz = az + (bz - az) * (t0 + t1) / 2; const w = len / n;
      const isGap = gap && Math.abs((cx - gap.x) * (dx ? 1 : 0) + (cz - gap.z) * (dz ? 1 : 0)) < gap.w / 2;
      if (!isGap) {
        kit.box(M.brickPlinth, cx, plinthH / 2, cz, dx ? w : 0.3, plinthH, dz ? w : 0.3, { tile: 0.9 });
        kit.box(M.stone, cx, plinthH + 0.03, cz, dx ? w : 0.36, 0.06, dz ? w : 0.36, { tile: 0.8 });
        ctx.physics.box(cx, cz, dx ? w : 0.3, dz ? w : 0.3, 0, 0, r.eave, 'wall');
        // glazing in two tiers with a transom bar
        for (const [y0, y1, mi] of [[plinthH + 0.06, 2.35, 0], [2.35, r.eave, 1]]) {
          const pn = pane(w - 0.06, y1 - y0 - 0.04, glassMats[mi]); pn.position.set(cx, (y0 + y1) / 2, cz); pn.rotation.y = yaw; scene.add(pn);
        }
      }
      // mullion post at segment start
      const px = ax + (bx - ax) * t0, pz = az + (bz - az) * t0;
      kit.box(iron, px, r.eave / 2, pz, 0.07, r.eave, 0.07, { tile: 0.6 });
    }
    kit.box(iron, bx, r.eave / 2, bz, 0.07, r.eave, 0.07, { tile: 0.6 });
    for (const y of [plinthH + 0.08, 2.35, r.eave - 0.04]) kit.box(iron, (ax + bx) / 2, y, (az + bz) / 2, dx ? len : 0.06, 0.06, dz ? len : 0.06, { tile: 0.6 });
  };
  wallRun(r.x0, r.z0, r.x1, r.z0, 0, 1);
  wallRun(r.x0, r.z0, r.x0, r.z1, 1, 0);
  wallRun(r.x1, r.z0, r.x1, r.z1, -1, 0);
  wallRun(r.x0, r.z1, r.x1, r.z1, 0, -1, { x: 11.2, z: r.z1, w: 1.3 });
  // ---------- pitched glass roof: ridge along x, rafters every 1.25 m; one broken pane
  const span = (r.z1 - r.z0) / 2, rise = r.ridge - r.eave, zc = (r.z0 + r.z1) / 2; const pitch = Math.atan2(rise, span); const slope = Math.hypot(rise, span);
  const nR = Math.round((r.x1 - r.x0) / step);
  const roofGlass = rainGlassMaterial();
  for (let i = 0; i <= nR; i++) {
    const x = r.x0 + i * (r.x1 - r.x0) / nR;
    for (const s of [-1, 1]) { const g = new THREE.BoxGeometry(0.06, 0.09, slope); g.rotateX(s * pitch); kit.add(g, iron, new THREE.Matrix4().makeTranslation(x, r.eave + rise / 2, zc + s * span / 2)); }
    if (i < nR) for (const s of [-1, 1]) {
      const broken = i === 6 && s < 0;
      if (broken) continue;
      const pn = pane((r.x1 - r.x0) / nR - 0.06, slope - 0.06, roofGlass); pn.position.set(x + (r.x1 - r.x0) / nR / 2, r.eave + rise / 2, zc + s * span / 2);
      pn.rotation.x = s > 0 ? -(Math.PI / 2 - pitch) : (Math.PI / 2 - pitch); scene.add(pn); // both slopes lie in their roof planes (glass is double-sided)
    }
  }
  kit.box(iron, (r.x0 + r.x1) / 2, r.ridge + 0.04, zc, r.x1 - r.x0 + 0.1, 0.12, 0.1, { tile: 0.6 });
  for (let i = 0; i <= 8; i++) { const f = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.18, 6), iron); f.position.set(r.x0 + i * (r.x1 - r.x0) / 8, r.ridge + 0.18, zc); scene.add(f); } // ridge cresting
  // tie rods with decorative rings across the span
  for (let i = 1; i < nR; i += 2) { const x = r.x0 + i * (r.x1 - r.x0) / nR; kit.box(iron, x, r.eave - 0.05, zc, 0.025, 0.025, r.z1 - r.z0, { tile: 0.6 }); const ring = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.015, 6, 24), iron); ring.position.set(x, r.eave + 0.2, zc); ring.castShadow = true; scene.add(ring); }
  // ---------- storm outside: backdrops facing in on three sides + sky
  // backdrops stay outside the house footprint: north (open grounds), east, and a short west one between study and glass corridor
  for (const [x, z, yaw, w, h] of [[(r.x0 + r.x1) / 2, r.z0 - 6, 0, 28, 12], [r.x0 - 1.6, zc, Math.PI / 2, 9.5, 9], [r.x1 + 6, zc, -Math.PI / 2, 22, 12]]) { const b = stormBackdrop(w, h); b.position.set(x, 3.2, z); b.rotation.y = yaw; scene.add(b); }
  // ---------- broken pane: shards, puddle, rain falling in, leaves
  const bx = r.x0 + 6.5 * (r.x1 - r.x0) / nR, bz = zc - span / 2;
  const puddle = new THREE.Mesh(new THREE.CircleGeometry(0.9, 32), new THREE.MeshStandardMaterial({ color: 0x0b0d0c, roughness: 0.02, metalness: 0.1, transparent: true, opacity: 0.85 }));
  puddle.rotation.x = -Math.PI / 2; puddle.scale.set(1.3, 0.8, 1); puddle.position.set(bx, 0.004, bz); scene.add(puddle);
  const shardM = new THREE.MeshPhysicalMaterial({ color: 0xc8d4d0, roughness: 0.05, transparent: true, opacity: 0.45 });
  for (let i = 0; i < 16; i++) { const sh = new THREE.Mesh(new THREE.ShapeGeometry(new THREE.Shape([new THREE.Vector2(0, 0), new THREE.Vector2(0.05 + R() * 0.12, 0.01), new THREE.Vector2(R() * 0.08, 0.06 + R() * 0.1)])), shardM); sh.rotation.x = -Math.PI / 2; sh.rotation.z = R() * 6; sh.position.set(bx + (R() - 0.5) * 1.6, 0.006 + i * 0.0003, bz + (R() - 0.5) * 1.2); scene.add(sh); }
  const rainN = 260; const rp = new Float32Array(rainN * 6); const rs = new Float32Array(rainN);
  for (let i = 0; i < rainN; i++) { const x = bx + (R() - 0.5) * 1.1, y = R() * 5.2, z = bz + (R() - 0.5) * 1.2; rp.set([x, y, z, x + 0.01, y - 0.18, z], i * 6); rs[i] = 6 + R() * 2; }
  const rg = new THREE.BufferGeometry(); rg.setAttribute('position', new THREE.BufferAttribute(rp, 3));
  const rain = new THREE.LineSegments(rg, new THREE.LineBasicMaterial({ color: 0x8fa0b0, transparent: true, opacity: 0.35, depthWrite: false })); rain.frustumCulled = false; scene.add(rain);
  ctx.update((dt) => { const a = rg.attributes.position.array; for (let i = 0; i < rainN; i++) { let y = a[i * 6 + 1] - dt * rs[i]; if (y < 0.05) y += 5.1; a[i * 6 + 1] = y; a[i * 6 + 4] = y - 0.18; } rg.attributes.position.needsUpdate = true; });
  plasterDebris(scene, bx + 0.6, bz + 0.5, { seed: 8, n: 10, r: 0.5, mat: new THREE.MeshStandardMaterial({ color: 0x5a4a30, roughness: 1 }) }); // blown-in leaf litter
  // ---------- central stone basin (dry fountain) — focal point
  const basinPts = [[0, 0], [0.9, 0], [0.95, 0.05], [0.95, 0.45], [0.88, 0.5], [0.82, 0.48], [0.8, 0.12], [0, 0.12]].map(([x, y]) => new THREE.Vector2(x, y));
  const basin = new THREE.Mesh(new THREE.LatheGeometry(basinPts, 48), M.stone); basin.position.set(11.5, 0, -8.4); basin.castShadow = basin.receiveShadow = true; scene.add(basin);
  const pedestal = new THREE.Mesh(new THREE.LatheGeometry([[0, 0], [0.16, 0], [0.12, 0.2], [0.1, 0.7], [0.28, 0.85], [0.3, 0.9], [0, 0.92]].map(([x, y]) => new THREE.Vector2(x, y)), 32), M.stone); pedestal.position.set(11.5, 0.12, -8.4); pedestal.castShadow = true; scene.add(pedestal);
  const fw = new THREE.Mesh(new THREE.CircleGeometry(0.78, 40), new THREE.MeshStandardMaterial({ color: 0x14170f, roughness: 0.05 })); fw.rotation.x = -Math.PI / 2; fw.position.set(11.5, 0.2, -8.4); scene.add(fw);
  ctx.physics.box(11.5, -8.4, 1.9, 1.9, 0, 0, 0.5, 'prop');
  // ---------- planting: palms in the beds, shrubs, weeds pushing through the flags, wilted pots
  place('pachira_aquatica_01', { x: 7.6, z: -10.8, only: /_d$/, center: true, collide: true });
  place('pachira_aquatica_01', { x: 15.4, z: -6.6, only: /_a$/, center: true, collide: true });
  place('shrub_02', { x: 7.7, z: -7.0, only: /_b$/, center: true });
  place('shrub_02', { x: 15.3, z: -10.4, only: /_c$/, center: true, tint: 0x8a8a60 });
  place('periwinkle_plant', { x: 7.4, z: -9.1, yaw: 1.1 });
  for (const [x, z, n, t] of [[7.9, -5.9, /_a$/, 0x9a9a70], [15.1, -7.8, /_d$/, 0xffffff], [7.5, -11.9, /_c$/, 0x8a8060]]) place('shrub_02', { x, z, only: n, center: true, s: 0.8, tint: t });
  for (const [x, z] of [[7.6, -6.6], [15.5, -9.6], [15.3, -11.6], [7.3, -7.9]]) place('periwinkle_plant', { x, z, yaw: R() * 6, s: 0.9 + R() * 0.4 });
  for (const [x, z] of [[15.6, -5.2], [7.2, -10.2]]) place('potted_plant_02', { x, z, yaw: R() * 6, tint: 0x9a8a60 });
  place('periwinkle_plant', { x: 15.6, z: -8.4, yaw: -0.5 });
  for (const [x, z] of [[10.4, -6.1], [12.9, -10.9], [9.4, -11.6], [13.6, -5.4]]) place('nettle_plant', { x, z, only: /tall_a|medium_a/, center: true, yaw: R() * 6 });
  // potting staging along the north glazing: sown trays, clay pots, tools, the lit lantern
  const st = staging(M, { len: 3.2, d: 0.7 }); st.position.set(11.5, 0, r.z0 + 0.55); scene.add(st);
  ctx.physics.box(11.5, r.z0 + 0.55, 3.2, 0.75, 0, 0, 1.2, 'prop');
  for (let i = 0; i < 4; i++) place('seeding_tray_01', { x: 10.3 + i * 0.26, y: 0.815, z: r.z0 + 0.6, yaw: R() * 0.2 });
  for (let i = 0; i < 5; i++) place('planter_pot_clay', { x: 12.0 + i * 0.3, y: 1.115, z: r.z0 + 0.34, s: 0.7 + R() * 0.25, yaw: R() * 6 });
  place('potted_plant_04', { x: 12.8, y: 0.815, z: r.z0 + 0.62, tint: 0x7a6a40 });
  place('trowel_01', { x: 11.6, y: 0.82, z: r.z0 + 0.75, yaw: 0.6 });
  place('wooden_lantern_01', { x: 9.9, y: 0.815, z: r.z0 + 0.62, yaw: 0.3 });
  place('watering_can_metal_01', { x: 9.0, z: r.z0 + 0.9, yaw: 2.2 });
  place('metal_stool_01', { x: 10.6, z: r.z0 + 1.35, yaw: 0.4, collide: true });
  place('rusted_spade_01', { x: 6.75, z: -5.3, rz: 0.15, yaw: 0.5 });
  place('potted_plant_02', { x: 9.4, z: -5.4, tint: 0x8a7a50, collide: true });
  place('potted_plant_01', { x: 13.3, z: -5.35, collide: true });
  place('planter_box_01', { x: 14.6, z: r.z0 + 0.5, yaw: 0, collide: true });
  place('wicker_basket_01', { x: 14.6, y: 0.42, z: r.z0 + 0.5, yaw: 0.3 });
  place('wooden_bucket_01', { x: bx + 0.35, z: bz + 0.6, rx: Math.PI / 2 - 0.1, yaw: 1.0 }); // kicked over by the wind
  // ---------- glass corridor from the living room
  const g = GLASSC;
  kit.box(M.conservFloor, (g.x0 + g.x1) / 2, -0.05, (g.z0 + g.z1) / 2, g.x1 - g.x0, 0.1, g.z1 - g.z0, { tile: 1.3 });
  for (const x of [g.x0, g.x1]) {
    kit.box(M.brickPlinth, x, 0.3, (g.z0 + g.z1) / 2, 0.2, 0.6, g.z1 - g.z0, { tile: 0.9 });
    ctx.physics.box(x, (g.z0 + g.z1) / 2, 0.2, g.z1 - g.z0, 0, 0, 3, 'wall');
    const n = 3; for (let i = 0; i <= n; i++) kit.box(iron, x, g.h / 2, g.z0 + i * (g.z1 - g.z0) / n, 0.07, g.h, 0.07);
    for (let i = 0; i < n; i++) { const pn = pane((g.z1 - g.z0) / n - 0.06, g.h - 0.7, rainGlassMaterial()); pn.position.set(x, 0.62 + (g.h - 0.62) / 2, g.z0 + (i + 0.5) * (g.z1 - g.z0) / n); pn.rotation.y = x < 11 ? Math.PI / 2 : -Math.PI / 2; scene.add(pn); }
    kit.box(iron, x, g.h, (g.z0 + g.z1) / 2, 0.08, 0.08, g.z1 - g.z0);
  }
  for (let i = 0; i <= 3; i++) kit.box(iron, (g.x0 + g.x1) / 2, g.h + 0.02, g.z0 + i * (g.z1 - g.z0) / 3, g.x1 - g.x0, 0.06, 0.06);
  const gr = pane(g.x1 - g.x0, g.z1 - g.z0, rainGlassMaterial()); gr.rotation.x = Math.PI / 2; gr.position.set((g.x0 + g.x1) / 2, g.h + 0.03, (g.z0 + g.z1) / 2); scene.add(gr);
  for (const [x, yaw] of [[g.x0 - 2.5, Math.PI / 2], [g.x1 + 2.5, -Math.PI / 2]]) { const b = stormBackdrop(3.3, 6); b.position.set(x, 2.4, -2.85); b.rotation.y = yaw; scene.add(b); } // kept within z<-1.15 so it never shows inside the living room
  // ---------- lights: storm through the roof (cold, shadow of iron), lantern (warm), lightning
  ctx.light({ room: 'conservatory', type: 'spot', pos: [12.5, 11, -7.0], target: [11.0, 0, -8.8], color: 0x6f86aa, intensity: 75, distance: 18, angle: 0.66, penumbra: 0.7, flash: 800, prio: 6 });
  ctx.light({ room: 'conservatory', type: 'point', pos: [9.9, 1.15, r.z0 + 0.7], color: 0xffa050, intensity: 2.6, distance: 6, fire: 0.6, prio: 5 });
  ctx.light({ room: 'conservatory', type: 'point', pos: [11.2, 3.0, -9.0], color: 0x5f7090, intensity: 1.2, distance: 9, flash: 400, prio: 4 });
  ctx.light({ room: 'glass', type: 'spot', pos: [11.2, 8, -2.8], target: [11.2, 0, -2.8], color: 0x6f86aa, intensity: 5, distance: 10, angle: 0.5, penumbra: 0.6, flash: 1000, prio: 5 });
  ctx.light({ room: 'glass', type: 'point', pos: [11.2, 1.3, 0.3], color: 0xff8a3c, intensity: 2.5, distance: 5, fire: 1, prio: 4 }); // living-room fire glow behind
  ctx.cam({ id: 'conserv_sw', room: 'conservatory', pos: [6.95, 2.85, -4.95], look: [14.6, 0.55, -11.2], fov: 56, zone: [6.5, 16.5, -8.4, -4.5], track: 0.12 });
  ctx.cam({ id: 'conserv_ne', room: 'conservatory', pos: [16.05, 1.85, -12.05], look: [8.0, 1.4, -5.0], fov: 56, zone: [6.5, 16.5, -12.5, -8.4], track: 0.12 });
  ctx.cam({ id: 'glass_corridor', room: 'glass', pos: [11.2, 2.45, -1.45], look: [11.4, 0.9, -8.6], fov: 52, zone: [10.5, 11.9, -4.5, -1.0], track: 0.1, prio: 2 });
  return [{ id: 'conservatory', bounds: r, neighbors: ['glass'], spawn: [11.2, -6], fill: 3.0 }, { id: 'glass', bounds: g, neighbors: ['conservatory', 'living'], spawn: [11.2, -2.6], fill: 0.8 }];
}
