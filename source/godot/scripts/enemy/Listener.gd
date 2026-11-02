class_name Listener
extends CharacterBody3D
## The Listener — sound-driven stalker (§21.8). Perceives mainly by hearing (NoiseBus, attenuated by walls),
## sees only a short cone (longer if Daniel's flashlight is on). Works in world space against real geometry
## and the navmesh: never targets the screen, never passes through walls/furniture.
## States: patrol, listen, investigate, search, stalk, hunt, attack, stagger, retreat.

signal state_changed(s: String)

const HP_MAX := 260.0
const SPEED := {"patrol": 0.95, "investigate": 1.15, "search": 0.95, "stalk": 0.8, "hunt": 3.4, "retreat": 3.0}
const ELONGATE := {"lowerarm_l": 1.28, "lowerarm_r": 1.28, "hand_l": 1.3, "hand_r": 1.3, "Head": 1.45, "neck_01": 1.2,
	"calf_l": 1.1, "calf_r": 1.1, "foot_l": 1.1, "foot_r": 1.1, "spine_03": 1.12, "index_02_l": 1.5, "index_02_r": 1.5,
	"middle_02_l": 1.5, "middle_02_r": 1.5, "ring_02_l": 1.5, "ring_02_r": 1.5, "pinky_02_l": 1.4, "pinky_02_r": 1.4,
	"index_03_l": 1.5, "index_03_r": 1.5, "middle_03_l": 1.5, "middle_03_r": 1.5, "ring_03_l": 1.5, "ring_03_r": 1.5}

var world: World
var player: Player
var rig: CharacterRig
var pose: PoseModifier
var agent: NavigationAgent3D
var snd_voice: AudioStreamPlayer3D
var snd_step: AudioStreamPlayer3D
var skin_mat: ShaderMaterial

var state := "patrol"
var hp := HP_MAX
var yaw := 0.0
var speed := 0.0
var target := Vector3.ZERO
var last_heard := Vector3.INF
var last_heard_t := -99.0
var suspicion := 0.0           # 0..1 accumulates from faint noises
var last_seen := Vector3.INF
var last_seen_t := -99.0
var aware := 0.0               # how sure it is Daniel is around
var _t := 0.0
var _think := 0.0
var _state_t := 0.0
var _path_t := 0.0
var _linger := 0.0
var _attack_cd := 0.0
var _busy := 0.0
var _search_pts: Array = []
var _patrol_room := ""
var _step_acc := 0.0
var _voice_t := 3.0
var _recent_dmg := 0.0
var _occl_t := 0.0
var _wounds: Array = []
var _climb: Dictionary = {}
var _flash := 0.0
var think_rate := 0.0          # exposed for tests (s between decisions)
var visible_on_screen := false
var on_screen_x := 0.0
var debug_last_event := ""
var _bind_space: Dictionary = {}

func setup(w: World, p: Player) -> void:
	world = w
	player = p
	collision_layer = World.L_ENEMY
	collision_mask = World.L_WORLD | World.L_DOOR | ArtSlice.L_PROP
	floor_max_angle = deg_to_rad(50.0)
	floor_snap_length = 0.5
	var cs := CollisionShape3D.new(); var cap := CapsuleShape3D.new(); cap.radius = 0.32; cap.height = 1.95
	cs.shape = cap; cs.position.y = 0.98; add_child(cs)
	add_to_group("enemy")
	rig = CharacterRig.new(); rig.name = "Rig"; add_child(rig)
	rig.build(false)
	for m in rig.meshes:
		if m.name in ["Eyes", "Eyebrows"]:
			m.visible = false
	_skin()
	_tree()
	pose = PoseModifier.new()
	rig.skeleton.add_child(pose)
	var el := Elongate.new(); el.factors = ELONGATE
	rig.skeleton.add_child(el)
	_hitboxes()
	agent = NavigationAgent3D.new()
	agent.path_desired_distance = 0.55
	agent.target_desired_distance = 0.7
	agent.path_max_distance = 2.5
	agent.radius = 0.35
	agent.height = 1.9
	agent.avoidance_enabled = false
	agent.path_postprocessing = NavigationPathQueryParameters3D.PATH_POSTPROCESSING_CORRIDORFUNNEL
	agent.link_reached.connect(_on_link)
	add_child(agent)
	for n in ["snd_voice", "snd_step"]:
		var a := AudioStreamPlayer3D.new(); a.bus = "SFX"; a.max_distance = 34.0; a.unit_size = 3.5
		a.attenuation_filter_cutoff_hz = 20000.0
		add_child(a); set(n, a)
	snd_voice.position.y = 1.8
	NoiseBus.noise.connect(_on_noise)
	_place_initial()

func _skin() -> void:
	var m := rig.body_mesh
	var mesh: ArrayMesh = m.mesh
	var out := ArrayMesh.new()
	for s in mesh.get_surface_count():
		var arrays := mesh.surface_get_arrays(s)
		var verts: PackedVector3Array = arrays[Mesh.ARRAY_VERTEX]
		var bp := PackedFloat32Array(); bp.resize(verts.size() * 3)
		for i in verts.size():
			bp[i * 3] = verts[i].x; bp[i * 3 + 1] = verts[i].y; bp[i * 3 + 2] = verts[i].z
		arrays[Mesh.ARRAY_CUSTOM0] = bp
		out.add_surface_from_arrays(Mesh.PRIMITIVE_TRIANGLES, arrays, [], {}, (Mesh.ARRAY_CUSTOM_RGB_FLOAT << Mesh.ARRAY_FORMAT_CUSTOM0_SHIFT) | (mesh.surface_get_format(s) & Mesh.ARRAY_FLAG_USE_8_BONE_WEIGHTS))
	m.mesh = out
	skin_mat = ShaderMaterial.new()
	skin_mat.shader = load("res://shaders/listener_skin.gdshader")
	skin_mat.set_shader_parameter("albedo_tex", load("res://assets/listener/listener_albedo.png"))
	skin_mat.set_shader_parameter("normal_tex", load("res://assets/listener/listener_normal.png"))
	skin_mat.set_shader_parameter("orm_tex", load("res://assets/listener/listener_orm.png"))
	for s in out.get_surface_count():
		m.set_surface_override_material(s, skin_mat)

func _tree() -> void:
	var r := rig
	var hunt := AnimationNodeBlendTree.new()
	hunt.add_node("j", r.anim("Jog_Fwd")); hunt.add_node("z", r.anim("Zombie_Walk_Fwd"))
	var b := AnimationNodeBlend2.new(); hunt.add_node("b", b)
	hunt.connect_node("b", 0, "j"); hunt.connect_node("b", 1, "z"); hunt.connect_node("output", 0, "b")
	r.add_selector("loco", {"idle": "Zombie_Idle", "walk": "Zombie_Walk_Fwd", "stalk": "Crouch_Fwd", "lurk": "Crouch_Idle", "hunt": hunt, "listen": "Idle_No"}, 0.35)
	r.add_selector("act_sel", {"attack": "Zombie_Scratch", "grab": "Melee_Hook", "hit": "Hit_Chest", "hit_head": "Hit_Head", "stagger": "Hit_Knockback", "climb": "ClimbUp_1m"}, 0.0, true)
	var os := AnimationNodeOneShot.new(); os.fadein_time = 0.1; os.fadeout_time = 0.25; r.bt.add_node("act", os)
	r.bt.connect_node("act", 0, "loco"); r.bt.connect_node("act", 1, "act_sel")
	r.bt.connect_node("output", 0, "act")
	r.tree.active = true
	r.tree.set("parameters/loco/hunt/b/blend_amount", 0.3)

func _hitboxes() -> void:
	var parts := [["Head", 0.13, 0.0, 2.6], ["spine_03", 0.2, 0.32, 1.0], ["spine_01", 0.19, 0.3, 1.0], ["pelvis", 0.18, 0.0, 0.9],
		["thigh_l", 0.1, 0.45, 0.7], ["thigh_r", 0.1, 0.45, 0.7], ["calf_l", 0.08, 0.45, 0.6], ["calf_r", 0.08, 0.45, 0.6],
		["upperarm_l", 0.07, 0.3, 0.6], ["upperarm_r", 0.07, 0.3, 0.6], ["lowerarm_l", 0.06, 0.36, 0.6], ["lowerarm_r", 0.06, 0.36, 0.6]]
	for p in parts:
		var area := Area3D.new()
		area.collision_layer = World.L_HITBOX; area.collision_mask = 0; area.monitoring = false; area.monitorable = true
		area.set_meta("owner", self); area.set_meta("bone", p[0]); area.set_meta("mult", p[3])
		var cs := CollisionShape3D.new()
		if p[2] > 0.0:
			var c := CapsuleShape3D.new(); c.radius = p[1]; c.height = maxf(p[2], p[1] * 2.0); cs.shape = c
			cs.position = Vector3(0, p[2] * 0.5, 0)
		else:
			var s := SphereShape3D.new(); s.radius = p[1]; cs.shape = s
			cs.position = Vector3(0, 0.08 if p[0] == "Head" else 0.0, 0)
		area.add_child(cs)
		rig.attach(p[0], area)

func _place_initial() -> void:
	# start far from Daniel, in a room 2+ doors away (or the farthest room)
	var far := ""
	var fd := -1.0
	for id in world.rooms:
		var c: Vector3 = world.rooms[id].aabb.get_center()
		var d := c.distance_to(world.spawn.origin)
		if d > fd and absf(c.y - world.spawn.origin.y) < 2.5:
			fd = d; far = id
	var r: Dictionary = world.rooms[far]
	var pos: Vector3 = r.get("spawn", r.aabb.get_center())
	global_position = Vector3(pos.x, r.aabb.position.y + 0.15, pos.z)
	_patrol_room = far

# ---------------------------------------------------------------- perception
func _on_noise(pos: Vector3, radius: float, kind: String, source: Node) -> void:
	if source == self or state == "stagger":
		return
	var head := global_position + Vector3(0, 1.8, 0)
	var d := head.distance_to(pos)
	if d > radius * 1.2:
		return
	var occ := world.occlusion_between(head, pos + Vector3(0, 0.3, 0)) if d > 2.0 else 0.0
	var eff := radius * (1.0 - 0.55 * occ)
	if d > eff:
		return
	var conf := 1.0 - d / eff
	suspicion = clampf(suspicion + conf * (1.0 if kind == "gunshot" else 0.55), 0.0, 1.5)
	last_heard = pos
	last_heard_t = _t
	debug_last_event = "%s d=%.1f occ=%.2f conf=%.2f" % [kind, d, occ, conf]
	if kind == "gunshot" or conf > 0.65 and aware > 0.4:
		aware = clampf(aware + 0.5, 0.0, 1.0)
		_set_state("hunt" if d < 14.0 and conf > 0.5 else "investigate")
	elif state in ["patrol", "listen", "search"] and suspicion > 0.35:
		_set_state("investigate")
	elif state == "patrol":
		_set_state("listen")

func _can_see_player() -> bool:
	if player == null or player.dead:
		return false
	var head := global_position + Vector3(0, 1.85, 0)
	var chest := player.global_position + Vector3(0, 1.2, 0)
	var d := head.distance_to(chest)
	var rng := 8.5 * (1.7 if player.flashlight_on else 1.0) * (0.55 if player.crouching else 1.0)
	if d > rng:
		return false
	var fwd := Basis(Vector3.UP, yaw) * Vector3.BACK
	var to := (chest - head).normalized()
	if fwd.dot(Vector3(to.x, 0, to.z).normalized()) < cos(deg_to_rad(58.0)) and d > 1.8:
		return false
	var q := PhysicsRayQueryParameters3D.create(head, chest, World.L_WORLD | World.L_DOOR)
	return get_world_3d().direct_space_state.intersect_ray(q).is_empty()

## Where Daniel's camera sees this creature: in frustum, unoccluded, and how close to the frame edge.
func _screen_check() -> void:
	visible_on_screen = false
	var cam := player.camera
	if cam == null:
		return
	var head := global_position + Vector3(0, 1.6, 0)
	if not cam.is_position_in_frustum(head):
		return
	var q := PhysicsRayQueryParameters3D.create(cam.global_position, head, World.L_WORLD | World.L_DOOR)
	if not get_world_3d().direct_space_state.intersect_ray(q).is_empty():
		return
	var sp := cam.unproject_position(head)
	var vs := get_viewport().get_visible_rect().size
	on_screen_x = (sp.x / maxf(1.0, vs.x)) * 2.0 - 1.0
	visible_on_screen = true

# ---------------------------------------------------------------- think (decisions, rate-limited = AI LOD)
func _physics_process(delta: float) -> void:
	_t += delta
	_state_t += delta
	_attack_cd = maxf(0.0, _attack_cd - delta)
	_busy = maxf(0.0, _busy - delta)
	_recent_dmg = maxf(0.0, _recent_dmg - delta * 25.0)
	_flash = maxf(0.0, _flash - delta * 3.0)
	skin_mat.set_shader_parameter("flash", _flash)
	if player == null or not world.nav_ready:
		return
	if not _climb.is_empty():
		_tick_climb(delta)
		return
	var dist := global_position.distance_to(player.global_position)
	think_rate = 0.1 if (dist < 16.0 or state in ["hunt", "attack", "stalk"]) else 0.45
	_think -= delta
	if _think <= 0.0:
		_think = think_rate
		_decide(dist)
	_move(delta)
	_audio(delta, dist)

func _set_state(s: String) -> void:
	if s == state:
		return
	state = s
	_state_t = 0.0
	_path_t = 0.0
	if s == "hunt":
		_voice("zombie_growl_%d.mp3" % (1 + randi() % 16), 2.0, 0.85)
	state_changed.emit(s)

func _decide(dist: float) -> void:
	_screen_check()
	var sees := _can_see_player()
	if sees:
		last_seen = player.global_position
		last_seen_t = _t
		aware = clampf(aware + 0.35, 0.0, 1.0)
	else:
		aware = clampf(aware - 0.02, 0.0, 1.0)
	suspicion = maxf(0.0, suspicion - 0.01)
	if _busy > 0.0 or state == "stagger":
		return
	if state == "retreat":
		if _state_t > 22.0 or (_state_t > 8.0 and not visible_on_screen):
			hp = minf(HP_MAX, hp + 120.0)
			_set_state("patrol")
		return
	if sees and dist < 1.25 and _attack_cd <= 0.0 and not player.dead:
		_attack()
		return
	if sees:
		# close and seen: hunt. Seen from afar while Daniel watches it: stalk / hold at the frame edge.
		if dist < 7.0 or aware > 0.85 or player.flashlight_on and dist < 11.0:
			_set_state("hunt")
		elif state != "hunt":
			_set_state("stalk")
	match state:
		"patrol":
			if _state_t > 1.0 and (agent.is_navigation_finished() or _path_t <= 0.0):
				_pick_patrol()
		"listen":
			agent.target_position = global_position
			if _state_t > 3.0:
				_set_state("investigate" if suspicion > 0.25 else "patrol")
		"investigate":
			_go(last_heard if last_heard != Vector3.INF else global_position, 1.5)
			if global_position.distance_to(last_heard) < 1.4 or agent.is_navigation_finished():
				_begin_search(last_heard)
			if _t - last_heard_t > 25.0:
				_set_state("patrol")
		"search":
			_tick_search()
		"stalk":
			_tick_stalk(dist, sees)
		"hunt":
			var goal := player.global_position if (sees or _t - last_seen_t < 2.5 or _t - last_heard_t < 1.5) else (last_seen if last_seen != Vector3.INF else last_heard)
			_go(goal, 0.4)
			if not sees and _t - last_seen_t > 8.0 and _t - last_heard_t > 6.0:
				_begin_search(goal)

func _go(p: Vector3, repath := 0.6) -> void:
	_path_t -= think_rate
	if _path_t <= 0.0 or agent.target_position.distance_to(p) > 1.0:
		agent.target_position = p
		_path_t = repath

func _pick_patrol() -> void:
	# director: drift toward Daniel's part of the house without homing in (rooms 1-2 doors from his)
	var near_ids := []
	var pr := world.room_at(player.global_position + Vector3(0, 0.5, 0))
	for id in world.rooms:
		if id == _patrol_room:
			continue
		var c: Vector3 = world.rooms[id].aabb.get_center()
		var d := c.distance_to(player.global_position)
		if d > 6.0 and d < 22.0 and absf(c.y - player.global_position.y) < 3.0:
			near_ids.append(id)
	if near_ids.is_empty():
		near_ids = world.rooms.keys()
	_patrol_room = near_ids[randi() % near_ids.size()]
	var r: Dictionary = world.rooms[_patrol_room]
	var a: AABB = r.aabb
	var p := a.get_center() + Vector3(randf_range(-0.3, 0.3) * a.size.x, 0.0, randf_range(-0.3, 0.3) * a.size.z)
	p.y = a.position.y + 0.2
	agent.target_position = NavigationServer3D.map_get_closest_point(get_world_3d().navigation_map, p)
	_path_t = 20.0

func _begin_search(around: Vector3) -> void:
	# points of interest: doorways near the noise (peek into the next room) and the noise spot itself
	_search_pts.clear()
	var doors := world.doors.duplicate()
	doors.sort_custom(func(a, b): return a.global_position.distance_to(around) < b.global_position.distance_to(around))
	for d in doors.slice(0, 3):
		if d.global_position.distance_to(around) < 10.0:
			var fwd: Vector3 = d.global_basis.z
			var side := 1.0 if (around - d.global_position).dot(fwd) > 0.0 else -1.0
			_search_pts.append({"pos": d.global_position + fwd * side * 0.7, "look": d.global_position - fwd * side * 2.0, "door": d})
	_search_pts.append({"pos": around, "look": around + Basis(Vector3.UP, randf() * TAU) * Vector3.BACK * 3.0})
	_set_state("search")

func _tick_search() -> void:
	if _search_pts.is_empty():
		_set_state("patrol")
		return
	var p: Dictionary = _search_pts[0]
	_go(NavigationServer3D.map_get_closest_point(get_world_3d().navigation_map, p.pos), 2.0)
	if global_position.distance_to(p.pos) < 0.9 or agent.is_navigation_finished():
		if not p.has("t"):
			p.t = _t
			if p.has("door") and not p.door.is_open() and p.door.locked_lines.is_empty():
				p.door.try_toggle(global_position, "listener")
			_voice("listener_click_%d.wav" % (randi() % 4), -2.0)
		_face_point(p.look)
		if _t - p.t > 2.2:
			_search_pts.pop_front()
	if _state_t > 30.0:
		_set_state("patrol")

## Stalking: approach along walls to a spot near Daniel that his camera is NOT looking at; if it ends up
## at the edge of his view it freezes there briefly, then withdraws out of sight.
func _tick_stalk(dist: float, sees: bool) -> void:
	if visible_on_screen and absf(on_screen_x) > 0.62 and _linger <= 0.0 and dist > 3.5:
		_linger = randf_range(1.2, 2.6)
		agent.target_position = global_position
		_voice("listener_breath_%d.wav" % (randi() % 3), -6.0)
		return
	if _linger > 0.0:
		_linger -= think_rate
		_face_point(player.global_position)
		if _linger <= 0.0:
			_path_t = 0.0
		return
	if dist < 4.0 or _state_t > 40.0:
		_set_state("hunt")
		return
	_path_t -= think_rate
	if _path_t <= 0.0 or agent.is_navigation_finished():
		agent.target_position = _stalk_spot()
		_path_t = 2.5

func _stalk_spot() -> Vector3:
	var map := get_world_3d().navigation_map
	var cam := player.camera
	var best := player.global_position
	var bs := -INF
	for i in 14:
		var ang := TAU * i / 14.0
		var r := randf_range(4.5, 8.0)
		var p := NavigationServer3D.map_get_closest_point(map, player.global_position + Vector3(cos(ang) * r, 0.0, sin(ang) * r))
		if absf(p.y - player.global_position.y) > 1.2:
			continue
		var score := -absf(p.distance_to(player.global_position) - 6.0)
		var head := p + Vector3(0, 1.6, 0)
		if cam.is_position_in_frustum(head):
			var sp := cam.unproject_position(head)
			var x := sp.x / maxf(1.0, get_viewport().get_visible_rect().size.x) * 2.0 - 1.0
			score += 2.0 if absf(x) > 0.7 else -4.0
		else:
			score += 1.0
		score += _wall_bonus(p)
		if score > bs:
			bs = score; best = p
	return best

func _wall_bonus(p: Vector3) -> float:
	var s := get_world_3d().direct_space_state
	for dir in [Vector3.RIGHT, Vector3.LEFT, Vector3.FORWARD, Vector3.BACK]:
		var q := PhysicsRayQueryParameters3D.create(p + Vector3(0, 1.0, 0), p + Vector3(0, 1.0, 0) + dir * 1.1, World.L_WORLD)
		if not s.intersect_ray(q).is_empty():
			return 1.5
	return 0.0

func _attack() -> void:
	_attack_cd = 1.7
	_busy = 1.0
	_set_state("hunt")
	rig.select("act_sel", "attack")
	rig.fire("act")
	_voice("zombie_growl_%d.mp3" % (1 + randi() % 16), 0.0, 1.0)
	get_tree().create_timer(0.45).timeout.connect(func():
		if is_instance_valid(player) and global_position.distance_to(player.global_position) < 1.55 and state != "stagger":
			player.take_damage(26.0, global_position))

# ---------------------------------------------------------------- movement
func _move(delta: float) -> void:
	var want := 0.0
	var dir := Vector3.ZERO
	if _busy <= 0.0 and state != "stagger" and state != "listen" and _linger <= 0.0 and not agent.is_navigation_finished():
		var nxt := agent.get_next_path_position()
		dir = nxt - global_position
		dir.y = 0.0
		if dir.length() > 0.05:
			dir = dir.normalized()
			want = SPEED.get(state, 1.0)
			_open_doors_ahead(dir)
			if state == "stalk":
				dir = _hug_wall(dir)
	speed = move_toward(speed, want, delta * (6.0 if want > speed else 9.0))
	if dir.length() > 0.01:
		yaw = lerp_angle(yaw, atan2(dir.x, dir.z), 1.0 - exp(-delta * 6.0))
	var v := Basis(Vector3.UP, yaw) * Vector3.BACK * speed
	velocity.x = v.x; velocity.z = v.z
	velocity.y = -0.5 if is_on_floor() else velocity.y - 20.0 * delta
	var intended := Vector3(velocity.x, 0, velocity.z) * delta
	move_and_slide()
	StepUp.try_step(self, intended)
	rig.rotation.y = yaw
	var real := Vector2(get_real_velocity().x, get_real_velocity().z).length()
	var g := "idle"
	if state == "listen":
		g = "listen"
	elif state == "stalk":
		g = "stalk" if real > 0.1 else "lurk"
		rig.speed_scale("loco", "stalk", maxf(0.5, real / CharacterRig.CLIP_SPEED.Crouch_Fwd))
	elif real > 2.0:
		g = "hunt"
		rig.speed_scale("loco", "hunt", real / (CharacterRig.CLIP_SPEED.Jog_Fwd * 0.7 + CharacterRig.CLIP_SPEED.Zombie_Walk_Fwd * 0.3))
	elif real > 0.1:
		g = "walk"
		rig.speed_scale("loco", "walk", real / CharacterRig.CLIP_SPEED.Zombie_Walk_Fwd)
	rig.select("loco", g)
	pose.head_tilt = lerpf(pose.head_tilt, 0.45 if state in ["listen", "search"] else 0.0, 1.0 - exp(-delta * 3.0))
	var to_p := player.global_position - global_position
	var rel := wrapf(atan2(to_p.x, to_p.z) - yaw, -PI, PI)
	pose.look_yaw = lerpf(pose.look_yaw, rel if (aware > 0.3 and absf(rel) < 1.6) else 0.0, 1.0 - exp(-delta * 4.0))
	_step_acc += real * delta
	if _step_acc > (0.7 if g != "hunt" else 1.6):
		_step_acc = 0.0
		snd_step.stream = load("res://assets/audio/step_%d.mp3" % (1 + randi() % 7))
		snd_step.pitch_scale = randf_range(0.66, 0.78)
		snd_step.volume_db = -6.0 if g == "hunt" else (-20.0 if g == "stalk" else -12.0)
		snd_step.play()

func _hug_wall(dir: Vector3) -> Vector3:
	var s := get_world_3d().direct_space_state
	var p := global_position + Vector3(0, 1.0, 0)
	var side := Vector3(dir.z, 0, -dir.x)
	for sgn in [1.0, -1.0]:
		var q := PhysicsRayQueryParameters3D.create(p, p + side * sgn * 1.3, World.L_WORLD)
		var h := s.intersect_ray(q)
		if not h.is_empty():
			var gap := p.distance_to(h.position)
			return (dir + side * sgn * clampf((gap - 0.55) * 0.6, -0.4, 0.4)).normalized()
	return dir

func _open_doors_ahead(dir: Vector3) -> void:
	for d in world.doors:
		if not is_instance_valid(d) or d.is_open() or not d.locked_lines.is_empty():
			continue
		var to: Vector3 = d.global_position - global_position
		to.y = 0.0
		if to.length() < 1.3 and to.normalized().dot(dir) > 0.3:
			d.try_toggle(global_position, "listener")
			_busy = 0.7

func _face_point(p: Vector3) -> void:
	var to := p - global_position
	yaw = lerp_angle(yaw, atan2(to.x, to.z), 0.35)

func _on_link(details: Dictionary) -> void:
	# ladder / shaft links (Wrenfield): climb along the link instead of walking through the slab
	var a: Vector3 = details.get("link_entry_position", global_position)
	var b: Vector3 = details.get("link_exit_position", global_position)
	if absf(a.y - b.y) < 0.8:
		return
	_climb = {"from": global_position, "to": b, "t": 0.0, "dur": absf(b.y - a.y) / 1.1 + 0.6}
	rig.select("act_sel", "climb"); rig.fire("act")

func _tick_climb(delta: float) -> void:
	_climb.t += delta
	var k := clampf(_climb.t / _climb.dur, 0.0, 1.0)
	global_position = _climb.from.lerp(_climb.to, k)
	if k >= 1.0:
		_climb = {}

# ---------------------------------------------------------------- damage / reactions
func take_hit(dmg: float, at: Vector3, dir: Vector3, bone: String) -> void:
	hp -= dmg
	_recent_dmg += dmg
	_flash = 1.0
	aware = 1.0
	last_seen = player.global_position
	last_seen_t = _t
	_add_wound(at, bone)
	if bone == "Head" or dmg > 40.0:
		_stagger("hit_head" if bone == "Head" else "stagger", 0.9)
	elif dmg > 15.0 and randf() < 0.5:
		rig.select("act_sel", "hit"); rig.fire("act"); _busy = 0.35
	if hp <= 0.0 or _recent_dmg > 95.0:
		# it does not die: it withdraws into the house and comes back later (stalker design)
		_recent_dmg = 0.0
		hp = maxf(hp, 40.0)
		_stagger("stagger", 1.3)
		_voice("zombie_growl_%d.mp3" % (1 + randi() % 16), 3.0, 0.7)
		_set_state("retreat")
		agent.target_position = _retreat_spot()
	elif state != "retreat":
		_set_state("hunt")

func _stagger(kind: String, t: float) -> void:
	rig.select("act_sel", kind)
	rig.fire("act")
	_busy = t
	speed = 0.0

func shoved(from: Vector3) -> void:
	_stagger("stagger", 1.2)
	var away := (global_position - from)
	away.y = 0.0
	velocity = away.normalized() * 4.0
	_attack_cd = 2.5

func _retreat_spot() -> Vector3:
	var best := global_position
	var bd := -1.0
	for id in world.rooms:
		var c: Vector3 = world.rooms[id].aabb.get_center()
		var d := c.distance_to(player.global_position)
		if d > bd and absf(c.y - global_position.y) < 3.0:
			bd = d; best = c
	return NavigationServer3D.map_get_closest_point(get_world_3d().navigation_map, best)

func _add_wound(world_pos: Vector3, bone: String) -> void:
	var b := rig.bone(bone if bone != "" and rig.bone(bone) >= 0 else "spine_02")
	var sk := rig.skeleton
	# world -> bind space: inverse of (skeleton global * bone pose * inverse bind)
	var skin: Skin = rig.body_mesh.skin
	var bi := -1
	for i in skin.get_bind_count():
		if skin.get_bind_name(i) == sk.get_bone_name(b):
			bi = i
	if bi < 0:
		return
	var bone_g := sk.global_transform * sk.get_bone_global_pose(b)
	var p_bind := skin.get_bind_pose(bi).affine_inverse() * (bone_g.affine_inverse() * world_pos)
	_wounds.push_front(Vector4(p_bind.x, p_bind.y, p_bind.z, randf_range(0.8, 1.3)))
	if _wounds.size() > 8:
		_wounds.resize(8)
	var arr := PackedVector4Array(_wounds)
	while arr.size() < 8:
		arr.append(Vector4(0, -10, 0, 0))
	skin_mat.set_shader_parameter("wounds", arr)

# ---------------------------------------------------------------- audio (3D, occluded by walls)
func _audio(delta: float, dist: float) -> void:
	_occl_t -= delta
	if _occl_t <= 0.0 and dist < 34.0:
		_occl_t = 0.25
		var occ := world.occlusion_between(player.camera.global_position, global_position + Vector3(0, 1.6, 0))
		for a in [snd_voice, snd_step]:
			a.attenuation_filter_cutoff_hz = lerpf(18000.0, 700.0, occ)
			a.volume_db = a.volume_db
		snd_voice.unit_size = lerpf(3.5, 1.6, occ)
		snd_step.unit_size = lerpf(3.5, 1.6, occ)
	_voice_t -= delta
	if _voice_t <= 0.0:
		_voice_t = randf_range(4.0, 9.0) if state != "hunt" else randf_range(2.0, 4.0)
		if state in ["listen", "search", "investigate"]:
			_voice("listener_click_%d.wav" % (randi() % 4), -4.0)
		else:
			_voice("listener_breath_%d.wav" % (randi() % 3), -8.0 if state != "hunt" else -2.0)

func _voice(file: String, db := 0.0, pitch := 1.0) -> void:
	var path := ("res://assets/audio/gen/" if file.ends_with(".wav") else "res://assets/audio/") + file
	var s = load(path)
	if s:
		snd_voice.stream = s; snd_voice.volume_db = db; snd_voice.pitch_scale = pitch; snd_voice.play()

## Post-animation bone elongation (longer forearms, fingers, neck, shins) applied every frame.
class Elongate extends SkeletonModifier3D:
	var factors := {}
	var _idx := {}
	func _process_modification() -> void:
		var sk := get_skeleton()
		if sk == null:
			return
		if _idx.is_empty():
			for n in factors:
				var i := sk.find_bone(n)
				if i >= 0:
					_idx[i] = factors[n]
		for i in _idx:
			sk.set_bone_pose_position(i, sk.get_bone_rest(i).origin * _idx[i])
