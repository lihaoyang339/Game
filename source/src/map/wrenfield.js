// WRENFIELD MANOR — map data transcribed from "THE HOLLOW SIGNAL · MAP V1.0".
// Spec coordinates: X east, Y north, Z up, metres; room ranges are interior clear dimensions.
// Engine mapping (three.js): x = X, y = Z, z = -Y.
// Anything not given by the spec is marked `assumed:` with the reason; see docs/map-validation.md.

export const LEVELS = {
  N: { z: -5.8, name: 'Natural / cistern level' },
  B: { z: -3.2, name: 'Basement', h: 2.8 },
  G: { z: 0.0, name: 'Ground floor', h: 3.4 },
  U: { z: 3.7, name: 'First floor', h: 3.0 },
  A: { z: 7.0, name: 'Attic', h: 2.6 },
};

// kind: room | corridor | stair | outdoor | void
export const ROOMS = [
  // ---------------- Ground floor (G) ----------------
  { id: 'G01', name: 'Front Portico', zh: '前门廊', level: 'G', x: [14, 22], y: [-5, 0], kind: 'outdoor', cam: 'CF01' },
  { id: 'G02', name: 'Entrance Vestibule', zh: '入口门厅', level: 'G', x: [14, 22], y: [0, 4], kind: 'room', cam: 'CF02' },
  { id: 'G03', name: 'Entrance Gallery', zh: '入口长廊', level: 'G', x: [10, 26], y: [4, 8], kind: 'corridor', cam: 'CF03/CF04' },
  { id: 'G04', name: 'Drawing Room', zh: '大客厅', level: 'G', x: [0, 10], y: [4, 14], kind: 'room', cam: 'CF05' },
  { id: 'G05', name: 'Music Salon', zh: '音乐室', level: 'G', x: [0, 10], y: [14, 22], kind: 'room', cam: 'CF06' },
  { id: 'G06', name: 'Dining Room', zh: '餐厅', level: 'G', x: [10, 20], y: [8, 18], kind: 'room', cam: 'CF07/CF08' },
  { id: 'G07', name: "Housekeeper's Office", zh: '管家办公室', level: 'G', x: [26, 34], y: [4, 10], kind: 'room', cam: 'CF09' },
  { id: 'G08', name: 'Stair Hall', zh: '主楼梯间', level: 'G', x: [20, 26], y: [8, 14], kind: 'stair', cam: 'CF10' },
  { id: 'G09', name: "Butler's Pantry", zh: '备餐间', level: 'G', x: [20, 26], y: [14, 18], kind: 'room' },
  { id: 'G10', name: 'Kitchen', zh: '厨房', level: 'G', x: [26, 36], y: [10, 18], kind: 'room', cam: 'CF11' },
  { id: 'G11', name: 'Scullery', zh: '洗涤间', level: 'G', x: [36, 42], y: [10, 16], kind: 'room', cam: 'CF12' },
  { id: 'G12', name: 'Cellar Stair', zh: '地下室楼梯间', level: 'G', x: [36, 42], y: [16, 22], kind: 'stair' },
  { id: 'G13', name: 'Library Antechamber', zh: '图书室前室', level: 'G', x: [10, 16], y: [18, 24], kind: 'room' },
  { id: 'G14', name: 'Library', zh: '图书室', level: 'G', x: [16, 26], y: [18, 26], kind: 'room', cam: 'CF13' },
  { id: 'G15', name: 'Map Room', zh: '建筑图室', level: 'G', x: [26, 34], y: [18, 26], kind: 'room', cam: 'CF14' },
  { id: 'G16', name: 'Staff Corridor', zh: '仆人走廊', level: 'G', x: [34, 40], y: [22, 32], kind: 'corridor', cam: 'CF15' },
  { id: 'G17', name: 'Staff Office', zh: '员工办公室', level: 'G', x: [28, 34], y: [26, 32], kind: 'room', cam: 'CF16' },
  { id: 'G18', name: 'Laundry', zh: '洗衣间', level: 'G', x: [28, 34], y: [32, 38], kind: 'room' },
  { id: 'G19', name: 'Servant Stair', zh: '仆人楼梯', level: 'G', x: [34, 40], y: [32, 38], kind: 'stair' },
  { id: 'G20', name: 'Boot Room', zh: '靴具储藏室', level: 'G', x: [40, 46], y: [22, 28], kind: 'room' },
  { id: 'G21', name: 'Back Porch', zh: '后门廊', level: 'G', x: [46, 50], y: [22, 28], kind: 'outdoor' },
  { id: 'G22', name: 'Conservatory Walk', zh: '玻璃廊', level: 'G', x: [-10, 0], y: [15.5, 19.5], kind: 'corridor', cam: 'CF17', assumed: 'Spec D-G08 opens Music Salon west wall (X=0) to a glass gallery, and §5 places garden X[-20,-10]; the gallery between them has no coordinates. Placed X[-10,0] Y[15.5,19.5].' },
  { id: 'O01', name: 'West Garden', zh: '西侧花园', level: 'G', x: [-20, -10], y: [12, 25], kind: 'outdoor' },
  { id: 'O02', name: 'Greenhouse', zh: '温室', level: 'G', x: [-32, -20], y: [14, 24], kind: 'room', cam: 'CF18' },
  { id: 'O03', name: "Gardener's Potting Shed", zh: '园丁工具房', level: 'G', x: [-28, -22], y: [24, 30], kind: 'room', cam: 'CF19' },
  { id: 'O04', name: 'Shed Path', zh: '工具房小径', level: 'G', x: [-22, -10], y: [25, 30], kind: 'outdoor', assumed: 'Shed entrance faces east onto a path strip along the north edge of the garden (a 2 m strip beside the greenhouse wall was too narrow once walls have thickness).' },
  { id: 'O05', name: 'Approach & Mountain Road', zh: '山路与前道', level: 'G', x: [10, 30], y: [-35, -5], kind: 'outdoor', cam: 'CF01' },
  // ---------------- First floor (U) ----------------
  { id: 'U01', name: 'Upper Landing', zh: '二楼楼梯平台', level: 'U', x: [20, 26], y: [8, 14], kind: 'stair', cam: 'CU01' },
  { id: 'U02', name: 'Nursery', zh: '儿童房', level: 'U', x: [0, 10], y: [4, 14], kind: 'room', cam: 'CU02' },
  { id: 'U03', name: 'Guest Bedroom', zh: '客房', level: 'U', x: [10, 20], y: [4, 14], kind: 'room', cam: 'CU03' },
  { id: 'U04', name: 'Master Bedroom', zh: '主卧室', level: 'U', x: [26, 36], y: [4, 14], kind: 'room', cam: 'CU04' },
  { id: 'U05', name: 'Dressing Room', zh: '衣帽间', level: 'U', x: [36, 42], y: [4, 10], kind: 'room' },
  { id: 'U06', name: 'Master Bathroom', zh: '主卫', level: 'U', x: [36, 42], y: [10, 16], kind: 'room' },
  { id: 'U07', name: 'Upper Gallery', zh: '二楼长廊', level: 'U', x: [6, 36], y: [14, 17], kind: 'corridor' },
  { id: 'U08', name: 'West Bedroom', zh: '西卧室', level: 'U', x: [0, 6], y: [17, 25], kind: 'room' },
  { id: 'U09', name: 'Family Sitting Room', zh: '家庭起居室', level: 'U', x: [10, 20], y: [17, 25], kind: 'room', cam: 'CU05' },
  { id: 'U10', name: 'Linen Room', zh: '亚麻储藏室', level: 'U', x: [20, 26], y: [17, 23], kind: 'room', cam: 'CU07' },
  { id: 'U11', name: 'Hunting Room', zh: '狩猎室', level: 'U', x: [26, 36], y: [17, 25], kind: 'room', cam: 'CU06' },
  { id: 'U12', name: 'West Bedroom Passage', zh: '西卧室过道', level: 'U', x: [6, 10], y: [17, 20], kind: 'corridor' },
  { id: 'U13', name: 'Servant Passage', zh: '仆人过道', level: 'U', x: [34, 40], y: [25, 32], kind: 'corridor', cam: 'CU08' },
  { id: 'U14', name: 'Servant Stair Landing', zh: '仆人楼梯平台', level: 'U', x: [34, 40], y: [32, 38], kind: 'stair' },
  // ---------------- Attic (A) ----------------
  { id: 'A01', name: 'Attic Landing', zh: '阁楼入口平台', level: 'A', x: [20, 26], y: [17, 23], kind: 'room', h: 2.4, cam: 'CA01' },
  { id: 'A02', name: 'Storage Loft', zh: '储物阁楼', level: 'A', x: [8, 20], y: [17, 27], kind: 'room', h: 1.9, cam: 'CA02' },
  { id: 'A03', name: "Housekeeper's Quarters", zh: '女管家住处', level: 'A', x: [20, 28], y: [23, 30], kind: 'room', h: 2.5, cam: 'CA03' },
  { id: 'A04', name: 'Bell Loft', zh: '电铃阁楼', level: 'A', x: [28, 40], y: [17, 27], kind: 'room', h: 3.8, cam: 'CA04' },
  { id: 'A05', name: 'Clock Chamber', zh: '钟室', level: 'A', x: [40, 48], y: [17, 25], kind: 'room', h: 3.2, cam: 'CA05' },
  { id: 'A06', name: 'Roof Access', zh: '屋顶检修口', level: 'A', x: [28, 34], y: [27, 32], kind: 'room', h: 2.2, cam: 'CA06' },
  { id: 'A07', name: 'Service Catwalk', zh: '检修步道', level: 'A', x: [34, 40], y: [27, 32], kind: 'corridor', h: 2.2 },
  { id: 'A08', name: 'Service Stair Head', zh: '服务楼梯顶', level: 'A', x: [34, 40], y: [32, 38], kind: 'stair', h: 2.4 },
  // ---------------- Basement (B) ----------------
  { id: 'B01', name: 'Cellar Landing', zh: '地下室平台', level: 'B', x: [36, 42], y: [16, 22], kind: 'stair', cam: 'CB01' },
  { id: 'B02', name: 'Wine Cellar', zh: '酒窖', level: 'B', x: [26, 36], y: [16, 22], kind: 'room', cam: 'CB02' },
  { id: 'B03', name: 'Coal Store', zh: '煤仓', level: 'B', x: [26, 32], y: [22, 28], kind: 'room' },
  { id: 'B04', name: 'Boiler Room', zh: '锅炉房', level: 'B', x: [32, 42], y: [22, 30], kind: 'room', cam: 'CB03' },
  { id: 'B05', name: 'Boiler Office', zh: '锅炉办公室', level: 'B', x: [42, 48], y: [22, 28], kind: 'room', cam: 'CB04' },
  { id: 'B06', name: 'Pump Room', zh: '水泵房', level: 'B', x: [42, 50], y: [14, 22], kind: 'room', cam: 'CB05' },
  { id: 'B07', name: 'Water Gallery', zh: '水廊', level: 'B', x: [32, 42], y: [10, 16], kind: 'room', cam: 'CB06' },
  // Lower levels: the spec lists these as basement rooms, but B08 overlaps B02 in plan (X26-32, Y16-20).
  // assumed: Lower Cistern and everything west of it sit on the natural level (Z=-5.8), reached by a stair
  // inside B08 from door B-D09. This also matches "地下自然空间 Z=-5.8, 4-7 m".
  { id: 'B08', name: 'Lower Cistern', zh: '下层蓄水池', level: 'N', x: [20, 32], y: [10, 20], kind: 'room', h: 2.5, cam: 'CB07', assumed: 'Placed at Z=-5.8 (plan overlap with Wine Cellar). Ceiling limited to 2.5 m under the cellar slab.' },
  { id: 'B09', name: 'Resonance Chamber', zh: '共鸣室', level: 'N', x: [8, 20], y: [14, 24], kind: 'room', h: 5.2, cam: 'CB08' },
  { id: 'B10', name: 'Drainage Tunnel', zh: '排水隧道', level: 'B', x: [0, 8], y: [18, 22], kind: 'corridor', h: 2.6, cam: 'CB09', ramp: { axis: 'x', from: 8, to: 3.4, z0: -5.8, z1: -3.2 }, assumed: 'Spec §7 puts T7 (Sluice Control) at Z=-3.2 while the cistern/resonance chain must sit at -5.8; the tunnel rises 2.6 m westward (stepped ramp X 8→1.5) so B11-B13 are at -3.2.' },
  { id: 'B11', name: 'Outer Sluice', zh: '外部水闸', level: 'B', x: [0, 6], y: [22, 28], kind: 'room', h: 4.0, cam: 'CB10' },
  { id: 'B12', name: 'Sluice Control Room', zh: '水闸控制室', level: 'B', x: [-6, 0], y: [22, 28], kind: 'room', h: 2.6 },
  { id: 'B13', name: 'Garden Drainage Crawlway', zh: '花园排水爬道', level: 'B', x: [-18, 0], y: [18, 22], kind: 'corridor', h: 1.6 },
];

// Doors: wall = 'x' (vertical wall at X = at) or 'y' (wall at Y = at); span along the other axis.
// width = span length. kind: single | double | service | hidden | hatch | arch | exterior
export const DOORS = [
  { id: 'D-G01', a: 'G01', b: 'G02', wall: 'y', at: 0, span: [17.0, 19.0], kind: 'double' },
  { id: 'D-G02', a: 'G02', b: 'G03', wall: 'y', at: 4, span: [17.0, 18.2], kind: 'single' },
  { id: 'D-G03', a: 'G03', b: 'G04', wall: 'x', at: 10, span: [5.4, 6.6], kind: 'single' },
  { id: 'D-G04', a: 'G03', b: 'G06', wall: 'y', at: 8, span: [12.5, 13.7], kind: 'single' },
  { id: 'D-G05', a: 'G03', b: 'G07', wall: 'x', at: 26, span: [5.2, 6.2], kind: 'service' },
  { id: 'D-G06', a: 'G03', b: 'G08', wall: 'y', at: 8, span: [22.0, 23.2], kind: 'single' },
  { id: 'D-G07', a: 'G04', b: 'G05', wall: 'y', at: 14, span: [4.2, 5.4], kind: 'single' },
  { id: 'D-G08', a: 'G05', b: 'G22', wall: 'x', at: 0, span: [17.0, 18.2], kind: 'single' },
  { id: 'D-G09', a: 'G06', b: 'G09', wall: 'x', at: 20, span: [15.1, 16.3], kind: 'single' },
  { id: 'D-G10', a: 'G09', b: 'G10', wall: 'x', at: 26, span: [15.1, 16.3], kind: 'single', lock: 'house_service_key' },
  { id: 'D-G11', a: 'G10', b: 'G11', wall: 'x', at: 36, span: [12.1, 13.1], kind: 'service' },
  { id: 'D-G12', a: 'G11', b: 'G12', wall: 'y', at: 16, span: [38.1, 39.1], kind: 'service' },
  { id: 'D-G13', a: 'G12', b: 'G16', wall: 'y', at: 22, span: [37.2, 38.4], kind: 'service' },
  { id: 'D-G14', a: 'G06', b: 'G13', wall: 'y', at: 18, span: [12.0, 13.2], kind: 'single' },
  { id: 'D-G15', a: 'G13', b: 'G14', wall: 'x', at: 16, span: [20.0, 21.2], kind: 'single' },
  { id: 'D-G16', a: 'G14', b: 'G15', wall: 'x', at: 26, span: [22.0, 23.4], kind: 'hidden', lock: 'puzzle_library_bookcase' },
  { id: 'D-G17', a: 'G15', b: 'G16', wall: 'x', at: 34, span: [23.2, 24.4], kind: 'hidden', oneWayFrom: 'G15' },
  { id: 'D-G18', a: 'G17', b: 'G16', wall: 'x', at: 34, span: [28.2, 29.2], kind: 'service' },
  { id: 'D-G19', a: 'G17', b: 'G18', wall: 'y', at: 32, span: [30.0, 31.2], kind: 'service' },
  { id: 'D-G20', a: 'G16', b: 'G19', wall: 'y', at: 32, span: [36.4, 37.6], kind: 'service' },
  { id: 'D-G21', a: 'G16', b: 'G20', wall: 'x', at: 40, span: [24.0, 25.2], kind: 'service' },
  { id: 'D-G23', a: 'G18', b: 'G19', wall: 'x', at: 34, span: [35.0, 35.9], kind: 'service', assumed: 'Chapter 2 needs a "small service passage behind the laundry" back toward the kitchen; MAP V1.0 gives none. A service door Laundry→Servant Stair closes the loop Laundry→Servant Stair→Staff Corridor→Cellar Stair→Scullery→Kitchen.' },
  { id: 'D-G22', a: 'G20', b: 'G21', wall: 'x', at: 46, span: [24.0, 25.2], kind: 'exterior', lock: 'storm_barred' },
  // assumed openings (spec gives the spaces but not the openings)
  { id: 'D-O01', a: 'G22', b: 'O01', wall: 'x', at: -10, span: [17.0, 18.2], kind: 'single', assumed: 'Glass gallery end door into the garden.' },
  { id: 'D-O02', a: 'O01', b: 'O02', wall: 'x', at: -20, span: [18.4, 19.6], kind: 'single', assumed: 'Greenhouse "入口朝东".' },
  { id: 'D-O03', a: 'O03', b: 'O04', wall: 'x', at: -22, span: [26.4, 27.4], kind: 'single', assumed: 'Shed entrance faces east onto the path.' },
  { id: 'D-O04', a: 'O04', b: 'O01', wall: 'y', at: 25, span: [-17.0, -15.0], kind: 'arch', assumed: 'Path opens onto the garden.' },
  { id: 'D-O05', a: 'O05', b: 'G01', wall: 'y', at: -5, span: [16.0, 20.0], kind: 'arch', assumed: 'Steps from the drive up to the portico.' },
  // ---------------- First floor ----------------
  { id: 'U-D01', a: 'U01', b: 'U07', wall: 'y', at: 14, span: [22.0, 23.2], kind: 'arch', lock: 'house_service_key', note: 'Spec labels this "主楼梯 → Upper Landing" but places it on the landing/gallery wall; built as a second landing opening (stair arrives vertically inside U01).' },
  { id: 'U-D02', a: 'U01', b: 'U07', wall: 'y', at: 14, span: [23.5, 24.7], kind: 'single', lock: 'house_service_key' },
  { id: 'U-D03', a: 'U02', b: 'U07', wall: 'y', at: 14, span: [7.0, 8.2], kind: 'single' },
  { id: 'U-D04', a: 'U03', b: 'U07', wall: 'y', at: 14, span: [14.0, 15.2], kind: 'single' },
  { id: 'U-D05', a: 'U04', b: 'U07', wall: 'y', at: 14, span: [29.0, 30.2], kind: 'single' },
  { id: 'U-D06', a: 'U09', b: 'U07', wall: 'y', at: 17, span: [12.0, 13.2], kind: 'single' },
  { id: 'U-D07', a: 'U10', b: 'U07', wall: 'y', at: 17, span: [21.0, 22.2], kind: 'single' },
  { id: 'U-D08', a: 'U11', b: 'U07', wall: 'y', at: 17, span: [29.0, 30.2], kind: 'single', lock: 'hunting_room_key' },
  { id: 'U-D09', a: 'U08', b: 'U12', wall: 'x', at: 6, span: [18.0, 19.2], kind: 'single' },
  { id: 'U-D10', a: 'U12', b: 'U07', wall: 'y', at: 17, span: [7.0, 8.2], kind: 'single' },
  { id: 'U-D11', a: 'U04', b: 'U05', wall: 'x', at: 36, span: [6.0, 7.2], kind: 'single' },
  { id: 'U-D12', a: 'U04', b: 'U06', wall: 'x', at: 36, span: [11.4, 12.6], kind: 'single' },
  { id: 'U-D13', a: 'U05', b: 'U06', wall: 'y', at: 10, span: [38.0, 39.2], kind: 'single' },
  { id: 'U-D14', a: 'U11', b: 'U13', wall: 'y', at: 25, span: [34.8, 36.0], kind: 'service', note: 'Spec X=35-36.2 extends 0.2 m past the Hunting Room east wall (X=36); shifted to 34.8-36.0 so the full leaf sits in the shared wall.' },
  { id: 'U-D15', a: 'U13', b: 'U14', wall: 'y', at: 32, span: [36.0, 37.2], kind: 'service' },
  // ---------------- Attic (all assumed: spec lists the connections, not the openings) ----------------
  { id: 'A-D01', a: 'A01', b: 'A02', wall: 'x', at: 20, span: [19.4, 20.4], kind: 'service', assumed: 'Landing → Storage Loft (west).' },
  { id: 'A-D02', a: 'A01', b: 'A03', wall: 'y', at: 23, span: [22.4, 23.4], kind: 'service', assumed: 'Landing → Quarters (north).' },
  { id: 'A-D03', a: 'A03', b: 'A04', wall: 'x', at: 28, span: [24.5, 25.5], kind: 'service', assumed: 'Quarters → Bell Loft (east).' },
  { id: 'A-D04', a: 'A04', b: 'A05', wall: 'x', at: 40, span: [20.5, 21.5], kind: 'service', lock: 'brass_winding_key', assumed: 'Bell Loft → Clock Chamber.' },
  { id: 'A-D05', a: 'A04', b: 'A06', wall: 'y', at: 27, span: [30.5, 31.5], kind: 'service', assumed: 'Bell Loft → Roof Access (north).' },
  { id: 'A-D06', a: 'A04', b: 'A07', wall: 'y', at: 27, span: [36.5, 37.5], kind: 'service', assumed: 'Bell Loft → Service Catwalk.' },
  { id: 'A-D07', a: 'A07', b: 'A08', wall: 'y', at: 32, span: [36.5, 37.5], kind: 'service', assumed: 'Catwalk → Service Stair Head.' },
  // ---------------- Basement / natural level ----------------
  { id: 'B-D01', a: 'B01', b: 'B02', wall: 'x', at: 36, span: [18.0, 19.2], kind: 'service' },
  { id: 'B-D02', a: 'B01', b: 'B06', wall: 'x', at: 42, span: [18.0, 19.2], kind: 'service' },
  { id: 'B-D03', a: 'B01', b: 'B07', wall: 'y', at: 16, span: [38.0, 39.2], kind: 'service' },
  { id: 'B-D04', a: 'B01', b: 'B04', wall: 'y', at: 22, span: [38.0, 39.2], kind: 'service' },
  { id: 'B-D05', a: 'B02', b: 'B03', wall: 'y', at: 22, span: [28.0, 29.2], kind: 'service' },
  { id: 'B-D06', a: 'B03', b: 'B04', wall: 'x', at: 32, span: [24.0, 25.2], kind: 'service' },
  { id: 'B-D07', a: 'B04', b: 'B05', wall: 'x', at: 42, span: [24.0, 25.2], kind: 'service' },
  { id: 'B-D08', a: 'B05', b: 'B06', wall: 'y', at: 22, span: [44.0, 45.2], kind: 'service' },
  { id: 'B-D09', a: 'B07', b: 'B08', wall: 'x', at: 32, span: [12.0, 13.2], kind: 'service', drop: 2.6, note: 'Level change -3.2 → -5.8 via a stair inside B08.' },
  { id: 'B-D10', a: 'B08', b: 'B09', wall: 'x', at: 20, span: [16.0, 17.2], kind: 'service' },
  { id: 'B-D11', a: 'B09', b: 'B10', wall: 'x', at: 8, span: [18.0, 19.2], kind: 'service', drop: 2.6, note: 'Tunnel starts at -5.8 here and rises westward.' },
  { id: 'B-D12', a: 'B10', b: 'B13', wall: 'x', at: 0, span: [19.0, 20.2], kind: 'service' },
  { id: 'B-D13', a: 'B10', b: 'B11', wall: 'y', at: 22, span: [2.0, 3.2], kind: 'service' },
  { id: 'B-D14', a: 'B11', b: 'B12', wall: 'x', at: 0, span: [24.0, 25.2], kind: 'service' },
];

// Vertical connections. footprint: where the stair/ladder physically sits (spec coords).
export const STAIRS = [
  // run: the flight's walking line; z of room `a` at run.from, z of room `b` at run.to.
  { id: 'S01', a: 'G08', b: 'U01', type: 'straight', footprint: { x: [24.6, 25.9], y: [8.6, 14.0] }, run: { axis: 'y', from: 8.6, to: 14.0 }, rise: 3.7, note: 'Straight flight up the east wall; foot beside door D-G06, head beside landing doors U-D01/U-D02 (a dog-leg in 6x6 would strand the arrival at the south edge).' },
  { id: 'S02', a: 'G19', b: 'U14', type: 'straight', footprint: { x: [38.6, 39.9], y: [32.4, 37.8] }, run: { axis: 'y', from: 32.4, to: 37.8 }, rise: 3.7 },
  { id: 'S03', a: 'G12', b: 'B01', type: 'straight', footprint: { x: [39.5, 40.8], y: [16.9, 21.7] }, run: { axis: 'y', from: 21.7, to: 16.9 }, rise: 3.2, lock: 'bolt_cutters', note: 'Descends southward, held 1.1 m off the east wall so the passage behind it reaches Pump Room door B-D02 (against the wall the flight would bury that door); heavy chain at the head (spec §8.1).' },
  { id: 'S04', a: 'U10', b: 'A01', type: 'hatch', footprint: { x: [22.0, 23.0], y: [21.8, 22.8] }, rise: 3.3, note: 'Linen Room hatch on its north side (spec §2.3).' },
  { id: 'S05', a: 'U14', b: 'A08', type: 'straight', footprint: { x: [34.1, 35.4], y: [32.4, 37.3] }, run: { axis: 'y', from: 32.4, to: 37.3 }, rise: 3.3 },
  { id: 'S06', a: 'B11', b: 'O05', type: 'shaft', footprint: { x: [2.0, 4.0], y: [27.0, 28.0] }, rise: 3.2, oneWayFrom: 'B11', note: 'Exit shaft to the valley road (spec §4.4); grate opens from inside only, so it cannot be used to enter early.' },
  { id: 'S07', a: 'B13', b: 'O01', type: 'shaft', footprint: { x: [-16.0, -15.0], y: [19.4, 20.4] }, rise: 3.2, lock: 'garden_drainage_open', assumed: 'Garden drainage well (spec §5.6) — inspection shaft with ladder.' },
  { id: 'S08', a: 'B07', b: 'B08', host: 'B08', type: 'straight', footprint: { x: [28.0, 32.0], y: [12.0, 13.2] }, run: { axis: 'x', from: 32.0, to: 28.0 }, rise: 2.6, assumed: 'Steps inside the Lower Cistern from door B-D09 down to Z=-5.8.' },
];

export const TYPEWRITERS = [
  { id: 'T1', room: 'G07', at: [31.0, 8.2, 0.0] }, { id: 'T2', room: 'G17', at: [29.5, 30.2, 0.0] }, { id: 'T3', room: 'U10', at: [21.5, 20.5, 3.7] },
  { id: 'T4', room: 'O03', at: [-25.0, 28.0, 0.0] }, { id: 'T5', room: 'A03', at: [21.5, 27.8, 7.0] }, { id: 'T6', room: 'B05', at: [46.0, 26.0, -3.2] }, { id: 'T7', room: 'B12', at: [-4.0, 26.0, -3.2] },
];

export const KEY_ITEMS = [
  { id: 'house_service_key', room: 'G07', note: 'hidden drawer' }, { id: 'fire_poker', room: 'G04' }, { id: 'pipe_wrench', room: 'G10' }, { id: 'bolt_cutters', room: 'G20' },
  { id: 'brass_winding_key', room: 'U04', note: 'family side quest' }, { id: 'bell_damper', room: 'A04', note: 'bell board side quest' }, { id: 'generator_fuse', room: 'G09' },
  { id: 'generator_crank', room: 'G11' }, { id: 'shotgun', room: 'U11' }, { id: 'pump_valve', room: 'O02' }, { id: 'sluice_wheel', room: 'B04' },
];

// Spec §11.3 required routes (rooms in order).
export const ROUTES = [
  ['G01', 'G02', 'G03', 'G04'],
  ['G03', 'G06', 'G13', 'G14', 'G15'],
  ['G06', 'G09', 'G10', 'G11'],
  ['G10', 'G11', 'G12'],
  ['G12', 'G16', 'G20', 'G21'],
  ['G10', 'G16', 'G17'],
  ['G05', 'G22', 'O01', 'O02'],
  ['G08', 'U01', 'U07', 'U02', 'U03', 'U04', 'U09', 'U10', 'U11', 'U08'],
  ['U10', 'A01', 'A04'],
  ['G11', 'B01', 'B04', 'B06'],
  ['B08', 'B09', 'B10', 'B11'],
  ['B13', 'B10'],
];

export const toEngine = (X, Y, Z = 0) => [X, Z, -Y];
export const roomById = (id) => ROOMS.find((r) => r.id === id);
export const levelZ = (r) => LEVELS[r.level].z;
export const roomHeight = (r) => r.h ?? LEVELS[r.level].h ?? 3;
