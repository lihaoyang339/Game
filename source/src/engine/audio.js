// Web Audio engine: buses, procedural convolution reverb (concrete garage), HRTF spatial sources,
// occlusion low-pass, looping ambiences.
import * as THREE from 'three';

export class AudioEngine {
  constructor(assets) {
    this.assets = assets;
    const AC = window.AudioContext || window.webkitAudioContext;
    this.ctx = new AC();
    const c = this.ctx;
    this.master = c.createGain();
    this.comp = c.createDynamicsCompressor();
    this.comp.threshold.value = -14; this.comp.ratio.value = 4;
    this.master.connect(this.comp).connect(c.destination);
    this.sfx = c.createGain(); this.amb = c.createGain(); this.music = c.createGain(); this.ui = c.createGain();
    this.sfx.connect(this.master); this.amb.connect(this.master); this.music.connect(this.master); this.ui.connect(this.master);
    this.reverb = c.createConvolver();
    this.reverb.buffer = this.makeIR(2.6, 2.2);
    this.reverbSend = c.createGain(); this.reverbSend.gain.value = 0.55;
    this.reverbSend.connect(this.reverb).connect(this.master);
    this.listenerPos = new THREE.Vector3();
    this.loops = new Map();
    this.occluder = null; // fn(from, to) -> bool blocked
    this.setVolumes({ master: 0.9, sfx: 1, amb: 0.8, music: 0.7 });
  }

  setVolumes(v) {
    if (v.master != null) this.master.gain.value = v.master;
    if (v.sfx != null) { this.sfx.gain.value = v.sfx; this.ui.gain.value = v.sfx; }
    if (v.amb != null) this.amb.gain.value = v.amb;
    if (v.music != null) this.music.gain.value = v.music;
  }

  resume() { if (this.ctx.state !== 'running') this.ctx.resume(); }

  makeIR(seconds, decay) {
    const c = this.ctx; const len = Math.floor(c.sampleRate * seconds);
    const buf = c.createBuffer(2, len, c.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const d = buf.getChannelData(ch);
      for (let i = 0; i < len; i++) {
        const t = i / len;
        // early reflections (concrete) + diffuse tail
        const er = (i < c.sampleRate * 0.08 && Math.random() < 0.004) ? (Math.random() * 2 - 1) * 0.8 : 0;
        d[i] = ((Math.random() * 2 - 1) * Math.pow(1 - t, decay) * 0.5 + er) * (i < 200 ? i / 200 : 1);
      }
    }
    return buf;
  }

  updateListener(camera) {
    const L = this.ctx.listener; const p = camera.position; this.listenerPos.copy(p);
    const f = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
    const u = new THREE.Vector3(0, 1, 0).applyQuaternion(camera.quaternion);
    if (L.positionX) {
      const t = this.ctx.currentTime;
      L.positionX.setTargetAtTime(p.x, t, 0.02); L.positionY.setTargetAtTime(p.y, t, 0.02); L.positionZ.setTargetAtTime(p.z, t, 0.02);
      L.forwardX.setTargetAtTime(f.x, t, 0.02); L.forwardY.setTargetAtTime(f.y, t, 0.02); L.forwardZ.setTargetAtTime(f.z, t, 0.02);
      L.upX.setTargetAtTime(u.x, t, 0.02); L.upY.setTargetAtTime(u.y, t, 0.02); L.upZ.setTargetAtTime(u.z, t, 0.02);
    } else { L.setPosition(p.x, p.y, p.z); L.setOrientation(f.x, f.y, f.z, u.x, u.y, u.z); }
  }

  buf(name) {
    if (Array.isArray(name)) name = name[Math.floor(Math.random() * name.length)];
    return this.assets.audio.get(name);
  }

  // Non-positional sound (UI, player-owned).
  play(name, { volume = 1, rate = 1, bus = 'sfx', reverb = 0.25, detune = 0 } = {}) {
    const b = this.buf(name); if (!b) return null;
    const c = this.ctx; const s = c.createBufferSource(); s.buffer = b;
    s.playbackRate.value = rate; s.detune.value = detune;
    const g = c.createGain(); g.gain.value = volume;
    s.connect(g).connect(this[bus] || this.sfx);
    if (reverb > 0) { const rg = c.createGain(); rg.gain.value = reverb; g.connect(rg).connect(this.reverbSend); }
    s.start();
    return { source: s, gain: g };
  }

  // Positional sound at a world position (or following an Object3D).
  playAt(name, pos, { volume = 1, rate = 1, ref = 2.5, rolloff = 1.1, max = 60, reverb = 0.45, follow = null, occlude = true } = {}) {
    const b = this.buf(name); if (!b) return null;
    const c = this.ctx; const s = c.createBufferSource(); s.buffer = b; s.playbackRate.value = rate;
    const p = c.createPanner(); p.panningModel = 'HRTF'; p.distanceModel = 'inverse';
    p.refDistance = ref; p.rolloffFactor = rolloff; p.maxDistance = max;
    const at = follow ? follow.getWorldPosition(new THREE.Vector3()) : pos;
    if (p.positionX) { p.positionX.value = at.x; p.positionY.value = at.y; p.positionZ.value = at.z; } else p.setPosition(at.x, at.y, at.z);
    const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 20000;
    if (occlude && this.occluder && this.occluder(at, this.listenerPos)) { lp.frequency.value = 900; volume *= 0.6; }
    const g = c.createGain(); g.gain.value = volume;
    s.connect(lp).connect(g).connect(p).connect(this.sfx);
    const rg = c.createGain(); rg.gain.value = reverb; g.connect(rg).connect(this.reverbSend);
    s.start();
    const h = { source: s, gain: g, panner: p, follow };
    if (follow) { this._followers = this._followers || new Set(); this._followers.add(h); s.onended = () => this._followers.delete(h); }
    return h;
  }

  update() {
    if (!this._followers) return;
    const v = new THREE.Vector3();
    for (const h of this._followers) {
      h.follow.getWorldPosition(v);
      if (h.panner.positionX) { h.panner.positionX.value = v.x; h.panner.positionY.value = v.y; h.panner.positionZ.value = v.z; }
    }
  }

  // Looping sound, optionally positional. Returns handle with setVolume/stop.
  loop(key, name, { volume = 1, pos = null, bus = 'amb', ref = 3, rolloff = 1, rate = 1, fade = 1.0 } = {}) {
    if (this.loops.has(key)) return this.loops.get(key);
    const b = this.buf(name); if (!b) return null;
    const c = this.ctx; const s = c.createBufferSource(); s.buffer = b; s.loop = true; s.playbackRate.value = rate;
    // skip mp3 encoder padding at loop boundaries
    s.loopStart = 0.03; s.loopEnd = Math.max(0.1, b.duration - 0.03);
    const g = c.createGain(); g.gain.value = 0;
    g.gain.setTargetAtTime(volume, c.currentTime, fade / 3);
    let out = g;
    s.connect(g);
    if (pos) {
      const p = c.createPanner(); p.panningModel = 'HRTF'; p.distanceModel = 'inverse'; p.refDistance = ref; p.rolloffFactor = rolloff;
      if (p.positionX) { p.positionX.value = pos.x; p.positionY.value = pos.y; p.positionZ.value = pos.z; } else p.setPosition(pos.x, pos.y, pos.z);
      g.connect(p); out = p;
      const rg = c.createGain(); rg.gain.value = 0.3; g.connect(rg).connect(this.reverbSend);
    }
    out.connect(this[bus] || this.amb);
    s.start(0, Math.random() * Math.max(0.01, b.duration - 0.1));
    const h = {
      source: s, gain: g,
      setVolume: (v, t = 0.3) => g.gain.setTargetAtTime(v, c.currentTime, t),
      stop: (t = 0.5) => { g.gain.setTargetAtTime(0, c.currentTime, t / 3); setTimeout(() => { try { s.stop(); } catch (e) { /* */ } }, t * 1000 + 100); this.loops.delete(key); },
    };
    this.loops.set(key, h);
    return h;
  }

  stopLoop(key, t) { const h = this.loops.get(key); if (h) h.stop(t); }
  stopAll() { for (const h of [...this.loops.values()]) h.stop(0.3); }
}
