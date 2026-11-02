class_name Pilot
extends RefCounted
## Drives the real Player controller along waypoints through its normal input path (Player.autopilot):
## converts the world-space direction to camera-relative stick input exactly as a human would produce.

var player: Player
var pts: PackedVector3Array = []
var i := 0
var run := true
var aim := false
var look_override := NAN
var arrive := 0.35
var best := INF
var stall := 0.0
var stuck := false
var done := false

func _init(p: Player, waypoints: PackedVector3Array, p_run := true) -> void:
	player = p
	pts = waypoints
	run = p_run

func step(delta: float) -> Dictionary:
	if done or stuck or i >= pts.size():
		done = true
		return {"move": Vector2.ZERO}
	var pos := player.global_position
	var tgt := pts[i]
	var to := Vector3(tgt.x - pos.x, 0.0, tgt.z - pos.z)
	var d := to.length()
	if d < arrive and absf(tgt.y - pos.y) < 0.9:
		i += 1
		best = INF
		stall = 0.0
		return step(0.0)
	if d < best - 0.04:
		best = d
		stall = 0.0
	else:
		stall += delta
		if stall > 3.0:
			stuck = true
	var dir := to / maxf(d, 0.001)
	var cy: float = player.cam_yaw
	var right := Vector3(cos(cy), 0, -sin(cy))
	var fwd := Vector3(-sin(cy), 0, -cos(cy))
	var out := {"move": Vector2(dir.dot(right), dir.dot(fwd)), "run": run and d > 0.6, "aim": aim}
	out.look_yaw = atan2(-dir.x, -dir.z) if is_nan(look_override) else look_override
	return out
