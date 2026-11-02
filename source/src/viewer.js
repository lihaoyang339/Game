// Asset verification viewer used by automated tests (tests/verify-assets.mjs).
import * as THREE from 'three';
import { Assets } from './engine/assets.js';
const q = new URLSearchParams(location.search);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(innerWidth, innerHeight); renderer.shadowMap.enabled = true;
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.outputColorSpace = THREE.SRGBColorSpace;
document.body.appendChild(renderer.domElement);
const scene = new THREE.Scene(); scene.background = new THREE.Color(0x2a2e33);
const cam = new THREE.PerspectiveCamera(40, innerWidth / innerHeight, 0.01, 100);
scene.add(new THREE.HemisphereLight(0xdde8ff, 0x332211, 1.2));
const dl = new THREE.DirectionalLight(0xffffff, 2.5); dl.position.set(2, 4, 3); dl.castShadow = true; scene.add(dl);
const floor = new THREE.Mesh(new THREE.PlaneGeometry(20, 20), new THREE.MeshStandardMaterial({ color: 0x555555 })); floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; scene.add(floor);
const assets = new Assets(renderer);
const info = document.getElementById('info');
window.__viewer = { scene, cam, renderer, assets, THREE };
async function main() {
  const mode = q.get('mode') || 'model';
  if (mode === 'char') { window.__ready = true; return; }
  if (mode === 'model') {
    const name = q.get('name');
    await assets.loadModel(name, `models/${name}.glb`);
    const o = assets.instance(name); scene.add(o);
    const box = new THREE.Box3().setFromObject(o); const size = box.getSize(new THREE.Vector3()); const c = box.getCenter(new THREE.Vector3());
    const r = Math.max(size.x, size.y, size.z);
    cam.position.set(c.x + r * 1.1, c.y + r * 0.6, c.z + r * 1.4); cam.lookAt(c);
    let tris = 0; o.traverse(m => { if (m.isMesh) tris += (m.geometry.index ? m.geometry.index.count : m.geometry.attributes.position.count) / 3; });
    info.textContent = `${name}\nsize ${size.toArray().map(v => v.toFixed(3)).join(' x ')} m\ntris ${tris}`;
    window.__info = { name, size: size.toArray(), tris };
  }
  window.__ready = true;
  renderer.render(scene, cam);
}
main().catch(e => { info.textContent = 'ERROR ' + e; window.__error = String(e); window.__ready = true; });
