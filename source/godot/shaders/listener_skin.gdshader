// The Listener: 4K procedural PBR skin + bind-pose features (CUSTOM0 = bind position): sealed eye
// sockets, rib ridges, slit mouth, wet sheen, bullet wounds (bind-space), hit flash.
shader_type spatial;
render_mode depth_draw_opaque, cull_back;
uniform sampler2D albedo_tex : source_color, filter_linear_mipmap_anisotropic;
uniform sampler2D normal_tex : hint_normal, filter_linear_mipmap_anisotropic;
uniform sampler2D orm_tex : hint_default_white, filter_linear_mipmap;
uniform float uv_scale = 1.0;
uniform vec4 wounds[8];
uniform float flash = 0.0;
uniform float wet = 0.6;
varying vec3 bind;
float h(vec3 p){ p = fract(p*0.1031); p += dot(p, p.zyx+31.32); return fract((p.x+p.y)*p.z); }
float vn(vec3 p){ vec3 i=floor(p); vec3 f=fract(p); f=f*f*(3.0-2.0*f);
  return mix(mix(mix(h(i),h(i+vec3(1,0,0)),f.x),mix(h(i+vec3(0,1,0)),h(i+vec3(1,1,0)),f.x),f.y),
             mix(mix(h(i+vec3(0,0,1)),h(i+vec3(1,0,1)),f.x),mix(h(i+vec3(0,1,1)),h(i+vec3(1,1,1)),f.x),f.y),f.z); }
void vertex() {
	bind = CUSTOM0.xyz;
	// sunken eye sockets and cheeks, rib ridges pushed out
	vec3 b = bind;
	float eye = 0.0;
	for (int s = -1; s <= 1; s += 2) eye += 1.0 - smoothstep(0.0, 0.028, length((b - vec3(float(s)*0.025, 1.698, 0.066)) * vec3(1.0, 1.3, 1.0)));
	float rib = step(1.15, b.y) * step(b.y, 1.42) * smoothstep(0.02, 0.06, b.z) * (0.5 + 0.5*sin(b.y*95.0));
	VERTEX += NORMAL * (-eye * 0.012 + rib * 0.004);
}
void fragment() {
	vec3 b = bind;
	vec3 col = texture(albedo_tex, UV * uv_scale).rgb;
	vec3 orm = texture(orm_tex, UV * uv_scale).rgb;
	float eye = 0.0;
	for (int s = -1; s <= 1; s += 2) eye += 1.0 - smoothstep(0.0, 0.03, length((b - vec3(float(s)*0.025, 1.698, 0.066)) * vec3(1.0, 1.3, 1.0)));
	col = mix(col, vec3(0.02, 0.015, 0.015), clamp(eye, 0.0, 1.0) * 0.95);
	float mouth = (1.0 - smoothstep(0.0, 0.004, abs(b.y - 1.625 - (b.x*b.x)*2.0))) * step(abs(b.x), 0.045) * step(0.06, b.z);
	col = mix(col, vec3(0.05, 0.01, 0.01), mouth);
	float wound = 0.0;
	for (int i = 0; i < 8; i++) {
		vec4 w = wounds[i]; if (w.w <= 0.0) continue;
		vec3 dd = b - w.xyz;
		float core = 1.0 - smoothstep(0.0, 0.02*w.w, length(dd));
		float drip = (1.0 - smoothstep(0.0, 0.01, abs(dd.x + (vn(b*20.0)-0.5)*0.02))) * step(dd.y, 0.0) * (1.0 - smoothstep(0.0, 0.16*w.w, -dd.y));
		wound = max(wound, max(core, drip * 0.85));
	}
	// The Listener bleeds almost black
	col = mix(col, vec3(0.03, 0.02, 0.025), clamp(wound, 0.0, 1.0));
	ALBEDO = col;
	ROUGHNESS = clamp(mix(orm.g, 0.18, wet * smoothstep(0.4, 0.7, vn(b*7.0))) * (1.0 - wound*0.6), 0.06, 1.0);
	AO = orm.r; AO_LIGHT_AFFECT = 0.3;
	NORMAL_MAP = texture(normal_tex, UV * uv_scale).rgb;
	NORMAL_MAP_DEPTH = 1.4;
	SSS_STRENGTH = 0.35;
	SPECULAR = 0.6;
	EMISSION = vec3(0.35, 0.02, 0.02) * flash;
}
