class_name Player
extends CharacterBody3D
## Daniel — modern over-the-shoulder third-person controller (§21.5–21.7).

signal died
signal fired(hit: Dictionary)
signal interacted(target)

const WALK := 1.35
const RUN := 4.6
const CROUCH := 0.85
const AIM := 1.05
const AIM_BACK := 0.9
const GRAVITY := 20.0
const DIST_NORMAL := 2.55
const DIST_AIM := 1.35
const PIVOT_H := 1.52
const SHOULDER_X := 0.42
const SHOULDER_X_AIM := 0.52
const FIRE_COOLDOWN := 0.26
const PISTOL_DAMAGE := 34.0

var world: World
var rig: CharacterRig
var pose: PoseModifier
var cam_pivot: Node3D
var spring: SpringArm3D
var camera: Camera3D
var flashlight: SpotLight3D
var pistol: Node3D
var muzzle: Marker3D
var knife: Node3D
var muzzle_light: OmniLight3D
var muzzle_flash: MeshInstance3D
var snd_step: AudioStreamPlayer3D
var snd_gun: AudioStreamPlayer3D
var snd_misc: AudioStreamPlayer3D
var decals: Array = []
var _decal_i := 0

# state
var yaw := PI                 # model facing (0 = +Z)
var cam_yaw := 0.0
var cam_pitch := -0.12
var speed := 0.0
var move_dir := Vector3.ZERO
var aiming := false
var crouching := false
var guarding := false
var dead := false
var controls_enabled := true
var flashlight_on := false
var shoulder := 1.0
var _shoulder_s := 1.0
var _aim_s := 0.0
var _busy := 0.0               # seconds until the current full/upper action releases control
var _busy_kind := ""
var _fire_cd := 0.0
var _shove_cd := 0.0
var _spread := 0.0
var _turning := 0.0
var _turn_from := 0.0
var _turn_cam_from := 0.0
var _step_acc := 0.0
var _step_i := 0
var _pivot_pos := Vector3.ZERO
var _shake := 0.0
var _recoil := 0.0
var _gait := "idle"
var _prev_yaw := 0.0
var _turn_rate := 0.0
var _pending := []             # [time, Callable]
var autopilot: Callable = Callable()   # tests/benchmark: returns {move: Vector2 (x right, y fwd), run, aim, look_yaw}

func setup(w: World) -> void:
	world = w
	collision_layer = World.L_PLAYER
	collision_mask = World.L_WORLD | World.L_DOOR | ArtSlice.L_PROP | World.L_ENEMY
	floor_max_angle = deg_to_rad(50.0)
	floor_snap_length = 0.5
	floor_constant_speed = true
	floor_block_on_wall = true
	var cs := CollisionShape3D.new()
	var cap := CapsuleShape3D.new()
	cap.radius = 0.3
	cap.height = 1.72
	cs.shape = cap
	cs.position.y = 0.86
	add_child(cs)
	add_to_group("player")
	rig = CharacterRig.new()
	rig.name = "Rig"
	add_child(rig)
	rig.build(true)
	rig.scale = Vector3.ONE * 0.97
	_apply_outfit()
	_build_tree()
	pose = PoseModifier.new()
	rig.skeleton.add_child(pose)
	_build_weapons()
	_build_camera()
	_build_flashlight()
	_build_audio()
	_build_decals()
	Game.weapon_changed.connect(func(_w): _update_weapon_visibility())
	_update_weapon_visibility()

# ---------------------------------------------------------------- construction
func _apply_outfit() -> void:
	var m := rig.body_mesh
	var mesh: ArrayMesh = m.mesh
	var out := ArrayMesh.new()
	for s in mesh.get_surface_count():
		var arrays := mesh.surface_get_arrays(s)
		var verts: PackedVector3Array = arrays[Mesh.ARRAY_VERTEX]
		var bindp := PackedFloat32Array()
		bindp.resize(verts.size() * 3)
		for i in verts.size():
			bindp[i * 3] = verts[i].x; bindp[i * 3 + 1] = verts[i].y; bindp[i * 3 + 2] = verts[i].z
		arrays[Mesh.ARRAY_CUSTOM0] = bindp
		var flags := (Mesh.ARRAY_CUSTOM_RGB_FLOAT << Mesh.ARRAY_FORMAT_CUSTOM0_SHIFT) | (mesh.surface_get_format(s) & Mesh.ARRAY_FLAG_USE_8_BONE_WEIGHTS)
		out.add_surface_from_arrays(Mesh.PRIMITIVE_TRIANGLES, arrays, [], {}, flags)
	m.mesh = out
	var sm := ShaderMaterial.new()
	sm.shader = load("res://shaders/outfit.gdshader")
	sm.set_shader_parameter("skin_tex", load("res://assets/characters/daniel/T_Superhero_Male_Light.png"))
	sm.set_shader_parameter("skin_normal", load("res://assets/characters/daniel/T_Superhero_Male_Normal.png"))
	sm.set_shader_parameter("skin_rough", load("res://assets/characters/daniel/T_Superhero_Male_Roughness.png"))
	sm.set_shader_parameter("fabric_n", load("res://assets/characters/daniel/fabric_weave_n.webp"))
	for s in out.get_surface_count():
		m.set_surface_override_material(s, sm)
	for h in rig.meshes:
		if h != m and h.name.begins_with("Hair"):
			for s in h.mesh.get_surface_count():
				var hm: Material = h.mesh.surface_get_material(s).duplicate()
				if hm is StandardMaterial3D:
					hm.albedo_color = Color(0.14, 0.1, 0.07).lerp(Color.WHITE, 0.0)
					hm.roughness = 0.75
				h.set_surface_override_material(s, hm)

func _build_tree() -> void:
	var r := rig
	# locomotion
	var inj := AnimationNodeBlendTree.new()
	inj.add_node("w", r.anim("Walk")); inj.add_node("z", r.anim("Zombie_Walk_Fwd")); var b2 := AnimationNodeBlend2.new(); inj.add_node("b", b2)
	inj.connect_node("b", 0, "w"); inj.connect_node("b", 1, "z"); inj.connect_node("output", 0, "b")
	r.add_selector("loco", {"idle": "Idle", "walk": "Walk", "walk_back": r.anim("Walk", true), "run": "Jog_Fwd", "crouch_idle": "Crouch_Idle",
		"crouch_walk": "Crouch_Fwd", "crouch_back": r.anim("Crouch_Fwd", true), "injured": inj, "aim_idle": "Pistol_Idle"}, 0.22)
	# weapon hold (upper body) — lowered pistol / knife ready / flashlight-ready arm
	r.add_selector("hold_sel", {"pistol": "Pistol_Idle", "knife": "Sword_Idle"}, 0.2, false)
	var hold := AnimationNodeBlend2.new(); r.filter_upper(hold, true, false, false); r.bt.add_node("hold", hold)
	r.bt.connect_node("hold", 0, "loco"); r.bt.connect_node("hold", 1, "hold_sel")
	# guard (Space held)
	r.bt.add_node("guard_anim", r.anim("Idle_Shield"))
	var guard := AnimationNodeBlend2.new(); r.filter_upper(guard); r.bt.add_node("guard", guard)
	r.bt.connect_node("guard", 0, "hold"); r.bt.connect_node("guard", 1, "guard_anim")
	# aim: pitch blend space (down / neutral / up), upper body only
	var bs := AnimationNodeBlendSpace1D.new()
	bs.add_blend_point(r.anim("Pistol_Aim_Down"), -1.0); bs.add_blend_point(r.anim("Pistol_Aim_Neutral"), 0.0); bs.add_blend_point(r.anim("Pistol_Aim_Up"), 1.0)
	bs.min_space = -1.0; bs.max_space = 1.0
	r.bt.add_node("aim_bs", bs)
	var aim := AnimationNodeBlend2.new(); r.filter_upper(aim); r.bt.add_node("aim", aim)
	r.bt.connect_node("aim", 0, "guard"); r.bt.connect_node("aim", 1, "aim_bs")
	# upper-body one-shots: shoot, reload, heal
	r.add_selector("up_sel", {"shoot": "Pistol_Shoot", "reload": "Pistol_Reload", "heal": "Consume"}, 0.0, true)
	var up := AnimationNodeOneShot.new(); r.filter_upper(up); up.fadein_time = 0.06; up.fadeout_time = 0.18; r.bt.add_node("up_act", up)
	r.bt.connect_node("up_act", 0, "aim"); r.bt.connect_node("up_act", 1, "up_sel")
	# full-body one-shots: interact, pick up, knife, shove, hits, quick turn
	r.add_selector("full_sel", {"interact": "Interact", "pickup": "PickUp_Table", "knife": "Sword_Regular_A", "shove": "Punch_Cross",
		"hit": "Hit_Chest", "hit_head": "Hit_Head", "knockback": "Hit_Knockback", "turn": "Walk"}, 0.0, true)
	var full := AnimationNodeOneShot.new(); full.fadein_time = 0.08; full.fadeout_time = 0.2; r.bt.add_node("full_act", full)
	r.bt.connect_node("full_act", 0, "up_act"); r.bt.connect_node("full_act", 1, "full_sel")
	# life
	var life := AnimationNodeTransition.new(); life.xfade_time = 0.25; life.input_count = 2; life.set_input_name(0, "alive"); life.set_input_name(1, "dead")
	r.bt.add_node("life", life); r.bt.add_node("death", r.anim("Death01"))
	r.bt.connect_node("life", 0, "full_act"); r.bt.connect_node("life", 1, "death")
	r.bt.connect_node("output", 0, "life")
	r.tree.active = true
	r.blend("hold", 0.0); r.blend("guard", 0.0); r.blend("aim", 0.0)
	r.tree.set("parameters/loco/injured/b/blend_amount", 0.4)

## Weapon offsets in hand-bone space, derived from the clip poses so the gun sits in the palm with the
## barrel along the forearm-aim line (Pistol_Aim_Neutral) and the knife across the fist (Sword_Idle).
func _hand_offsets() -> Dictionary:
	var ap := AnimationPlayer.new()
	rig.model.add_child(ap)
	ap.root_node = NodePath("..")
	ap.add_animation_library("ual", CharacterRig.library())
	rig.tree.active = false
	var sk := rig.skeleton
	var res := {}
	for clip in ["Pistol_Aim_Neutral", "Sword_Idle"]:
		ap.play("ual/" + clip); ap.seek(0.0, true); ap.advance(0.0)
		var H := sk.get_bone_global_pose(sk.find_bone("hand_r"))
		var mid := sk.get_bone_global_pose(sk.find_bone("middle_01_r")).origin
		var idx := sk.get_bone_global_pose(sk.find_bone("index_01_r")).origin
		var pky := sk.get_bone_global_pose(sk.find_bone("pinky_01_r")).origin
		var fingers := (mid - H.origin).normalized()
		var palm := H.origin + fingers * 0.07
		if clip == "Pistol_Aim_Neutral":
			# barrel (+X pistol) along aim forward (+Z), up (+Y) world up, grip point at the palm
			var B := Basis(Vector3(0, 0, 1), Vector3(0, 1, 0), Vector3(-1, 0, 0))
			var G := Transform3D(B, palm - B * Vector3(-0.005, -0.035, 0.0) + Vector3(0, -0.015, 0))
			res.pistol = H.affine_inverse() * G
		else:
			var blade := (idx - pky).normalized()
			var side := fingers.cross(blade).normalized()
			var B2 := Basis(side, blade, side.cross(blade)).orthonormalized()
			res.knife = H.affine_inverse() * Transform3D(B2, palm)
	ap.queue_free()
	rig.tree.active = true
	return res

func _build_weapons() -> void:
	var off := _hand_offsets()
	pistol = Node3D.new(); pistol.name = "Pistol"
	var src: Node = load("res://assets/weapons/service_pistol.glb").instantiate()
	for m in src.find_children("*", "MeshInstance3D", true, false):
		if m.name.ends_with("_a") or m.name.ends_with("magazine_loaded"):
			var mi := MeshInstance3D.new(); mi.mesh = m.mesh; mi.transform = m.transform
			for s in m.mesh.get_surface_count():
				mi.set_surface_override_material(s, m.get_active_material(s))
			pistol.add_child(mi)
	src.free()
	muzzle = Marker3D.new(); muzzle.position = Vector3(0.175, 0.062, 0.0); pistol.add_child(muzzle)
	rig.attach("hand_r", pistol, off.pistol)
	knife = _make_knife()
	rig.attach("hand_r", knife, off.knife)
	muzzle_light = OmniLight3D.new(); muzzle_light.light_color = Color(1.0, 0.75, 0.45); muzzle_light.omni_range = 5.0; muzzle_light.light_energy = 0.0
	muzzle_light.shadow_enabled = false; muzzle.add_child(muzzle_light)
	muzzle_flash = MeshInstance3D.new()
	var q := QuadMesh.new(); q.size = Vector2(0.16, 0.16); muzzle_flash.mesh = q
	var fm := StandardMaterial3D.new(); fm.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED; fm.blend_mode = BaseMaterial3D.BLEND_MODE_ADD
	fm.albedo_texture = _flash_texture(); fm.albedo_color = Color(1.0, 0.7, 0.35); fm.billboard_mode = BaseMaterial3D.BILLBOARD_ENABLED; fm.no_depth_test = false
	fm.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
	muzzle_flash.material_override = fm; muzzle_flash.visible = false; muzzle_flash.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	muzzle_flash.position = Vector3(0.05, 0, 0); muzzle.add_child(muzzle_flash)

static func _flash_texture() -> Texture2D:
	var img := Image.create(64, 64, false, Image.FORMAT_RGBA8)
	for y in 64:
		for x in 64:
			var d := Vector2(x - 31.5, y - 31.5) / 32.0
			var a := atan2(d.y, d.x)
			var star := 0.55 + 0.45 * pow(absf(cos(a * 3.0)), 6.0)
			var v := clampf(1.0 - d.length() / star, 0.0, 1.0)
			img.set_pixel(x, y, Color(1, 1, 1, v * v))
	return ImageTexture.create_from_image(img)

func _make_knife() -> Node3D:
	var k := Node3D.new(); k.name = "Knife"
	var steel := StandardMaterial3D.new(); steel.albedo_color = Color(0.62, 0.63, 0.65); steel.metallic = 1.0; steel.roughness = 0.28
	var grip := StandardMaterial3D.new(); grip.albedo_color = Color(0.05, 0.05, 0.05); grip.roughness = 0.7
	var blade := MeshInstance3D.new(); var bm := PrismMesh.new(); bm.size = Vector3(0.03, 0.17, 0.004); bm.left_to_right = 0.0
	blade.mesh = bm; blade.position = Vector3(0, 0.135, 0); blade.material_override = steel; k.add_child(blade)
	var h := MeshInstance3D.new(); var hm := CapsuleMesh.new(); hm.radius = 0.014; hm.height = 0.11; h.mesh = hm; h.material_override = grip; k.add_child(h)
	var guard := MeshInstance3D.new(); var gm := BoxMesh.new(); gm.size = Vector3(0.05, 0.008, 0.016); guard.mesh = gm; guard.position.y = 0.055; guard.material_override = steel; k.add_child(guard)
	return k

func _build_camera() -> void:
	cam_pivot = Node3D.new(); cam_pivot.name = "CamPivot"; cam_pivot.top_level = true
	add_child(cam_pivot)
	spring = SpringArm3D.new(); spring.collision_mask = World.L_WORLD | World.L_DOOR
	var sph := SphereShape3D.new(); sph.radius = 0.18; spring.shape = sph; spring.margin = 0.06
	spring.spring_length = DIST_NORMAL
	spring.add_excluded_object(get_rid())
	cam_pivot.add_child(spring)
	camera = Camera3D.new(); camera.near = 0.05; camera.far = 120.0; camera.fov = Settings.get_v("cam_fov")
	spring.add_child(camera)
	camera.current = true
	_pivot_pos = global_position + Vector3(0, PIVOT_H, 0)
	cam_yaw = rotation.y + PI
	shoulder = float(Settings.get_v("cam_shoulder"))
	_shoulder_s = shoulder

func _build_flashlight() -> void:
	flashlight = SpotLight3D.new(); flashlight.name = "Flashlight"; flashlight.top_level = true
	flashlight.light_color = Color(0.93, 0.96, 1.0); flashlight.light_energy = 7.0; flashlight.spot_range = 18.0
	flashlight.spot_angle = 24.0; flashlight.spot_angle_attenuation = 0.8; flashlight.spot_attenuation = 1.6
	flashlight.shadow_enabled = true; flashlight.shadow_bias = 0.04; flashlight.light_volumetric_fog_energy = 1.4
	flashlight.visible = false
	add_child(flashlight)

func _build_audio() -> void:
	for n in ["snd_step", "snd_gun", "snd_misc"]:
		var p := AudioStreamPlayer3D.new(); p.bus = "SFX"; p.max_distance = 40.0; p.unit_size = 3.0
		add_child(p); set(n, p)
	snd_step.position.y = 0.05

func _build_decals() -> void:
	var tex := _hole_texture()
	for i in 24:
		var d := Decal.new(); d.size = Vector3(0.09, 0.06, 0.09); d.texture_albedo = tex; d.top_level = true
		d.visible = false; d.cull_mask = 1; d.upper_fade = 0.2; d.lower_fade = 0.2
		add_child(d); decals.append(d)

static func _hole_texture() -> Texture2D:
	var img := Image.create(64, 64, false, Image.FORMAT_RGBA8)
	var rng := RandomNumberGenerator.new(); rng.seed = 5
	for y in 64:
		for x in 64:
			var d := Vector2(x - 31.5, y - 31.5).length() / 32.0
			var n := rng.randf() * 0.15
			var hole := clampf(1.0 - (d - 0.12) / 0.06, 0.0, 1.0)
			var scorch := clampf(1.0 - (d + n) / 0.8, 0.0, 1.0) * 0.55
			var a := maxf(hole, scorch)
			img.set_pixel(x, y, Color(0.03, 0.025, 0.02, a))
	return ImageTexture.create_from_image(img)

# ---------------------------------------------------------------- input
func _unhandled_input(e: InputEvent) -> void:
	if dead or not controls_enabled:
		return
	if e is InputEventMouseMotion and Input.get_mouse_mode() == Input.MOUSE_MODE_CAPTURED:
		var sh: float = Settings.get_v("cam_sens_h_aim" if aiming else "cam_sens_h")
		var sv: float = Settings.get_v("cam_sens_v_aim" if aiming else "cam_sens_v")
		cam_yaw -= e.relative.x * sh * 0.01
		cam_pitch += (e.relative.y if Settings.get_v("cam_invert_y") else -e.relative.y) * sv * 0.01
		cam_pitch = clampf(cam_pitch, deg_to_rad(-72.0), deg_to_rad(62.0))
	elif e.is_action_pressed("shoulder_swap"):
		shoulder = -shoulder
		Settings.set_v("cam_shoulder", int(shoulder))
	elif e.is_action_pressed("flashlight"):
		flashlight_on = not flashlight_on
		_play(snd_misc, "relay_clunk.mp3", -18.0, 2.2)
	elif e.is_action_pressed("crouch") and not aiming:
		crouching = not crouching
	elif e.is_action_pressed("quick_turn"):
		_quick_turn()
	elif e.is_action_pressed("reload"):
		_reload()
	elif e.is_action_pressed("heal"):
		_heal()
	elif e.is_action_pressed("interact"):
		_interact()
	elif e.is_action_pressed("weapon_next") and not aiming and _busy <= 0.0:
		Game.cycle_weapon(1)
	elif e.is_action_pressed("weapon_prev") and not aiming and _busy <= 0.0:
		Game.cycle_weapon(-1)
	elif e.is_action_pressed("attack"):
		_attack()
	elif e.is_action_pressed("defend"):
		_defend_pressed()

# ---------------------------------------------------------------- per frame
func _physics_process(delta: float) -> void:
	_tick_pending(delta)
	_busy = maxf(0.0, _busy - delta)
	_fire_cd = maxf(0.0, _fire_cd - delta)
	_shove_cd = maxf(0.0, _shove_cd - delta)
	var ap := {}
	if autopilot.is_valid():
		ap = autopilot.call(delta)
	var in_v := Vector2.ZERO
	var want_run := false
	if not dead and controls_enabled:
		in_v = Input.get_vector("move_left", "move_right", "move_back", "move_forward")
		want_run = Input.is_action_pressed("sprint")
		aiming = Input.is_action_pressed("aim") and Game.weapon == "pistol" and _busy_kind != "reload" and _turning <= 0.0
		guarding = Input.is_action_pressed("defend") and not aiming and _busy <= 0.0
	if not ap.is_empty():
		in_v = ap.get("move", Vector2.ZERO); want_run = ap.get("run", false); aiming = ap.get("aim", false)
		if ap.has("look_yaw"): cam_yaw = lerp_angle(cam_yaw, ap.look_yaw, 1.0 - exp(-delta * 6.0))
		if ap.has("look_pitch"): cam_pitch = ap.look_pitch
	if dead:
		in_v = Vector2.ZERO
	if aiming and crouching:
		crouching = false
	# camera-relative direction
	var cb := Basis(Vector3.UP, cam_yaw)
	var fwd := cb * Vector3.FORWARD
	var right := cb * Vector3.RIGHT
	var wish := (right * in_v.x + fwd * in_v.y)
	var mag := minf(1.0, wish.length())
	if mag > 0.01:
		wish = wish / wish.length()
	# quick turn overrides steering
	if _turning > 0.0:
		_turning -= delta
		var t := 1.0 - clampf(_turning / 0.42, 0.0, 1.0)
		var e := t * t * (3.0 - 2.0 * t)
		yaw = _turn_from + PI * e
		cam_yaw = _turn_cam_from + PI * e
		mag = 0.0
	var target := 0.0
	var inj := Game.injury()
	if mag > 0.01 and _busy_kind not in ["heal_lock", "pickup", "interact", "knockback", "hit"]:
		if aiming:
			var local := Basis(Vector3.UP, yaw).inverse() * wish
			target = (AIM_BACK if local.z < -0.3 else AIM) * mag
		elif crouching:
			target = CROUCH * mag
		elif want_run and inj < 0.75:
			target = RUN * mag
		else:
			target = WALK * mag
		if inj > 0.6:
			target *= 0.78
	# facing
	if aiming:
		yaw = lerp_angle(yaw, cam_yaw + PI, 1.0 - exp(-delta * 18.0))
	elif mag > 0.01 and _turning <= 0.0:
		var want_yaw := atan2(wish.x, wish.z)
		var diff := wrapf(want_yaw - yaw, -PI, PI)
		var rate := 7.0 if speed > 2.5 else 10.0
		yaw += diff * (1.0 - exp(-delta * rate))
		target *= clampf(cos(diff) * 0.7 + 0.3, 0.15, 1.0)  # slow down through sharp turns (no skating)
	var accel := 9.0 if target > speed else 12.0
	speed = move_toward(speed, target, accel * delta * maxf(1.0, absf(target - speed)))
	if mag > 0.01 and aiming:
		move_dir = move_dir.lerp(wish, 1.0 - exp(-delta * 12.0))
	elif mag > 0.01:
		move_dir = Basis(Vector3.UP, yaw) * Vector3.BACK
	var hv := move_dir * speed
	velocity.x = hv.x; velocity.z = hv.z
	if is_on_floor():
		velocity.y = -0.5
	else:
		velocity.y -= GRAVITY * delta
	var intended := Vector3(velocity.x, 0, velocity.z) * delta
	move_and_slide()
	StepUp.try_step(self, intended)
	# measured speed (blocked by walls -> animation slows too: no running in place)
	var real := Vector2(get_real_velocity().x, get_real_velocity().z).length()
	if real < speed - 0.3 and is_on_wall():
		speed = lerpf(speed, real, 0.5)
	rig.rotation.y = yaw
	_turn_rate = wrapf(yaw - _prev_yaw, -PI, PI) / maxf(delta, 0.001)
	_prev_yaw = yaw
	_animate(delta, real)
	_footsteps(delta, real)
	if world:
		world.set_player_room(world.room_at(global_position + Vector3(0, 0.5, 0)))

func _process(delta: float) -> void:
	_update_camera(delta)
	_update_flashlight(delta)
	_spread = maxf(0.0, _spread - delta * 0.12)
	_recoil = move_toward(_recoil, 0.0, delta * 0.5)
	if muzzle_light.light_energy > 0.0:
		muzzle_light.light_energy = maxf(0.0, muzzle_light.light_energy - delta * 120.0)
		if muzzle_light.light_energy <= 0.0:
			muzzle_flash.visible = false

func _animate(delta: float, real: float) -> void:
	var r := rig
	var local := Basis(Vector3.UP, yaw).inverse() * (move_dir * real)
	var g := "idle"
	var inj := Game.injury()
	if dead:
		r.select("life", "dead")
		return
	if aiming:
		if real > 0.12:
			var back := local.z < -0.25 * real
			g = "walk_back" if back else "walk"
			r.speed_scale("loco", g, real / CharacterRig.CLIP_SPEED.Walk)
			var a := atan2(local.x, local.z)
			if back:
				a = wrapf(a - PI, -PI, PI)
			pose.twist = lerpf(pose.twist, clampf(a, -1.25, 1.25), 1.0 - exp(-delta * 10.0))
		else:
			g = "aim_idle"
			pose.twist = lerpf(pose.twist, 0.0, 1.0 - exp(-delta * 10.0))
	else:
		pose.twist = lerpf(pose.twist, 0.0, 1.0 - exp(-delta * 8.0))
		if crouching:
			g = "crouch_walk" if real > 0.1 else "crouch_idle"
			r.speed_scale("loco", "crouch_walk", maxf(0.4, real / CharacterRig.CLIP_SPEED.Crouch_Fwd))
		elif real > 2.4:
			g = "run"
			r.speed_scale("loco", "run", real / CharacterRig.CLIP_SPEED.Jog_Fwd)
		elif real > 0.12:
			g = "injured" if inj > 0.6 else "walk"
			var s := real / CharacterRig.CLIP_SPEED.Walk
			r.speed_scale("loco", "walk", maxf(0.5, s)); r.speed_scale("loco", "injured", maxf(0.5, real / 1.0))
	if _turning > 0.0:
		r.speed_scale("full_sel", "turn", 2.4)
	r.select("loco", g)
	_gait = g
	# upper-body layers
	var w := Game.weapon
	var hold_amt := 0.0
	if w == "pistol" and not aiming and g != "run":
		r.select("hold_sel", "pistol"); hold_amt = 0.55
	elif w == "knife" and not aiming:
		r.select("hold_sel", "knife"); hold_amt = 0.6
	r.blend("hold", lerpf(r.tree.get("parameters/hold/blend_amount"), hold_amt, 1.0 - exp(-delta * 8.0)))
	r.blend("guard", lerpf(r.tree.get("parameters/guard/blend_amount"), 1.0 if guarding else 0.0, 1.0 - exp(-delta * 12.0)))
	_aim_s = lerpf(_aim_s, 1.0 if aiming else 0.0, 1.0 - exp(-delta * 14.0))
	r.blend("aim", _aim_s)
	r.tree.set("parameters/aim_bs/blend_position", clampf(cam_pitch / deg_to_rad(55.0), -1.0, 1.0))
	# procedural layer: lean, banking, injury hunch, head look
	var run_k := clampf((real - 2.4) / 2.2, 0.0, 1.0)
	pose.lean_pitch = lerpf(pose.lean_pitch, 0.1 * run_k, 1.0 - exp(-delta * 6.0))
	pose.lean_roll = lerpf(pose.lean_roll, clampf(-_turn_rate * real * 0.018, -0.18, 0.18), 1.0 - exp(-delta * 6.0))
	pose.hunch = lerpf(pose.hunch, clampf((inj - 0.45) * 1.8, 0.0, 1.0), 1.0 - exp(-delta * 3.0))
	var rel_yaw := wrapf(cam_yaw + PI - yaw, -PI, PI)
	var look := 0.0 if aiming else (rel_yaw if absf(rel_yaw) < 2.0 else 0.0)
	pose.look_yaw = lerpf(pose.look_yaw, look, 1.0 - exp(-delta * 6.0))
	pose.look_pitch = lerpf(pose.look_pitch, 0.0 if aiming else cam_pitch * 0.6, 1.0 - exp(-delta * 6.0))

# ---------------------------------------------------------------- camera
func _update_camera(delta: float) -> void:
	var smooth: float = Settings.get_v("cam_smooth")
	var follow := lerpf(40.0, 9.0, smooth)
	var head := global_position + Vector3(0, (PIVOT_H - 0.42) if crouching else PIVOT_H, 0)
	_pivot_pos = _pivot_pos.lerp(head, 1.0 - exp(-delta * follow))
	if _pivot_pos.distance_to(head) > 1.5:
		_pivot_pos = head
	cam_pivot.global_position = _pivot_pos
	var shake := Vector2(randf_range(-1, 1), randf_range(-1, 1)) * _shake * 0.02
	_shake = maxf(0.0, _shake - delta * 2.5)
	cam_pivot.rotation = Vector3(cam_pitch + _recoil + shake.y, cam_yaw + shake.x, 0.0)
	_shoulder_s = lerpf(_shoulder_s, shoulder, 1.0 - exp(-delta * 10.0))
	var sx := lerpf(SHOULDER_X, SHOULDER_X_AIM, _aim_s) * _shoulder_s
	# never start the spring arm inside a wall: clamp the shoulder offset by a sideways probe (tight corridors)
	var side_dir := cam_pivot.global_basis.x * signf(sx)
	var q := PhysicsRayQueryParameters3D.create(_pivot_pos, _pivot_pos + side_dir * (absf(sx) + 0.2), World.L_WORLD | World.L_DOOR, [get_rid()])
	var hit := get_world_3d().direct_space_state.intersect_ray(q)
	if not hit.is_empty():
		sx = signf(sx) * maxf(0.0, _pivot_pos.distance_to(hit.position) - 0.22)
	spring.position = Vector3(sx, lerpf(0.06, 0.0, _aim_s), 0.0)
	spring.spring_length = lerpf(DIST_NORMAL, DIST_AIM, _aim_s)
	var base_fov: float = Settings.get_v("cam_fov")
	camera.fov = lerpf(camera.fov, base_fov - 16.0 * _aim_s, 1.0 - exp(-delta * 12.0))
	# keep the character readable: if the arm is pulled in very close, lift the camera over the shoulder
	var pulled := spring.get_hit_length()
	camera.position.y = clampf((1.0 - pulled / 1.0) * 0.25, 0.0, 0.25)

func aim_ray() -> Dictionary:
	var from := camera.global_position
	var dir := -camera.global_basis.z
	var spread := 0.004 + _spread
	dir = (dir + camera.global_basis.x * randf_range(-spread, spread) + camera.global_basis.y * randf_range(-spread, spread)).normalized()
	var q := PhysicsRayQueryParameters3D.create(from, from + dir * 60.0, World.L_WORLD | World.L_DOOR | ArtSlice.L_PROP | World.L_HITBOX, [get_rid()])
	q.collide_with_areas = true
	var r := get_world_3d().direct_space_state.intersect_ray(q)
	if r.is_empty():
		return {"position": from + dir * 60.0, "dir": dir}
	r.dir = dir
	return r

func _update_flashlight(delta: float) -> void:
	flashlight.visible = flashlight_on and not dead
	if not flashlight.visible:
		return
	var chest := rig.bone_global("spine_03")
	var face := Basis(Vector3.UP, yaw)
	var pos := chest.origin + face * Vector3(-0.12, 0.05, 0.16)
	var target := camera.global_position + (-camera.global_basis.z) * 12.0
	flashlight.global_position = pos
	var want := flashlight.global_transform.looking_at(target, Vector3.UP).basis
	flashlight.global_basis = flashlight.global_basis.slerp(want, 1.0 - exp(-delta * 14.0)).orthonormalized()

# ---------------------------------------------------------------- actions
func _act_full(kind: String, lock: float, busy_kind := "") -> void:
	rig.select("full_sel", kind)
	rig.fire("full_act")
	_busy = lock
	_busy_kind = busy_kind if busy_kind != "" else kind
	_after(lock, func(): if _busy_kind == (busy_kind if busy_kind != "" else kind): _busy_kind = "")

func _act_upper(kind: String, lock: float) -> void:
	rig.select("up_sel", kind)
	rig.fire("up_act")
	_busy = maxf(_busy, lock)
	_busy_kind = kind
	_after(lock, func(): if _busy_kind == kind: _busy_kind = "")

func _quick_turn() -> void:
	if aiming or _turning > 0.0 or _busy > 0.0 or dead:
		return
	_turning = 0.42
	_turn_from = yaw
	_turn_cam_from = cam_yaw
	speed = 0.0
	_act_full("turn", 0.42)

func _attack() -> void:
	if dead or _busy > 0.0:
		return
	match Game.weapon:
		"pistol":
			if aiming:
				_shoot()
		"knife":
			_knife()
		_:
			pass  # unarmed: LMB does nothing (no shot from thin air)

func _shoot() -> void:
	if _fire_cd > 0.0:
		return
	if Game.mag <= 0:
		_play(snd_gun, "dry_fire.mp3", -6.0)
		_fire_cd = 0.35
		Game.say("没子弹了。按 R 换弹。", 1.4)
		return
	_fire_cd = FIRE_COOLDOWN
	Game.mag -= 1
	Game.ammo_changed.emit(Game.mag, Game.count("ammo"))
	_act_upper("shoot", 0.12)
	var hit := aim_ray()
	# the muzzle must also see the target (no shooting through a door frame the camera peeks past)
	var mq := PhysicsRayQueryParameters3D.create(muzzle.global_position, hit.position + hit.dir * 0.05, World.L_WORLD | World.L_DOOR | ArtSlice.L_PROP | World.L_HITBOX, [get_rid()])
	mq.collide_with_areas = true
	var mh := get_world_3d().direct_space_state.intersect_ray(mq)
	if not mh.is_empty() and mh.position.distance_to(hit.position) > 0.08:
		mh.dir = hit.dir
		hit = mh
	muzzle_light.light_energy = 6.0
	muzzle_flash.visible = true
	muzzle_flash.rotation.z = randf() * TAU
	_play(snd_gun, ["pistol_shot_1.mp3", "pistol_shot_2.mp3"][randi() % 2], 0.0, randf_range(0.96, 1.04))
	NoiseBus.emit_noise(global_position + Vector3(0, 1.4, 0), 34.0, "gunshot", self)
	_recoil += 0.035
	_spread = minf(0.05, _spread + 0.018)
	_shake = maxf(_shake, 0.25)
	if hit.has("collider"):
		var c: Object = hit.collider
		if c is Area3D and c.has_meta("owner"):
			c.get_meta("owner").take_hit(PISTOL_DAMAGE * c.get_meta("mult", 1.0), hit.position, hit.dir, c.get_meta("bone", ""))
		else:
			_bullet_hole(hit.position, hit.normal)
	fired.emit(hit)

func _bullet_hole(p: Vector3, n: Vector3) -> void:
	var d: Decal = decals[_decal_i]
	_decal_i = (_decal_i + 1) % decals.size()
	d.visible = true
	d.global_position = p
	d.global_basis = _decal_basis(n)
	_play(snd_misc, "impact_concrete.mp3", -8.0, randf_range(0.9, 1.1), p)

static func _decal_basis(n: Vector3) -> Basis:
	var y := n.normalized()
	var x := y.cross(Vector3.FORWARD if absf(y.z) < 0.9 else Vector3.RIGHT).normalized()
	var z := x.cross(y).normalized()
	return Basis(x, y, z).rotated(y, randf() * TAU)

func _knife() -> void:
	_act_full("knife", 0.5)
	_play(snd_misc, "whoosh.wav", -6.0, randf_range(0.9, 1.15))
	NoiseBus.emit_noise(global_position, 4.0, "melee", self)
	_after(0.2, func():
		var center := global_position + Vector3(0, 1.1, 0) + Basis(Vector3.UP, yaw) * Vector3(0, 0, 0.85)
		var q := PhysicsShapeQueryParameters3D.new()
		var s := SphereShape3D.new(); s.radius = 0.55; q.shape = s
		q.transform = Transform3D(Basis.IDENTITY, center); q.collision_mask = World.L_HITBOX; q.collide_with_areas = true; q.collide_with_bodies = false
		for h in get_world_3d().direct_space_state.intersect_shape(q, 4):
			var c: Object = h.collider
			if c.has_meta("owner"):
				c.get_meta("owner").take_hit(22.0, center, Basis(Vector3.UP, yaw) * Vector3.BACK, "knife")
				_play(snd_misc, "flesh_1_%d.mp3" % (1 + randi() % 3), -4.0)
				break)

func _defend_pressed() -> void:
	# a shove only when something is on top of us; otherwise Space just raises the guard (held)
	if _shove_cd > 0.0 or dead or _busy > 0.0:
		return
	var threat := _threat_in_reach()
	if threat:
		_shove_cd = 5.0
		_act_full("shove", 0.55)
		_play(snd_misc, "whoosh.wav", -4.0, 0.8)
		_after(0.18, func(): if is_instance_valid(threat): threat.shoved(global_position))

func _threat_in_reach() -> Node:
	for e in get_tree().get_nodes_in_group("enemy"):
		if e.global_position.distance_to(global_position) < 1.6 and e.has_method("shoved"):
			return e
	return null

func _reload() -> void:
	if Game.weapon != "pistol" or Game.mag >= Game.mag_size or Game.count("ammo") <= 0 or _busy > 0.0 or dead:
		return
	aiming = false
	_act_upper("reload", 1.55)
	_play(snd_gun, "pistol_reload.mp3", -4.0)
	NoiseBus.emit_noise(global_position, 5.0, "reload", self)
	_after(1.4, func():
		var need := Game.mag_size - Game.mag
		var got := mini(need, Game.count("ammo"))
		Game.take("ammo", got)
		Game.mag += got
		Game.ammo_changed.emit(Game.mag, Game.count("ammo")))

func _heal() -> void:
	if dead or _busy > 0.0 or Game.hp >= Game.max_hp - 1.0 or not (Game.has("herb") or Game.has("med")):
		if Game.hp >= Game.max_hp - 1.0 and not dead:
			Game.say("现在不需要治疗。", 1.2)
		return
	_act_upper("heal", 1.3)
	_busy_kind = "heal_lock"
	_after(0.8, func():
		var used := Game.heal_best()
		if used != "":
			Game.say("用了" + Game.ITEMS[used].name + "。", 1.2))

func _interact() -> void:
	if dead or _busy > 0.0:
		return
	var t := find_interact_target()
	if t.is_empty():
		return
	interacted.emit(t)
	if t.kind == "door":
		var lines: Array = t.door.try_toggle(global_position)
		_act_full("interact", 0.45)
		if not lines.is_empty():
			Game.say("\n".join(lines))
	else:
		var it: Dictionary = t.item
		if it.has("ladder") and world.has_method("use_ladder"):
			var dest: Vector3 = world.use_ladder(it.ladder, it.get("down", false))
			if dest != Vector3.INF:
				_act_full("interact", 0.9)
				controls_enabled = false
				_after(0.6, func():
					place(Transform3D(Basis(Vector3.UP, yaw), dest))
					controls_enabled = true)
			return
		if it.has("give"):
			_act_full("pickup", 1.0)
			_after(0.55, func():
				Game.add_item(it.give[0], it.give[1])
				_play(snd_misc, "item_get.mp3", -6.0))
		else:
			_act_full("interact", 0.6)
		Game.say("\n".join(it.text))
		if it.get("once", false):
			world.interactables.erase(it)

## Best interaction target in front of Daniel: {kind: "door", door} | {kind: "item", item} | {}.
func find_interact_target() -> Dictionary:
	if world == null:
		return {}
	var fwd := Basis(Vector3.UP, yaw) * Vector3.BACK
	var p := global_position
	var best := {}
	var bd := INF
	for d in world.doors:
		if not is_instance_valid(d):
			continue
		var dp: Vector3 = d.global_position
		var to := Vector3(dp.x - p.x, 0, dp.z - p.z)
		var dist := to.length()
		if dist > 1.7 or absf(dp.y - p.y) > 1.5:
			continue
		if to.normalized().dot(fwd) < 0.15 and dist > 0.6:
			continue
		if dist < bd:
			bd = dist; best = {"kind": "door", "door": d, "prompt": "关门" if d.is_open() else "开门"}
	for it in world.interactables:
		var ip: Vector3 = it.pos
		var dist := Vector2(ip.x - p.x, ip.z - p.z).length()
		if dist > it.r or absf(ip.y - p.y) > 2.0:
			continue
		if dist < bd:
			bd = dist; best = {"kind": "item", "item": it, "prompt": it.prompt}
	return best

## Teleport (spawn, ladders, tests): position + facing, camera snapped behind.
func place(t: Transform3D) -> void:
	global_position = t.origin
	rotation = Vector3.ZERO
	yaw = t.basis.get_euler().y
	cam_yaw = yaw + PI
	velocity = Vector3.ZERO
	speed = 0.0
	_pivot_pos = t.origin + Vector3(0, PIVOT_H, 0)
	rig.rotation.y = yaw
	if cam_pivot:
		cam_pivot.global_position = _pivot_pos
		cam_pivot.rotation = Vector3(cam_pitch, cam_yaw, 0)
	reset_physics_interpolation()

# ---------------------------------------------------------------- damage
func take_damage(amount: float, from: Vector3) -> void:
	if dead:
		return
	var a := amount * (0.45 if guarding else 1.0)
	Game.damage(a)
	_shake = maxf(_shake, 0.8)
	if Game.hp <= 0.0:
		_die()
		return
	var heavy := a > 25.0
	_act_full("knockback" if heavy else "hit", 0.75 if heavy else 0.45)
	_play(snd_misc, "flesh_2_%d.mp3" % (1 + randi() % 4), -2.0)

func _die() -> void:
	dead = true
	aiming = false
	flashlight_on = false
	rig.select("life", "dead")
	died.emit()

func revive() -> void:
	dead = false
	rig.select("life", "alive")
	Game.hp = Game.max_hp
	Game.health_changed.emit(Game.hp)

# ---------------------------------------------------------------- footsteps / noise
func _footsteps(delta: float, real: float) -> void:
	if real < 0.1 or not is_on_floor():
		return
	var stride := 0.65
	if _gait == "run": stride = 2.5 * (real / CharacterRig.CLIP_SPEED.Jog_Fwd) / 0.86
	elif _gait.begins_with("crouch"): stride = 0.75
	_step_acc += real * delta
	if _step_acc >= stride:
		_step_acc = 0.0
		_step_i += 1
		var loud: Array = {"run": [-2.0, 15.0], "walk": [-10.0, 6.0], "walk_back": [-11.0, 5.0], "injured": [-9.0, 6.0], "crouch_walk": [-22.0, 2.0], "crouch_back": [-22.0, 2.0]}.get(_gait, [-12.0, 5.0])
		_play(snd_step, "step_%d.mp3" % (1 + _step_i % 7), loud[0], randf_range(0.92, 1.06))
		NoiseBus.emit_noise(global_position, loud[1], "step", self)

# ---------------------------------------------------------------- helpers
func _play(p: AudioStreamPlayer3D, file: String, db := 0.0, pitch := 1.0, at := Vector3.INF) -> void:
	var path := ("res://assets/audio/gen/" if file.ends_with(".wav") else "res://assets/audio/") + file
	var s = load(path)
	if s == null:
		return
	if at != Vector3.INF:
		var one := AudioStreamPlayer3D.new(); one.bus = "SFX"; one.stream = s; one.volume_db = db; one.pitch_scale = pitch; one.top_level = true
		add_child(one); one.global_position = at; one.play(); one.finished.connect(one.queue_free)
		return
	p.stream = s; p.volume_db = db; p.pitch_scale = pitch; p.play()

func _after(t: float, f: Callable) -> void:
	_pending.append([t, f])

func _tick_pending(delta: float) -> void:
	var i := 0
	while i < _pending.size():
		_pending[i][0] -= delta
		if _pending[i][0] <= 0.0:
			var f: Callable = _pending[i][1]
			_pending.remove_at(i)
			if f.is_valid():
				f.call()
		else:
			i += 1

func _update_weapon_visibility() -> void:
	pistol.visible = Game.weapon == "pistol"
	knife.visible = Game.weapon == "knife"

func is_lit() -> bool:
	return flashlight_on
