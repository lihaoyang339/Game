extends RefCounted
## Rendered QA views (needs a GPU/software renderer, not --headless):
##  1. the art slice from each original three.js fixed camera (docs/port/three-cams.json) for side-by-side
##     comparison with the three.js reference renders;
##  2. third-person gameplay views (explore, aim, flashlight, Listener at the frame edge), Wrenfield views.

const CAMS := "res://data/three-cams.json"

func run(main: Node, args: Dictionary) -> void:
	var out: String = args.get("out", "user://shots")
	DirAccess.make_dir_recursive_absolute(out)
	var tree := main.get_tree()
	var which: String = args.get("set", "port,play,wren")
	if "port" in which or "play" in which:
		await main.start_level("artslice")
		var w: ArtSlice = main.world
		w.ensure_all_loaded()
		var p: Player = main.player
		var l: Listener = main.listener
		l.process_mode = Node.PROCESS_MODE_DISABLED
		if "port" in which and FileAccess.file_exists(CAMS):
			var cams: Array = JSON.parse_string(FileAccess.get_file_as_string(CAMS))
			var cam := Camera3D.new()
			w.add_child(cam)
			p.global_position = Vector3(100, 0, 100)
			for c in cams:
				if args.has("only") and not c.id in String(args.only).split(","):
					continue
				cam.fov = c.fov
				cam.global_position = Vector3(c.pos[0], c.pos[1], c.pos[2])
				cam.look_at(Vector3(c.look[0], c.look[1], c.look[2]))
				cam.current = true
				w.set_player_room(c.room)
				await _settle(tree, 24)
				_save(main, out, "godot-%s.png" % c.id)
			cam.queue_free()
			p.camera.current = true
		if "play" in which:
			l.process_mode = Node.PROCESS_MODE_INHERIT
			var views := [
				["tp-foyer", Vector3(0.2, 0, 6.2), PI, -0.1, false, false],
				["tp-gallery", Vector3(-6.0, 0, -1.8), -PI / 2, -0.08, false, false],
				["tp-dining-aim", Vector3(-11.3, 0, -5.2), PI, -0.05, true, false],
				["tp-dining-flashlight", Vector3(-9.0, 0, -8.0), PI * 0.75, -0.15, false, true],
				["tp-kitchen", Vector3(-21.0, 0, -5.5), PI, -0.12, false, true],
				["tp-study", Vector3(-2.0, 0, -5.0), PI, -0.1, false, false],
			]
			for v in views:
				if args.has("only") and not v[0] in String(args.only).split(","):
					continue
				p.place(Transform3D(Basis(Vector3.UP, v[2]), v[1] + Vector3(0, 0.05, 0)))
				p.cam_pitch = v[3]
				p.flashlight_on = v[5]
				Game.set_weapon("pistol")
				p.autopilot = func(_d): return {"move": Vector2.ZERO, "aim": v[4]}
				w.set_player_room(w.room_at(p.global_position + Vector3(0, 0.5, 0)))
				# the Listener in the next room, at the edge of the frame
				l.global_position = p.global_position + Basis(Vector3.UP, p.cam_yaw) * Vector3(2.6, 0, -6.0)
				l.global_position = NavigationServer3D.map_get_closest_point(w.get_world_3d().navigation_map, l.global_position)
				await _settle(tree, 40)
				_save(main, out, "godot-%s.png" % v[0])
			p.autopilot = Callable()
	if "wren" in which:
		await main.start_level("wrenfield")
		var w2: Wrenfield = main.world
		var p2: Player = main.player
		main.listener.process_mode = Node.PROCESS_MODE_DISABLED
		for v in [["wren-portico", Vector3(18, 0, 2), PI], ["wren-gallery", Vector3(12, 0, -6), -PI / 2], ["wren-stair", Vector3(23.5, 0, -9.2), PI], ["wren-cellar", Vector3(37.5, -3.2, -20), PI / 2]]:
			p2.place(Transform3D(Basis(Vector3.UP, v[2]), v[1] + Vector3(0, 0.05, 0)))
			p2.flashlight_on = true
			await _settle(tree, 30)
			_save(main, out, "godot-%s.png" % v[0])

func _settle(tree: SceneTree, frames: int) -> void:
	for i in frames:
		await tree.process_frame

func _save(main: Node, out: String, name: String) -> void:
	var img := main.get_viewport().get_texture().get_image()
	img.save_png(out.path_join(name))
	print("[shot] ", name)
