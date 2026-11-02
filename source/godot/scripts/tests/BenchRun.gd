extends Node
## §22 benchmark: the furnished dining room + the connected gallery (corridor) + a real door with collision,
## Daniel (2K PBR) on an automated loop (walk/run/aim/shoot, flashlight, camera sweeps), The Listener
## (4K PBR, live AI), dynamic lights + shadows, 3D audio. Records Perf for N minutes and writes a report.

signal finished(report: Dictionary)

const LOOP := [Vector3(-11.35, 0, -2.4), Vector3(-11.35, 0, -4.6), Vector3(-13.9, 0, -5.0), Vector3(-14.6, 0, -8.4), Vector3(-11.3, 0, -10.7),
	Vector3(-8.0, 0, -8.6), Vector3(-8.0, 0, -5.0), Vector3(-11.35, 0, -4.4), Vector3(-11.35, 0, -2.0), Vector3(-3.0, 0, -1.8), Vector3(-15.0, 0, -1.8), Vector3(-8.6, 0, -1.8)]

var world: World
var player: Player
var listener: Listener
var minutes := 2.0
var out_dir := ""
var _pilot: Pilot
var _leg := 0
var _t := 0.0
var _phase_t := 0.0
var _phase := "walk"
var _running := false

func begin(w: World, p: Player, l: Listener, mins: float, out: String) -> void:
	world = w; player = p; listener = l; minutes = mins; out_dir = out
	(w as ArtSlice).ensure_all_loaded()
	for d in w.doors:
		if d.id == "dining":
			d.force_open(0.0)
	player.flashlight_on = true
	Game.set_weapon("pistol")
	_next_leg()
	player.autopilot = _drive
	_running = true
	Perf.start_recording("bench-%dmin-%s" % [int(minutes), RenderingServer.get_current_rendering_method()])

func _next_leg() -> void:
	var map := world.get_world_3d().navigation_map
	var a := NavigationServer3D.map_get_closest_point(map, player.global_position)
	var b := NavigationServer3D.map_get_closest_point(map, LOOP[_leg % LOOP.size()])
	var path := NavigationServer3D.map_get_path(map, a, b, true)
	if path.size() < 2:
		path = PackedVector3Array([LOOP[_leg % LOOP.size()]])
	_pilot = Pilot.new(player, path, _leg % 3 == 1)
	_leg += 1

func _drive(delta: float) -> Dictionary:
	_phase_t += delta
	# every 25 s: stop, aim at The Listener (or down the hall) and fire two shots; open/close the dining door
	if _phase == "walk" and _phase_t > 25.0:
		_phase = "aim"; _phase_t = 0.0
	if _phase == "aim":
		var tgt := listener.global_position + Vector3(0, 1.4, 0)
		var to := tgt - player.camera.global_position
		var yaw := atan2(-to.x, -to.z)
		if _phase_t > 0.8 and _phase_t < 0.85 or _phase_t > 1.4 and _phase_t < 1.45:
			if Game.mag <= 1: Game.mag = Game.mag_size
			player._shoot()
		if _phase_t > 2.0:
			_phase = "walk"; _phase_t = 0.0
			for d in world.doors:
				if d.id == "dining" and player.global_position.distance_to(d.global_position) < 6.0:
					d.try_toggle(player.global_position)
		return {"move": Vector2.ZERO, "aim": true, "look_yaw": yaw, "look_pitch": clampf(atan2(to.y, Vector2(to.x, to.z).length()), -0.6, 0.6)}
	var r := _pilot.step(delta)
	if _pilot.done or _pilot.stuck:
		_next_leg()
	# keep the camera moving like a player looking around
	if r.has("look_yaw"):
		r.look_yaw += sin(_t * 0.7) * 0.6
	return r

func _process(delta: float) -> void:
	if not _running:
		return
	_t += delta
	if Game.hp < 40.0:
		Game.hp = Game.max_hp; Game.health_changed.emit(Game.hp)
	if player.dead:
		player.revive()
	if _t >= minutes * 60.0:
		_running = false
		player.autopilot = Callable()
		var r := Perf.stop_recording()
		if out_dir != "":
			DirAccess.make_dir_recursive_absolute(out_dir)
			var f := FileAccess.open(out_dir.path_join("bench-%s.json" % r.label), FileAccess.WRITE)
			f.store_string(JSON.stringify(r, "  "))
			f.close()
			for ext in ["csv", "md"]:
				var src: String = Perf.last_report_path().get_basename() + "." + ext
				DirAccess.copy_absolute(src, out_dir.path_join("bench-%s.%s" % [r.label, ext]))
		finished.emit(r)
