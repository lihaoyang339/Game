// Port of rainGlassMaterial() (src/world/fixtures.js): running droplets + static beads, lit by lightning.
shader_type spatial;
render_mode unshaded, blend_mix, depth_draw_never, cull_disabled, shadows_disabled;
global uniform float storm_flash;
varying vec3 w_pos;
float h(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7)))*43758.5453); }
void vertex() { w_pos = (MODEL_MATRIX * vec4(VERTEX, 1.0)).xyz; }
void fragment() {
	vec2 uv = w_pos.xy + vec2(w_pos.z, 0.0);
	vec2 g = uv*vec2(26.0, 6.0); vec2 id = floor(g); float r = h(id.xx);
	float y = fract(g.y + TIME*(0.35+r*0.6) + r*7.0);
	float x = fract(g.x) - 0.5 + sin(g.y*4.0 + r*6.0)*0.08;
	float head = smoothstep(0.08, 0.0, length(vec2(x*1.6, (y-0.9)*0.9)));
	float trail = smoothstep(0.035, 0.0, abs(x)) * smoothstep(0.9, 0.2, y) * 0.35 * step(0.6, r);
	vec2 b = uv*48.0; vec2 bi = floor(b); float br = h(bi);
	float bead = step(0.82, br) * smoothstep(0.22, 0.0, length(fract(b)-0.5 - (br-0.5)*0.3));
	float wt = clamp(head + trail + bead*0.7, 0.0, 1.0);
	vec3 base = vec3(0.025, 0.03, 0.04);
	ALBEDO = base + vec3(0.45,0.5,0.6)*wt*(0.15 + storm_flash*1.2) + vec3(0.7,0.75,0.9)*storm_flash*0.25;
	ALPHA = 0.35 + wt*0.35 + storm_flash*0.2;
}
