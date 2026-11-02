// Procedural storm soundscape (Web Audio): rain bed whose brightness/level follow how exposed the
// current room is (glass > windows > interior), thunder triggered by each lightning strike after a
// distance delay, spatial fire crackle at the living-room hearth, a slow house-settling creak.
import * as THREE from 'three';
import { storm } from '../world/fixtures.js';

function noiseBuffer(ctx, sec, brown = false) {
  const b = ctx.createBuffer(2, ctx.sampleRate * sec, ctx.sampleRate);
  for (let c = 0; c < 2; c++) { const d = b.getChannelData(c); let last = 0; for (let i = 0; i < d.length; i++) { const w = Math.random() * 2 - 1; if (brown) { last = (last + 0.02 * w) / 1.02; d[i] = last * 3.5; } else d[i] = w; } }
  return b;
}

export class StormAudio {
  constructor() { this.started = false; }
  start() {
    if (this.started) return; this.started = true;
    const AC = window.AudioContext || window.webkitAudioContext; const c = this.ctx = new AC();
    this.master = c.createGain(); this.master.gain.value = 0.8; this.master.connect(c.destination);
    // rain: two layers (body + patter), filtered by exposure
    const mk = (buf, type, f, q) => { const s = c.createBufferSource(); s.buffer = buf; s.loop = true; const fl = c.createBiquadFilter(); fl.type = type; fl.frequency.value = f; fl.Q.value = q; const g = c.createGain(); g.gain.value = 0; s.connect(fl).connect(g).connect(this.master); s.start(); return { fl, g }; };
    this.rainBody = mk(noiseBuffer(c, 4, true), 'lowpass', 900, 0.5);
    this.rainPatter = mk(noiseBuffer(c, 3), 'bandpass', 3500, 0.6);
    this.wind = mk(noiseBuffer(c, 6, true), 'bandpass', 300, 2.5);
    // reverb for thunder
    this.verb = c.createConvolver(); const ir = c.createBuffer(2, c.sampleRate * 3, c.sampleRate);
    for (let ch = 0; ch < 2; ch++) { const d = ir.getChannelData(ch); for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 3); }
    this.verb.buffer = ir; this.verb.connect(this.master);
    // fire crackle (spatial)
    this.fire = c.createGain(); this.fire.gain.value = 0;
    this.firePan = c.createPanner(); this.firePan.panningModel = 'HRTF'; this.firePan.refDistance = 1.5; this.firePan.rolloffFactor = 1.4;
    this.firePan.positionX.value = 12.9; this.firePan.positionY.value = 0.4; this.firePan.positionZ.value = 4;
    this.fire.connect(this.firePan).connect(this.master);
    const fs = c.createBufferSource(); fs.buffer = noiseBuffer(c, 2, true); fs.loop = true; const ff = c.createBiquadFilter(); ff.type = 'lowpass'; ff.frequency.value = 400; fs.connect(ff).connect(this.fire); fs.start();
    storm.onStrike = () => this.thunder();
    this.creakT = 20;
  }
  thunder() {
    const c = this.ctx; if (!c) return;
    const delay = 0.6 + Math.random() * 2.4; const t0 = c.currentTime + delay;
    const s = c.createBufferSource(); s.buffer = noiseBuffer(c, 5, true);
    const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.setValueAtTime(900, t0); lp.frequency.exponentialRampToValueAtTime(90, t0 + 4);
    const g = c.createGain(); g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(1.6 * this.exposure, t0 + 0.08); g.gain.exponentialRampToValueAtTime(0.001, t0 + 4.8);
    s.connect(lp).connect(g); g.connect(this.master); g.connect(this.verb); s.start(t0); s.stop(t0 + 5);
  }
  crackle() {
    const c = this.ctx; const s = c.createBufferSource(); s.buffer = noiseBuffer(c, 0.03); const hp = c.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 1500;
    const g = c.createGain(); g.gain.value = 0.25 + Math.random() * 0.4; s.connect(hp).connect(g).connect(this.fire); s.start();
  }
  creak() {
    const c = this.ctx; const o = c.createOscillator(); o.type = 'sawtooth'; const t0 = c.currentTime; o.frequency.setValueAtTime(90 + Math.random() * 60, t0); o.frequency.linearRampToValueAtTime(70 + Math.random() * 40, t0 + 1.2);
    const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 700; bp.Q.value = 8; const g = c.createGain(); g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(0.05, t0 + 0.2); g.gain.linearRampToValueAtTime(0, t0 + 1.3);
    o.connect(bp).connect(g).connect(this.verb); o.start(t0); o.stop(t0 + 1.4);
  }
  // exposure: 0 = deep interior, 1 = under glass
  update(dt, camera, exposure) {
    if (!this.ctx) return; const c = this.ctx; const t = c.currentTime; this.exposure = exposure;
    this.rainBody.g.gain.setTargetAtTime(0.18 + 0.5 * exposure, t, 0.8); this.rainBody.fl.frequency.setTargetAtTime(500 + 1600 * exposure, t, 0.8);
    this.rainPatter.g.gain.setTargetAtTime(0.02 + 0.22 * exposure, t, 0.8);
    this.wind.g.gain.setTargetAtTime(0.06 + 0.08 * Math.sin(t * 0.13) ** 2, t, 1.5);
    const L = c.listener; const p = camera.position; const f = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
    if (L.positionX) { L.positionX.value = p.x; L.positionY.value = p.y; L.positionZ.value = p.z; L.forwardX.value = f.x; L.forwardY.value = f.y; L.forwardZ.value = f.z; }
    this.fire.gain.setTargetAtTime(0.5, t, 0.5);
    if (Math.random() < dt * 9) this.crackle();
    this.creakT -= dt; if (this.creakT < 0) { this.creak(); this.creakT = 25 + Math.random() * 40; }
  }
}
