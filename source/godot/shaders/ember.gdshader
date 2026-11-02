// Port of emberMaterial(): glowing charcoal (object-space noise).
shader_type spatial;
render_mode unshaded;
varying vec3 o_pos;
float h(vec3 p){ return fract(sin(dot(p, vec3(12.9898,78.233,45.164)))*43758.5453); }
float n(vec3 p){ vec3 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f);
	return mix(mix(mix(h(i),h(i+vec3(1,0,0)),f.x),mix(h(i+vec3(0,1,0)),h(i+vec3(1,1,0)),f.x),f.y),mix(mix(h(i+vec3(0,0,1)),h(i+vec3(1,0,1)),f.x),mix(h(i+vec3(0,1,1)),h(i+vec3(1,1,1)),f.x),f.y),f.z); }
void vertex() { o_pos = VERTEX; }
void fragment() {
	float c = n(o_pos*38.0) * n(o_pos*9.0 + vec3(0.0, TIME*0.3, 0.0));
	float glow = smoothstep(0.22, 0.6, c) * (0.6 + 0.4*sin(TIME*3.0 + o_pos.x*40.0));
	vec3 ch = vec3(0.025,0.02,0.018) * (0.5 + n(o_pos*60.0));
	ALBEDO = ch + vec3(1.0,0.28,0.04)*glow*2.5;
}
