class_name PoseModifier
extends SkeletonModifier3D
## Procedural layer applied after the AnimationTree each frame (skeleton space: Y up, character faces +Z):
## - twist: pelvis/legs yaw toward the movement direction while the spine counter-rotates so the chest
##   stays on the aim line (8-direction aimed movement from forward/backward clips; the free UAL set
##   has no authored strafe clips).
## - lean_pitch / lean_roll: sprint forward lean and banking into turns.
## - hunch: injured posture.  look_yaw / look_pitch: head + neck follow the camera within limits.
## - head_tilt: The Listener's listening tilt.

var twist := 0.0
var lean_pitch := 0.0
var lean_roll := 0.0
var hunch := 0.0
var look_yaw := 0.0
var look_pitch := 0.0
var head_tilt := 0.0
var _b := {}

func _ready() -> void:
	active = true

func _bi(sk: Skeleton3D, n: String) -> int:
	if not _b.has(n):
		_b[n] = sk.find_bone(n)
	return _b[n]

func _rot_global(sk: Skeleton3D, bi: int, r: Basis) -> void:
	if bi < 0:
		return
	var g := sk.get_bone_global_pose(bi)
	sk.set_bone_global_pose(bi, Transform3D(r * g.basis, g.origin))

func _process_modification() -> void:
	var sk := get_skeleton()
	if sk == null:
		return
	var up := Vector3.UP
	var right := Vector3.RIGHT
	var fwd := Vector3.BACK  # +Z
	var p := _bi(sk, "pelvis"); var s1 := _bi(sk, "spine_01"); var s2 := _bi(sk, "spine_02"); var s3 := _bi(sk, "spine_03")
	if absf(twist) > 0.001 and p >= 0:
		var o1 := sk.get_bone_global_pose(s1).basis
		var o2 := sk.get_bone_global_pose(s2).basis
		var o3 := sk.get_bone_global_pose(s3).basis
		_rot_global(sk, p, Basis(up, twist))
		var g1 := sk.get_bone_global_pose(s1); sk.set_bone_global_pose(s1, Transform3D(Basis(up, twist * 0.6) * o1, g1.origin))
		var g2 := sk.get_bone_global_pose(s2); sk.set_bone_global_pose(s2, Transform3D(Basis(up, twist * 0.25) * o2, g2.origin))
		var g3 := sk.get_bone_global_pose(s3); sk.set_bone_global_pose(s3, Transform3D(o3, g3.origin))
	if absf(lean_pitch) > 0.001 or absf(lean_roll) > 0.001:
		_rot_global(sk, s1, Basis(right, lean_pitch * 0.6) * Basis(fwd, lean_roll * 0.6))
		_rot_global(sk, s2, Basis(right, lean_pitch * 0.4) * Basis(fwd, lean_roll * 0.4))
	if hunch > 0.001:
		_rot_global(sk, s2, Basis(right, hunch * 0.18))
		_rot_global(sk, s3, Basis(right, hunch * 0.12))
		_rot_global(sk, _bi(sk, "neck_01"), Basis(right, -hunch * 0.1))
	if absf(look_yaw) > 0.001 or absf(look_pitch) > 0.001 or absf(head_tilt) > 0.001:
		var ly := clampf(look_yaw, -1.1, 1.1); var lp := clampf(look_pitch, -0.6, 0.5)
		_rot_global(sk, _bi(sk, "neck_01"), Basis(up, ly * 0.4) * Basis(right, -lp * 0.4))
		_rot_global(sk, _bi(sk, "Head"), Basis(up, ly * 0.6) * Basis(right, -lp * 0.6) * Basis(fwd, head_tilt))
