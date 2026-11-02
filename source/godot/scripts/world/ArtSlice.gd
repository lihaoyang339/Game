class_name ArtSlice
extends World
## The art-slice manor (foyer, living room, gallery, study, dining room, kitchen, service corridor,
## conservatory) ported from the three.js build: geometry/materials from assets/artslice/*.glb +
## data/artslice.json, lights/doors/colliders/interactables rebuilt here.

const L_PROP := 32
const DATA := "res://data/artslice.json"
const LOCKS := {
	"entrance": ["外面风雨太大了。", "在找到电话之前，没有理由再出去。"],
	"parlor": ["门锁着。"],
	"music": ["锁住了。门的另一边好像有东西顶着。"],
	"back_stair": ["楼梯间的门卡死了。"],
}
const ACOUSTICS := {"foyer": [0.8, 0.22], "living": [0.6, 0.14], "gallery": [0.55, 0.18], "study": [0.4, 0.08], "dining": [0.6, 0.15],
	"kitchen": [0.45, 0.16], "corridor": [0.3, 0.12], "conservatory": [0.7, 0.2], "glass": [0.35, 0.12]}
const LIGHT_K := 1.0 / PI          # three.js candela (physically-correct, decay 2) -> Godot energy with inverse-square attenuation

var data: Dictionary
var matlib: MatLib
var parts := {}                   # room id -> {state: "unloaded"|"loading"|"loaded", node, last_seen}
var lights := []                  # [{def, node: Light3D, mats: []}]
var adjacency := {}               # room -> [rooms] (through doors)
var storm_flash := 0.0
var _storm_next := 4.0
var _storm_double := -1.0
var _t := 0.0
var load_progress := 0.0
var _hemi_base := 0.5
var _thunder: AudioStreamPlayer
var _rain_players: Array = []
var stream_radius := 2            # rooms within this many door hops stay loaded

func _init() -> void:
	world_name = "artslice"

func build(progress: Callable = Callable()) -> void:
	data = JSON.parse_string(FileAccess.get_file_as_string(DATA))
	matlib = MatLib.new(data)
	make_environment()
	var e: Dictionary = data.env
	env.fog_light_color = MatLib.col(e.fog.color)
	env.fog_density = 0.012
	var sky := MatLib.col(e.hemi.sky)
	var ground := MatLib.col(e.hemi.ground)
	env.ambient_light_color = sky.lerp(ground, 0.45)
	_hemi_base = e.hemi.base
	env.ambient_light_energy = _hemi_base / PI * 1.6
	# rooms
	for r in data.rooms:
		var b: Dictionary = r.bounds
		var h: float = b.get("h", b.get("ridge", 3.5))
		rooms[r.id] = {"id": r.id, "name": r.name, "aabb": AABB(Vector3(b.x0, -0.1, b.z0), Vector3(b.x1 - b.x0, h + 0.2, b.z1 - b.z0)),
			"neighbors": r.neighbors, "acoustics": ACOUSTICS.get(r.id, [0.5, 0.12]), "spawn": Vector3(r.spawn[0], 0, r.spawn[1])}
		adjacency[r.id] = []
	var sp: Vector3 = rooms.foyer.spawn
	spawn = Transform3D(Basis(Vector3.UP, PI), sp)
	# door adjacency (a door belongs to the rooms on both sides of it)
	for d in data.doors:
		var p := Vector3(d.x, 1.0, d.z)
		var touching := []
		for id in rooms:
			if rooms[id].aabb.grow(0.35).has_point(p):
				touching.append(id)
		for a in touching:
			for b2 in touching:
				if a != b2 and not adjacency[a].has(b2):
					adjacency[a].append(b2)
	for id in rooms:
		for n in rooms[id].neighbors:
			if not adjacency[id].has(n): adjacency[id].append(n)
			if not adjacency[n].has(id): adjacency[n].append(id)
	# collision: walls (+ occluders), props (own layer so the camera ignores furniture), floors, ceilings
	for c in data.colliders:
		if c.tag == "door":
			continue
		var size := Vector3(c.hx * 2.0, c.y1 - c.y0, c.hz * 2.0)
		var center := Vector3(c.x, (c.y0 + c.y1) * 0.5, c.z)
		add_box(center, size, c.rot, c.tag == "wall", L_WORLD if c.tag == "wall" else L_PROP)
	for id in rooms:
		var a: AABB = rooms[id].aabb
		add_box(Vector3(a.get_center().x, -0.15, a.get_center().z), Vector3(a.size.x + 0.6, 0.3, a.size.z + 0.6))
		add_box(Vector3(a.get_center().x, a.end.y + 0.05, a.get_center().z), Vector3(a.size.x + 0.6, 0.2, a.size.z + 0.6))
	# geometry parts, loaded on demand around the player (all at start for the spawn area)
	for p in data.parts:
		parts[p.id] = {"state": "unloaded", "node": null, "last_seen": 0.0, "tris": p.tris}
	var want := _wanted_rooms("foyer")
	want.append("exterior")
	var i := 0
	for id in want:
		_load_part_sync(id)
		i += 1
		if progress.is_valid():
			progress.call(float(i) / want.size())
	_make_lights()
	_make_interactables()
	_make_audio()
	bake_navigation()
	set_player_room("foyer")

func add_box(center: Vector3, size: Vector3, yaw := 0.0, occluder := false, layer := L_WORLD) -> void:
	if layer == L_WORLD:
		super.add_box(center, size, yaw, occluder, layer)
		return
	var body := get_node_or_null("Props") as StaticBody3D
	if body == null:
		body = StaticBody3D.new(); body.name = "Props"; body.collision_layer = L_PROP; body.collision_mask = 0
		add_child(body)
	var cs := CollisionShape3D.new(); var b := BoxShape3D.new(); b.size = size; cs.shape = b
	cs.transform = Transform3D(Basis(Vector3.UP, yaw), center)
	body.add_child(cs)

func bake_navigation(cell := 0.1, agent_r := 0.35, agent_h := 1.9, climb := 0.45) -> void:
	super.bake_navigation(cell, agent_r, agent_h, climb)
	nav_region.navigation_mesh.geometry_collision_mask = L_WORLD | L_PROP

# ---------------------------------------------------------------- room geometry streaming
func _wanted_rooms(center: String) -> Array:
	var seen := {center: 0}
	var q := [center]
	while not q.is_empty():
		var r: String = q.pop_front()
		if seen[r] >= stream_radius:
			continue
		for n in adjacency.get(r, []):
			if not seen.has(n):
				seen[n] = seen[r] + 1
				q.append(n)
	return seen.keys()

func _part_path(id: String) -> String:
	return "res://assets/artslice/%s.glb" % id

func _load_part_sync(id: String) -> void:
	if not parts.has(id) or parts[id].state == "loaded":
		return
	var ps: PackedScene = load(_part_path(id))
	_instance_part(id, ps)

func _instance_part(id: String, ps: PackedScene) -> void:
	var n := ps.instantiate()
	n.name = "Part_" + id
	add_child(n)
	matlib.apply_to(n)
	for mi in n.find_children("*", "MeshInstance3D", true, false):
		mi.gi_mode = GeometryInstance3D.GI_MODE_DISABLED
		var mat: Material = mi.get_surface_override_material(0)
		if mat is ShaderMaterial and mat.shader in [MatLib.SH.rain_glass, MatLib.SH.flame, MatLib.SH.light_cone, MatLib.SH.storm_backdrop]:
			mi.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
		var aabb: AABB = mi.get_aabb()
		if aabb.get_longest_axis_size() < 0.6:   # small dressing: fade out at distance (HLOD-style visibility range)
			mi.visibility_range_end = 14.0
			mi.visibility_range_end_margin = 2.0
			mi.visibility_range_fade_mode = GeometryInstance3D.VISIBILITY_RANGE_FADE_SELF
			if aabb.get_longest_axis_size() < 0.25:
				mi.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	parts[id].node = n
	parts[id].state = "loaded"
	_attach_doors(n)

func _attach_doors(root: Node) -> void:
	for d in data.doors:
		var dn := root.find_child("DOOR__" + d.id, true, false) as Node3D
		if dn == null:
			continue
		var door := Door.new()
		door.name = "Door_" + d.id
		dn.get_parent().add_child(door)
		door.global_transform = dn.global_transform
		var leaves := []
		for i in d.sides.size():
			var lf := dn.find_child("LEAF__%s__%d" % [d.id, i], true, false) as Node3D
			if lf:
				lf.reparent(door, true)
				leaves.append(lf)
		door.setup(d.id, leaves, d.sides, d.open, d.swing, d.w, d.h)
		door.locked_lines = LOCKS.get(d.id, [])
		if d.id == "service_jib":
			door.one_way_side = -1.0
		doors.append(door)

func _unload_part(id: String) -> void:
	var p: Dictionary = parts[id]
	if p.state != "loaded":
		return
	for d in doors.duplicate():
		if is_instance_valid(d) and p.node.is_ancestor_of(d):
			doors.erase(d)
	p.node.queue_free()
	p.node = null
	p.state = "unloaded"

func _update_streaming() -> void:
	if current_room == "":
		return
	var want := _wanted_rooms(current_room)
	var now := _t
	for id in parts:
		if id == "exterior":
			continue
		var p: Dictionary = parts[id]
		if id in want:
			p.last_seen = now
			if p.state == "unloaded":
				p.state = "loading"
				ResourceLoader.load_threaded_request(_part_path(id), "PackedScene", true)
			elif p.state == "loading":
				var st := ResourceLoader.load_threaded_get_status(_part_path(id))
				if st == ResourceLoader.THREAD_LOAD_LOADED:
					_instance_part(id, ResourceLoader.load_threaded_get(_part_path(id)))
			if p.node:
				p.node.visible = true
		else:
			if p.node:
				p.node.visible = false
			if p.state == "loaded" and now - p.last_seen > 25.0:
				_unload_part(id)

func ensure_all_loaded() -> void:
	for id in parts:
		_load_part_sync(id)

# ---------------------------------------------------------------- lights (port of RoomLights)
func _make_lights() -> void:
	var holder := Node3D.new(); holder.name = "Lights"; add_child(holder)
	for i in data.lights.size():
		var d: Dictionary = data.lights[i]
		var l: Light3D
		if d.type == "spot":
			var s := SpotLight3D.new()
			s.spot_range = d.distance
			s.spot_angle = rad_to_deg(d.angle)
			s.spot_angle_attenuation = lerpf(0.4, 1.6, 1.0 - d.penumbra)
			s.spot_attenuation = 2.0
			l = s
		else:
			var o := OmniLight3D.new()
			o.omni_range = d.distance
			o.omni_attenuation = 2.0
			o.omni_shadow_mode = OmniLight3D.SHADOW_CUBE
			l = o
		l.light_color = MatLib.col(d.color)
		l.position = Vector3(d.pos[0], d.pos[1], d.pos[2])
		l.shadow_enabled = false
		l.shadow_bias = 0.03
		l.shadow_normal_bias = 1.2
		l.light_specular = 0.6
		l.distance_fade_enabled = true
		l.distance_fade_begin = 26.0
		l.distance_fade_length = 6.0
		holder.add_child(l)
		if d.target != null:
			l.look_at(Vector3(d.target[0], d.target[1], d.target[2]), Vector3.UP if absf((Vector3(d.target[0], d.target[1], d.target[2]) - l.position).normalized().y) < 0.99 else Vector3.FORWARD)
		lights.append({"def": d, "node": l, "phase": randf() * 100.0, "cur": 1.0, "mats": []})
	for li in matlib.emissive_by_light:
		if li < lights.size():
			lights[li].mats = matlib.emissive_by_light[li]

func _level(L: Dictionary) -> float:
	var d: Dictionary = L.def
	if not d.on:
		return 0.0
	var k := 1.0
	var t: float = _t + L.phase
	if d.fire > 0.0:
		k *= 0.78 + 0.12 * sin(t * 9.1) * sin(t * 5.3) + 0.1 * sin(t * 23.0 + sin(t * 3.0))
	if d.flicker > 0.0:
		var n := sin(t * 11.3) * sin(t * 6.7 + 1.3) + sin(t * 1.9)
		if n > 1.75 - d.flicker:
			k *= 0.15 + randf() * 0.2
		else:
			k *= 0.94 + 0.06 * sin(t * 60.0)
	return k

func _update_lights(focus: Vector3) -> void:
	var active := {}
	for r in [current_room] + adjacency.get(current_room, []):
		active[r] = true
	var gain: float = data.env.lightGain
	var cands := []
	for L in lights:
		var d: Dictionary = L.def
		var k := _level(L)
		L.cur = k
		for m in L.mats:
			if m is StandardMaterial3D:
				m.emission_energy_multiplier = d.emissive * k
		var on: bool = active.has(d.room)
		var energy: float = (d.intensity * k + d.flash * storm_flash) * gain * LIGHT_K
		L.node.visible = on and energy > 0.002
		L.node.light_energy = energy
		if on and d.shadow and L.node is SpotLight3D and energy > 0.05:
			var prio: float = d.prio + (10.0 if d.room == current_room else 0.0)
			cands.append([prio, -L.node.position.distance_to(focus), L])
	cands.sort_custom(func(a, b): return a[0] > b[0] if a[0] != b[0] else a[1] > b[1])
	var budget := Settings.shadowed_light_budget()
	for i in cands.size():
		cands[i][2].node.shadow_enabled = i < budget
	for L in lights:
		if not (L.node is SpotLight3D) or not L.node.visible:
			L.node.shadow_enabled = false if not L.node.visible else L.node.shadow_enabled
	env.ambient_light_energy = (_hemi_base + storm_flash * 0.6) / PI * 1.6

# ---------------------------------------------------------------- storm (port of updateStorm)
func _update_storm(delta: float) -> void:
	storm_flash *= exp(-delta * 7.0)
	_storm_next -= delta
	if _storm_next <= 0.0:
		storm_flash = 1.0
		_storm_double = 0.12 if randf() < 0.5 else -1.0
		_storm_next = 9.0 + randf() * 14.0
		_thunder_strike()
	if _storm_double > 0.0:
		_storm_double -= delta
		if _storm_double <= 0.0:
			storm_flash = maxf(storm_flash, 0.7)
	RenderingServer.global_shader_parameter_set("storm_flash", storm_flash)

func _thunder_strike() -> void:
	if _thunder:
		_thunder.stream = load("res://assets/audio/gen/thunder_%d.wav" % (randi() % 3))
		_thunder.pitch_scale = randf_range(0.9, 1.05)
		get_tree().create_timer(randf_range(0.3, 1.6)).timeout.connect(func(): if is_instance_valid(_thunder): _thunder.play())

# ---------------------------------------------------------------- interactables, audio
func _make_interactables() -> void:
	for it in data.interactables:
		interactables.append({"pos": Vector3(it.x, 1.0, it.z), "r": it.r, "prompt": it.prompt, "text": it.text})
	# pickups placed for the third-person test loop (ammo/herb) — dressing only, logic in Player
	interactables.append({"pos": Vector3(-12.6, 0.9, -10.6), "r": 1.0, "prompt": "拾取", "text": ["9mm 子弹 ×12。"], "give": ["ammo", 12], "once": true})
	interactables.append({"pos": Vector3(-20.0, 0.95, -10.8), "r": 1.0, "prompt": "拾取", "text": ["一株草药。"], "give": ["herb", 1], "once": true})

func _make_audio() -> void:
	_thunder = AudioStreamPlayer.new(); _thunder.bus = "Ambience"; _thunder.volume_db = -3.0; add_child(_thunder)
	# rain on every exterior window: one 3D emitter per room window wall, occluded by the house
	var rain = load("res://assets/audio/gen/rain_loop.wav")
	if rain == null:
		return
	for id in rooms:
		var a: AABB = rooms[id].aabb
		var p := AudioStreamPlayer3D.new()
		p.stream = rain; p.bus = "Ambience"; p.autoplay = true
		p.unit_size = 4.0; p.max_distance = 30.0; p.volume_db = -14.0 if id != "conservatory" else -6.0
		p.attenuation_filter_cutoff_hz = 4000.0
		p.position = a.get_center() + Vector3(0, a.size.y * 0.3, 0)
		add_child(p)
		_rain_players.append(p)

func _process(delta: float) -> void:
	_t += delta
	_update_storm(delta)
	var cam := get_viewport().get_camera_3d()
	var focus := cam.global_position if cam else Vector3.ZERO
	_update_lights(focus)
	_update_streaming()
