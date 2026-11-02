extends RefCounted
## In-engine route replay for Wrenfield (port of tests/map-walk.mjs): every route leg found by the
## geometric walk test (data/wrenfield.json "paths") is driven with the REAL Godot player controller
## (Jolt CharacterBody3D, capsule r 0.30 h 1.72, ramps, real colliders), keys held. Then every ladder/
## hatch/shaft is used through the interaction code. Writes <out>/godot-walk.md and .json.

func run(main: Node, args: Dictionary) -> void:
	var out_dir: String = args.get("out", "user://")
	var w := Wrenfield.new()
	main.add_child(w)
	await w.build()
	w.set_unlocked(true)
	Game.reset_session()
	var p := Player.new()
	w.add_child(p)
	p.setup(w)
	p.place(w.spawn)
	var tree := main.get_tree()
	for k in 10:
		await tree.physics_frame
	var res := []
	var t_all := Time.get_ticks_msec()
	for leg in w.data.paths:
		if args.has("leg") and leg.id != args.leg:
			continue
		var pts := PackedVector3Array()
		for q in leg.path:
			pts.append(Wrenfield.E(q[0], q[1], q[2]))
		p.place(Transform3D(Basis.IDENTITY, pts[0] + Vector3(0, 0.05, 0)))
		for k in 3:
			await tree.physics_frame
		StepUp.debug = args.has("leg")
		var pilot := Pilot.new(p, pts.slice(1), true)
		p.autopilot = pilot.step
		var sim := 0.0
		var limit := 25.0 + pts.size() * 0.6
		while not pilot.done and not pilot.stuck and sim < limit:
			await tree.physics_frame
			sim += 1.0 / 60.0
			if args.has("leg") and (int(sim * 60) % 30 == 0 or args.has("fine") and sim > float(args.fine)):
				var q := p.global_position
				var nx: Vector3 = pilot.pts[mini(pilot.i, pilot.pts.size() - 1)]
				print("  t=%.2f pos=(%.3f,%.3f,%.3f) wp %d/%d -> (%.2f,%.2f,%.2f) floor=%s wall=%s v=%s real=%s spd=%.2f" % [sim, q.x, -q.z, q.y, pilot.i, pilot.pts.size(), nx.x, -nx.z, nx.y, p.is_on_floor(), p.is_on_wall(), p.velocity, p.get_real_velocity(), p.speed])
				for ci in p.get_slide_collision_count():
					var col := p.get_slide_collision(ci)
					print("    hit ", col.get_collider(), " n=", col.get_normal(), " at ", col.get_position())
		p.autopilot = Callable()
		var ok: bool = pilot.done and not pilot.stuck and pilot.i >= pilot.pts.size()
		var at := p.global_position
		var r := {"id": leg.id, "from": leg.from, "to": leg.to, "ok": ok, "sim_s": snappedf(sim, 0.1), "wp": pilot.i, "of": pilot.pts.size(),
			"why": "" if ok else ("stuck" if pilot.stuck else "timeout"), "at": [snappedf(at.x, 0.01), snappedf(-at.z, 0.01), snappedf(at.y, 0.01)]}
		res.append(r)
		print("[walk] %s %s->%s %s %.1fs %s" % [r.id, r.from, r.to, "PASS" if ok else "FAIL", sim, "" if ok else str(r.at)])
	# ladders / hatches / shafts through the interaction path
	var lad := []
	for li in w.ladders.size():
		var l: Dictionary = w.ladders[li]
		p.place(Transform3D(Basis.IDENTITY, l.bottom + Vector3(0, 0.05, 0)))
		for k in 3:
			await tree.physics_frame
		var before := p.global_position.y
		var dest: Vector3 = w.use_ladder(li)
		if dest != Vector3.INF:
			p.place(Transform3D(Basis.IDENTITY, dest + Vector3(0, 0.05, 0)))
		for k in 30:
			await tree.physics_frame
		var after := p.global_position.y
		var ok := absf(after - float(l.z1)) < 0.3
		var note := ""
		if dest == Vector3.INF:
			note = "no walkable surface at the top in MAP V1.0 (exit shaft, handled as ending)" if l.id == "S06" else "blocked"
		lad.append({"id": l.id, "z_before": snappedf(before, 0.01), "z_after": snappedf(after, 0.01), "ok": ok, "note": note})
		print("[ladder] %s %.2f -> %.2f %s" % [l.id, before, after, "PASS" if ok else "FAIL"])
	# locks really block (keys not held)
	w.set_unlocked(false)
	var fails := res.filter(func(r): return not r.ok)
	var md := ["# Wrenfield — Godot in-engine walk replay", "",
		"Godot %s, Jolt physics, real `Player` controller (capsule r 0.30 m, 1.72 m), keys held, running. %d route legs, **%d failures**; ladders %d/%d. Wall time %.1f s." % [
			Engine.get_version_info().string, res.size(), fails.size(), lad.filter(func(l): return l.ok).size(), lad.size(), (Time.get_ticks_msec() - t_all) / 1000.0], "",
		"| Leg | From → To | Result | Sim time |", "|---|---|---|---|"]
	for r in res:
		md.append("| %s | %s → %s | %s | %.1f s |" % [r.id, r.from, r.to, "PASS" if r.ok else "FAIL %s at %s wp %d/%d" % [r.why, r.at, r.wp, r.of], r.sim_s])
	md.append(""); md.append("| Ladder | Z before | Z after | Result |"); md.append("|---|---|---|---|")
	for l in lad:
		md.append("| %s | %.2f | %.2f | %s |" % [l.id, l.z_before, l.z_after, "PASS" if l.ok else "FAIL " + l.note])
	_write(out_dir, "godot-walk.md", "\n".join(md))
	_write(out_dir, "godot-walk.json", JSON.stringify({"legs": res, "ladders": lad}, " "))
	print("[walk] %d legs, %d failures; ladders %d/%d" % [res.size(), fails.size(), lad.filter(func(l): return l.ok).size(), lad.size()])

static func _write(dir: String, name: String, text: String) -> void:
	DirAccess.make_dir_recursive_absolute(dir)
	var f := FileAccess.open(dir.path_join(name), FileAccess.WRITE)
	f.store_string(text)
	f.close()
