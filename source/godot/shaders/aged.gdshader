// Port of the three.js manor material + age() onBeforeCompile pass (src/world/manormats.js):
// purposeful aging — dust on up-facing surfaces, grime rising from the floor, water stains running
// down from leak points, colour fading, optional marble checkerboard and wet floor patches.
shader_type spatial;
render_mode depth_draw_opaque, cull_back;

uniform vec4 albedo_color : source_color = vec4(1.0);
uniform sampler2D albedo_tex : source_color, filter_linear_mipmap_anisotropic, repeat_enable, hint_default_white;
uniform bool use_albedo_tex = false;
uniform sampler2D normal_tex : hint_normal, filter_linear_mipmap_anisotropic, repeat_enable;
uniform bool use_normal_tex = false;
uniform float normal_scale = 1.0;
uniform sampler2D rough_tex : hint_default_white, filter_linear_mipmap_anisotropic, repeat_enable;
uniform bool use_rough_tex = false;
uniform int rough_channel = 1;
uniform float roughness_f = 1.0;
uniform float metallic_f = 0.0;
uniform sampler2D ao_tex : hint_default_white, filter_linear_mipmap, repeat_enable;
uniform bool use_ao_tex = false;
uniform float ao_intensity = 1.0;
uniform vec3 emission_color : source_color = vec3(0.0);
uniform float emission_energy = 0.0;
// aging
uniform float dust = 0.0;
uniform float grime = 0.0;
uniform float fade = 0.0;
uniform float checker = 0.0;
uniform vec3 tint1 : source_color = vec3(1.0);
uniform vec3 tint2 : source_color = vec3(1.0);
uniform vec4 stains[4];
uniform float wet = 0.0;
uniform float wet_y = 0.02;

varying vec3 w_pos;
varying vec3 w_nrm;

float ah(vec3 p){ p = fract(p*0.1031); p += dot(p, p.zyx+31.32); return fract((p.x+p.y)*p.z); }
float an(vec3 p){ vec3 i=floor(p); vec3 f=fract(p); f=f*f*(3.0-2.0*f);
  return mix(mix(mix(ah(i),ah(i+vec3(1,0,0)),f.x),mix(ah(i+vec3(0,1,0)),ah(i+vec3(1,1,0)),f.x),f.y),
             mix(mix(ah(i+vec3(0,0,1)),ah(i+vec3(1,0,1)),f.x),mix(ah(i+vec3(0,1,1)),ah(i+vec3(1,1,1)),f.x),f.y),f.z); }
float afbm(vec3 p){ float a=0.5,s=0.0; for(int i=0;i<4;i++){ s+=a*an(p); p*=2.07; a*=0.5; } return s; }

void vertex() {
	w_pos = (MODEL_MATRIX * vec4(VERTEX, 1.0)).xyz;
	w_nrm = normalize(mat3(MODEL_MATRIX) * NORMAL);
}

void fragment() {
	vec4 c = albedo_color;
	if (use_albedo_tex) c *= texture(albedo_tex, UV);
	vec3 col = c.rgb;
	float rough = roughness_f;
	if (use_rough_tex) rough *= texture(rough_tex, UV)[rough_channel];
	float age_rough = 0.0;
	vec3 w = w_pos; vec3 n = normalize(w_nrm);
	if (checker > 0.0) {
		vec2 cc = floor(w.xz / checker); float k = mod(cc.x + cc.y, 2.0); col *= mix(tint1, tint2, k);
		vec2 f = fract(w.xz / checker); float grout = 1.0 - smoothstep(0.0, 0.006/checker, min(min(f.x,1.0-f.x), min(f.y,1.0-f.y)));
		col = mix(col, col*0.55, grout*0.7); age_rough += grout*0.3;
	}
	float lum = dot(col, vec3(0.3,0.59,0.11));
	col = mix(col, vec3(lum)*vec3(1.02,0.98,0.9) + 0.03, fade * (0.6 + 0.4*afbm(w*1.3)));
	float up = smoothstep(0.55, 0.95, n.y);
	float dn = afbm(w*7.0);
	float d = up * dust * (0.55 + 0.45*dn);
	col = mix(col, vec3(0.42,0.39,0.35), clamp(d*0.75, 0.0, 0.85));
	age_rough += d*0.5;
	float g = grime * (1.0 - smoothstep(0.0, 0.55 + 0.25*afbm(w*2.0), w.y)) * (1.0 - up);
	col *= 1.0 - g*0.45;
	for (int i = 0; i < 4; i++) {
		vec4 st = stains[i]; if (st.w <= 0.0) continue;
		vec3 dd = w - st.xyz; float horiz = length(dd.xz);
		float run = smoothstep(st.w, 0.0, horiz + max(dd.y, 0.0)*2.0 + (afbm(w*3.0)-0.5)*st.w*0.8) * smoothstep(-2.6*st.w-1.2, 0.0, dd.y);
		float edge = smoothstep(0.08, 0.0, abs(run - 0.25)) * 0.5;
		col = mix(col, col*vec3(0.62,0.55,0.42), clamp(run*0.8 + edge, 0.0, 0.9));
	}
	float wt = wet * (1.0 - smoothstep(wet_y, wet_y + 0.01, abs(w.y))) * smoothstep(0.45, 0.6, afbm(w*1.7));
	col *= 1.0 - wt*0.35; age_rough -= wt*0.8;
	ALBEDO = col;
	ROUGHNESS = clamp(rough + age_rough, 0.04, 1.0);
	METALLIC = metallic_f;
	if (use_normal_tex) { NORMAL_MAP = texture(normal_tex, UV).rgb; NORMAL_MAP_DEPTH = normal_scale; }
	if (use_ao_tex) { AO = mix(1.0, texture(ao_tex, UV).r, ao_intensity); AO_LIGHT_AFFECT = 0.5; }
	EMISSION = emission_color * emission_energy;
}
