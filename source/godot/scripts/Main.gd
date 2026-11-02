extends Node
## Entry point: main menu, async level loading with shader warm-up, gameplay session, and automated
## test modes (command line, after `--`):
##   --level=artslice|wrenfield|bench     start directly in a level
##   --test=shots --out=DIR               render reference views of the art slice and quit
##   --test=walk                           Wrenfield route replay with the real controller (headless OK)
##   --test=bench --minutes=N --out=DIR    automated benchmark run, writes report, quits
##   --test=ai                             Listener navigation / perception checks (headless OK)

const UIScript := preload("res://scripts/ui/UI.gd")

var args := {}
var world: World
var player: Player
var listener: Listener
var ui: UIScript
var level_name := ""
var load_ms := 0.0

func _ready() -> void:
	for a in OS.get_cmdline_user_args():
		var kv := a.trim_prefix("--").split("=", true, 1)
		args[kv[0]] = kv[1] if kv.size() > 1 else "1"
	get_tree().auto_accept_quit = true
	ui = UIScript.new()
	ui.name = "UI"
	add_child(ui)
	ui.start_requested.connect(func(lv): start_level(lv))
	ui.quit_requested.connect(func(): get_tree().quit())
	ui.menu_requested.connect(back_to_menu)
	if args.has("test"):
		await _run_test(args.test)
		return
	if args.has("level"):
		start_level(args.level)
	else:
		ui.show_main_menu()

func back_to_menu() -> void:
	_clear_level()
	ui.show_main_menu()

func _clear_level() -> void:
	if world:
		world.queue_free()
		world = null
	player = null
	listener = null
	get_tree().paused = false

func start_level(name: String) -> void:
	_clear_level()
	level_name = name
	ui.show_loading("正在载入……")
	var t0 := Time.get_ticks_usec()
	Game.reset_session()
	if name == "wrenfield":
		world = Wrenfield.new()
	else:
		world = ArtSlice.new()
	add_child(world)
	await world.build(func(p): ui.set_loading_progress(p * 0.85))
	player = Player.new()
	player.name = "Daniel"
	world.add_child(player)
	player.setup(world)
	if name == "bench":
		world.spawn = Transform3D(Basis(Vector3.UP, -PI / 2), Vector3(-8.6, 0.05, -1.8))
	player.place(world.spawn)
	Settings.apply_graphics(get_viewport(), world.env)
	listener = Listener.new()
	listener.name = "Listener"
	world.add_child(listener)
	listener.setup(world, player)
	ui.set_loading_progress(0.9)
	await _warm_up()
	load_ms = (Time.get_ticks_usec() - t0) / 1000.0
	Perf.notes["load_ms_" + name] = snappedf(load_ms, 1.0)
	print("[load] %s in %.0f ms" % [name, load_ms])
	ui.attach_session(world, player, listener)
	ui.hide_loading()
	if name == "bench":
		_start_benchmark(float(args.get("minutes", str(ui.Main_args_minutes))))

## Render the level for a few frames behind the loading screen so pipelines compile before play
## (Godot 4.4+ ubershaders already avoid blocking compiles; this front-loads the specialised variants).
func _warm_up() -> void:
	var cam := player.camera
	var base := cam.global_transform
	for i in 16:
		cam.global_transform = base.rotated_local(Vector3.UP, TAU * i / 16.0)
		await get_tree().process_frame
	cam.global_transform = base

# ---------------------------------------------------------------- benchmark (§22)
var _bench: Node

func _start_benchmark(minutes: float) -> void:
	_bench = preload("res://scripts/tests/BenchRun.gd").new()
	add_child(_bench)
	_bench.begin(world, player, listener, minutes, args.get("out", ""))
	_bench.finished.connect(func(report):
		ui.show_bench_result(report)
		if args.has("test"):
			get_tree().quit())

func _run_test(name: String) -> void:
	match name:
		"shots":
			await preload("res://scripts/tests/Shots.gd").new().run(self, args)
			get_tree().quit()
		"walk":
			await preload("res://scripts/tests/WalkTest.gd").new().run(self, args)
			get_tree().quit()
		"ai":
			await preload("res://scripts/tests/AITest.gd").new().run(self, args)
			get_tree().quit()
		"bench":
			await start_level("bench")
		_:
			push_error("unknown test " + name)
			get_tree().quit(1)
