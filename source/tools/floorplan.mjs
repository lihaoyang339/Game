// Generates docs/floorplan-ground.svg from the room bounds used by the build, plus doors & cameras.
import fs from 'node:fs';
import { FOYER } from '../src/rooms/foyer.js';
import { LIVING } from '../src/rooms/living.js';
import { GALLERY } from '../src/rooms/gallery.js';
import { STUDY } from '../src/rooms/study.js';
import { DINING } from '../src/rooms/dining.js';
import { KITCHEN, PANTRY, CORRIDOR } from '../src/rooms/service.js';
import { CONS, GLASSC } from '../src/rooms/conservatory.js';
const rooms = [
  ['前厅 Foyer', FOYER, '#c9b98f'], ['大客厅 Living Room', LIVING, '#b7c4a3'], ['长廊 Gallery', GALLERY, '#c8b49a'], ['书房 Study', STUDY, '#a99880'],
  ['餐厅 Dining', DINING, '#c49a8f'], ['厨房 Kitchen', KITCHEN, '#d8d2c0'], ['备餐间 Pantry', PANTRY, '#d8d2c0'], ['仆人走廊 Servants\' Corridor', CORRIDOR, '#c7cbb8'],
  ['温室 Conservatory', { ...CONS }, '#b9d0c6'], ['玻璃廊', { ...GLASSC }, '#b9d0c6'],
];
// doors: [x, z, width, horizontal?, label, state]
const doors = [[0, 8, 1.8, 1, 'Entrance', 'closed'], [4.15, 4.5, 1.9, 0, '', 'open'], [-4, 4.5, 1.05, 0, 'Parlour', 'locked'], [0, -0.15, 2.4, 1, 'arch', 'open'],
  [-2, -3.45, 1.05, 1, '', 'ajar'], [-11.35, -3.45, 1.8, 1, '', 'closed'], [-16.15, -2.3, 0.9, 0, 'jib door (opens from service side)', 'oneway'], [6.2, -1, 1.05, 1, 'Music Room', 'locked'],
  [11.2, -1.07, 1.2, 1, '', 'ajar'], [-15.85, -9.6, 0.95, 0, '', 'ajar'], [-17.65, -9.6, 0.95, 0, '', 'open'], [-21, -3.45, 0.95, 1, '', 'open'], [-23.6, -1.5, 0.9, 1, 'Cellar (padlocked)', 'locked'], [-24.5, -2.4, 0.9, 0, 'Back stair', 'locked']];
const S = 26, ox = 28, oz = 16; const X = (x) => (x + ox) * S; const Z = (z) => (z + oz) * S;
let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${48 * S}" height="${28 * S}" font-family="Georgia" font-size="13"><rect width="100%" height="100%" fill="#efe8d6"/>`;
svg += `<text x="20" y="28" font-size="20">THE MANOR — Ground floor (vertical slice), 1 grid = 1 m. Hidden void between Dining &amp; Study: ${(STUDY.x0 - DINING.x1).toFixed(1)} m</text>`;
for (let x = -28; x <= 20; x++) svg += `<line x1="${X(x)}" y1="${Z(-15)}" x2="${X(x)}" y2="${Z(11)}" stroke="#ddd3bd" stroke-width="0.5"/>`;
for (let z = -15; z <= 11; z++) svg += `<line x1="${X(-28)}" y1="${Z(z)}" x2="${X(20)}" y2="${Z(z)}" stroke="#ddd3bd" stroke-width="0.5"/>`;
for (const [n, r, c] of rooms) svg += `<rect x="${X(r.x0)}" y="${Z(r.z0)}" width="${(r.x1 - r.x0) * S}" height="${(r.z1 - r.z0) * S}" fill="${c}" stroke="#3a3228" stroke-width="3"/><text x="${X((r.x0 + r.x1) / 2)}" y="${Z((r.z0 + r.z1) / 2)}" text-anchor="middle">${n}</text>`;
svg += `<rect x="${X(DINING.x1)}" y="${Z(DINING.z0)}" width="${(STUDY.x0 - DINING.x1) * S}" height="${(DINING.z1 - DINING.z0) * S}" fill="url(#h)" stroke="#8a2a20" stroke-dasharray="6 4"/><defs><pattern id="h" width="8" height="8" patternUnits="userSpaceOnUse"><path d="M0 8 L8 0" stroke="#8a2a20"/></pattern></defs>`;
const col = { open: '#2a6a3a', ajar: '#3a7a8a', closed: '#7a5a2a', locked: '#a02020', oneway: '#6a3a9a' };
for (const [x, z, w, h, label, st] of doors) {
  svg += h ? `<line x1="${X(x - w / 2)}" y1="${Z(z)}" x2="${X(x + w / 2)}" y2="${Z(z)}" stroke="${col[st]}" stroke-width="7"/>` : `<line x1="${X(x)}" y1="${Z(z - w / 2)}" x2="${X(x)}" y2="${Z(z + w / 2)}" stroke="${col[st]}" stroke-width="7"/>`;
  if (label) svg += `<text x="${X(x) + 6}" y="${Z(z) - 6}" font-size="11" fill="${col[st]}">${label}</text>`;
}
let ly = 22 * S; for (const [k, v] of Object.entries(col)) { svg += `<rect x="${X(-27)}" y="${ly}" width="22" height="8" fill="${v}"/><text x="${X(-27) + 30}" y="${ly + 9}">${k}</text>`; ly += 18; }
svg += '</svg>';
fs.writeFileSync('docs/floorplan-ground.svg', svg);
console.log('docs/floorplan-ground.svg written');
