extends Node
## Persistent settings (user://settings.cfg): input bindings, camera, graphics/performance, audio.

signal changed(key: String)

const PATH := "user://settings.cfg"

# §21.6 default bindings. Each entry: [label, [events...]] where events are "key:<physical keycode>" or "mouse:<button index>".
const DEFAULT_BINDINGS := {
	"move_forward": ["向前", ["key:%d" % KEY_W]],
	"move_back": ["向后", ["key:%d" % KEY_S]],
	"move_left": ["向左", ["key:%d" % KEY_A]],
	"move_right": ["向右", ["key:%d" % KEY_D]],
	"sprint": ["奔跑", ["key:%d" % KEY_SHIFT]],
	"crouch": ["蹲下 / 潜行", ["key:%d" % KEY_CTRL]],
	"quick_turn": ["快速转身 180°", ["key:%d" % KEY_X]],
	"aim": ["举枪瞄准（按住）", ["mouse:%d" % MOUSE_BUTTON_RIGHT]],
	"attack": ["射击 / 攻击", ["mouse:%d" % MOUSE_BUTTON_LEFT]],
	"defend": ["防御 / 准备近战武器", ["key:%d" % KEY_SPACE]],
	"reload": ["换弹", ["key:%d" % KEY_R]],
	"interact": ["互动 / 开门 / 调查", ["key:%d" % KEY_F]],
	"flashlight": ["手电筒", ["key:%d" % KEY_G]],
	"heal": ["快速治疗", ["key:%d" % KEY_Q]],
	"inventory": ["背包", ["key:%d" % KEY_TAB]],
	"weapon_next": ["下一把武器", ["mouse:%d" % MOUSE_BUTTON_WHEEL_DOWN]],
	"weapon_prev": ["上一把武器", ["mouse:%d" % MOUSE_BUTTON_WHEEL_UP]],
	"map": ["地图", ["key:%d" % KEY_M]],
	"shoulder_swap": ["切换左右肩视角", ["key:%d" % KEY_V]],
	"pause": ["暂停菜单", ["key:%d" % KEY_ESCAPE]],
	"perf_overlay": ["性能叠加层", ["key:%d" % KEY_F3]],
}
const UNBINDABLE := ["pause"]

enum Quality { LOW, MEDIUM, HIGH, ULTRA }
const QUALITY_NAMES := ["低", "中", "高", "极高"]
const FPS_MODES := [60, 45, 30]
const UPSCALERS := ["off", "metalfx_spatial", "metalfx_temporal", "fsr2", "fsr1"]
const UPSCALER_NAMES := ["关闭（原生）", "MetalFX 空间", "MetalFX 时间", "FSR 2.2", "FSR 1.0"]

var values := {
	# camera (§21.5)
	"cam_sens_h": 0.20, "cam_sens_v": 0.17, "cam_sens_h_aim": 0.11, "cam_sens_v_aim": 0.09,
	"cam_invert_y": false, "cam_smooth": 0.35, "cam_fov": 70.0, "cam_shoulder": 1,
	# graphics / performance (§21.4)
	"fps_mode": 60, "quality": Quality.MEDIUM, "render_scale": 0.77, "upscaler": "metalfx_spatial",
	"renderer": "forward_plus", "vsync": true, "fullscreen": false, "show_perf": false,
	# audio
	"vol_master": 0.9, "vol_sfx": 1.0, "vol_ambience": 0.8,
	# misc
	"language": "zh",
}
var bindings := {}  # action -> Array[String]
var _cfg := ConfigFile.new()

func _ready() -> void:
	process_mode = Node.PROCESS_MODE_ALWAYS
	if OS.get_name() != "macOS":
		values.upscaler = "fsr1"
	_load()
	_apply_bindings()
	_setup_audio_buses()
	apply_audio()
	apply_window()
	Input.use_accumulated_input = false  # raw per-event mouse deltas (no frame accumulation smoothing)

# ---------------------------------------------------------------- persistence
func _load() -> void:
	for a in DEFAULT_BINDINGS:
		bindings[a] = DEFAULT_BINDINGS[a][1].duplicate()
	if _cfg.load(PATH) != OK:
		return
	for k in values:
		values[k] = _cfg.get_value("settings", k, values[k])
	for a in DEFAULT_BINDINGS:
		var b = _cfg.get_value("bindings", a, null)
		if b is Array and not b.is_empty():
			bindings[a] = b

func save() -> void:
	for k in values:
		_cfg.set_value("settings", k, values[k])
	for a in bindings:
		_cfg.set_value("bindings", a, bindings[a])
	_cfg.save(PATH)

func get_v(key: String) -> Variant:
	return values.get(key)

func set_v(key: String, v: Variant) -> void:
	values[key] = v
	match key:
		"fps_mode", "vsync", "fullscreen":
			apply_window()
		"vol_master", "vol_sfx", "vol_ambience":
			apply_audio()
	save()
	changed.emit(key)

# ---------------------------------------------------------------- input
static func event_from_string(s: String) -> InputEvent:
	var p := s.split(":")
	if p[0] == "key":
		var e := InputEventKey.new()
		e.physical_keycode = int(p[1])
		return e
	var m := InputEventMouseButton.new()
	m.button_index = int(p[1])
	return m

static func event_to_string(e: InputEvent) -> String:
	if e is InputEventKey:
		var k: int = e.physical_keycode if e.physical_keycode != 0 else e.keycode
		return "key:%d" % k
	if e is InputEventMouseButton:
		return "mouse:%d" % e.button_index
	return ""

static func describe(s: String) -> String:
	var p := s.split(":")
	if p[0] == "key":
		return OS.get_keycode_string(int(p[1]))
	match int(p[1]):
		MOUSE_BUTTON_LEFT: return "鼠标左键"
		MOUSE_BUTTON_RIGHT: return "鼠标右键"
		MOUSE_BUTTON_MIDDLE: return "鼠标中键"
		MOUSE_BUTTON_WHEEL_UP: return "滚轮上"
		MOUSE_BUTTON_WHEEL_DOWN: return "滚轮下"
	return "鼠标%s" % p[1]

func _apply_bindings() -> void:
	for a in bindings:
		if not InputMap.has_action(a):
			InputMap.add_action(a, 0.2)
		InputMap.action_erase_events(a)
		for s in bindings[a]:
			InputMap.action_add_event(a, event_from_string(s))

## Rebind `action` to `ev`; an existing use of that input by another action is swapped onto the old binding.
func rebind(action: String, ev: InputEvent) -> void:
	var s := event_to_string(ev)
	if s == "" or action in UNBINDABLE:
		return
	var old: Array = bindings[action]
	for a in bindings:
		if a != action and s in bindings[a]:
			bindings[a] = old.duplicate()
	bindings[action] = [s]
	_apply_bindings()
	save()
	changed.emit("bindings")

func reset_bindings() -> void:
	for a in DEFAULT_BINDINGS:
		bindings[a] = DEFAULT_BINDINGS[a][1].duplicate()
	_apply_bindings()
	save()
	changed.emit("bindings")

# ---------------------------------------------------------------- window / frame pacing
func apply_window() -> void:
	Engine.max_fps = int(values.fps_mode)
	DisplayServer.window_set_vsync_mode(DisplayServer.VSYNC_ENABLED if values.vsync else DisplayServer.VSYNC_DISABLED)
	if DisplayServer.get_name() != "headless":
		var want := DisplayServer.WINDOW_MODE_FULLSCREEN if values.fullscreen else DisplayServer.WINDOW_MODE_WINDOWED
		if DisplayServer.window_get_mode() != want:
			DisplayServer.window_set_mode(want)

## Applies the current quality preset to a viewport + environment + the scene's light budget.
func apply_graphics(vp: Viewport, env: Environment) -> void:
	var q: int = values.quality
	var up: String = values.upscaler
	var scale: float = values.render_scale
	match up:
		"off":
			vp.scaling_3d_mode = Viewport.SCALING_3D_MODE_BILINEAR
			scale = 1.0
		"metalfx_spatial":
			vp.scaling_3d_mode = Viewport.SCALING_3D_MODE_METALFX_SPATIAL if OS.get_name() == "macOS" else Viewport.SCALING_3D_MODE_FSR
		"metalfx_temporal":
			vp.scaling_3d_mode = Viewport.SCALING_3D_MODE_METALFX_TEMPORAL if OS.get_name() == "macOS" else Viewport.SCALING_3D_MODE_FSR2
		"fsr2":
			vp.scaling_3d_mode = Viewport.SCALING_3D_MODE_FSR2
		_:
			vp.scaling_3d_mode = Viewport.SCALING_3D_MODE_FSR
	if RenderingServer.get_current_rendering_method() == "gl_compatibility":
		vp.scaling_3d_mode = Viewport.SCALING_3D_MODE_BILINEAR
	vp.scaling_3d_scale = clampf(scale, 0.5, 1.0)
	vp.screen_space_aa = Viewport.SCREEN_SPACE_AA_FXAA if up in ["off", "metalfx_spatial", "fsr1"] else Viewport.SCREEN_SPACE_AA_DISABLED
	vp.positional_shadow_atlas_size = [1024, 2048, 4096, 4096][q]
	vp.mesh_lod_threshold = [4.0, 2.0, 1.0, 0.5][q]
	RenderingServer.positional_soft_shadow_filter_set_quality([RenderingServer.SHADOW_QUALITY_HARD, RenderingServer.SHADOW_QUALITY_SOFT_LOW, RenderingServer.SHADOW_QUALITY_SOFT_MEDIUM, RenderingServer.SHADOW_QUALITY_SOFT_HIGH][q])
	if env:
		env.ssao_enabled = q >= Quality.MEDIUM
		env.ssao_intensity = 1.6
		env.ssil_enabled = q >= Quality.ULTRA
		env.volumetric_fog_enabled = q >= Quality.HIGH and RenderingServer.get_current_rendering_method() == "forward_plus"
		env.glow_enabled = q >= Quality.LOW
	if RenderingServer.get_current_rendering_method() == "forward_plus":
		RenderingServer.environment_set_ssao_quality([RenderingServer.ENV_SSAO_QUALITY_VERY_LOW, RenderingServer.ENV_SSAO_QUALITY_LOW, RenderingServer.ENV_SSAO_QUALITY_MEDIUM, RenderingServer.ENV_SSAO_QUALITY_HIGH][q], q < Quality.HIGH, 0.5, 2, 50, 300)
		RenderingServer.environment_set_volumetric_fog_volume_size([64, 64, 64, 96][q], [32, 48, 64, 96][q])

func shadowed_light_budget() -> int:
	return [2, 4, 6, 8][int(values.quality)]

## Renderer change needs a restart (Forward+ vs Mobile are separate pipelines).
func set_renderer(r: String) -> void:
	values.renderer = r
	save()
	OS.set_restart_on_exit(true, ["--rendering-method", r])
	get_tree().quit()

# ---------------------------------------------------------------- audio
func _setup_audio_buses() -> void:
	for b in ["SFX", "Ambience"]:
		if AudioServer.get_bus_index(b) == -1:
			AudioServer.add_bus()
			var i := AudioServer.bus_count - 1
			AudioServer.set_bus_name(i, b)
			AudioServer.set_bus_send(i, "Master")
	var sfx := AudioServer.get_bus_index("SFX")
	if AudioServer.get_bus_effect_count(sfx) == 0:
		var rev := AudioEffectReverb.new()
		rev.room_size = 0.55
		rev.damping = 0.6
		rev.wet = 0.12
		rev.dry = 1.0
		AudioServer.add_bus_effect(sfx, rev)
		var lim := AudioEffectHardLimiter.new()
		AudioServer.add_bus_effect(AudioServer.get_bus_index("Master"), lim)

## Room acoustics: room size 0..1 and wetness, driven by the room the listener is in.
func set_room_acoustics(size: float, wet: float) -> void:
	var sfx := AudioServer.get_bus_index("SFX")
	var rev := AudioServer.get_bus_effect(sfx, 0) as AudioEffectReverb
	if rev:
		rev.room_size = size
		rev.wet = wet

func apply_audio() -> void:
	AudioServer.set_bus_volume_db(0, linear_to_db(maxf(0.0001, values.vol_master)))
	var s := AudioServer.get_bus_index("SFX")
	if s >= 0:
		AudioServer.set_bus_volume_db(s, linear_to_db(maxf(0.0001, values.vol_sfx)))
	var a := AudioServer.get_bus_index("Ambience")
	if a >= 0:
		AudioServer.set_bus_volume_db(a, linear_to_db(maxf(0.0001, values.vol_ambience)))
