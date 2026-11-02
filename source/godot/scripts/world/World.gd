class_name World
extends Node3D
## Common level interface used by the player, The Listener, UI and tests.
## Collision layers: 1 world static, 2 doors, 3 player, 4 enemy, 5 enemy hitboxes.

const L_WORLD := 1
const L_DOOR := 2
const L_PLAYER := 4
const L_ENEMY := 8
const L_HITBOX := 16

signal room_changed(room_id: String)

var world_name := ""
var rooms := {}               # id -> {id, name, aabb: AABB, neighbors: [], level, acoustics: [size, wet]}
var doors: Array = []         # Door nodes
var interactables: Array = [] # {pos, r, prompt, text, node}
var spawn := Transform3D.IDENTITY
var nav_region: NavigationRegion3D
var env: Environment
var current_room := ""
var static_body: StaticBody3D
var nav_ready := false

func room_at(p: Vector3) -> String:
	var best := ""
	var best_vol := INF
	for id in rooms:
		var a: AABB = rooms[id].aabb
		if a.grow(0.05).has_point(p):
			var v := a.get_volume()
			if v < best_vol:
				best_vol = v; best = id
	return best

func set_player_room(id: String) -> void:
	if id == "" or id == current_room:
		return
	current_room = id
	var ac: Array = rooms[id].get("acoustics", [0.5, 0.12])
	Settings.set_room_acoustics(ac[0], ac[1])
	room_changed.emit(id)

## Static box collider + optional occluder (walls are perfect occluders for occlusion culling).
func add_box(center: Vector3, size: Vector3, yaw := 0.0, occluder := false, layer := L_WORLD) -> void:
	if static_body == null:
		static_body = StaticBody3D.new()
		static_body.name = "StaticWorld"
		static_body.collision_layer = L_WORLD
		static_body.collision_mask = 0
		add_child(static_body)
	var cs := CollisionShape3D.new()
	var b := BoxShape3D.new()
	b.size = size
	cs.shape = b
	cs.transform = Transform3D(Basis(Vector3.UP, yaw), center)
	static_body.add_child(cs)
	if occluder and size.y > 1.6 and maxf(size.x, size.z) > 0.8:
		var oi := OccluderInstance3D.new()
		var bo := BoxOccluder3D.new()
		bo.size = size * Vector3(0.98, 0.98, 0.98)
		oi.occluder = bo
		oi.transform = cs.transform
		add_child(oi)

## Bake a navmesh for AI from static colliders only (doors are opened by the AI itself).
func bake_navigation(cell := 0.1, agent_r := 0.35, agent_h := 1.9, climb := 0.45) -> void:
	nav_region = NavigationRegion3D.new()
	nav_region.name = "Nav"
	var nm := NavigationMesh.new()
	nm.cell_size = cell
	nm.cell_height = 0.05
	nm.agent_radius = agent_r
	nm.agent_height = agent_h
	nm.agent_max_climb = climb
	nm.agent_max_slope = 46.0
	nm.geometry_parsed_geometry_type = NavigationMesh.PARSED_GEOMETRY_STATIC_COLLIDERS
	nm.geometry_collision_mask = L_WORLD
	nm.region_min_size = 1.0
	nav_region.navigation_mesh = nm
	add_child(nav_region)
	NavigationServer3D.map_set_cell_size(get_world_3d().navigation_map, cell)
	NavigationServer3D.map_set_cell_height(get_world_3d().navigation_map, 0.05)
	var src := NavigationMeshSourceGeometryData3D.new()
	NavigationServer3D.parse_source_geometry_data(nm, src, self)
	NavigationServer3D.bake_from_source_geometry_data_async(nm, src, func():
		nav_region.navigation_mesh = nm
		nav_ready = true)

func door_near(p: Vector3, max_d := 1.8) -> Node:
	var best: Node = null
	var bd := max_d
	for d in doors:
		var dd: float = d.global_position.distance_to(Vector3(p.x, d.global_position.y, p.z))
		if dd < bd:
			bd = dd; best = d
	return best

## How much a sound travelling from a to b is muffled by solid geometry (0 = clear, 1 = fully blocked).
func occlusion_between(a: Vector3, b: Vector3) -> float:
	var q := PhysicsRayQueryParameters3D.create(a, b, L_WORLD | L_DOOR)
	var space := get_world_3d().direct_space_state
	var hits := 0
	var from := a
	for i in 3:
		q.from = from
		var r := space.intersect_ray(q)
		if r.is_empty():
			break
		hits += 1
		from = r.position + (b - a).normalized() * 0.4
	return clampf(hits * 0.45, 0.0, 1.0)

func make_environment() -> WorldEnvironment:
	var we := WorldEnvironment.new()
	env = Environment.new()
	env.background_mode = Environment.BG_COLOR
	env.background_color = Color(0.008, 0.008, 0.01)
	env.ambient_light_source = Environment.AMBIENT_SOURCE_COLOR
	env.reflected_light_source = Environment.REFLECTION_SOURCE_DISABLED
	env.tonemap_mode = Environment.TONE_MAPPER_ACES
	env.tonemap_exposure = 1.0
	env.glow_enabled = true
	env.glow_intensity = 0.35
	env.glow_bloom = 0.04
	env.glow_hdr_threshold = 1.4
	env.glow_blend_mode = Environment.GLOW_BLEND_MODE_SOFTLIGHT
	env.ssao_enabled = true
	env.ssao_radius = 0.9
	env.ssao_intensity = 1.6
	env.adjustment_enabled = true
	env.adjustment_saturation = 0.8
	env.adjustment_contrast = 1.06
	env.fog_enabled = true
	env.fog_mode = Environment.FOG_MODE_EXPONENTIAL
	we.environment = env
	add_child(we)
	return we
