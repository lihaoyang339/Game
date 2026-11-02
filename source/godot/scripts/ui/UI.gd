extends CanvasLayer
## All 2D UI: main menu, loading, HUD, pause, settings (graphics/performance, camera, controls, audio),
## inventory (Tab, mouse driven), map (M), death screen, benchmark results. Built in code.

signal start_requested(level: String)
signal quit_requested
signal menu_requested

const C_BG := Color(0.03, 0.03, 0.035, 0.92)
const C_TEXT := Color(0.86, 0.84, 0.8)
const C_DIM := Color(0.55, 0.53, 0.5)
const C_ACCENT := Color(0.78, 0.62, 0.38)

var theme_ui: Theme
var root: Control
var menu: Control
var loading: Control
var loading_bar: ProgressBar
var hud: Control
var crosshair: Control
var prompt: Label
var subtitle: Label
var ammo: Label
var status: Label
var weapon_lbl: Label
var vignette: ColorRect
var pause: Control
var settings: Control
var inventory: Control
var map_view: Control
var death: Control
var bench: Control
var world: World
var player: Player
var listener: Listener
var _msg_t := 0.0
var _hurt := 0.0
var _rebinding := ""
var _inv_sel := -1
var _overlay_open := ""

func _ready() -> void:
	layer = 50
	process_mode = Node.PROCESS_MODE_ALWAYS
	theme_ui = _make_theme()
	root = Control.new(); root.set_anchors_preset(Control.PRESET_FULL_RECT); root.theme = theme_ui; root.mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_child(root)
	_build_hud(); _build_menu(); _build_loading(); _build_pause(); _build_settings(); _build_inventory(); _build_map(); _build_death(); _build_bench()
	Game.message.connect(_on_message)
	Game.health_changed.connect(func(hp): _hurt = 1.0 if hp < Game.max_hp else _hurt; _update_status())
	Game.ammo_changed.connect(func(m, r): _update_ammo())
	Game.weapon_changed.connect(func(w): _update_ammo())

func _make_theme() -> Theme:
	var t := Theme.new()
	var f := FontVariation.new()
	f.base_font = load("res://assets/fonts/NotoSansSC-Regular.ttf")
	t.default_font = f
	t.default_font_size = 18
	var sb := StyleBoxFlat.new(); sb.bg_color = Color(0.09, 0.085, 0.08, 0.9); sb.border_color = Color(0.35, 0.3, 0.24); sb.set_border_width_all(1); sb.set_content_margin_all(8)
	var sbh := sb.duplicate(); sbh.bg_color = Color(0.2, 0.16, 0.11, 0.95); sbh.border_color = C_ACCENT
	var sbp := sb.duplicate(); sbp.bg_color = Color(0.3, 0.22, 0.12, 0.95)
	for cls in ["Button", "OptionButton"]:
		t.set_stylebox("normal", cls, sb); t.set_stylebox("hover", cls, sbh); t.set_stylebox("pressed", cls, sbp); t.set_stylebox("focus", cls, sbh)
		t.set_color("font_color", cls, C_TEXT); t.set_color("font_hover_color", cls, Color.WHITE)
	t.set_color("font_color", "Label", C_TEXT)
	var panel := StyleBoxFlat.new(); panel.bg_color = C_BG; panel.set_content_margin_all(18); panel.border_color = Color(0.25, 0.22, 0.18); panel.set_border_width_all(1)
	t.set_stylebox("panel", "PanelContainer", panel)
	return t

func _full(c: Control) -> Control:
	c.set_anchors_preset(Control.PRESET_FULL_RECT)
	return c

func _label(text: String, size := 18, color := C_TEXT) -> Label:
	var l := Label.new(); l.text = text; l.add_theme_font_size_override("font_size", size); l.add_theme_color_override("font_color", color)
	return l

func _button(text: String, cb: Callable) -> Button:
	var b := Button.new(); b.text = text; b.pressed.connect(cb); b.custom_minimum_size = Vector2(320, 44)
	return b

func _center_panel(parent: Control, min_size := Vector2(520, 0)) -> VBoxContainer:
	var cc := CenterContainer.new(); _full(cc); parent.add_child(cc)
	var pc := PanelContainer.new(); pc.custom_minimum_size = min_size; cc.add_child(pc)
	var vb := VBoxContainer.new(); vb.add_theme_constant_override("separation", 10); pc.add_child(vb)
	return vb

# ---------------------------------------------------------------- main menu / loading
func _build_menu() -> void:
	menu = _full(Control.new()); root.add_child(menu)
	var bg := _full(ColorRect.new()); bg.color = Color(0.015, 0.015, 0.02); menu.add_child(bg)
	var vb := _center_panel(menu, Vector2(560, 0))
	vb.add_child(_label("THE MANOR", 46, C_ACCENT))
	vb.add_child(_label("风暴宅邸 · 空响  —  第三人称测试版 0.4（Godot 4.7.2）", 16, C_DIM))
	vb.add_child(HSeparator.new())
	vb.add_child(_button("开始：宅邸（美术切片）", func(): start_requested.emit("artslice")))
	vb.add_child(_button("开始：Wrenfield 全楼层地图", func(): start_requested.emit("wrenfield")))
	var hb := HBoxContainer.new(); vb.add_child(hb)
	var mins := OptionButton.new(); for m in [2, 20, 30]: mins.add_item("%d 分钟" % m, m)
	mins.select(0)
	var bb := _button("性能测试（餐厅 + 走廊）", func():
		Main_args_minutes = mins.get_selected_id()
		start_requested.emit("bench"))
	bb.custom_minimum_size.x = 220; hb.add_child(bb); hb.add_child(mins)
	vb.add_child(_button("设置", func(): open_settings()))
	vb.add_child(_button("退出", func(): quit_requested.emit()))
	vb.add_child(HSeparator.new())
	var info := _label("", 13, C_DIM); info.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART; vb.add_child(info)
	info.text = "渲染：%s · %s\nGPU：%s\n键鼠：WASD 移动 · 鼠标看 · 右键瞄准 · 左键射击 · F 互动 · G 手电 · Tab 背包 · Esc 菜单 · F3 性能" % [
		RenderingServer.get_current_rendering_method(), RenderingServer.get_current_rendering_driver_name(), RenderingServer.get_video_adapter_name()]
	menu.visible = false

var Main_args_minutes := 2

func show_main_menu() -> void:
	_hide_all()
	menu.visible = true
	Input.set_mouse_mode(Input.MOUSE_MODE_VISIBLE)

func _build_loading() -> void:
	loading = _full(Control.new()); root.add_child(loading)
	var bg := _full(ColorRect.new()); bg.color = Color(0.01, 0.01, 0.012); loading.add_child(bg)
	var vb := VBoxContainer.new(); vb.set_anchors_preset(Control.PRESET_CENTER_BOTTOM); vb.position = Vector2(-300, -120); vb.custom_minimum_size = Vector2(600, 60)
	vb.anchor_left = 0.5; vb.anchor_right = 0.5; vb.anchor_top = 1.0; vb.anchor_bottom = 1.0
	loading.add_child(vb)
	var l := _label("正在载入……", 18, C_DIM); l.name = "Text"; vb.add_child(l)
	loading_bar = ProgressBar.new(); loading_bar.custom_minimum_size = Vector2(600, 8); loading_bar.show_percentage = false; vb.add_child(loading_bar)
	loading.visible = false

func show_loading(text: String) -> void:
	_hide_all()
	loading.visible = true
	(loading.find_child("Text", true, false) as Label).text = text
	loading_bar.value = 0

func set_loading_progress(p: float) -> void:
	loading_bar.value = p * 100.0

func hide_loading() -> void:
	loading.visible = false
	hud.visible = true
	Input.set_mouse_mode(Input.MOUSE_MODE_CAPTURED)

func _hide_all() -> void:
	for c in [menu, loading, hud, pause, settings, inventory, map_view, death, bench]:
		if c: c.visible = false

func attach_session(w: World, p: Player, l: Listener) -> void:
	world = w; player = p; listener = l
	p.died.connect(func(): _show_death())
	_update_ammo(); _update_status()

# ---------------------------------------------------------------- HUD
func _build_hud() -> void:
	hud = _full(Control.new()); hud.mouse_filter = Control.MOUSE_FILTER_IGNORE; root.add_child(hud)
	vignette = _full(ColorRect.new()); vignette.mouse_filter = Control.MOUSE_FILTER_IGNORE
	var sm := ShaderMaterial.new(); var sh := Shader.new()
	sh.code = """shader_type canvas_item;
uniform float hurt = 0.0; uniform float injury = 0.0; uniform float strength = 0.32;
void fragment(){ vec2 d = UV - 0.5; float v = smoothstep(0.35, 0.85, length(d * vec2(1.0, 0.85)));
  float pulse = 0.5 + 0.5 * sin(TIME * (2.0 + injury * 4.0));
  vec3 col = mix(vec3(0.0), vec3(0.45, 0.0, 0.0), clamp(hurt + injury * pulse * 0.6, 0.0, 1.0));
  COLOR = vec4(col, v * (strength + hurt * 0.5 + injury * 0.35)); }"""
	sm.shader = sh; vignette.material = sm; hud.add_child(vignette)
	crosshair = Control.new(); crosshair.set_anchors_preset(Control.PRESET_CENTER); crosshair.mouse_filter = Control.MOUSE_FILTER_IGNORE
	crosshair.draw.connect(_draw_crosshair); hud.add_child(crosshair)
	prompt = _label("", 20, Color.WHITE); prompt.set_anchors_preset(Control.PRESET_CENTER); prompt.position = Vector2(30, 40); hud.add_child(prompt)
	subtitle = _label("", 22, Color(0.95, 0.93, 0.88)); subtitle.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	subtitle.anchor_left = 0.15; subtitle.anchor_right = 0.85; subtitle.anchor_top = 0.8; subtitle.anchor_bottom = 0.95
	subtitle.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART; subtitle.add_theme_color_override("font_outline_color", Color.BLACK); subtitle.add_theme_constant_override("outline_size", 6)
	hud.add_child(subtitle)
	var br := VBoxContainer.new(); br.anchor_left = 1.0; br.anchor_right = 1.0; br.anchor_top = 1.0; br.anchor_bottom = 1.0
	br.position = Vector2(-260, -110); br.custom_minimum_size = Vector2(240, 90); hud.add_child(br)
	weapon_lbl = _label("", 16, C_DIM); weapon_lbl.horizontal_alignment = HORIZONTAL_ALIGNMENT_RIGHT; br.add_child(weapon_lbl)
	ammo = _label("", 34, Color.WHITE); ammo.horizontal_alignment = HORIZONTAL_ALIGNMENT_RIGHT; br.add_child(ammo)
	status = _label("", 16, Color(0.6, 0.85, 0.6)); status.position = Vector2(24, 0); status.anchor_top = 1.0; status.anchor_bottom = 1.0; status.position.y = -48
	hud.add_child(status)
	hud.visible = false

func _draw_crosshair() -> void:
	if player == null or not player.aiming:
		return
	var s := 7.0 + player._spread * 300.0
	var c := Color(1, 1, 1, 0.85)
	for d in [Vector2(1, 0), Vector2(-1, 0), Vector2(0, 1), Vector2(0, -1)]:
		crosshair.draw_line(d * s, d * (s + 7.0), c, 2.0)
	crosshair.draw_circle(Vector2.ZERO, 1.6, c)

func _update_ammo() -> void:
	if ammo == null:
		return
	var w := Game.weapon
	weapon_lbl.text = {"pistol": "手枪", "knife": "小刀", "none": "空手"}.get(w, w)
	ammo.text = "%d / %d" % [Game.mag, Game.count("ammo")] if w == "pistol" else ""

func _update_status() -> void:
	if status == null:
		return
	var r := Game.hp / Game.max_hp
	status.text = "状态：" + ("良好" if r > 0.66 else ("注意" if r > 0.33 else "危险"))
	status.add_theme_color_override("font_color", Color(0.6, 0.85, 0.6) if r > 0.66 else (Color(0.95, 0.75, 0.3) if r > 0.33 else Color(0.95, 0.3, 0.25)))

func _on_message(text: String, seconds: float) -> void:
	subtitle.text = text
	_msg_t = seconds

func _process(delta: float) -> void:
	if _msg_t > 0.0:
		_msg_t -= delta
		if _msg_t <= 0.0:
			subtitle.text = ""
	_hurt = maxf(0.0, _hurt - delta * 1.5)
	if vignette.material:
		vignette.material.set_shader_parameter("hurt", _hurt)
		vignette.material.set_shader_parameter("injury", clampf((Game.injury() - 0.5) * 2.0, 0.0, 1.0))
	if hud.visible and player:
		crosshair.queue_redraw()
		var t := player.find_interact_target()
		prompt.text = ("F  " + t.prompt) if not t.is_empty() else ""
	if map_view.visible:
		map_view.queue_redraw()

func _unhandled_input(e: InputEvent) -> void:
	if _rebinding != "":
		return
	if player == null:
		return
	if e.is_action_pressed("pause"):
		if _overlay_open != "":
			close_overlay()
		elif death.visible or bench.visible:
			pass
		else:
			open_overlay("pause")
		get_viewport().set_input_as_handled()
	elif e.is_action_pressed("inventory") and not death.visible:
		if _overlay_open == "inventory": close_overlay()
		elif _overlay_open == "": open_overlay("inventory")
		get_viewport().set_input_as_handled()
	elif e.is_action_pressed("map") and not death.visible:
		if _overlay_open == "map": close_overlay()
		elif _overlay_open == "": open_overlay("map")
		get_viewport().set_input_as_handled()

func open_overlay(which: String) -> void:
	_overlay_open = which
	get_tree().paused = true
	Input.set_mouse_mode(Input.MOUSE_MODE_VISIBLE)
	pause.visible = which == "pause"
	inventory.visible = which == "inventory"
	map_view.visible = which == "map"
	settings.visible = which == "settings"
	if which == "inventory":
		_refresh_inventory()

func close_overlay() -> void:
	_overlay_open = ""
	for c in [pause, inventory, map_view, settings]:
		c.visible = false
	if player:
		get_tree().paused = false
		Input.set_mouse_mode(Input.MOUSE_MODE_CAPTURED)
		hud.visible = true
	else:
		menu.visible = true

# ---------------------------------------------------------------- pause
func _build_pause() -> void:
	pause = _full(Control.new()); root.add_child(pause)
	var dim := _full(ColorRect.new()); dim.color = Color(0, 0, 0, 0.55); pause.add_child(dim)
	var vb := _center_panel(pause)
	vb.add_child(_label("暂停", 30, C_ACCENT))
	vb.add_child(_button("继续", close_overlay))
	vb.add_child(_button("设置", func(): open_overlay("settings")))
	vb.add_child(_button("返回主菜单", func(): close_overlay(); _overlay_open = ""; player = null; menu_requested.emit()))
	vb.add_child(_button("退出游戏", func(): quit_requested.emit()))
	pause.visible = false

# ---------------------------------------------------------------- settings
func open_settings() -> void:
	if player:
		open_overlay("settings")
	else:
		menu.visible = false
		settings.visible = true
		_overlay_open = "settings"

func _build_settings() -> void:
	settings = _full(Control.new()); root.add_child(settings)
	var dim := _full(ColorRect.new()); dim.color = Color(0, 0, 0, 0.7); settings.add_child(dim)
	var vb := _center_panel(settings, Vector2(820, 640))
	vb.add_child(_label("设置", 28, C_ACCENT))
	var tabs := TabContainer.new(); tabs.custom_minimum_size = Vector2(780, 520); vb.add_child(tabs)
	# graphics / performance
	var g := _tab(tabs, "画面与性能")
	_opt(g, "帧率模式", ["60 FPS", "45 FPS", "30 FPS"], Settings.FPS_MODES.find(Settings.get_v("fps_mode")), func(i): Settings.set_v("fps_mode", Settings.FPS_MODES[i]))
	_opt(g, "画质", Settings.QUALITY_NAMES, Settings.get_v("quality"), func(i): Settings.set_v("quality", i); _reapply_graphics())
	_opt(g, "超分辨率", Settings.UPSCALER_NAMES, Settings.UPSCALERS.find(Settings.get_v("upscaler")), func(i): Settings.set_v("upscaler", Settings.UPSCALERS[i]); _reapply_graphics())
	_slider(g, "渲染缩放", 0.5, 1.0, 0.01, Settings.get_v("render_scale"), func(v): Settings.set_v("render_scale", v); _reapply_graphics())
	_opt(g, "渲染器（需重启）", ["Forward+（Metal）", "Mobile（Metal）"], 0 if Settings.get_v("renderer") == "forward_plus" else 1, func(i): Settings.set_renderer(["forward_plus", "mobile"][i]))
	_check(g, "垂直同步", Settings.get_v("vsync"), func(v): Settings.set_v("vsync", v))
	_check(g, "全屏", Settings.get_v("fullscreen"), func(v): Settings.set_v("fullscreen", v))
	_check(g, "性能叠加层（F3）", Settings.get_v("show_perf"), func(v): Perf.overlay_visible = v; Perf._layer.visible = v; Settings.set_v("show_perf", v))
	g.add_child(_label("当前：%s / %s · %s" % [RenderingServer.get_current_rendering_method(), RenderingServer.get_current_rendering_driver_name(), RenderingServer.get_video_adapter_name()], 13, C_DIM))
	# camera
	var c := _tab(tabs, "镜头")
	_slider(c, "普通视角 水平灵敏度", 0.03, 0.6, 0.01, Settings.get_v("cam_sens_h"), func(v): Settings.set_v("cam_sens_h", v))
	_slider(c, "普通视角 垂直灵敏度", 0.03, 0.6, 0.01, Settings.get_v("cam_sens_v"), func(v): Settings.set_v("cam_sens_v", v))
	_slider(c, "瞄准 水平灵敏度", 0.02, 0.5, 0.01, Settings.get_v("cam_sens_h_aim"), func(v): Settings.set_v("cam_sens_h_aim", v))
	_slider(c, "瞄准 垂直灵敏度", 0.02, 0.5, 0.01, Settings.get_v("cam_sens_v_aim"), func(v): Settings.set_v("cam_sens_v_aim", v))
	_check(c, "鼠标反转（垂直）", Settings.get_v("cam_invert_y"), func(v): Settings.set_v("cam_invert_y", v))
	_slider(c, "镜头平滑程度", 0.0, 1.0, 0.05, Settings.get_v("cam_smooth"), func(v): Settings.set_v("cam_smooth", v))
	_slider(c, "视野 FOV", 65.0, 80.0, 1.0, Settings.get_v("cam_fov"), func(v): Settings.set_v("cam_fov", v))
	_opt(c, "肩位", ["右肩", "左肩"], 0 if Settings.get_v("cam_shoulder") > 0 else 1, func(i):
		Settings.set_v("cam_shoulder", 1 if i == 0 else -1)
		if player: player.shoulder = 1.0 if i == 0 else -1.0)
	c.add_child(_label("鼠标输入为逐事件原始增量（不做帧累积平滑），游戏内不叠加加速度。macOS 系统的指针加速度请在 系统设置 → 鼠标 中调整。", 13, C_DIM))
	# controls
	var k := _tab(tabs, "按键")
	var sc := ScrollContainer.new(); sc.custom_minimum_size = Vector2(740, 440); k.add_child(sc)
	var list := VBoxContainer.new(); list.name = "Bindings"; sc.add_child(list)
	k.add_child(_button("恢复默认按键", func(): Settings.reset_bindings(); _refresh_bindings()))
	_refresh_bindings()
	# audio
	var a := _tab(tabs, "音频")
	_slider(a, "主音量", 0.0, 1.0, 0.01, Settings.get_v("vol_master"), func(v): Settings.set_v("vol_master", v))
	_slider(a, "音效", 0.0, 1.0, 0.01, Settings.get_v("vol_sfx"), func(v): Settings.set_v("vol_sfx", v))
	_slider(a, "环境音", 0.0, 1.0, 0.01, Settings.get_v("vol_ambience"), func(v): Settings.set_v("vol_ambience", v))
	vb.add_child(_button("返回", func():
		if player: open_overlay("pause")
		else: settings.visible = false; _overlay_open = ""; menu.visible = true))
	settings.visible = false

func _reapply_graphics() -> void:
	if world:
		Settings.apply_graphics(get_viewport(), world.env)

func _tab(tabs: TabContainer, name: String) -> VBoxContainer:
	var vb := VBoxContainer.new(); vb.name = name; vb.add_theme_constant_override("separation", 8); tabs.add_child(vb)
	return vb

func _row(parent: Control, label: String) -> HBoxContainer:
	var hb := HBoxContainer.new(); var l := _label(label, 16); l.custom_minimum_size.x = 260; hb.add_child(l); parent.add_child(hb)
	return hb

func _opt(parent: Control, label: String, items: Array, sel: int, cb: Callable) -> void:
	var ob := OptionButton.new(); for it in items: ob.add_item(it)
	ob.select(maxi(0, sel)); ob.item_selected.connect(cb); ob.custom_minimum_size.x = 300
	_row(parent, label).add_child(ob)

func _check(parent: Control, label: String, v: bool, cb: Callable) -> void:
	var cbx := CheckBox.new(); cbx.button_pressed = v; cbx.toggled.connect(cb)
	_row(parent, label).add_child(cbx)

func _slider(parent: Control, label: String, lo: float, hi: float, step: float, v: float, cb: Callable) -> void:
	var hb := _row(parent, label)
	var s := HSlider.new(); s.min_value = lo; s.max_value = hi; s.step = step; s.value = v; s.custom_minimum_size.x = 300
	var vl := _label("%.2f" % v, 15, C_DIM); vl.custom_minimum_size.x = 60
	s.value_changed.connect(func(x): vl.text = "%.2f" % x; cb.call(x))
	hb.add_child(s); hb.add_child(vl)

func _refresh_bindings() -> void:
	var list := settings.find_child("Bindings", true, false) as VBoxContainer
	for ch in list.get_children():
		ch.queue_free()
	for a in Settings.DEFAULT_BINDINGS:
		var hb := _row(list, Settings.DEFAULT_BINDINGS[a][0])
		var b := Button.new(); b.custom_minimum_size = Vector2(220, 34)
		b.text = ", ".join(Settings.bindings[a].map(func(s): return Settings.describe(s)))
		if a in Settings.UNBINDABLE:
			b.disabled = true
		b.pressed.connect(func(): _start_rebind(a, b))
		hb.add_child(b)

func _start_rebind(action: String, b: Button) -> void:
	_rebinding = action
	b.text = "按下新按键……（Esc 取消）"

func _input(e: InputEvent) -> void:
	if _rebinding == "":
		return
	if (e is InputEventKey and e.pressed) or (e is InputEventMouseButton and e.pressed):
		get_viewport().set_input_as_handled()
		if not (e is InputEventKey and e.physical_keycode == KEY_ESCAPE):
			Settings.rebind(_rebinding, e)
		_rebinding = ""
		_refresh_bindings()

# ---------------------------------------------------------------- inventory
func _build_inventory() -> void:
	inventory = _full(Control.new()); root.add_child(inventory)
	var dim := _full(ColorRect.new()); dim.color = Color(0, 0, 0, 0.6); inventory.add_child(dim)
	var vb := _center_panel(inventory, Vector2(760, 480))
	vb.add_child(_label("背包", 28, C_ACCENT))
	var hb := HBoxContainer.new(); hb.add_theme_constant_override("separation", 16); vb.add_child(hb)
	var grid := GridContainer.new(); grid.name = "Grid"; grid.columns = 4; grid.add_theme_constant_override("h_separation", 8); grid.add_theme_constant_override("v_separation", 8)
	hb.add_child(grid)
	var right := VBoxContainer.new(); right.custom_minimum_size = Vector2(300, 300); hb.add_child(right)
	var name := _label("", 22, Color.WHITE); name.name = "ItemName"; right.add_child(name)
	var desc := _label("", 15, C_DIM); desc.name = "ItemDesc"; desc.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART; desc.custom_minimum_size.x = 300; right.add_child(desc)
	var use := _button("使用 / 装备", _use_selected); use.name = "Use"; use.custom_minimum_size = Vector2(200, 40); right.add_child(use)
	var hp := _label("", 16); hp.name = "HP"; right.add_child(hp)
	vb.add_child(_label("鼠标点选物品 · Tab 关闭", 13, C_DIM))
	inventory.visible = false

func _refresh_inventory() -> void:
	var grid := inventory.find_child("Grid", true, false) as GridContainer
	for c in grid.get_children():
		c.queue_free()
	for i in Game.inventory.size():
		var it: Dictionary = Game.inventory[i]
		var info: Dictionary = Game.ITEMS.get(it.id, {"name": it.id, "icon": "?"})
		var b := Button.new(); b.custom_minimum_size = Vector2(96, 96); b.toggle_mode = true
		b.text = "%s\n%s\n×%d" % [info.icon, info.name.substr(0, 6), it.n]
		if (it.id == Game.weapon):
			b.modulate = C_ACCENT
		b.pressed.connect(func(): _select_item(i))
		grid.add_child(b)
	(inventory.find_child("HP", true, false) as Label).text = "体力：%d / %d" % [Game.hp, Game.max_hp]
	_select_item(clampi(_inv_sel, 0, Game.inventory.size() - 1) if not Game.inventory.is_empty() else -1)

func _select_item(i: int) -> void:
	_inv_sel = i
	var nl := inventory.find_child("ItemName", true, false) as Label
	var dl := inventory.find_child("ItemDesc", true, false) as Label
	if i < 0 or i >= Game.inventory.size():
		nl.text = ""; dl.text = ""
		return
	var it: Dictionary = Game.inventory[i]
	var info: Dictionary = Game.ITEMS.get(it.id, {"name": it.id, "desc": ""})
	nl.text = info.name; dl.text = info.desc

func _use_selected() -> void:
	if _inv_sel < 0 or _inv_sel >= Game.inventory.size():
		return
	var id: String = Game.inventory[_inv_sel].id
	match Game.ITEMS.get(id, {}).get("kind", ""):
		"weapon": Game.set_weapon("none" if Game.weapon == id else id)
		"heal": Game.heal_best()
	_refresh_inventory()

# ---------------------------------------------------------------- map
func _build_map() -> void:
	map_view = _full(Control.new()); root.add_child(map_view)
	var dim := _full(ColorRect.new()); dim.color = Color(0.02, 0.02, 0.025, 0.94); map_view.add_child(dim)
	var canvas := _full(Control.new()); canvas.name = "Canvas"; canvas.draw.connect(func(): _draw_map(canvas)); map_view.add_child(canvas)
	var t := _label("地图 · M 关闭", 16, C_DIM); t.position = Vector2(24, 18); map_view.add_child(t)
	map_view.visible = false
	map_view.draw.connect(func(): canvas.queue_redraw())

func _draw_map(c: Control) -> void:
	if world == null or player == null:
		return
	var py := player.global_position.y
	var rects := []
	var lo := Vector2(INF, INF); var hi := Vector2(-INF, -INF)
	for id in world.rooms:
		var a: AABB = world.rooms[id].aabb
		if absf(a.position.y - (py - 0.2)) > 1.6 and not a.has_point(player.global_position + Vector3(0, 0.5, 0)):
			continue
		rects.append([id, a])
		lo = lo.min(Vector2(a.position.x, a.position.z)); hi = hi.max(Vector2(a.end.x, a.end.z))
	if rects.is_empty():
		return
	var size := c.size - Vector2(120, 140)
	var s := minf(size.x / (hi.x - lo.x), size.y / (hi.y - lo.y))
	var off := Vector2(60, 80) + (size - (hi - lo) * s) * 0.5
	var f: Font = theme_ui.default_font
	for r in rects:
		var a: AABB = r[1]
		var rr := Rect2(off + (Vector2(a.position.x, a.position.z) - lo) * s, Vector2(a.size.x, a.size.z) * s)
		var cur: bool = r[0] == world.current_room
		c.draw_rect(rr, Color(0.25, 0.2, 0.14, 0.9) if cur else Color(0.12, 0.12, 0.13, 0.9))
		c.draw_rect(rr, Color(0.6, 0.55, 0.45), false, 1.5)
		var nm: String = world.rooms[r[0]].get("name", r[0])
		c.draw_string(f, rr.position + Vector2(6, 20), nm, HORIZONTAL_ALIGNMENT_LEFT, rr.size.x - 8, 13, C_DIM)
	for d in world.doors:
		if is_instance_valid(d) and absf(d.global_position.y - py) < 2.0:
			var dp := off + (Vector2(d.global_position.x, d.global_position.z) - lo) * s
			c.draw_circle(dp, 4.0, Color(0.85, 0.3, 0.25) if not d.locked_lines.is_empty() else C_ACCENT)
	var pp := off + (Vector2(player.global_position.x, player.global_position.z) - lo) * s
	var fwd := Vector2(sin(player.yaw), cos(player.yaw))
	c.draw_colored_polygon(PackedVector2Array([pp + fwd * 12, pp + fwd.orthogonal() * 7 - fwd * 6, pp - fwd.orthogonal() * 7 - fwd * 6]), Color(0.95, 0.85, 0.4))

# ---------------------------------------------------------------- death / bench
func _build_death() -> void:
	death = _full(Control.new()); root.add_child(death)
	var dim := _full(ColorRect.new()); dim.color = Color(0.1, 0, 0, 0.6); death.add_child(dim)
	var vb := _center_panel(death)
	vb.add_child(_label("你死了", 36, Color(0.85, 0.2, 0.18)))
	vb.add_child(_button("从入口重新开始", func():
		death.visible = false
		if player:
			player.revive(); player.global_transform = world.spawn
			Input.set_mouse_mode(Input.MOUSE_MODE_CAPTURED); hud.visible = true))
	vb.add_child(_button("返回主菜单", func(): death.visible = false; player = null; menu_requested.emit()))
	death.visible = false

func _show_death() -> void:
	await get_tree().create_timer(2.2).timeout
	death.visible = true
	Input.set_mouse_mode(Input.MOUSE_MODE_VISIBLE)

func _build_bench() -> void:
	bench = _full(Control.new()); root.add_child(bench)
	var dim := _full(ColorRect.new()); dim.color = Color(0, 0, 0, 0.75); bench.add_child(dim)
	var vb := _center_panel(bench, Vector2(760, 0))
	vb.add_child(_label("性能测试结果", 28, C_ACCENT))
	var t := _label("", 16); t.name = "Body"; t.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART; t.custom_minimum_size.x = 720; vb.add_child(t)
	vb.add_child(_button("打开报告文件夹", func(): OS.shell_open(ProjectSettings.globalize_path("user://bench"))))
	vb.add_child(_button("返回主菜单", func(): bench.visible = false; player = null; menu_requested.emit()))
	bench.visible = false

func show_bench_result(r: Dictionary) -> void:
	bench.visible = true
	hud.visible = false
	Input.set_mouse_mode(Input.MOUSE_MODE_VISIBLE)
	var d: Dictionary = r.get("drift", {})
	(bench.find_child("Body", true, false) as Label).text = "时长 %.0f 秒 · %d 帧 · %s / %s · %s\n平均 %.1f FPS · 1%% Low %.1f FPS\n帧时间 平均 %.2f ms · P99 %.2f ms · 最大 %.1f ms\nCPU 平均 %.2f ms（P99 %.2f）· GPU 平均 %.2f ms（P99 %.2f）\n内存 %.0f → %.0f MB（峰值 %.0f）· 显存峰值 %.0f MB\n卡顿帧 %d（其中伴随着色器编译 %d）\n漂移：开始 %.1f FPS → 结束 %.1f FPS，内存斜率 %.2f MB/分钟\n\n报告：%s" % [
		r.seconds, r.frames, r.renderer, r.rendering_driver, r.gpu, r.avg_fps, r.one_pct_low_fps, r.frame_ms_avg, r.frame_ms_p99, r.frame_ms_max,
		r.cpu_ms_avg, r.cpu_ms_p99, r.gpu_ms_avg, r.gpu_ms_p99, r.mem_start_mb, r.mem_end_mb, r.mem_max_mb, r.vram_max_mb,
		r.hitches, r.hitches_with_shader_compile, d.get("fps_first", 0.0), d.get("fps_last", 0.0), d.get("mem_slope_mb_per_min", 0.0), Perf.last_report_path()]
