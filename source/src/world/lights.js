// Light fixtures + fixed-size dynamic light pool. All fixtures exist logically; only the most
// relevant N get a real THREE light each frame (constant light count => no shader recompiles).
import * as THREE from 'three';
import { lightConeMaterial } from './materials.js';

export class Fixture {
  constructor(o) {
    Object.assign(this, {
      pos: new THREE.Vector3(), color: new THREE.Color(0xdfe8ff), intensity: 40, range: 12, circuit: 'main',
      flicker: 0, broken: false, kind: 'ceiling', on: false, level: 0, mats: [], cone: null, shadow: true, emissive: 6,
    }, o);
    this.phase = Math.random() * 100;
    this.out = 0;
  }
}

export class LightSystem {
  constructor(scene, quality) {
    this.scene = scene; this.fixtures = []; this.circuits = { main: false, emergency: true, gate: false, exit: true, monitors: true, office: false };
    this.points = []; this.spots = []; this.q = quality;
    this.time = 0;
    this.build(quality);
  }

  build(q) {
    for (const l of [...this.points, ...this.spots]) { this.scene.remove(l); if (l.target) this.scene.remove(l.target); l.dispose?.(); }
    this.points = []; this.spots = [];
    for (let i = 0; i < q.points; i++) {
      const l = new THREE.PointLight(0xffffff, 0, 12, 2); l.castShadow = false; this.scene.add(l); this.points.push(l);
    }
    for (let i = 0; i < q.spotShadows; i++) {
      const l = new THREE.SpotLight(0xffffff, 0, 14, 1.25, 0.8, 2);
      l.castShadow = true; l.shadow.mapSize.set(q.shadow >= 2048 ? 1024 : 512, q.shadow >= 2048 ? 1024 : 512);
      l.shadow.bias = -0.0008; l.shadow.normalBias = 0.03; l.shadow.camera.near = 0.3; l.shadow.camera.far = 14;
      this.scene.add(l); this.scene.add(l.target); this.spots.push(l);
    }
    this.q = q;
  }

  add(o) {
    const f = new Fixture(o);
    this.fixtures.push(f);
    if (f.coneSize) {
      const [rTop, rBot, h] = f.coneSize;
      const g = new THREE.CylinderGeometry(rTop, rBot, h, 24, 1, true);
      const m = lightConeMaterial(f.color, f.coneStrength ?? 0.1);
      const mesh = new THREE.Mesh(g, m); mesh.position.copy(f.pos).add(new THREE.Vector3(0, -h / 2 - 0.05, 0));
      mesh.renderOrder = 10; mesh.frustumCulled = true;
      this.scene.add(mesh); f.cone = mesh;
    }
    return f;
  }

  setCircuit(name, on) { this.circuits[name] = on; }

  update(dt, focus) {
    this.time += dt;
    const t = this.time;
    for (const f of this.fixtures) {
      const powered = this.circuits[f.circuit] && !f.broken;
      let lvl = powered ? 1 : 0;
      if (powered && f.flicker > 0) {
        // fluorescent starter flicker: occasional dropouts + buzz modulation
        const n = Math.sin(t * 13.1 + f.phase) * Math.sin(t * 7.3 + f.phase * 2.1) + Math.sin(t * 1.7 + f.phase);
        if (n > 1.2 - f.flicker * 0.8) lvl = 0.05 + Math.random() * 0.2;
        else lvl = 0.85 + 0.15 * Math.sin(t * 50 + f.phase);
      }
      if (f.pulse) lvl *= 0.55 + 0.45 * Math.max(0, Math.sin(t * f.pulse));
      // power-on warm-up: ramp
      f.level += (lvl - f.level) * Math.min(1, dt * (lvl > f.level ? (f.warm || 12) : 25));
      const e = f.level * f.emissive;
      for (const m of f.mats) { m.emissiveIntensity = e; }
      if (f.cone) { f.cone.visible = f.level > 0.02; f.cone.material.uniforms.uStrength.value = (f.coneStrength ?? 0.1) * f.level; f.cone.material.uniforms.uTime.value = t; }
    }
    // score fixtures by distance to focus point
    const cand = [];
    for (const f of this.fixtures) {
      if (f.level < 0.01 || f.intensity <= 0) continue;
      const d = f.pos.distanceTo(focus);
      if (d > f.range + 14) continue;
      cand.push([d - f.intensity * 0.02, f]);
    }
    cand.sort((a, b) => a[0] - b[0]);
    let si = 0, pi = 0;
    for (const [, f] of cand) {
      if (f.shadow && f.kind === 'ceiling' && si < this.spots.length) {
        const l = this.spots[si++];
        l.position.copy(f.pos); l.target.position.set(f.pos.x, f.pos.y - 3, f.pos.z);
        l.color.copy(f.color); l.intensity = f.intensity * f.level * 1.6; l.distance = f.range + 2;
        continue;
      }
      if (pi < this.points.length) {
        const l = this.points[pi++];
        l.position.copy(f.pos); if (f.kind === 'ceiling') l.position.y -= 0.25;
        l.color.copy(f.color); l.intensity = f.intensity * f.level; l.distance = f.range;
      }
    }
    for (; si < this.spots.length; si++) this.spots[si].intensity = 0;
    for (; pi < this.points.length; pi++) this.points[pi].intensity = 0;
  }
}
