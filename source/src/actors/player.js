// The protagonist: an ordinary person (rain-soaked field jacket, jeans, work boots). Camera-relative
// movement that keeps its frame across fixed-camera cuts while the stick/keys stay held (RE remake style).
import * as THREE from 'three';
import { Character } from './character.js';

export const CIVILIAN = {
  zombie: 0, bulk: 1.9, shirt: [0.045, 0.042, 0.036], shirtRough: 0.42, vest: [0, 0, 0], vestRough: 0.8, vestOn: 0,
  pants: [0.075, 0.09, 0.14], pantsRough: 0.82, boots: [0.09, 0.06, 0.04], bootsRough: 0.55,
  gloves: [0, 0, 0], glovesOn: 0, belt: [0.09, 0.06, 0.04], sleeve: 1.0, tear: 0, blood: 0, dirt: 0.35,
  skinTint: [1, 1, 1], decay: 0,
};

export class Player {
  constructor(assets, physics, fabricNormal, skinTex) {
    this.physics = physics;
    this.ch = new Character(assets, { body: 'male', hair: 'Hair_SimpleParted', outfit: CIVILIAN, fabricNormal, hairColor: [0.14, 0.1, 0.07], skinTex });
    this.root = this.ch.root; this.root.scale.setScalar(0.97);
    this.pos = new THREE.Vector3(); this.yaw = 0; this.speed = 0;
    this.ch.add('idle', 'Idle_Loop'); this.ch.add('walk', 'Walk_Loop', { rate: 1.05 }); this.ch.add('run', 'Jog_Fwd_Loop', { rate: 0.72 });
    this.ch.setWeight('idle', 1); this.ch.snapWeights();
    this.frame = null; // camera basis held across cuts
  }
  place(x, z, yaw = 0) { this.pos.set(x, this.physics.floorY(x, z), z); this.yaw = yaw; this.sync(); }
  sync() { this.root.position.copy(this.pos); this.root.rotation.y = this.yaw; }
  update(dt, input, camera, cutHappened) {
    const mx = input.moveX, my = input.moveY; const mag = Math.min(1, Math.hypot(mx, my));
    if (mag < 0.1) this.frame = null;
    if (!this.frame || (cutHappened && !this.frame)) {
      const f = new THREE.Vector3(); camera.getWorldDirection(f); f.y = 0; f.normalize();
      this.frame = { f, r: new THREE.Vector3(-f.z, 0, f.x) };
    }
    const target = input.run ? 3.4 : 1.35;
    let want = 0;
    if (mag > 0.1) {
      const dir = this.frame.f.clone().multiplyScalar(my).addScaledVector(this.frame.r, mx).normalize();
      const ty = Math.atan2(dir.x, dir.z);
      let d = ty - this.yaw; d = Math.atan2(Math.sin(d), Math.cos(d));
      this.yaw += d * Math.min(1, dt * 10);
      want = target * mag * Math.max(0.2, Math.cos(d));
    }
    this.speed += (want - this.speed) * Math.min(1, dt * 8);
    const step = new THREE.Vector3(Math.sin(this.yaw), 0, Math.cos(this.yaw)).multiplyScalar(this.speed * dt);
    const prev = this.pos.clone();
    this.pos.add(step); this.physics.resolveCircle(this.pos, 0.3, this.pos.y);
    this.pos.y = this.physics.floorY(this.pos.x, this.pos.z);
    if (this.physics.noFloor) { this.pos.copy(prev); this.speed *= 0.5; } // multi-level maps: never walk onto missing floor
    const s = this.speed;
    this.ch.setWeight('idle', s < 0.2 ? 1 : 0); this.ch.setWeight('walk', s >= 0.2 && s < 2.2 ? 1 : 0); this.ch.setWeight('run', s >= 2.2 ? 1 : 0);
    this.ch.actions.get('walk').timeScale = Math.max(0.6, s / 0.975) * 0.98;
    this.ch.actions.get('run').timeScale = Math.max(0.5, s / 5.36);
    this.ch.updateWeights(dt, 8); this.ch.mixer.update(dt);
    this.sync();
  }
}
