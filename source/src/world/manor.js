// Manor world: loads assets, builds rooms, owns room-scoped lighting, fixed cameras, props, doors.
import * as THREE from 'three';
import { ArchKit } from './arch.js';
import { buildManorMaterials, dusty } from './manormats.js';
import { Physics } from '../engine/physics.js';
import { storm, updateStorm, updateWindows, updateFire } from './fixtures.js';

export const TEXTURES = ['herringbone_parquet', 'diagonal_parquet', 'rectangular_parquet', 'old_wood_floor', 'dark_paneled_wood', 'black_walnut_veneer_01',
  'oak_veneer_01', 'lacquered_cherry_wood', 'dark_wood', 'marble_01', 'velour_velvet', 'quatrefoil_jacquard_fabric', 'fabric_pattern_05', 'rough_linen',
  'leather_red_02', 'decrepit_wallpaper', 'white_plaster_rough_01', 'painted_plaster_wall', 'worn_plaster_wall', 'kitchen_wood', 'wood_cabinet_worn_long',
  'wood_table_worn', 'terracotta_floor_tiles', 'red_brick', 'poly_wool_herringbone', 'green_metal_rust', 'brown_mud_leaves_01', 'patio_tiles', 'castle_brick_01',
  'stone_tiles', 'long_white_tiles'];

// ---------------------------------------------------------------- lights
export class RoomLights {
  constructor(scene, q) {
    this.scene = scene; this.defs = []; this.points = []; this.spots = []; this.t = 0; this.gain = 8.5; this.flashGain = 1;
    for (let i = 0; i < q.points; i++) { const l = new THREE.PointLight(0xffffff, 0, 10, 2); scene.add(l); this.points.push(l); }
    for (let i = 0; i < q.spots; i++) {
      const l = new THREE.SpotLight(0xffffff, 0, 12, 1, 0.6, 2); l.castShadow = true;
      l.shadow.mapSize.set(q.shadow, q.shadow); l.shadow.bias = -0.0005; l.shadow.normalBias = 0.025; l.shadow.radius = 3;
      l.shadow.camera.near = 0.1; scene.add(l); scene.add(l.target); this.spots.push(l);
    }
    this.hemiBase = 0.5; this.hemi = new THREE.HemisphereLight(0x4a5470, 0x1a1410, 0.5); scene.add(this.hemi);
  }
  add(d) {
    const def = { type: 'point', color: 0xffffff, intensity: 10, distance: 8, angle: 0.9, penumbra: 0.6, prio: 1, flicker: 0, fire: 0, flash: 0, on: true, mats: [], emissive: 3, phase: Math.random() * 100, ...d };
    def.color = new THREE.Color(def.color); def.pos = def.pos.clone ? def.pos : new THREE.Vector3(...def.pos);
    if (def.target && !def.target.isVector3) def.target = new THREE.Vector3(...def.target);
    this.defs.push(def); return def;
  }
  level(d) {
    if (!d.on) return 0;
    let k = 1; const t = this.t + d.phase;
    if (d.fire) k *= 0.78 + 0.12 * Math.sin(t * 9.1) * Math.sin(t * 5.3) + 0.1 * Math.sin(t * 23.0 + Math.sin(t * 3.0));
    if (d.flicker) { const n = Math.sin(t * 11.3) * Math.sin(t * 6.7 + 1.3) + Math.sin(t * 1.9); if (n > 1.75 - d.flicker) k *= 0.15 + Math.random() * 0.2; else k *= 0.94 + 0.06 * Math.sin(t * 60); }
    return k;
  }
  update(dt, rooms, focus, current = null) {
    this.t += dt;
    const flash = storm.flash;
    for (const d of this.defs) { const k = this.level(d); d.cur = k; for (const m of d.mats) m.emissiveIntensity = d.emissive * k; }
    const cand = this.defs.filter((d) => rooms.has(d.room) && (d.cur > 0.01 || (d.flash && flash > 0.02)));
    const ep = (d) => d.prio + (d.room === current ? 10 : 0); // the room you are in always wins its light slots
    cand.sort((a, b) => (ep(b) - ep(a)) || (a.pos.distanceTo(focus) - b.pos.distanceTo(focus)));
    let si = 0, pi = 0;
    for (const d of cand) {
      const I = (d.intensity * d.cur + (d.flash ? d.flash * flash * this.flashGain : 0)) * this.gain;
      if (d.type === 'spot' && si < this.spots.length) {
        const l = this.spots[si++]; l.position.copy(d.pos); l.target.position.copy(d.target); l.color.copy(d.color);
        l.intensity = I; l.distance = d.distance; l.angle = d.angle; l.penumbra = d.penumbra; l.castShadow = d.shadow !== false;
        l.shadow.camera.far = d.distance; continue;
      }
      if (pi < this.points.length) { const l = this.points[pi++]; l.position.copy(d.pos); l.color.copy(d.color); l.intensity = I; l.distance = d.distance; }
    }
    for (; si < this.spots.length; si++) this.spots[si].intensity = 0;
    for (; pi < this.points.length; pi++) this.points[pi].intensity = 0;
    this.hemi.intensity = this.hemiBase + flash * 0.6;
  }
}

// ---------------------------------------------------------------- cameras
export class CameraDirector {
  constructor(camera) { this.camera = camera; this.cams = []; this.current = null; this.lock = null; this.cutCount = 0; }
  add(c) { const cam = { fov: 50, track: 0.15, prio: 1, ...c }; cam.pos = new THREE.Vector3(...cam.pos); cam.look = new THREE.Vector3(...cam.look); this.cams.push(cam); return cam; }
  inZone(c, p) { const z = c.zone; return p.x >= z[0] && p.x <= z[1] && p.z >= z[2] && p.z <= z[3]; }
  pick(p) {
    if (this.lock) return this.cams.find((c) => c.id === this.lock);
    if (this.current && this.inZone(this.current, p)) {
      // hysteresis: keep current unless a higher-priority zone claims the player
      const better = this.cams.find((c) => c !== this.current && c.prio > this.current.prio && this.inZone(c, p));
      if (!better) return this.current;
    }
    let best = null; for (const c of this.cams) if (this.inZone(c, p) && (!best || c.prio > best.prio)) best = c;
    return best || this.current || this.cams[0];
  }
  update(dt, target) {
    const c = this.pick(target);
    if (c !== this.current) { this.current = c; this.cutCount++; this.snap = true; }
    const cam = this.camera;
    cam.position.copy(c.pos);
    const look = c.look.clone().lerp(target.clone().setY(target.y + 1.2), c.track);
    if (this.snap) { this.look = look; this.snap = false; } else this.look.lerp(look, 1 - Math.exp(-dt * 4));
    cam.lookAt(this.look);
    if (cam.fov !== c.fov) { cam.fov = c.fov; cam.updateProjectionMatrix(); }
    return c;
  }
}

// ---------------------------------------------------------------- world
export class Manor {
  constructor(R, assets) {
    this.R = R; this.scene = R.scene; this.assets = assets; this.physics = new Physics();
    this.rooms = new Map(); this.doors = []; this.updaters = []; this.props = []; this.interactables = [];
  }

  async load(models) {
    const a = this.assets; const jobs = [];
    for (const id of TEXTURES) jobs.push(a.loadPBR(id, ['fabric_pattern_05', 'leather_red_02'].includes(id) ? ['nor_gl', 'arm'] : undefined));
    for (const m of models) jobs.push(a.loadModel(m, `models/${m}.glb`));
    jobs.push(a.loadHDR('env', 'hdri/old_hall_1k.hdr'));
    await Promise.all(jobs);
  }

  build(roomModules) {
    const pm = new THREE.PMREMGenerator(this.R.renderer);
    this.env = pm.fromEquirectangular(this.assets.textures.get('env')).texture;
    this.scene.environment = this.env; this.scene.environmentIntensity = 0.05; // imported props: faint night reflections
    this.scene.background = new THREE.Color(0x020203);
    this.scene.fog = new THREE.FogExp2(0x0b0a09, 0.028);
    this.M = buildManorMaterials(this.assets, this.env);
    const q = this.R.q;
    this.lights = new RoomLights(this.scene, { points: q.points, spots: q.spotShadows + 2, shadow: q.shadow });
    this.cams = new CameraDirector(this.R.camera);
    this.root = new THREE.Group(); this.scene.add(this.root);
    for (const mod of roomModules) {
      const kit = new ArchKit(this.physics);
      const ctx = this.ctx(kit);
      const infos = [].concat(mod.build(ctx));
      kit.flush(this.root);
      for (const info of infos) {
        this.rooms.set(info.id, info);
        // low cool fill (night sky bounce) so shadowed areas keep their shapes; lowest priority in the pool
        const b = info.bounds; const h = b.h ?? b.eave ?? 3;
        this.lights.add({ room: info.id, type: 'point', pos: [(b.x0 + b.x1) / 2, h * 0.75, (b.z0 + b.z1) / 2], color: 0x6c7896, intensity: info.fill ?? 0.9, distance: Math.max(b.x1 - b.x0, b.z1 - b.z0) * 1.1, prio: 0 });
      }
    }
    this.scene.updateMatrixWorld(true);
  }

  ctx(kit) {
    return {
      kit, M: this.M, scene: this.root, assets: this.assets, physics: this.physics,
      place: (n, o) => this.place(n, o), light: (d) => this.lights.add(d), cam: (c) => this.cams.add(c),
      door: (d) => { this.doors.push(d); if (d.p) { d.collider = this.physics.box(d.p.x, d.p.z, d.p.w, 0.12, d.p.yaw, 0, d.p.h, 'door'); d.collider.enabled = d.open < 0.3; d.collider.blocksSight = false; } return d; },
      interact: (o) => { this.interactables.push(o); return o; }, update: (f) => this.updaters.push(f),
    };
  }

  // Place a model. o: {x,y,z,yaw,s, only:RegExp, exclude:RegExp, center, dust, collide, tint, shadow, parent, rx, rz}
  place(name, o = {}) {
    const obj = this.assets.instance(name);
    if (o.only || o.exclude) for (const c of [...obj.children]) if ((o.only && !o.only.test(c.name)) || (o.exclude && o.exclude.test(c.name))) c.removeFromParent();
    if (o.center) {
      const b = new THREE.Box3().setFromObject(obj); const c = b.getCenter(new THREE.Vector3());
      for (const ch of obj.children) { ch.position.x -= c.x; ch.position.z -= c.z; ch.position.y -= b.min.y; }
    }
    const holder = new THREE.Group(); holder.add(obj);
    holder.position.set(o.x ?? 0, o.y ?? 0, o.z ?? 0); holder.rotation.set(o.rx ?? 0, o.yaw ?? 0, o.rz ?? 0);
    const s = o.s ?? 1; holder.scale.setScalar(s);
    obj.traverse((m) => {
      if (!m.isMesh) return;
      m.castShadow = o.shadow !== false; m.receiveShadow = true;
      if (o.dust) m.material = dusty(m.material, o.dust);
      if (o.tint) { m.material = m.material.clone(); m.material.color.multiply(new THREE.Color(o.tint)); }
      if (o.rough != null) { m.material = m.material.clone(); m.material.roughness = o.rough; }
    });
    (o.parent || this.root).add(holder);
    if (o.collide) {
      holder.updateMatrixWorld(true);
      const lb = new THREE.Box3(); const inv = new THREE.Matrix4().makeRotationY(-(o.yaw ?? 0));
      obj.traverse((m) => { if (m.isMesh) { m.geometry.computeBoundingBox(); const bb = m.geometry.boundingBox.clone().applyMatrix4(m.matrixWorld); bb.applyMatrix4(new THREE.Matrix4().makeTranslation(-holder.position.x, 0, -holder.position.z)).applyMatrix4(inv); lb.union(bb); } });
      const pad = o.collide.pad ?? 0;
      const c = lb.getCenter(new THREE.Vector3()); const sz = lb.getSize(new THREE.Vector3());
      const wc = new THREE.Vector3(c.x, 0, c.z).applyAxisAngle(new THREE.Vector3(0, 1, 0), o.yaw ?? 0);
      this.physics.box(holder.position.x + wc.x, holder.position.z + wc.z, sz.x + pad, sz.z + pad, o.yaw ?? 0, lb.min.y, lb.max.y, 'prop');
    }
    this.props.push(holder);
    return holder;
  }

  activeRooms(roomId) { const r = this.rooms.get(roomId); return new Set([roomId, ...(r?.neighbors || [])]); }

  update(dt, focus, roomId) {
    updateStorm(dt); updateWindows(dt); updateFire(dt);
    for (const d of this.doors) d.update?.(dt);
    for (const f of this.updaters) f(dt);
    this.lights.update(dt, this.activeRooms(roomId), focus, roomId);
  }
}
