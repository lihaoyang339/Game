// Port of stormBackdrop(): night sky + swaying tree silhouettes outside the windows, lit by lightning.
shader_type spatial;
render_mode unshaded, cull_disabled, shadows_disabled;
global uniform float storm_flash;
uniform sampler2D map : source_color, filter_linear_mipmap;
void fragment() {
	vec2 uv = UV; uv.x += sin(TIME*0.7 + uv.y*3.0)*0.004*(1.0-uv.y);
	vec3 c = texture(map, uv).rgb;
	float sil = 1.0 - smoothstep(0.0, 0.05, length(c));
	c = c*(0.35 + storm_flash*5.0) + vec3(0.25,0.3,0.45)*storm_flash*(1.0-sil)*0.6;
	ALBEDO = c;
}
