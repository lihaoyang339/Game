// Port of flameMaterial(): additive fireplace flame cards.
shader_type spatial;
render_mode unshaded, blend_add, depth_draw_never, cull_disabled, shadows_disabled;
uniform float level = 1.0;
float h(vec2 p){ return fract(sin(dot(p, vec2(12.9898,78.233)))*43758.5453); }
float n(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f); return mix(mix(h(i),h(i+vec2(1,0)),f.x), mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x), f.y); }
void fragment() {
	vec2 uv = UV; float t = TIME;
	float f = n(vec2(uv.x*5.0, uv.y*3.0 - t*2.4))*0.6 + n(vec2(uv.x*11.0, uv.y*6.0 - t*4.1))*0.4;
	float shape = (1.0 - uv.y*1.25) - abs(uv.x-0.5)*1.6 + f*0.55 - 0.35;
	float a = smoothstep(0.0, 0.25, shape) * level;
	ALBEDO = mix(vec3(0.9,0.18,0.02), vec3(1.0,0.62,0.18), smoothstep(0.1,0.6,shape)) * 3.2 * a;
}
