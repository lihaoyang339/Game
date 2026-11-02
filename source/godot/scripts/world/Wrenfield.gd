class_name Wrenfield
extends World
## Wrenfield Manor, MAP V1.0 greybox (all levels), built from data/wrenfield.json (exported from the
## three.js layout code, so geometry is identical to the validated greybox). Spec coords -> engine:
## x = X, y = Z, z = -Y.

const DATA := "res://data/wrenfield.json"
const LEVEL_ORDER := ["N", "B", "G", "U", "A"]
const COL := {"wall": Color(0.62, 0.6, 0.56), "ext": Color(0.5, 0.48, 0.45), "lintel": Color(0.55, 0.53, 0.5), "sill": Color(0.45, 0.43, 0.4),
	"locked": Color(0.55, 0.16, 0.12), "balustrade": Color(0.35, 0.25, 0.18), "understair": Color(0.4, 0.38, 0.35), "stair": Color(0.42, 0.33, 0.24),
	"floor": Color(0.36, 0.33, 0.29), "outdoor": Color(0.22, 0.26, 0.2), "ceiling": Color(0.7, 0.68, 0.64), "ladder": Color(0.3, 0.3, 0.32)}

var data: Dictionary
var levels := {}               # level -> Node3D
var level_z := {}
var locked := {}               # lock key -> [CollisionShape3D, MeshInstance3D-surface owner]
var ladders: Array = []        # {pos_bottom, pos_top, one_way_from_bottom, lock}
var _st := {}                  # (level|kind) -> SurfaceTool
var _lights := []
var unlocked_all := false
var _cur_level := "G"

static func E(X: float, Y: float, Z: float) -> Vector3:
	return Vector3(X, Z, -Y)

func _init() -> void:
	world_name = "wrenfield"

func build(progress: Callable = Callable()) -> void:
	data = JSON.parse_string(FileAccess.get_file_as_string(DATA))
	make_environment()
	env.ambient_light_color = Color(0.55, 0.58, 0.66)
	env.ambient_light_energy = 0.22
	env.fog_light_color = Color(0.04, 0.04, 0.045)
	env.fog_density = 0.01
	for l in LEVEL_ORDER:
		var n := Node3D.new(); n.name = "Level_" + l; add_child(n); levels[l] = n
		level_z[l] = float(data.LEVELS[l].z)
	var L: Dictionary = data.layout
	var voids: Array = L.slabs.filter(func(s): return s.kind == "void")
	# rooms
	for r in data.ROOMS:
		var z: float = data.LEVELS[r.level].z
		var h: float = r.get("h", data.LEVELS[r.level].get("h", 3.0))
		var z0 := z; var z1 := z + h
		if r.has("ramp"):
			z0 = minf(r.ramp.z0, r.ramp.z1); z1 = maxf(r.ramp.z0, r.ramp.z1) + h
		var a := AABB(E(r.x[0], r.y[1], z0 - 0.1), Vector3(r.x[1] - r.x[0], z1 - z0 + 0.2, r.y[1] - r.y[0]))
		rooms[r.id] = {"id": r.id, "name": r.get("zh", r.name), "aabb": a, "level": r.level, "neighbors": [], "kind": r.kind,
			"acoustics": [0.35, 0.08] if r.kind == "outdoor" else ([0.75, 0.2] if r.kind == "corridor" else [0.55, 0.14])}
	if progress.is_valid(): progress.call(0.1)
	# colliders (walls, lintels, sills, locked leaves, balustrades, under-stair mass) -> boxes + merged meshes
	for c in L.colliders:
		var tag: String = c.tag
		var cz1: float = c.z1
		if tag == "sill":
			cz1 -= 0.05  # filler under thresholds: keep clear of the floor plane (Jolt contact slop)
		var center := E(c.x, c.y, (c.z0 + cz1) * 0.5)
		var size := Vector3(c.w, cz1 - c.z0, c.d)
		var lvl := _level_of(c.z0 + 0.3)
		var kind := "locked" if tag.begins_with("locked:") else tag
		if kind == "wall" and _is_exterior(c):
			kind = "ext"
		_box_mesh(lvl, kind, center, size)
		if tag.begins_with("locked:"):
			var key := tag.substr(7)
			var cs := _locked_box(center, size)
			if not locked.has(key): locked[key] = []
			locked[key].append(cs)
		else:
			add_box(center, size, 0.0, kind in ["wall", "ext"] and size.y > 2.0)
	if progress.is_valid(): progress.call(0.35)
	# floors + ceilings (cut around stair voids), ramps for flights
	for s in L.slabs:
		if s.kind == "void":
			continue
		var lvl := _level_of(float(s.z) + (0.3 if s.kind == "floor" else -0.3))
		if s.kind == "floor" and s.get("ramp") != null:
			_ramp(s.x, s.y, s.ramp, lvl, "floor" if not s.outdoor else "outdoor")
			# flat floor beyond each end of the slope (three.js floorAt clamps the ramp there)
			var rp: Dictionary = s.ramp
			var lo: float = minf(rp.from, rp.to); var hi: float = maxf(rp.from, rp.to)
			var z_lo: float = rp.z0 if rp.from < rp.to else rp.z1
			var z_hi: float = rp.z1 if rp.from < rp.to else rp.z0
			var ax: int = 0 if rp.axis == "x" else 1
			var ext: Array = s.x if ax == 0 else s.y
			for seg in [[ext[0], lo, z_lo], [hi, ext[1], z_hi]]:
				if seg[1] - seg[0] < 0.02:
					continue
				var xr: Array = [seg[0], seg[1]] if ax == 0 else s.x
				var yr: Array = s.y if ax == 0 else [seg[0], seg[1]]
				var c := E((xr[0] + xr[1]) * 0.5, (yr[0] + yr[1]) * 0.5, seg[2] - 0.075)
				var sz := Vector3(xr[1] - xr[0], 0.15, yr[1] - yr[0])
				_box_mesh(_level_of(seg[2] + 0.3), "floor", c, sz)
				add_box(c, sz, 0.0, false)
			continue
		var top: float = s.z if s.kind == "floor" else float(s.z) + float(s.t)
		var bot: float = top - float(s.t)
		var rects := [[s.x[0], s.x[1], s.y[0], s.y[1]]]
		for v in voids:
			if (s.kind == "floor" and absf(v.z - s.z) < 0.01) or (s.kind == "ceiling" and v.z > s.z - 0.8 and v.z < s.z + 0.8):
				rects = _subtract(rects, [v.x[0], v.x[1], v.y[0], v.y[1]])
		for r in rects:
			var center := E((r[0] + r[1]) * 0.5, (r[2] + r[3]) * 0.5, (top + bot) * 0.5)
			var size := Vector3(r[1] - r[0], top - bot, r[3] - r[2])
			_box_mesh(lvl, "ceiling" if s.kind == "ceiling" else ("outdoor" if s.outdoor else "floor"), center, size)
			add_box(center, size, 0.0, false)
	for st in L.stairs:
		if st.kind == "flight":
			_flight(st)
		else:
			_ladder(st)
	if progress.is_valid(): progress.call(0.55)
	_thresholds()
	_labels()
	_room_lights()
	_commit_meshes()
	# locked doors as interactable (try: needs key)
	for d in data.DOORS:
		if d.has("lock"):
			var door := Door.new()
			var mid: float = (d.span[0] + d.span[1]) * 0.5
			var a = _room(d.a); var b = _room(d.b)
			var z: float = maxf(_floor_z(a), _floor_z(b))
			door.position = E(d.at, mid, z) if d.wall == "x" else E(mid, d.at, z)
			door.locked_lines = ["锁着。", "需要：" + _key_name(d.lock)]
			door.set_meta("lock", d.lock)
			add_child(door)
			doors.append(door)
		var ra = _room(d.a); var rb = _room(d.b)
		if ra and rb:
			rooms[d.a].neighbors.append(d.b); rooms[d.b].neighbors.append(d.a)
	spawn = Transform3D(Basis(Vector3.UP, PI), E(18.0, -3.0, 0.05))
	bake_navigation(0.15, 0.35, 1.9, 0.45)
	if progress.is_valid(): progress.call(0.9)
	set_player_room("G01")

func _room(id: String):
	for r in data.ROOMS:
		if r.id == id:
			return r
	return null

func _floor_z(r) -> float:
	if r == null:
		return 0.0
	if r.has("ramp"):
		return minf(r.ramp.z0, r.ramp.z1)
	return data.LEVELS[r.level].z

func _key_name(k: String) -> String:
	var names := {"house_service_key": "仆役门钥匙", "bolt_cutters": "断线钳", "garden_drainage_open": "打开花园排水井"}
	return names.get(k, k)

func _level_of(z: float) -> String:
	var best := "G"
	for l in LEVEL_ORDER:
		if z >= level_z[l] - 0.2:
			best = l
	return best

func _is_exterior(c: Dictionary) -> bool:
	return absf(c.w - 0.35) < 0.01 or absf(c.d - 0.35) < 0.01

static func _subtract(rects: Array, v: Array) -> Array:
	var out := []
	for r in rects:
		if v[0] >= r[1] or v[1] <= r[0] or v[2] >= r[3] or v[3] <= r[2]:
			out.append(r); continue
		if v[0] > r[0]: out.append([r[0], v[0], r[2], r[3]])
		if v[1] < r[1]: out.append([v[1], r[1], r[2], r[3]])
		var x0 := maxf(r[0], v[0]); var x1 := minf(r[1], v[1])
		if v[2] > r[2]: out.append([x0, x1, r[2], v[2]])
		if v[3] < r[3]: out.append([x0, x1, v[3], r[3]])
	return out

func _locked_box(center: Vector3, size: Vector3) -> CollisionShape3D:
	var body := get_node_or_null("Locked") as StaticBody3D
	if body == null:
		body = StaticBody3D.new(); body.name = "Locked"; body.collision_layer = L_WORLD; body.collision_mask = 0; add_child(body)
	var cs := CollisionShape3D.new(); var b := BoxShape3D.new(); b.size = size; cs.shape = b; cs.position = center
	body.add_child(cs)
	return cs

## Open every lock (debug key K, or for the walk test which assumes keys are held).
func set_unlocked(v: bool) -> void:
	unlocked_all = v
	for k in locked:
		for cs in locked[k]:
			cs.disabled = v
	for d in doors:
		if d.has_meta("lock"):
			d.locked_lines = [] if v else ["锁着。", "需要：" + _key_name(d.get_meta("lock"))]

# ---------------------------------------------------------------- mesh building (merged per level+kind)
func _st_for(lvl: String, kind: String) -> SurfaceTool:
	var k := lvl + "|" + kind
	if not _st.has(k):
		var st := SurfaceTool.new(); st.begin(Mesh.PRIMITIVE_TRIANGLES); _st[k] = st
	return _st[k]

func _box_mesh(lvl: String, kind: String, center: Vector3, size: Vector3, basis := Basis.IDENTITY) -> void:
	var st := _st_for(lvl, kind)
	var h := size * 0.5
	var faces := [[Vector3.RIGHT, Vector3.UP, Vector3.BACK], [Vector3.LEFT, Vector3.UP, Vector3.FORWARD], [Vector3.UP, Vector3.BACK, Vector3.RIGHT],
		[Vector3.DOWN, Vector3.FORWARD, Vector3.RIGHT], [Vector3.BACK, Vector3.UP, Vector3.LEFT], [Vector3.FORWARD, Vector3.UP, Vector3.RIGHT]]
	for f in faces:
		var n: Vector3 = f[0]; var u: Vector3 = f[1]; var v: Vector3 = f[2]
		var c := n * h
		var uu := u * h; var vv := v * h
		var p := [c - uu - vv, c + uu - vv, c + uu + vv, c - uu + vv]
		var wn := (basis * n).normalized()
		# world-scale UVs so a tiling grid texture keeps 1 m squares
		var su := (u * size).length(); var sv := (v * size).length()
		var uv := [Vector2(0, sv), Vector2(0, 0), Vector2(su, 0), Vector2(su, sv)]
		for i in [0, 2, 1, 0, 3, 2]:
			st.set_normal(wn); st.set_uv(uv[i]); st.add_vertex(center + basis * p[i])

func _commit_meshes() -> void:
	for k in _st:
		var parts: PackedStringArray = k.split("|")
		var st: SurfaceTool = _st[k]
		st.generate_tangents()
		var mi := MeshInstance3D.new()
		mi.name = "%s_%s" % [parts[1], parts[0]]
		mi.mesh = st.commit()
		mi.material_override = _mat(parts[1])
		if parts[1] in ["ceiling"]:
			mi.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_ON
		levels[parts[0]].add_child(mi)
	_st.clear()

func _mat(kind: String) -> Material:
	var m := StandardMaterial3D.new()
	m.albedo_color = COL.get(kind, Color.GRAY)
	m.roughness = 0.85
	m.albedo_texture = _grid_tex()
	m.texture_filter = BaseMaterial3D.TEXTURE_FILTER_LINEAR_WITH_MIPMAPS_ANISOTROPIC
	if kind == "locked":
		m.emission_enabled = true; m.emission = Color(0.5, 0.05, 0.03); m.emission_energy_multiplier = 0.4
	return m

var _grid: Texture2D
func _grid_tex() -> Texture2D:
	if _grid:
		return _grid
	var img := Image.create(256, 256, true, Image.FORMAT_RGBA8)
	img.fill(Color(1, 1, 1))
	for i in 256:
		for w in 2:
			img.set_pixel(i, w, Color(0.72, 0.72, 0.72)); img.set_pixel(w, i, Color(0.72, 0.72, 0.72))
			img.set_pixel(i, 128 + w, Color(0.86, 0.86, 0.86)); img.set_pixel(128 + w, i, Color(0.86, 0.86, 0.86))
	img.generate_mipmaps()
	_grid = ImageTexture.create_from_image(img)
	return _grid

# ---------------------------------------------------------------- stairs, ladders
func _ramp(xr: Array, yr: Array, ramp: Dictionary, lvl: String, kind: String) -> void:
	var along_x: bool = ramp.axis == "x"
	var a0: float = ramp.from; var a1: float = ramp.to
	var z0: float = ramp.z0; var z1: float = ramp.z1
	var run := absf(a1 - a0)
	var rise := z1 - z0
	var length := sqrt(run * run + rise * rise)
	var ang := atan2(rise, run)
	var mid_a := (a0 + a1) * 0.5
	var mid_z := (z0 + z1) * 0.5
	var t := 0.25
	var width: float = (yr[1] - yr[0]) if along_x else (xr[1] - xr[0])
	var center: Vector3
	var basis: Basis
	if along_x:
		var dir := signf(a1 - a0)
		center = E(mid_a, (yr[0] + yr[1]) * 0.5, mid_z)
		basis = Basis(Vector3.BACK, ang * dir)  # tilt about engine z (spec Y)
	else:
		var dir := signf(a1 - a0)
		center = E((xr[0] + xr[1]) * 0.5, mid_a, mid_z)
		basis = Basis(Vector3.RIGHT, ang * dir)  # tilt about engine x; spec +Y = engine -Z
	# the walking surface passes through the ramp line; box centred t/2 below it
	var down := basis * Vector3(0, -t * 0.5, 0)
	var size := Vector3(length, t, width) if along_x else Vector3(width, t, length)
	_box_mesh(lvl, kind, center + down, size, basis)
	var cs := CollisionShape3D.new(); var b := BoxShape3D.new(); b.size = size; cs.shape = b
	cs.transform = Transform3D(basis, center + down)
	if static_body == null:
		add_box(Vector3(0, -100, 0), Vector3.ONE)
	static_body.add_child(cs)

func _flight(st: Dictionary) -> void:
	var run: Dictionary = st.run
	var lvl := _level_of(minf(st.za, st.zb) + 0.3)
	_ramp(st.x, st.y, {"axis": run.axis, "from": run.from, "to": run.to, "z0": st.za, "z1": st.zb}, lvl, "stair")
	# visual treads on top of the ramp (collision stays the smooth ramp)
	var n: int = st.steps
	for i in n:
		var t0 := float(i) / n
		var t1 := float(i + 1) / n
		var z := lerpf(st.za, st.zb, (t0 + t1) * 0.5) if st.zb > st.za else lerpf(st.za, st.zb, (t0 + t1) * 0.5)
		var a := lerpf(run.from, run.to, t0); var b := lerpf(run.from, run.to, t1)
		var lo := minf(a, b); var hi := maxf(a, b)
		var zt := maxf(lerpf(st.za, st.zb, t0), lerpf(st.za, st.zb, t1))
		if run.axis == "y":
			_box_mesh(lvl, "stair", E((st.x[0] + st.x[1]) * 0.5, (lo + hi) * 0.5, zt - 0.09), Vector3(st.x[1] - st.x[0], 0.18, hi - lo))
		else:
			_box_mesh(lvl, "stair", E((lo + hi) * 0.5, (st.y[0] + st.y[1]) * 0.5, zt - 0.09), Vector3(hi - lo, 0.18, st.y[1] - st.y[0]))

func _ladder(st: Dictionary) -> void:
	var def = null
	for s in data.STAIRS:
		if s.id == st.id:
			def = s
	var cx := (float(st.x[0]) + float(st.x[1])) * 0.5
	var cy := (float(st.y[0]) + float(st.y[1])) * 0.5
	var lvl := _level_of(float(st.z0) + 0.3)
	for off in [-0.22, 0.22]:
		_box_mesh(lvl, "ladder", E(cx + off, float(st.y[1]) - 0.09, (st.z0 + st.z1 + 1.0) * 0.5), Vector3(0.05, st.z1 + 1.0 - st.z0, 0.04))
	var z: float = st.z0 + 0.3
	while z < st.z1 + 0.9:
		_box_mesh(lvl, "ladder", E(cx, float(st.y[1]) - 0.09, z), Vector3(0.44, 0.03, 0.04))
		z += 0.3
	var bottom := E(cx, cy - 0.8, st.z0)
	var top := E(cx, cy + 0.9, st.z1)
	var one_way: bool = def != null and def.has("oneWayFrom")
	ladders.append({"id": st.id, "bottom": bottom, "top": top, "x": cx, "y": cy, "z0": st.z0, "z1": st.z1, "one_way": one_way, "lock": def.get("lock", "") if def else ""})
	interactables.append({"pos": bottom + Vector3(0, 1, 0), "r": 1.1, "prompt": "攀爬", "text": [], "ladder": ladders.size() - 1})
	if not one_way:
		interactables.append({"pos": top + Vector3(0, 1, 0), "r": 1.1, "prompt": "爬下", "text": [], "ladder": ladders.size() - 1, "down": true})
	var link := NavigationLink3D.new()
	link.bidirectional = not one_way
	link.start_position = bottom
	link.end_position = top
	add_child(link)

## Player climbs a ladder/hatch/shaft: returns the destination (or Vector3.INF when blocked).
## The exit point is probed against real floor next to the opening (outdoor shafts open onto terrain).
func use_ladder(i: int, down := false) -> Vector3:
	var l: Dictionary = ladders[i]
	if l.lock != "" and not unlocked_all:
		Game.say("锁着。需要：" + _key_name(l.lock))
		return Vector3.INF
	if l.id == "S06" and not down:
		Game.say("井口外是通往山谷的道路——这是离开庄园的出口。\n（MAP V1.0 没有定义井口外的地面，此处作为结局出口处理。）", 5.0)
		return Vector3.INF
	var z: float = l.z0 if down else l.z1
	var space := get_world_3d().direct_space_state
	for off in [Vector2(0, 0.9), Vector2(0, -0.9), Vector2(0.9, 0), Vector2(-0.9, 0), Vector2(0, 1.4), Vector2(0, -1.4), Vector2(1.4, 0), Vector2(-1.4, 0)]:
		var p := E(l.x + off.x, l.y + off.y, z)
		var q := PhysicsRayQueryParameters3D.create(p + Vector3(0, 0.6, 0), p + Vector3(0, -0.4, 0), L_WORLD)
		var h := space.intersect_ray(q)
		if h.is_empty() or absf(h.position.y - z) > 0.2:
			continue
		var sq := PhysicsShapeQueryParameters3D.new()
		var cap := CapsuleShape3D.new(); cap.radius = 0.3; cap.height = 1.7
		sq.shape = cap; sq.transform = Transform3D(Basis.IDENTITY, h.position + Vector3(0, 0.9, 0)); sq.collision_mask = L_WORLD
		if space.intersect_shape(sq, 1).is_empty():
			return h.position
	return l.bottom if down else l.top

# ---------------------------------------------------------------- dressing
func _thresholds() -> void:
	for d in data.DOORS:
		var a = _room(d.a); var b = _room(d.b)
		if a == null or b == null:
			continue
		var z := maxf(_floor_z(a), _floor_z(b)) + 0.012
		var w: float = d.span[1] - d.span[0]
		var mid: float = (d.span[0] + d.span[1]) * 0.5
		var kind := "locked" if d.has("lock") else "stair"
		var c := E(d.at, mid, z) if d.wall == "x" else E(mid, d.at, z)
		var size := Vector3(0.24, 0.02, w) if d.wall == "x" else Vector3(w, 0.02, 0.24)
		_box_mesh(_level_of(z + 0.2), kind, c, size)

func _labels() -> void:
	for r in data.ROOMS:
		var l := Label3D.new()
		l.text = "%s\n%s" % [r.id, r.get("zh", r.name)]
		l.font = load("res://assets/fonts/NotoSansSC-Regular.ttf")
		l.font_size = 64; l.pixel_size = 0.004
		l.modulate = Color(1, 1, 1, 0.22); l.outline_size = 0
		l.rotation = Vector3(-PI / 2, 0, 0)
		var z: float = _floor_z(r) + 0.02
		l.position = E((r.x[0] + r.x[1]) * 0.5, (r.y[0] + r.y[1]) * 0.5, z)
		l.visibility_range_end = 14.0
		levels[_level_of(z + 0.2)].add_child(l)

func _room_lights() -> void:
	for r in data.ROOMS:
		if r.kind == "outdoor":
			continue
		var h: float = r.get("h", data.LEVELS[r.level].get("h", 3.0))
		var o := OmniLight3D.new()
		o.light_color = Color(1.0, 0.82, 0.6) if r.kind != "corridor" else Color(0.85, 0.88, 1.0)
		o.light_energy = 0.55
		o.omni_range = maxf(r.x[1] - r.x[0], r.y[1] - r.y[0]) * 0.75 + 1.0
		o.omni_attenuation = 1.4
		o.position = E((r.x[0] + r.x[1]) * 0.5, (r.y[0] + r.y[1]) * 0.5, _floor_z(r) + h * 0.8)
		o.shadow_enabled = false
		o.distance_fade_enabled = true; o.distance_fade_begin = 22.0; o.distance_fade_length = 6.0
		levels[_level_of(_floor_z(r) + 0.3)].add_child(o)
		_lights.append(o)

func _process(_delta: float) -> void:
	var cam := get_viewport().get_camera_3d()
	if cam == null:
		return
	# show the player's level and its neighbours only (upper levels would never be seen; cheaper culling)
	var pz := cam.global_position.y
	var lvl := _level_of(pz - 1.4)
	if lvl != _cur_level:
		_cur_level = lvl
		var i := LEVEL_ORDER.find(lvl)
		for j in LEVEL_ORDER.size():
			levels[LEVEL_ORDER[j]].visible = absi(j - i) <= 1
