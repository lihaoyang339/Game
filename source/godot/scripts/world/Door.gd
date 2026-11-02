class_name Door
extends Node3D
## Hinged door: one or two leaves on pivots, each carrying a kinematic collider that swings with it.
## open: 0 closed .. 1 fully open (three.js parity: leaf angle = open * 1.75 rad * side * swing).

signal toggled(open: bool)

var id := ""
var open := 0.0
var target := 0.0
var swing := 1.0
var locked_lines: Array = []   # non-empty => locked; lines are said when tried
var one_way_side := 0.0        # >0: opens only from local +z side, <0 only from -z side
var leaves: Array = []         # [{pivot: Node3D, side: float}]
var speed := 0.9
var width := 1.0
var height := 2.3
var _creak: AudioStreamPlayer3D

func setup(p_id: String, leaf_nodes: Array, sides: Array, p_open: float, p_swing: float, w: float, h: float) -> void:
	id = p_id; open = p_open; target = p_open; swing = p_swing; width = w; height = h
	for i in leaf_nodes.size():
		var pv: Node3D = leaf_nodes[i]
		var body := AnimatableBody3D.new()
		body.collision_layer = World.L_DOOR
		body.collision_mask = 0
		body.sync_to_physics = false
		var cs := CollisionShape3D.new()
		var b := BoxShape3D.new()
		var lw: float = w / leaf_nodes.size()
		b.size = Vector3(lw - 0.02, h - 0.02, 0.06)
		cs.shape = b
		cs.position = Vector3(float(sides[i]) * lw * 0.5, h * 0.5, 0.0)
		body.add_child(cs)
		pv.add_child(body)
		leaves.append({"pivot": pv, "side": float(sides[i])})
	_creak = AudioStreamPlayer3D.new()
	_creak.bus = "SFX"
	_creak.position = Vector3(0, 1.2, 0)
	_creak.max_distance = 22.0
	add_child(_creak)
	_apply()

func _apply() -> void:
	for l in leaves:
		l.pivot.rotation.y = -open * 1.75 * l.side * swing

func is_open() -> bool:
	return target > 0.3

## Try to open/close from position `from`. Returns false (and the reason lines) when it will not move.
func try_toggle(from: Vector3, actor := "player") -> Array:
	if not locked_lines.is_empty():
		return locked_lines
	if one_way_side != 0.0 and target < 0.3:
		var local := to_local(from)
		if signf(local.z) != signf(one_way_side):
			return ["墙上有一道几乎看不见的缝。", "这边没有把手。"]
	target = 0.0 if target > 0.3 else 0.75
	_play("door_open_01.mp3" if target > 0.3 else "door_doorlock.mp3", -4.0 if actor == "player" else 0.0)
	NoiseBus.emit_noise(global_position + Vector3(0, 1, 0), 9.0 if actor == "player" else 6.0, "door", self)
	toggled.emit(target > 0.3)
	return []

func force_open(v: float) -> void:
	target = v

func _play(file: String, db := 0.0) -> void:
	if _creak == null:
		return
	var s = load("res://assets/audio/" + file)
	if s:
		_creak.stream = s
		_creak.volume_db = db
		_creak.play()

func _physics_process(delta: float) -> void:
	if absf(target - open) > 0.001:
		open += signf(target - open) * minf(absf(target - open), delta * speed)
		_apply()
