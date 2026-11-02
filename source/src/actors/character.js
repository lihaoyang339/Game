// Character assembly: CC0 Quaternius base body + hair on the Universal Animation Library rig,
// a procedural outfit/skin shader (clothing regions painted in bind-pose space, cloth inflation,
// fabric micro-normals, zombie decay, dynamic bullet wounds) and a layered animation controller.
import * as THREE from 'three';
import { conditionBody } from './clothsim.js';

export const UPPER_BONES = new Set(['spine_01', 'spine_02', 'spine_03', 'neck_01', 'Head',
  'clavicle_l', 'upperarm_l', 'lowerarm_l', 'hand_l', 'clavicle_r', 'upperarm_r', 'lowerarm_r', 'hand_r']);
const isUpper = (bone) => UPPER_BONES.has(bone) || /^(index|middle|pinky|ring|thumb)_/.test(bone);

// Filter a clip to upper or lower body tracks.
const clipCache = new Map();
export function maskedClip(clip, part) {
  const key = clip.uuid + part;
  if (clipCache.has(key)) return clipCache.get(key);
  const tracks = clip.tracks.filter((t) => {
    const bone = t.name.split('.')[0];
    if (bone === 'root') return part === 'lower';
    return part === 'upper' ? isUpper(bone) : !isUpper(bone);
  });
  const c = new THREE.AnimationClip(clip.name + '_' + part, clip.duration, tracks);
  clipCache.set(key, c);
  return c;
}
// Remove root translation so in-place movement is driven by game code.
export function inPlace(clip) {
  const key = clip.uuid + 'ip';
  if (clipCache.has(key)) return clipCache.get(key);
  const c = clip.clone();
  c.tracks = c.tracks.filter((t) => t.name !== 'root.position');
  clipCache.set(key, c);
  return c;
}

// ----------------------------------------------------------------------------------------------
// Outfit shader. Regions are evaluated on the bind-pose (T-pose) vertex position, so clothing
// follows skinning perfectly. Outfit params are uniforms so each character can differ.
// ----------------------------------------------------------------------------------------------
export const OUTFITS = {
  leon: {
    zombie: 0,
    shirt: [0.085, 0.10, 0.15], shirtRough: 0.82,          // navy uniform shirt
    vest: [0.06, 0.065, 0.07], vestRough: 0.6, vestOn: 1,  // black tactical vest
    pants: [0.07, 0.085, 0.12], pantsRough: 0.85,          // dark navy cargo pants
    boots: [0.035, 0.03, 0.028], bootsRough: 0.45,
    gloves: [0.03, 0.03, 0.03], glovesOn: 1,
    belt: [0.05, 0.04, 0.035], sleeve: 1.0, tear: 0.0, blood: 0.03, dirt: 0.15,
    skinTint: [1, 1, 1], decay: 0,
  },
};
export function zombieOutfit(rng = Math.random) {
  const pick = (a) => a[Math.floor(rng() * a.length)];
  const shirts = [[0.45, 0.55, 0.6], [0.55, 0.52, 0.45], [0.18, 0.25, 0.2], [0.42, 0.12, 0.1], [0.62, 0.62, 0.6], [0.2, 0.22, 0.3]];
  const pants = [[0.12, 0.14, 0.2], [0.25, 0.22, 0.18], [0.1, 0.1, 0.1], [0.4, 0.5, 0.55], [0.3, 0.32, 0.3]];
  return {
    zombie: 1,
    shirt: pick(shirts), shirtRough: 0.9,
    vest: [0, 0, 0], vestRough: 0.8, vestOn: 0,
    pants: pick(pants), pantsRough: 0.9,
    boots: pick([[0.05, 0.04, 0.035], [0.09, 0.09, 0.1], [0.08, 0.06, 0.045]]), bootsRough: 0.6,
    gloves: [0, 0, 0], glovesOn: 0,
    belt: [0.08, 0.06, 0.05], sleeve: rng() < 0.5 ? 0.55 : 1.0, tear: 0.35 + rng() * 0.3, blood: 0.45 + rng() * 0.4, dirt: 0.6,
    skinTint: [0.78, 0.82, 0.74], decay: 0.65 + rng() * 0.3,
  };
}

const MAX_WOUNDS = 10;
function outfitUniforms(o) {
  const v3 = (a) => new THREE.Vector3(...a);
  return {
    uShirt: { value: v3(o.shirt) }, uShirtRough: { value: o.shirtRough },
    uVest: { value: v3(o.vest) }, uVestRough: { value: o.vestRough }, uVestOn: { value: o.vestOn },
    uPants: { value: v3(o.pants) }, uPantsRough: { value: o.pantsRough },
    uBoots: { value: v3(o.boots) }, uBootsRough: { value: o.bootsRough },
    uGloves: { value: v3(o.gloves) }, uGlovesOn: { value: o.glovesOn },
    uBelt: { value: v3(o.belt) }, uSleeve: { value: o.sleeve }, uTear: { value: o.tear },
    uBlood: { value: o.blood }, uDirt: { value: o.dirt }, uSkinTint: { value: v3(o.skinTint) },
    uDecay: { value: o.decay }, uZombie: { value: o.zombie }, uBulk: { value: o.bulk ?? 1 },
    uWounds: { value: Array.from({ length: MAX_WOUNDS }, () => new THREE.Vector4(0, -10, 0, 0)) },
    uFabricN: { value: null }, uFabricScale: { value: 9.0 },
    uFlash: { value: 0 },
  };
}

const COMMON_GLSL = /* glsl */`
float hash13(vec3 p){ p = fract(p*0.1031); p += dot(p, p.zyx+31.32); return fract((p.x+p.y)*p.z); }
float vnoise(vec3 p){ vec3 i=floor(p); vec3 f=fract(p); f=f*f*(3.0-2.0*f);
  return mix(mix(mix(hash13(i),hash13(i+vec3(1,0,0)),f.x),mix(hash13(i+vec3(0,1,0)),hash13(i+vec3(1,1,0)),f.x),f.y),
             mix(mix(hash13(i+vec3(0,0,1)),hash13(i+vec3(1,0,1)),f.x),mix(hash13(i+vec3(0,1,1)),hash13(i+vec3(1,1,1)),f.x),f.y),f.z); }
float fbm(vec3 p){ float a=0.5, s=0.0; for(int i=0;i<4;i++){ s+=a*vnoise(p); p*=2.03; a*=0.5; } return s; }
// region weights from bind-pose position b (meters, y up, character facing +z, T-pose arms along x)
// returns: x=shirt(torso+sleeves) y=pants z=boots w=gloves ; second: x=vest y=belt z=collar/cuff seam
void regions(vec3 b, float sleeveLen, out vec4 r1, out vec4 r2){
  float ax = abs(b.x);
  float wob = (vnoise(b*14.0)-0.5)*0.012;
  float armZone = smoothstep(0.17, 0.21, ax) * smoothstep(1.18, 1.24, b.y);   // 1 on arms
  float handZone = smoothstep(0.682, 0.692, ax + wob*0.3);           // hands
  float sleeveEnd = mix(0.36, 0.695, sleeveLen);
  float sleeve = armZone * (1.0 - smoothstep(sleeveEnd-0.005, sleeveEnd+0.005, ax + wob)) * step(1.25, b.y);
  float topY = 1.565 + 0.05*smoothstep(0.07,0.15,ax) - 0.06*(1.0-smoothstep(0.03,0.075,ax))*smoothstep(-0.02,0.04,b.z) - 0.02*smoothstep(-0.02,0.04,b.z);
  float torso = (1.0-armZone) * smoothstep(0.93, 0.95, b.y+wob) * (1.0 - smoothstep(topY-0.008, topY, b.y + wob*0.5));
  float shirt = clamp(sleeve + torso, 0.0, 1.0);
  float legs = (1.0-armZone) * (1.0 - smoothstep(0.935, 0.95, b.y + wob)) ;
  float boots = legs * (1.0 - smoothstep(0.16, 0.175, b.y + wob*0.5));
  float pants = legs - boots;
  float gloves = handZone * step(1.2, b.y);
  float vest = (1.0-armZone) * smoothstep(0.985, 1.0, b.y) * (1.0 - smoothstep(1.43, 1.445, b.y + b.z*0.35)) * smoothstep(0.035, 0.05, b.z + 0.075 - 0.0*b.y);
  vest = max(vest, (1.0-armZone) * smoothstep(0.985, 1.0, b.y) * (1.0 - smoothstep(1.43, 1.445, b.y)) * step(b.z, -0.02));
  float belt = (1.0-armZone) * smoothstep(0.925, 0.93, b.y) * (1.0 - smoothstep(0.985, 0.99, b.y));
  float seam = 0.0;
  seam += (1.0 - smoothstep(0.0, 0.006, abs(b.y - 0.17))) * legs;
  seam += (1.0 - smoothstep(0.0, 0.006, abs(ax - sleeveEnd))) * armZone * step(1.25, b.y);
  r1 = vec4(shirt, pants, boots, gloves);
  r2 = vec4(vest, belt, clamp(seam,0.0,1.0), 0.0);
}
`;

export function applyOutfit(material, outfit, fabricNormal) {
  const u = outfitUniforms(outfit);
  u.uFabricN.value = fabricNormal;
  material.userData.outfit = u;
  material.customProgramCacheKey = () => 'outfit_v3';
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, u);
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', `#include <common>
        varying vec3 vBind; varying vec3 vBindN;
        uniform float uVestOn, uSleeve, uZombie, uBulk;
        ${COMMON_GLSL}`)
      .replace('#include <begin_vertex>', `#include <begin_vertex>
        vBind = position; vBindN = normal;
        { vec4 r1; vec4 r2; regions(position, uSleeve, r1, r2);
          float inflate = r1.x*0.006*uBulk + r1.y*0.009 + r1.z*0.013 + r1.w*0.003 + r2.x*uVestOn*0.016 + r2.y*0.012;
          // smooth out anatomy under trousers / shirt
          inflate += r1.y * 0.012 * (1.0 - smoothstep(0.0, 0.12, abs(position.y - 0.86))) * (1.0 - smoothstep(0.0,0.12,abs(position.x)));
          transformed += normal * inflate; }`);
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>
        varying vec3 vBind; varying vec3 vBindN;
        uniform vec3 uShirt, uVest, uPants, uBoots, uGloves, uBelt, uSkinTint;
        uniform float uShirtRough, uVestRough, uVestOn, uPantsRough, uBootsRough, uGlovesOn, uSleeve, uTear, uBlood, uDirt, uDecay, uZombie, uFabricScale, uFlash;
        uniform vec4 uWounds[${MAX_WOUNDS}];
        uniform sampler2D uFabricN;
        float gClothMask; float gRoughOverride; vec3 gFabricN; float gWound;
        ${COMMON_GLSL}`)
      .replace('#include <map_fragment>', `#include <map_fragment>
        {
          vec3 b = vBind;
          vec4 r1; vec4 r2; regions(b, uSleeve, r1, r2);
          float n1 = fbm(b*9.0); float n2 = fbm(b*31.0+7.0); float n3 = vnoise(b*60.0);
          // torn clothing reveals skin (zombies)
          float tearMask = smoothstep(1.0-uTear*0.5, 1.05-uTear*0.5, fbm(b*6.0+3.1)*1.25);
          float cloth = (r1.x + r1.y) * (1.0 - tearMask*step(0.01,uTear)) + r1.z + r1.w*uGlovesOn + r2.y;
          cloth = clamp(cloth, 0.0, 1.0);
          vec3 skin = diffuseColor.rgb;
          // zombie skin: desaturate, sickly tint, bruises, veins
          float lum = dot(skin, vec3(0.3,0.59,0.11));
          vec3 zskin = mix(skin, vec3(lum), 0.55*uDecay) * uSkinTint;
          float bruise = smoothstep(0.55, 0.8, fbm(b*7.0+11.0));
          zskin = mix(zskin, zskin*vec3(0.55,0.42,0.55), bruise*uDecay*0.8);
          float vein = 1.0 - smoothstep(0.0, 0.035, abs(vnoise(b*40.0+2.0)-0.5));
          zskin = mix(zskin, zskin*vec3(0.45,0.5,0.6), vein*0.35*uDecay);
          float rot = smoothstep(0.62, 0.78, fbm(b*12.0+5.0));
          zskin = mix(zskin, vec3(0.16,0.09,0.07), rot*uDecay*0.85);
          skin = mix(skin, zskin, uZombie);
          vec3 col = skin;
          float fabricVar = 0.85 + 0.3*n2;
          col = mix(col, uShirt*fabricVar, r1.x);
          col = mix(col, uVest*(0.9+0.2*n3), r2.x*uVestOn);
          col = mix(col, uPants*fabricVar, r1.y);
          col = mix(col, uBelt, r2.y);
          // belt buckle
          // vest webbing straps / pouches
          float web = r2.x*uVestOn * step(0.5, fract(b.y*38.0)) * step(0.02, b.z) * (1.0-smoothstep(0.1,0.11,abs(b.x)));
          col = mix(col, uVest*0.75, web*0.35);
          float strap = r2.x*uVestOn*(1.0-smoothstep(0.018,0.024,abs(abs(b.x)-0.1)))*step(1.25,b.y);
          col = mix(col, uVest*0.6, strap);
          float pouch = r2.x*uVestOn*step(0.04,b.z)*(1.0-smoothstep(0.0,0.004,abs(abs(b.x)-0.075)-0.03))*(1.0-smoothstep(1.06,1.08,b.y))*step(1.0,b.y);
          col *= 1.0 - pouch*0.4;
          col = mix(col, uBoots*(0.8+0.4*n3), r1.z);
          // boot sole
          col = mix(col, vec3(0.02), r1.z*(1.0-smoothstep(0.025,0.035,b.y)));
          col = mix(col, uGloves, r1.w*uGlovesOn);
          // reveal skin through tears
          col = mix(col, skin, (r1.x+r1.y)*tearMask*step(0.01,uTear));
          // seams / cuffs darkening
          col *= 1.0 - r2.z*0.45;
          // dirt & grime
          float dirt = smoothstep(0.45, 0.75, n1) * uDirt;
          col = mix(col, col*vec3(0.55,0.5,0.42), dirt*cloth);
          col = mix(col, col*vec3(0.6,0.55,0.5), (1.0-smoothstep(0.0,0.55,b.y))*uDirt*0.6);
          // blood: around mouth/chest/hands for zombies, + stains
          float bloodZone = uZombie * ( (1.0-smoothstep(0.0,0.16,length(b-vec3(0.0,1.6,0.1))))
                           + (1.0-smoothstep(0.0,0.28,length((b-vec3(0.0,1.3,0.12))*vec3(1.0,1.6,1.0)))) * 0.9
                           + r1.w*0.0 + smoothstep(0.6,0.7,abs(b.x))*0.8 );
          float bl = smoothstep(0.5, 0.62, fbm(b*10.0+1.7) + bloodZone*0.35) * uBlood;
          bl = max(bl, step(0.0, uBlood-0.001)*smoothstep(0.78,0.86,fbm(b*18.0+9.0))*uBlood*0.6);
          vec3 bloodCol = mix(vec3(0.20,0.015,0.01), vec3(0.08,0.01,0.008), n3);
          col = mix(col, bloodCol, clamp(bl,0.0,1.0));
          // dynamic wounds (bind-space points)
          gWound = 0.0;
          for (int i=0;i<${MAX_WOUNDS};i++){
            vec4 w = uWounds[i];
            if (w.w <= 0.0) continue;
            vec3 d = b - w.xyz;
            float core = 1.0 - smoothstep(0.0, 0.022*w.w, length(d));
            float splat = (1.0 - smoothstep(0.0, 0.09*w.w, length(d*vec3(1.0,0.45,1.0) + vec3(0.0,0.03,0.0)))) * smoothstep(0.35,0.6,vnoise(b*45.0+float(i)));
            float drip = (1.0 - smoothstep(0.0, 0.012, abs(d.x + (vnoise(b*20.0)-0.5)*0.02))) * step(d.y, 0.0) * (1.0 - smoothstep(0.0, 0.18*w.w, -d.y));
            gWound = max(gWound, max(core, max(splat*0.85, drip*0.8)));
            col = mix(col, vec3(0.02,0.0,0.0), core);
          }
          col = mix(col, vec3(0.18,0.01,0.008), clamp(gWound,0.0,1.0)*0.9);
          diffuseColor.rgb = col;
          gClothMask = cloth;
          float rough = 0.0;
          rough += r1.x*uShirtRough + r1.y*uPantsRough + r1.z*uBootsRough + r1.w*uGlovesOn*0.5 + r2.y*0.45;
          rough = mix(rough, uVestRough, r2.x*uVestOn);
          gRoughOverride = rough;
          gFabricN = texture2D(uFabricN, vMapUv*uFabricScale).xyz*2.0-1.0;
          // wet blood is glossy
          gRoughOverride = mix(gRoughOverride, 0.25, clamp(bl+gWound,0.0,1.0)*cloth);
        }`)
      .replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>
        roughnessFactor = mix(roughnessFactor, gRoughOverride, gClothMask);
        roughnessFactor = mix(roughnessFactor, 0.3, gWound*(1.0-gClothMask));
        roughnessFactor = mix(roughnessFactor, min(1.0, roughnessFactor+0.15), uZombie*(1.0-gClothMask));`)
      .replace('#include <normal_fragment_maps>', `vec3 geoNormalOF = normal;
        #include <normal_fragment_maps>
        normal = normalize(mix(normal, geoNormalOF, gClothMask*0.85));
        {
          // fabric weave micro normal (perturb in tangent-free way using screen derivatives)
          vec3 fn = gFabricN; fn.xy *= 0.45*gClothMask;
          vec3 q0 = dFdx(-vViewPosition), q1 = dFdy(-vViewPosition);
          vec2 st0 = dFdx(vMapUv*uFabricScale), st1 = dFdy(vMapUv*uFabricScale);
          vec3 q1perp = cross(q1, normal), q0perp = cross(normal, q0);
          vec3 T = q1perp*st0.x + q0perp*st1.x; vec3 B = q1perp*st0.y + q0perp*st1.y;
          float det = max(dot(T,T), dot(B,B)); float sc = det == 0.0 ? 0.0 : inversesqrt(det);
          normal = normalize(T*(fn.x*sc) + B*(fn.y*sc) + normal*fn.z);
        }`)
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
        totalEmissiveRadiance += vec3(0.6,0.05,0.02)*uFlash;`);
  };
  material.needsUpdate = true;
  return u;
}

// ----------------------------------------------------------------------------------------------
// Character: holds the assembled skinned model, bones by name, mixer, actions and hit volumes.
// ----------------------------------------------------------------------------------------------
export class Character {
  constructor(assets, { body = 'male', hair = null, outfit = OUTFITS.leon, skinTex = null, fabricNormal = null, eyes = 'normal', hairColor = null } = {}) {
    this.hairColor = hairColor;
    this.assets = assets;
    this.root = new THREE.Group();
    const model = assets.instance(body === 'female' ? 'body_female' : 'body_male');
    this.model = model;
    this.root.add(model);
    this.bones = {};
    model.traverse((o) => { if (o.isBone) this.bones[o.name] = o; });
    this.meshes = [];
    model.traverse((o) => {
      if (o.isSkinnedMesh) {
        o.castShadow = true; o.receiveShadow = true; o.frustumCulled = false;
        this.meshes.push(o);
        const m = o.material.clone();
        o.material = m;
        if (/Superhero/.test(m.name)) {
          if (skinTex) { m.map = skinTex; }
          o.geometry = conditionBody(o.geometry, body, outfit);
          this.outfitUniforms = applyOutfit(m, outfit, fabricNormal);
          this.bodyMesh = o;
        } else if (/Hair/.test(m.name) && hairColor) {
          m.color = new THREE.Color(...hairColor);
        } else if (/Eyes/.test(m.name) && eyes === 'dead') {
          m.color = new THREE.Color(0.9, 0.88, 0.75); m.roughness = 0.2;
          m.onBeforeCompile = (s) => { s.fragmentShader = s.fragmentShader.replace('#include <map_fragment>', '#include <map_fragment>\n diffuseColor.rgb = mix(vec3(dot(diffuseColor.rgb, vec3(0.33))), vec3(0.85,0.82,0.7), 0.85);'); };
        }
      }
    });
    if (hair) this.attachSkinned(hair);
    this.mixer = new THREE.AnimationMixer(model);
    this.actions = new Map();
    this.weights = new Map(); // target weights
    this.hitVolumes = [];
  }

  attachSkinned(name) {
    const h = this.assets.instance(name);
    const meshes = [];
    h.traverse((o) => { if (o.isSkinnedMesh) meshes.push(o); });
    for (const m of meshes) {
      const bones = m.skeleton.bones.map((b) => this.bones[b.name]);
      const sk = new THREE.Skeleton(bones, m.skeleton.boneInverses);
      m.removeFromParent();
      this.model.add(m);
      m.bind(sk, m.bindMatrix);
      m.castShadow = true; m.frustumCulled = false;
      m.material = m.material.clone();
      m.material.roughness = 0.75;
      if (this.hairColor) m.material.color = new THREE.Color(...this.hairColor);
      this.meshes.push(m);
    }
  }

  // Register an action. opts: { part: 'full'|'upper'|'lower', loop: true/false, inplace }
  add(key, clipName, opts = {}) {
    let clip = this.assets.clip(clipName);
    if (!clip) { console.warn('missing clip', clipName); return null; }
    clip = inPlace(clip);
    if (opts.part && opts.part !== 'full') clip = maskedClip(clip, opts.part);
    const a = this.mixer.clipAction(clip);
    a.setLoop(opts.loop === false ? THREE.LoopOnce : THREE.LoopRepeat);
    a.clampWhenFinished = opts.loop === false;
    a.enabled = true;
    a.setEffectiveWeight(0);
    a.play();
    if (opts.loop === false) a.paused = true;
    a.userData = { opts, rate: opts.rate ?? 1 };
    a.timeScale = a.userData.rate;
    this.actions.set(key, a);
    this.weights.set(key, 0);
    return a;
  }

  // Restart a one-shot action from t=0
  trigger(key, rate) {
    const a = this.actions.get(key); if (!a) return null;
    a.reset(); a.paused = false; a.enabled = true;
    a.timeScale = rate ?? a.userData.rate;
    a.play();
    return a;
  }

  setWeight(key, w) { if (this.weights.has(key)) this.weights.set(key, w); }

  // Blend actual weights toward targets.
  updateWeights(dt, speed = 10) {
    const k = 1 - Math.exp(-speed * dt);
    for (const [key, a] of this.actions) {
      const tw = this.weights.get(key);
      const w = a.getEffectiveWeight();
      const nw = Math.abs(tw - w) < 0.002 ? tw : w + (tw - w) * k;
      a.setEffectiveWeight(nw);
    }
  }

  snapWeights() { for (const [key, a] of this.actions) a.setEffectiveWeight(this.weights.get(key)); }

  // Convert a world point near bone `boneName` into bind-pose space (for wound decals)
  worldToBind(world, boneName) {
    const mesh = this.bodyMesh; const sk = mesh.skeleton;
    const idx = sk.bones.findIndex((b) => b.name === boneName);
    if (idx < 0) return null;
    const bone = sk.bones[idx];
    const m = new THREE.Matrix4();
    // world = M * Binv * (BoneW * Ib) * Bind * p  =>  p = Bind^-1 * Ib^-1 * BoneW^-1 * Bind * M^-1 * world
    const Minv = mesh.matrixWorld.clone().invert();
    const BoneWinv = bone.matrixWorld.clone().invert();
    const Ibinv = sk.boneInverses[idx].clone().invert();
    m.copy(mesh.bindMatrixInverse).multiply(Ibinv).multiply(BoneWinv).multiply(mesh.bindMatrix).multiply(Minv);
    return world.clone().applyMatrix4(m);
  }

  addWound(world, boneName, size = 1) {
    const u = this.outfitUniforms; if (!u) return;
    const p = this.worldToBind(world, boneName); if (!p) return;
    const arr = u.uWounds.value;
    // replace oldest (rotate)
    arr.unshift(arr.pop());
    arr[0].set(p.x, p.y, p.z, size);
  }

  clearWounds() { const u = this.outfitUniforms; if (u) for (const w of u.uWounds.value) w.set(0, -10, 0, 0); }

  bonePos(name, target = new THREE.Vector3()) { return this.bones[name].getWorldPosition(target); }
}
