extends RefCounted
## The Listener checks (headless): navmesh coverage between rooms, hearing through walls vs line of
## sight, investigate -> reaches the noise through a closed door, search visits doorways, never ends up
## inside geometry, Wrenfield multi-level paths (stairs + ladder links). Writes <out>/godot-ai.md/json.

func run(main: Node, args: Dictionary) -> void:
	var out: String = args.get("out", "user://")
	var tree := main.get_tree()
	var checks := []
	await main.start_level("artslice")
	var w: ArtSlice = main.world
	w.ensure_all_loaded()
	var p: Player = main.player
	var l: Listener = main.listener
	p.controls_enabled = false
	while not w.nav_ready:
		await tree.process_frame
	await tree.physics_frame
	var map := w.get_world_3d().navigation_map
	# 1. every room reachable from every other on the navmesh (doors are passable for the AI)
	var ids: Array = w.rooms.keys()
	var unreachable := []
	for a in ids:
		for b in ids:
			if a >= b: continue
			var pa := NavigationServer3D.map_get_closest_point(map, w.rooms[a].spawn)
			var pb := NavigationServer3D.map_get_closest_point(map, w.rooms[b].spawn)
			var path := NavigationServer3D.map_get_path(map, pa, pb, true)
			if path.is_empty() or path[path.size() - 1].distance_to(pb) > 0.8:
				unreachable.append("%s-%s" % [a, b])
	checks.append({"name": "navmesh connects all art-slice rooms", "ok": unreachable.is_empty(), "detail": "unreachable: %s" % [unreachable]})
	# 2. hearing: same footstep heard in the open, muffled through a wall
	l.global_position = NavigationServer3D.map_get_closest_point(map, Vector3(-11.3, 0, -7.5))   # dining
	l._set_state("patrol"); l.suspicion = 0.0
	l.agent.target_position = l.global_position
	await tree.physics_frame
	NoiseBus.emit_noise(Vector3(-11.3, 0.1, -4.5), 6.0, "step", p)       # same room, 3 m
	var heard_open := l.suspicion
	l.suspicion = 0.0; l._set_state("patrol")
	NoiseBus.emit_noise(Vector3(-11.3, 0.1, -1.0), 6.0, "step", p)       # gallery, behind wall + closed door, 6.5 m
	var heard_wall := l.suspicion
	checks.append({"name": "footstep heard in the open, blocked by wall at same range", "ok": heard_open > 0.1 and heard_wall < heard_open * 0.5, "detail": "open %.2f, through wall %.2f" % [heard_open, heard_wall]})
	# 3. gunshot in the gallery -> Listener investigates/hunts, opens the dining door, arrives near the source
	l.suspicion = 0.0; l._set_state("patrol")
	p.global_position = Vector3(-4.0, 0.05, -1.8)
	var src := Vector3(-8.5, 1.4, -1.8)
	NoiseBus.emit_noise(src, 34.0, "gunshot", p)
	var states := {l.state: true}
	var min_d := INF
	var t := 0.0
	var inside_geom := 0
	while t < 40.0:
		await tree.physics_frame
		t += 1.0 / 60.0
		states[l.state] = true
		min_d = minf(min_d, Vector2(l.global_position.x - src.x, l.global_position.z - src.z).length())
		var q := PhysicsPointQueryParameters3D.new(); q.position = l.global_position + Vector3(0, 1.0, 0); q.collision_mask = World.L_WORLD
		if not w.get_world_3d().direct_space_state.intersect_point(q).is_empty():
			inside_geom += 1
		if min_d < 1.6:
			break
	var dining_door := w.doors.filter(func(d): return d.id == "dining")
	checks.append({"name": "gunshot: Listener paths through the dining door to the source", "ok": min_d < 1.6, "detail": "closest %.2f m after %.1f s; states %s; dining door open=%s" % [min_d, t, states.keys(), dining_door[0].is_open() if not dining_door.is_empty() else "?"]})
	checks.append({"name": "Listener never inside walls", "ok": inside_geom == 0, "detail": "%d frames inside wall colliders" % inside_geom})
	# 4. vision cone: Daniel behind it is not seen; in front and lit is seen
	l.global_position = NavigationServer3D.map_get_closest_point(map, Vector3(-6.0, 0, -1.8)); l.yaw = PI / 2  # facing +X (east)
	p.global_position = Vector3(-9.0, 0.05, -1.8); p.flashlight_on = false
	await tree.physics_frame
	var behind := l._can_see_player()
	p.global_position = Vector3(-2.0, 0.05, -1.8); p.flashlight_on = true
	await tree.physics_frame
	var front := l._can_see_player()
	checks.append({"name": "vision: blind behind, sees ahead (lit)", "ok": not behind and front, "detail": "behind=%s front=%s" % [behind, front]})
	# 5. AI LOD: far Listener thinks less often
	l.global_position = NavigationServer3D.map_get_closest_point(map, Vector3(14, 0, -10)); l._set_state("patrol")
	p.global_position = Vector3(-22, 0.05, -6)
	for i in 3: await tree.physics_frame
	var far_rate := l.think_rate
	checks.append({"name": "AI LOD: decision interval far away", "ok": far_rate >= 0.4, "detail": "%.2f s" % far_rate})
	main._clear_level()
	await tree.process_frame
	# 6. Wrenfield multi-level navigation: ground floor -> first floor (S01 stairs) and -> basement (S03)
	await main.start_level("wrenfield")
	var wf: Wrenfield = main.world
	while not wf.nav_ready:
		await tree.process_frame
	await tree.physics_frame
	var m2 := wf.get_world_3d().navigation_map
	for pair in [["G03", "U07", Vector3(18, 0, -6), Wrenfield.E(15, 16, 3.7)], ["G11", "B01", Wrenfield.E(38, 13, 0), Wrenfield.E(41.5, 18, -3.2)], ["G03", "G04", Vector3(18, 0, -6), Wrenfield.E(5, 9, 0)]]:
		var a := NavigationServer3D.map_get_closest_point(m2, pair[2])
		var b := NavigationServer3D.map_get_closest_point(m2, pair[3])
		var path := NavigationServer3D.map_get_path(m2, a, b, true)
		var ok := not path.is_empty() and path[path.size() - 1].distance_to(b) < 1.0 and absf(a.y - b.y) > 2.0 if pair[0] != "G03" or pair[1] != "G04" else not path.is_empty() and path[path.size() - 1].distance_to(b) < 1.0
		checks.append({"name": "Wrenfield nav %s -> %s" % [pair[0], pair[1]], "ok": ok, "detail": "path %d pts, end %.2f m from goal, dz %.1f" % [path.size(), path[path.size() - 1].distance_to(b) if not path.is_empty() else -1.0, b.y - a.y]})
	var md := ["# The Listener — AI checks (Godot, headless)", "", "| Check | Result | Detail |", "|---|---|---|"]
	for c in checks:
		md.append("| %s | %s | %s |" % [c.name, "PASS" if c.ok else "FAIL", c.detail])
	WalkTestWriter.write(out, "godot-ai.md", "\n".join(md))
	WalkTestWriter.write(out, "godot-ai.json", JSON.stringify(checks, " "))
	for c in checks:
		print("[ai] %s %s — %s" % ["PASS" if c.ok else "FAIL", c.name, c.detail])

class WalkTestWriter:
	static func write(dir: String, name: String, text: String) -> void:
		DirAccess.make_dir_recursive_absolute(dir)
		var f := FileAccess.open(dir.path_join(name), FileAccess.WRITE)
		f.store_string(text)
		f.close()
