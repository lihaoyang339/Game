class_name MatLib
extends RefCounted
## Rebuilds the art slice's three.js materials (exported to data/artslice.json) as Godot materials.
## Plain PBR -> StandardMaterial3D; aged materials -> shaders/aged.gdshader; custom shaders -> ported .gdshader.

const TEX_DIR := "res://assets/artslice/tex/"
const SH := {
	"aged": preload("res://shaders/aged.gdshader"),
	"rain_glass": preload("res://shaders/rain_glass.gdshader"),
	"storm_backdrop": preload("res://shaders/storm_backdrop.gdshader"),
	"flame": preload("res://shaders/flame.gdshader"),
	"ember": preload("res://shaders/ember.gdshader"),
	"light_cone": preload("res://shaders/light_cone.gdshader"),
}

var mats: Dictionary          # name -> json dict
var texs: Dictionary          # id -> json dict
var _cache := {}              # name -> Material
var _tex_cache := {}
var emissive_by_light := {}   # light index -> Array[Material]

func _init(data: Dictionary) -> void:
	mats = data.materials
	texs = data.textures

static func col(h) -> Color:
	return Color.hex((int(h) << 8) | 0xff)

func tex(id: String) -> Texture2D:
	if _tex_cache.has(id):
		return _tex_cache[id]
	var t: Texture2D = load(TEX_DIR + texs[id].file)
	_tex_cache[id] = t
	return t

func get_mat(name: String) -> Material:
	if _cache.has(name):
		return _cache[name]
	var d: Dictionary = mats.get(name, {})
	var m: Material = null
	if d.is_empty():
		m = null
	elif d.shader != null:
		m = _shader_mat(d)
	elif d.age != null:
		m = _aged(d)
	else:
		m = _standard(d)
	if m and name.begins_with("EMIT__"):
		var li := int(name.split("__")[1])
		if not emissive_by_light.has(li):
			emissive_by_light[li] = []
		emissive_by_light[li].append(m)
	_cache[name] = m
	return m

func _map(d: Dictionary, slot: String) -> Texture2D:
	return tex(d.maps[slot].tex) if d.maps.has(slot) else null

func _standard(d: Dictionary) -> StandardMaterial3D:
	var m := StandardMaterial3D.new()
	m.albedo_color = col(d.color)
	m.albedo_color.a = d.opacity
	var a := _map(d, "map")
	if a: m.albedo_texture = a
	m.roughness = d.roughness
	m.metallic = d.metalness
	var r := _map(d, "roughnessMap")
	if r:
		m.roughness_texture = r
		m.roughness_texture_channel = BaseMaterial3D.TEXTURE_CHANNEL_GREEN
	var mt := _map(d, "metalnessMap")
	if mt:
		m.metallic_texture = mt
		m.metallic_texture_channel = BaseMaterial3D.TEXTURE_CHANNEL_BLUE
		m.metallic = d.metalness
	var n := _map(d, "normalMap")
	if n:
		m.normal_enabled = true
		m.normal_texture = n
		m.normal_scale = d.normalScale[0]
	var ao := _map(d, "aoMap")
	if ao:
		m.ao_enabled = true
		m.ao_texture = ao
		m.ao_texture_channel = BaseMaterial3D.TEXTURE_CHANNEL_RED
		m.ao_light_affect = 0.4 * d.aoMapIntensity
	var em := col(d.emissive)
	if d.emissive != 0 and d.emissiveIntensity > 0.0 or d.maps.has("emissiveMap"):
		m.emission_enabled = true
		m.emission = em
		m.emission_energy_multiplier = d.emissiveIntensity
		var et := _map(d, "emissiveMap")
		if et: m.emission_texture = et
	if d.emitBase != null:
		m.emission_enabled = true
		m.emission = em if d.emissive != 0 else Color(1.0, 0.72, 0.42)
		m.emission_energy_multiplier = 0.0
	if d.vertexColors:
		m.vertex_color_use_as_albedo = true
	if d.transparent or d.opacity < 0.999 or d.transmission > 0.0:
		m.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA_DEPTH_PRE_PASS if d.depthWrite else BaseMaterial3D.TRANSPARENCY_ALPHA
		if d.transmission > 0.0:
			m.albedo_color.a = minf(m.albedo_color.a, 1.0 - d.transmission * 0.8)
	if d.alphaTest > 0.0:
		m.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA_SCISSOR
		m.alpha_scissor_threshold = d.alphaTest
	if d.maps.has("alphaMap"):
		m.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
	m.cull_mode = [BaseMaterial3D.CULL_BACK, BaseMaterial3D.CULL_FRONT, BaseMaterial3D.CULL_DISABLED][int(d.side)]
	if int(d.blending) == 2:
		m.blend_mode = BaseMaterial3D.BLEND_MODE_ADD
		m.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
	if d.type == "MeshBasicMaterial":
		m.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
	if d.sheen > 0.0:  # velvet: approximate three's sheen lobe with Godot rim lighting
		m.rim_enabled = true
		m.rim = clampf(d.sheen * 0.6, 0.0, 1.0)
		m.rim_tint = 0.6
	if d.clearcoat > 0.0:
		m.clearcoat_enabled = true
		m.clearcoat = d.clearcoat
		m.clearcoat_roughness = d.clearcoatRoughness
	m.texture_filter = BaseMaterial3D.TEXTURE_FILTER_LINEAR_WITH_MIPMAPS_ANISOTROPIC
	return m

func _aged(d: Dictionary) -> ShaderMaterial:
	var m := ShaderMaterial.new()
	m.shader = SH.aged
	m.set_shader_parameter("albedo_color", col(d.color))
	var a := _map(d, "map")
	if a:
		m.set_shader_parameter("albedo_tex", a); m.set_shader_parameter("use_albedo_tex", true)
	var n := _map(d, "normalMap")
	if n:
		m.set_shader_parameter("normal_tex", n); m.set_shader_parameter("use_normal_tex", true); m.set_shader_parameter("normal_scale", d.normalScale[0])
	var r := _map(d, "roughnessMap")
	if r:
		m.set_shader_parameter("rough_tex", r); m.set_shader_parameter("use_rough_tex", true)
	var ao := _map(d, "aoMap")
	if ao:
		m.set_shader_parameter("ao_tex", ao); m.set_shader_parameter("use_ao_tex", true); m.set_shader_parameter("ao_intensity", d.aoMapIntensity)
	m.set_shader_parameter("roughness_f", d.roughness)
	m.set_shader_parameter("metallic_f", d.metalness)
	if d.emissive != 0:
		m.set_shader_parameter("emission_color", col(d.emissive)); m.set_shader_parameter("emission_energy", d.emissiveIntensity)
	var ag: Dictionary = d.age
	for k in ["dust", "grime", "fade", "wet"]:
		m.set_shader_parameter(k, float(ag.get(k, 0.0)))
	m.set_shader_parameter("wet_y", float(ag.get("wetY", 0.02)))
	if ag.get("checker") != null:
		m.set_shader_parameter("checker", ag.checker.size)
		m.set_shader_parameter("tint1", col(ag.checker.a)); m.set_shader_parameter("tint2", col(ag.checker.b))
	var st := PackedVector4Array()
	for i in 4:
		if i < ag.get("stains", []).size():
			var s = ag.stains[i]
			st.append(Vector4(s.x, s.y, s.z, s.r))
		else:
			st.append(Vector4(0, -99, 0, 0))
	m.set_shader_parameter("stains", st)
	return m

func _shader_mat(d: Dictionary) -> ShaderMaterial:
	var kind: String = d.shader.shader
	var m := ShaderMaterial.new()
	m.shader = SH.get(kind, SH.flame)
	match kind:
		"storm_backdrop":
			var a := _map(d, "map")
			if a: m.set_shader_parameter("map", a)
		"light_cone":
			if d.shader.has("color"): m.set_shader_parameter("color", col(d.shader.color))
			if d.shader.has("strength"): m.set_shader_parameter("strength", d.shader.strength)
	m.render_priority = 1 if kind == "rain_glass" else 0
	return m

## Swap every imported surface material for its rebuilt counterpart (matched by exported material name).
func apply_to(root: Node) -> int:
	var n := 0
	for mi in root.find_children("*", "MeshInstance3D", true, false):
		var mesh: Mesh = mi.mesh
		if mesh == null:
			continue
		for s in mesh.get_surface_count():
			var src := mesh.surface_get_material(s)
			if src == null:
				continue
			var m := get_mat(src.resource_name)
			if m:
				mi.set_surface_override_material(s, m)
				n += 1
	return n
