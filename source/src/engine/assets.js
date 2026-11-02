// Asset loading and caching: GLB models, animation clips, PBR texture sets, HDR environment, audio buffers.
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js';
import * as SkeletonUtils from 'three/examples/jsm/utils/SkeletonUtils.js';

const BASE = './assets/';

export class Assets {
  constructor(renderer) {
    this.renderer = renderer;
    this.manager = new THREE.LoadingManager();
    this.gltf = new GLTFLoader(this.manager);
    this.tex = new THREE.TextureLoader(this.manager);
    this.models = new Map();
    this.clips = new Map();
    this.textures = new Map();
    this.audio = new Map();
    this.animMeta = {};
    this.total = 0;
    this.done = 0;
    this.onProgress = () => {};
    this.errors = [];
  }

  _track(p) {
    this.total++;
    return p.then((v) => { this.done++; this.onProgress(this.done / this.total); return v; })
      .catch((e) => { this.done++; this.errors.push(String(e?.message || e)); console.error('[assets]', e); this.onProgress(this.done / this.total); return null; });
  }

  loadModel(name, path) {
    return this._track(this.gltf.loadAsync(BASE + path).then((g) => {
      g.scene.traverse((o) => {
        if (o.isMesh) {
          o.castShadow = true; o.receiveShadow = true;
          const mats = Array.isArray(o.material) ? o.material : [o.material];
          for (const m of mats) {
            if (m.map) m.map.anisotropy = 4;
            if (m.normalMap) m.normalMap.anisotropy = 4;
          }
        }
      });
      this.models.set(name, g);
      return g;
    }));
  }

  loadClips(path) {
    return this._track(this.gltf.loadAsync(BASE + path).then((g) => {
      for (const c of g.animations) this.clips.set(c.name, c);
      return g.animations;
    }));
  }

  loadJSON(name, path) {
    return this._track(fetch(BASE + path).then((r) => r.json()).then((j) => { this[name] = j; return j; }));
  }

  // PBR set: diff (sRGB), nor_gl (linear), arm (AO/Rough/Metal linear)
  loadPBR(id, maps = ['diff', 'nor_gl', 'arm']) {
    const set = {};
    const ps = maps.map((m) => this._track(this.tex.loadAsync(`${BASE}textures/${id}/${m}.webp`).then((t) => {
      t.wrapS = t.wrapT = THREE.RepeatWrapping;
      t.anisotropy = this.renderer ? Math.min(8, this.renderer.capabilities.getMaxAnisotropy()) : 4;
      t.colorSpace = m === 'diff' ? THREE.SRGBColorSpace : THREE.NoColorSpace;
      set[m] = t;
    })));
    this.textures.set(id, set);
    return Promise.all(ps).then(() => set);
  }

  loadTexture(name, path, srgb = true) {
    return this._track(this.tex.loadAsync(BASE + path).then((t) => {
      t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
      this.textures.set(name, t);
      return t;
    }));
  }

  loadHDR(name, path) {
    return this._track(new RGBELoader(this.manager).loadAsync(BASE + path).then((t) => {
      t.mapping = THREE.EquirectangularReflectionMapping;
      this.textures.set(name, t);
      return t;
    }));
  }

  loadAudio(ctx, name, path) {
    return this._track(fetch(BASE + 'audio/' + path).then((r) => {
      if (!r.ok) throw new Error('audio ' + path + ' ' + r.status);
      return r.arrayBuffer();
    }).then((b) => ctx.decodeAudioData(b)).then((buf) => { this.audio.set(name, buf); return buf; }));
  }

  // Deep clone of a model scene (skinned meshes get their own skeleton).
  instance(name) {
    const g = this.models.get(name);
    if (!g) throw new Error('model not loaded: ' + name);
    return SkeletonUtils.clone(g.scene);
  }

  clip(name) { return this.clips.get(name); }
}
