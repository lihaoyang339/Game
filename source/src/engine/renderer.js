// Renderer + post-processing chain (HDR -> bloom -> filmic grade/tonemap -> FXAA) with quality tiers.
import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { FXAAShader } from 'three/examples/jsm/shaders/FXAAShader.js';
import { GTAOPass } from 'three/examples/jsm/postprocessing/GTAOPass.js';

export const QUALITY = {
  low: { scale: 0.55, shadow: 512, spotShadows: 0, points: 4, bloom: true, ao: false, fxaa: true, aniso: 2, dust: 150 },
  medium: { scale: 0.75, shadow: 1024, spotShadows: 1, points: 6, bloom: true, ao: false, fxaa: true, aniso: 4, dust: 300 },
  high: { scale: 1.0, shadow: 2048, spotShadows: 2, points: 8, bloom: true, ao: true, fxaa: true, aniso: 8, dust: 500 },
  ultra: { scale: 1.0, shadow: 2048, spotShadows: 2, points: 8, bloom: true, ao: true, fxaa: true, aniso: 16, dust: 700 },
};

const GradeShader = {
  uniforms: {
    tDiffuse: { value: null }, uTime: { value: 0 }, uRes: { value: new THREE.Vector2(1, 1) },
    uExposure: { value: 1.0 }, uSaturation: { value: 0.82 }, uContrast: { value: 1.08 },
    uLift: { value: new THREE.Vector3(0.006, 0.010, 0.014) }, uGain: { value: new THREE.Vector3(1.0, 0.98, 0.94) },
    uVignette: { value: 0.3 }, uGrain: { value: 0.01 }, uCA: { value: 0.0 },
    uDamage: { value: 0 }, uFade: { value: 0 }, uFadeColor: { value: new THREE.Color(0, 0, 0) }, uDesat: { value: 0 },
    uFocus: { value: 0 },
  },
  vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
  fragmentShader: /* glsl */`
    uniform sampler2D tDiffuse; uniform float uTime, uExposure, uSaturation, uContrast, uVignette, uGrain, uCA, uDamage, uFade, uDesat, uFocus;
    uniform vec3 uLift, uGain, uFadeColor; uniform vec2 uRes; varying vec2 vUv;
    vec3 RRTAndODTFit(vec3 v){ vec3 a = v*(v+0.0245786)-0.000090537; vec3 b = v*(0.983729*v+0.4329510)+0.238081; return a/b; }
    vec3 aces(vec3 color){
      const mat3 ACESInputMat = mat3(vec3(0.59719,0.07600,0.02840), vec3(0.35458,0.90834,0.13383), vec3(0.04823,0.01566,0.83777));
      const mat3 ACESOutputMat = mat3(vec3(1.60475,-0.10208,-0.00327), vec3(-0.53108,1.10813,-0.07276), vec3(-0.07367,-0.00605,1.07602));
      color *= 1.0/0.6; color = ACESInputMat*color; color = RRTAndODTFit(color); color = ACESOutputMat*color; return clamp(color,0.0,1.0); }
    float hash(vec2 p){ return fract(sin(dot(p, vec2(12.9898,78.233)))*43758.5453); }
    vec3 toSRGB(vec3 c){ return mix(c*12.92, 1.055*pow(c, vec3(1.0/2.4))-0.055, step(0.0031308, c)); }
    void main(){
      vec2 d = vUv-0.5; float r2 = dot(d,d);
      float ca = uCA*(1.0+uDamage*2.0);
      vec3 col = vec3(texture2D(tDiffuse, vUv - d*ca*r2*4.0).r, texture2D(tDiffuse, vUv).g, texture2D(tDiffuse, vUv + d*ca*r2*4.0).b);
      // aim focus: subtle edge blur
      if (uFocus > 0.0) {
        vec2 px = 1.5/uRes * smoothstep(0.04, 0.25, r2) * uFocus * 3.0;
        col = (col*2.0 + texture2D(tDiffuse, vUv+px).rgb + texture2D(tDiffuse, vUv-px).rgb + texture2D(tDiffuse, vUv+vec2(px.x,-px.y)).rgb + texture2D(tDiffuse, vUv+vec2(-px.x,px.y)).rgb)/6.0;
      }
      col *= uExposure;
      col = aces(col);
      float l = dot(col, vec3(0.2126,0.7152,0.0722));
      col = mix(vec3(l), col, uSaturation*(1.0-uDesat));
      col = (col-0.5)*uContrast+0.5;
      col = max(col*uGain + uLift*(1.0-col), 0.0);
      // split-tone: cool shadows, slightly warm highlights
      col += vec3(-0.01,0.0,0.018)*(1.0-l) + vec3(0.012,0.006,-0.01)*l;
      col *= 1.0 - uVignette*smoothstep(0.08, 0.55, r2*1.6);
      float dv = smoothstep(0.05, 0.45, r2*1.5);
      col = mix(col, col*vec3(0.85,0.12,0.1)+vec3(0.10,0.0,0.0), uDamage*dv);
      float g = hash(vUv*uRes + fract(uTime*7.13)*100.0);
      col += (g-0.5)*uGrain*(1.2-l);
      col = mix(col, uFadeColor, uFade);
      gl_FragColor = vec4(toSRGB(clamp(col,0.0,1.0)), 1.0);
    }`,
};

export class Renderer {
  constructor(canvasParent) {
    this.renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'high-performance', stencil: false });
    const r = this.renderer;
    r.outputColorSpace = THREE.LinearSRGBColorSpace; // sRGB conversion done in grade pass
    r.toneMapping = THREE.NoToneMapping;
    r.shadowMap.enabled = true;
    r.shadowMap.type = THREE.PCFSoftShadowMap;
    r.setPixelRatio(1);
    canvasParent.appendChild(r.domElement);
    r.domElement.id = 'game-canvas';
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(62, innerWidth / innerHeight, 0.05, 160);
    this.qualityName = 'high';
    this.q = QUALITY.high;
    this.composer = null;
    this.grade = null;
    this.onResize = this.onResize.bind(this);
    addEventListener('resize', this.onResize);
  }

  setQuality(name) {
    this.qualityName = name; this.q = QUALITY[name] || QUALITY.high;
    this.buildComposer();
    this.onResize();
  }

  buildComposer() {
    const r = this.renderer;
    const w = innerWidth, h = innerHeight;
    const rt = new THREE.WebGLRenderTarget(w, h, { type: THREE.HalfFloatType, samples: 0 });
    this.composer = new EffectComposer(r, rt);
    this.composer.addPass(new RenderPass(this.scene, this.camera));
    this.ao = null;
    if (this.q.ao) {
      this.ao = new GTAOPass(this.scene, this.camera, w, h);
      this.ao.output = GTAOPass.OUTPUT.Default;
      this.ao.blendIntensity = 0.75;
      this.ao.updateGtaoMaterial({ radius: 0.45, distanceExponent: 1.4, thickness: 1.0, scale: 1.0, samples: 12 });
      this.composer.addPass(this.ao);
    }
    // sanitize HDR: kill NaN/Inf and clamp extreme highlights so bloom's blur can never smear them
    this.sanitize = new ShaderPass({ uniforms: { tDiffuse: { value: null } }, vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
      fragmentShader: 'uniform sampler2D tDiffuse; varying vec2 vUv; void main(){ vec4 c = texture2D(tDiffuse, vUv); if (any(isnan(c.rgb)) || any(isinf(c.rgb))) c.rgb = vec3(0.0); gl_FragColor = vec4(min(c.rgb, vec3(48.0)), 1.0); }' });
    this.composer.addPass(this.sanitize);
    this.bloom = null;
    if (this.q.bloom) {
      this.bloom = new UnrealBloomPass(new THREE.Vector2(w / 2, h / 2), 0.55, 0.6, 0.9);
      this.composer.addPass(this.bloom);
    }
    const prev = this.grade?.uniforms;
    this.grade = new ShaderPass(GradeShader);
    if (prev) for (const k in prev) if (k !== 'tDiffuse') this.grade.uniforms[k].value = prev[k].value;
    this.composer.addPass(this.grade);
    this.fxaa = null;
    if (this.q.fxaa) { this.fxaa = new ShaderPass(FXAAShader); this.composer.addPass(this.fxaa); }
  }

  onResize() {
    const w = innerWidth, h = innerHeight;
    const pr = Math.min(window.devicePixelRatio || 1, 2) * this.q.scale;
    this.renderer.setPixelRatio(pr);
    this.renderer.setSize(w, h);
    this.camera.aspect = w / h; this.camera.updateProjectionMatrix();
    if (this.composer) {
      this.composer.setPixelRatio(pr);
      this.composer.setSize(w, h);
      this.grade.uniforms.uRes.value.set(w * pr, h * pr);
      if (this.fxaa) this.fxaa.material.uniforms.resolution.value.set(1 / (w * pr), 1 / (h * pr));
    }
  }

  render(dt, t) {
    this.grade.uniforms.uTime.value = t;
    this.composer.render(dt);
  }
}
