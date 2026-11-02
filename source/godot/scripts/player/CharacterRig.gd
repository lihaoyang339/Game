class_name CharacterRig
extends Node3D
## Quaternius UBC body (CC0) + hair, driven by the Universal Animation Library 1+2 (CC0, 86 clips)
## through an AnimationTree built in code. Used for Daniel and for The Listener.

const BODY := "res://assets/characters/daniel/Superhero_Male_FullBody.gltf"
const HAIR := "res://assets/characters/hair/Hair_SimpleParted.gltf"
const LIBS := ["res://assets/anims/UAL1_Standard.glb", "res://assets/anims/UAL2_Standard.glb"]
const LOOPS := ["Crouch_Fwd", "Crouch_Idle", "Idle", "Idle_Torch", "Jog_Fwd", "Pistol_Idle", "Push", "Sprint", "Walk", "Walk_Formal",
	"Idle_FoldArms", "Idle_Lantern", "Idle_No", "Idle_Rail", "Idle_Shield", "Walk_Carry", "Zombie_Idle", "Zombie_Walk_Fwd", "Sword_Idle", "Spell_Simple_Idle", "Swim_Idle"]
const SK := "Armature/Skeleton3D"
const UPPER := ["spine_01", "spine_02", "spine_03", "neck_01", "Head", "clavicle_l", "upperarm_l", "lowerarm_l", "hand_l",
	"clavicle_r", "upperarm_r", "lowerarm_r", "hand_r"]
## Native ground speed (m/s) of each locomotion clip, measured from the root-motion versions (data/anim_rootmotion.json).
const CLIP_SPEED := {"Walk": 0.975, "Jog_Fwd": 5.357, "Sprint": 8.25, "Crouch_Fwd": 0.75, "Zombie_Walk_Fwd": 1.05, "Walk_Carry": 0.65, "Walk_Formal": 0.975}

static var _lib_cache: AnimationLibrary

var model: Node3D
var skeleton: Skeleton3D
var tree: AnimationTree
var body_mesh: MeshInstance3D
var meshes: Array = []
var bt: AnimationNodeBlendTree

static func library() -> AnimationLibrary:
	if _lib_cache:
		return _lib_cache
	var lib := AnimationLibrary.new()
	for p in LIBS:
		var s: Node = load(p).instantiate()
		var ap: AnimationPlayer = s.find_child("AnimationPlayer", true, false)
		var src := ap.get_animation_library("")
		for n in src.get_animation_list():
			if lib.has_animation(n):
				continue
			var a: Animation = src.get_animation(n).duplicate()
			a.loop_mode = Animation.LOOP_LINEAR if n in LOOPS else Animation.LOOP_NONE
			lib.add_animation(n, a)
		s.free()
	_lib_cache = lib
	return lib

func build(with_hair := true) -> void:
	model = load(BODY).instantiate()
	model.name = "Model"
	add_child(model)
	skeleton = model.get_node(SK)
	for m in skeleton.get_children():
		if m is MeshInstance3D:
			meshes.append(m)
			if m.name.begins_with("SuperHero"):
				body_mesh = m
	if with_hair:
		var h: Node = load(HAIR).instantiate()
		for m in h.find_children("*", "MeshInstance3D", true, false):
			m.get_parent().remove_child(m)
			skeleton.add_child(m)
			m.skeleton = NodePath("..")
			meshes.append(m)
		h.free()
	for m in meshes:
		m.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_ON
	tree = AnimationTree.new()
	tree.name = "AnimationTree"
	model.add_child(tree)
	tree.root_node = NodePath("..")
	tree.add_animation_library("ual", library())
	tree.callback_mode_process = AnimationMixer.ANIMATION_CALLBACK_MODE_PROCESS_IDLE
	bt = AnimationNodeBlendTree.new()
	tree.tree_root = bt

func bone(name: String) -> int:
	return skeleton.find_bone(name)

func bone_global(name: String) -> Transform3D:
	return skeleton.global_transform * skeleton.get_bone_global_pose(skeleton.find_bone(name))

func attach(bone_name: String, node: Node3D, offset := Transform3D.IDENTITY) -> BoneAttachment3D:
	var ba := BoneAttachment3D.new()
	ba.bone_name = bone_name
	skeleton.add_child(ba)
	node.transform = offset
	ba.add_child(node)
	return ba

# ---------------------------------------------------------------- tree building helpers
func anim(name: String, backward := false) -> AnimationNodeAnimation:
	var a := AnimationNodeAnimation.new()
	a.animation = "ual/" + name
	if backward:
		a.play_mode = AnimationNodeAnimation.PLAY_MODE_BACKWARD
	return a

func filter_upper(n: AnimationNode, include_arms := true, only_left := false, only_right := false) -> void:
	n.filter_enabled = true
	for b in skeleton.get_bone_count():
		var bn := skeleton.get_bone_name(b)
		var upper := bn in UPPER or bn.ends_with("_l") and _is_hand_or_finger(bn) or bn.ends_with("_r") and _is_hand_or_finger(bn)
		if not include_arms and (bn.begins_with("clavicle") or bn.begins_with("upperarm") or bn.begins_with("lowerarm") or _is_hand_or_finger(bn)):
			upper = false
		if only_left and bn.ends_with("_r"):
			upper = false
		if only_right and bn.ends_with("_l"):
			upper = false
		if upper:
			n.set_filter_path(NodePath(SK + ":" + bn), true)

static func _is_hand_or_finger(bn: String) -> bool:
	for p in ["hand_", "index_", "middle_", "pinky_", "ring_", "thumb_"]:
		if bn.begins_with(p):
			return true
	return false

## Transition node with named inputs, each an animation (optionally through a TimeScale named ts_<input>).
func add_selector(name: String, inputs: Dictionary, xfade := 0.2, timescaled := true) -> void:
	var tr := AnimationNodeTransition.new()
	tr.xfade_time = xfade
	tr.input_count = inputs.size()
	bt.add_node(name, tr)
	var i := 0
	for key in inputs:
		tr.set_input_name(i, key)
		var src = inputs[key]
		var src_name := "%s_%s" % [name, key]
		bt.add_node(src_name, src if src is AnimationNode else anim(src))
		if timescaled:
			var ts := AnimationNodeTimeScale.new()
			bt.add_node("ts_%s_%s" % [name, key], ts)
			bt.connect_node("ts_%s_%s" % [name, key], 0, src_name)
			bt.connect_node(name, i, "ts_%s_%s" % [name, key])
		else:
			bt.connect_node(name, i, src_name)
		i += 1

func speed_scale(sel: String, input: String, s: float) -> void:
	tree.set("parameters/ts_%s_%s/scale" % [sel, input], s)

func select(sel: String, input: String) -> void:
	if tree.get("parameters/%s/current_state" % sel) != input:
		tree.set("parameters/%s/transition_request" % sel, input)

func fire(oneshot: String) -> void:
	tree.set("parameters/%s/request" % oneshot, AnimationNodeOneShot.ONE_SHOT_REQUEST_FIRE)

func abort(oneshot: String) -> void:
	tree.set("parameters/%s/request" % oneshot, AnimationNodeOneShot.ONE_SHOT_REQUEST_FADE_OUT)

func oneshot_active(oneshot: String) -> bool:
	return tree.get("parameters/%s/active" % oneshot)

func blend(node: String, v: float) -> void:
	tree.set("parameters/%s/blend_amount" % node, v)

func clip_length(name: String) -> float:
	return library().get_animation(name).length
