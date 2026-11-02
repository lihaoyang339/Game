// Downloads CC0 assets for The Manor from Poly Haven and records provenance (assets_src/polyhaven/manifest.json).
const models = {
  // foyer / living / study (formal rooms)
  ArmChair_01: '2k', sofa_03: '2k', GreenChair_01: '1k', ClassicConsole_01: '2k', ClassicNightstand_01: '1k', GothicCabinet_01: '1k',
  gothic_coffee_table: '1k', side_table_tall_01: '1k', round_wooden_table_01: '1k', Chandelier_01: '1k', Chandelier_02: '1k', Chandelier_03: '1k',
  lantern_chandelier_01: '1k', mantel_clock_01: '1k', ornate_mirror_01: '1k', fancy_picture_frame_01: '1k',
  fancy_picture_frame_02: '1k', standing_picture_frame_01: '1k', marble_bust_01: '1k', lion_head: '1k', vintage_cabinet_01: '2k',
  wooden_bookshelf_worn: '1k', book_encyclopedia_set_01: '1k', brass_candleholders: '1k', wooden_candlestick: '1k',
  vintage_oil_lamp: '1k', Lantern_01: '1k', tea_set_01: '1k', vintage_radio_transceiver: '1k', vintage_telephone_wall_clock: '1k',
  vintage_wooden_drawer_01: '1k', vintage_suitcase: '1k', Rockingchair_01: '1k', WoodenChair_01: '1k', vintage_day_bed: '1k',
  pocket_watch: '1k', round_spectacles: '1k', magnifying_glass_01: '1k', vintage_microscope: '1k', postcard_set_01: '1k', carved_wooden_elephant: '1k',
  wine_bottles_01: '1k', jug_01: '1k', ceramic_pot: '1k', dining_chair_02: '1k',
  // kitchen / service
  WoodenTable_01: '1k', WoodenTable_02: '1k', painted_wooden_cabinet: '1k', painted_wooden_cabinet_02: '1k', painted_wooden_shelves: '1k',
  painted_wooden_chair_01: '1k', painted_wooden_stool: '1k', painted_wooden_bench: '1k', pot_enamel_01: '1k', metal_jug: '1k', wooden_bowl_01: '1k',
  wooden_cutting_board: '1k', wicker_basket_01: '1k', vintage_electric_kettle: '1k', scandinavian_masonry_heater: '1k', wooden_bucket_01: '1k',
  wooden_broom: '1k', rubber_boots: '1k', wooden_stool_01: '1k', wooden_crate_02: '1k', lightbulb_01: '1k', pull_chain_light_socket: '1k',
  // conservatory
  potted_plant_01: '1k', potted_plant_02: '1k', potted_plant_04: '1k', planter_box_01: '1k', pachira_aquatica_01: '1k', shrub_01: '1k', shrub_02: '1k',
  periwinkle_plant: '1k', nettle_plant: '1k', watering_can_metal_01: '1k', trowel_01: '1k', rusted_spade_01: '1k', seeding_tray_01: '1k', planter_pot_clay: '1k',
  metal_stool_01: '1k',
  // narrative / food / misc
  strawberry_chocolate_cake: '1k', lemon: '1k', bananas: '1k', yellow_onion: '1k', sweet_potato: '1k', dining_table: '1k', wooden_lantern_01: '1k', vintage_flashlight: '1k',
};
const textures = {
  herringbone_parquet: '2k', diagonal_parquet: '2k', rectangular_parquet: '2k', old_wood_floor: '2k', wood_floor_worn: '2k',
  dark_paneled_wood: '2k', wooden_panels: '2k', black_walnut_veneer_01: '2k', oak_veneer_01: '2k', lacquered_cherry_wood: '2k', dark_wood: '2k',
  marble_01: '2k', marble_tiles: '2k', velour_velvet: '1k', quatrefoil_jacquard_fabric: '1k', fabric_pattern_05: '1k', rough_linen: '1k',
  leather_red_02: '1k', decrepit_wallpaper: '2k', white_plaster_rough_01: '2k', painted_plaster_wall: '2k', worn_plaster_wall: '2k', damaged_plaster: '2k',
  kitchen_wood: '2k', wood_cabinet_worn_long: '2k', wood_table_worn: '2k', worn_tile_floor: '2k', terracotta_floor_tiles: '2k', red_brick: '2k',
  dirty_carpet: '1k', poly_wool_herringbone: '1k', green_metal_rust: '2k', brown_mud_leaves_01: '2k', patio_tiles: '2k', castle_brick_01: '2k',
  rough_plaster_brick: '2k', stone_tiles: '2k', long_white_tiles: '2k', interior_tiles: '2k',
};
const hdris = { old_hall: '1k' };
import fs from 'node:fs/promises';
import path from 'node:path';
const OUT = 'assets_src/polyhaven';
const API = 'https://api.polyhaven.com';
const manifest = { source: 'https://polyhaven.com', license: 'CC0 1.0 Universal', assets: [] };
async function get(url) { for (let i = 0; i < 4; i++) { try { const r = await fetch(url); if (r.ok) return r; throw new Error(r.status + ' ' + url); } catch (e) { if (i === 3) throw e; await new Promise(r => setTimeout(r, 2000 * 2 ** i)); } } }
import crypto from 'node:crypto';
async function dl(url, file, md5 = null) {
  try {
    const buf = await fs.readFile(file);
    if (!md5 || crypto.createHash('md5').update(buf).digest('hex') === md5) return;
    console.warn('md5 mismatch, re-downloading', file);
  } catch {}
  await fs.mkdir(path.dirname(file), { recursive: true });
  const r = await get(url); const b = Buffer.from(await r.arrayBuffer());
  if (md5 && crypto.createHash('md5').update(b).digest('hex') !== md5) throw new Error('md5 mismatch after download ' + url);
  await fs.writeFile(file, b);
}
async function info(id) { return (await get(`${API}/info/${id}`)).json(); }
async function doModel(id, res) {
  const files = await (await get(`${API}/files/${id}`)).json();
  const g = files.gltf[res] || files.gltf['1k'];
  const dir = path.join(OUT, 'models', id);
  await dl(g.gltf.url, path.join(dir, path.basename(g.gltf.url)), g.gltf.md5);
  await Promise.all(Object.entries(g.gltf.include).map(([rel, f]) => dl(f.url, path.join(dir, rel), f.md5)));
  const inf = await info(id);
  manifest.assets.push({ id, type: 'model', res, url: `https://polyhaven.com/a/${id}`, download: g.gltf.url, authors: Object.keys(inf.authors || {}), name: inf.name, polycount: inf.polycount, dimensions_mm: inf.dimensions });
}
async function doTexture(id, res) {
  const files = await (await get(`${API}/files/${id}`)).json();
  const dir = path.join(OUT, 'textures', id);
  const want = { Diffuse: 'diff', nor_gl: 'nor_gl', arm: 'arm' };
  const got = [];
  for (const [k, short] of Object.entries(want)) {
    const e = files[k]?.[res]?.jpg; if (!e) continue;
    await dl(e.url, path.join(dir, `${id}_${short}_${res}.jpg`), e.md5); got.push(short);
  }
  const inf = await info(id);
  manifest.assets.push({ id, type: 'texture', res, maps: got, url: `https://polyhaven.com/a/${id}`, authors: Object.keys(inf.authors || {}), name: inf.name });
}
async function doHdri(id, res) {
  const files = await (await get(`${API}/files/${id}`)).json();
  const e = files.hdri[res].hdr; await dl(e.url, path.join(OUT, 'hdri', `${id}_${res}.hdr`));
  const inf = await info(id);
  manifest.assets.push({ id, type: 'hdri', res, url: `https://polyhaven.com/a/${id}`, download: e.url, authors: Object.keys(inf.authors || {}), name: inf.name });
}
const jobs = [
  ...Object.entries(models).map(([id, r]) => () => doModel(id, r)),
  ...Object.entries(textures).map(([id, r]) => () => doTexture(id, r)),
  ...Object.entries(hdris).map(([id, r]) => () => doHdri(id, r)),
];
let i = 0; const fails = [];
await Promise.all(Array.from({ length: 6 }, async () => { while (i < jobs.length) { const j = jobs[i++]; try { await j(); } catch (e) { fails.push(String(e)); console.error('FAIL', e.message); } } }));
manifest.assets.sort((a, b) => a.id.localeCompare(b.id));
await fs.writeFile(path.join(OUT, 'manifest.json'), JSON.stringify(manifest, null, 1));
console.log('done', manifest.assets.length, 'assets; failures:', fails.length);
