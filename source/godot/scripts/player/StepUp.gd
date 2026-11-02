class_name StepUp
extends RefCounted
## Step-up for CharacterBody3D (Godot's body has none): when blocked by a low edge (<= max_h), test
## up -> forward -> down and move onto it if the landing is walkable. Same 0.45 m rule the map was
## validated with (tests/map-geo-test.mjs).

static var debug := false

static func _d(m: String) -> void:
	if debug: print("    [step] ", m)

static func try_step(body: CharacterBody3D, horiz: Vector3, max_h := 0.46) -> bool:
	if horiz.length() < 0.0005 or not body.is_on_floor() and body.velocity.y > 0.5:
		return false
	var blocked := false
	for i in body.get_slide_collision_count():
		var n := body.get_slide_collision(i).get_normal()
		if n.y < 0.7 and Vector3(n.x, 0, n.z).normalized().dot(horiz.normalized()) < -0.3:
			blocked = true
	if not blocked:
		if debug and body.get_slide_collision_count() > 0: _d("not blocked: normals %s" % [range(body.get_slide_collision_count()).map(func(i): return body.get_slide_collision(i).get_normal())])
		return false
	var t := body.global_transform
	t.origin -= horiz.normalized() * 0.03   # probe from just off the contact (bodies in contact report hits)
	if body.test_move(t, Vector3(0, max_h, 0)):
		_d("up blocked"); return false
	t.origin.y += max_h
	var fwd := horiz.normalized() * (maxf(horiz.length(), 0.12) + 0.03)
	if body.test_move(t, fwd):
		_d("fwd blocked at %s" % t.origin); return false
	t.origin += fwd
	var kc := KinematicCollision3D.new()
	if not body.test_move(t, Vector3(0, -max_h - 0.08, 0), kc):
		_d("no landing"); return false
	if kc.get_normal().y < 0.62:
		_d("landing too steep %s" % kc.get_normal()); return false
	t.origin += kc.get_travel()
	body.global_transform = t
	return true
