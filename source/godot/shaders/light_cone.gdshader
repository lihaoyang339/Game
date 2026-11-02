// Port of lightConeMaterial(): additive volumetric shaft with drifting dust; brightens with lightning.
shader_type spatial;
render_mode unshaded, blend_add, depth_draw_never, cull_back, shadows_disabled;
global uniform float storm_flash;
uniform vec3 color : source_color = vec3(0.87, 0.91, 1.0);
uniform float strength = 0.12;
uniform float flash_gain = 0.35;
varying vec3 w_pos;
varying float vh;
float h(vec3 p){ return fract(sin(dot(p, vec3(12.9898,78.233,37.719)))*43758.5453); }
float n3(vec3 p){ vec3 i=floor(p); vec3 f=fract(p); f=f*f*(3.0-2.0*f);
	return mix(mix(mix(h(i),h(i+vec3(1,0,0)),f.x),mix(h(i+vec3(0,1,0)),h(i+vec3(1,1,0)),f.x),f.y),mix(mix(h(i+vec3(0,0,1)),h(i+vec3(1,0,1)),f.x),mix(h(i+vec3(0,1,1)),h(i+vec3(1,1,1)),f.x),f.y),f.z); }
void vertex() { w_pos = (MODEL_MATRIX * vec4(VERTEX, 1.0)).xyz; vh = UV.y; }
void fragment() {
	float f = pow(abs(dot(normalize(NORMAL), normalize(VIEW))), 2.2);
	float fd = pow(vh, 1.4) * smoothstep(0.0, 0.12, 1.0 - vh);
	float d = 0.7 + 0.6*n3(w_pos*2.2 + vec3(0.0, TIME*0.15, TIME*0.05));
	ALBEDO = color * f * fd * (strength + storm_flash*flash_gain) * d;
}
