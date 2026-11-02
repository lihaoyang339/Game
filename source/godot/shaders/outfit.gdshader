// Port of the three.js outfit shader (src/actors/character.js applyOutfit + CIVILIAN outfit):
// clothing regions are evaluated in bind-pose space (CUSTOM0 = bind position, baked at load), so the
// jacket/jeans/boots follow skinning exactly. Cloth inflation, fabric weave micro-normal, seams, dirt,
// zombie decay and dynamic wounds (used by The Listener variant).
shader_type spatial;
render_mode depth_draw_opaque, cull_back;

uniform sampler2D skin_tex : source_color, filter_linear_mipmap_anisotropic, hint_default_white;
uniform sampler2D skin_normal : hint_normal, filter_linear_mipmap_anisotropic;
uniform sampler2D skin_rough : hint_default_white, filter_linear_mipmap;
uniform sampler2D fabric_n : hint_normal, filter_linear_mipmap_anisotropic, repeat_enable;
uniform float fabric_scale = 9.0;
uniform vec3 shirt : source_color = vec3(0.045, 0.042, 0.036);
uniform float shirt_rough = 0.42;
uniform vec3 pants : source_color = vec3(0.075, 0.09, 0.14);
uniform float pants_rough = 0.82;
uniform vec3 boots : source_color = vec3(0.09, 0.06, 0.04);
uniform float boots_rough = 0.55;
uniform vec3 belt : source_color = vec3(0.09, 0.06, 0.04);
uniform float sleeve = 1.0;
uniform float dirt = 0.35;
uniform float bulk = 1.9;
uniform float wetness = 0.25;
uniform vec3 skin_tint = vec3(1.0);
uniform float decay = 0.0;
uniform vec4 wounds[8];
uniform float flash = 0.0;

varying vec3 bind;

float hash13(vec3 p){ p = fract(p*0.1031); p += dot(p, p.zyx+31.32); return fract((p.x+p.y)*p.z); }
float vnoise(vec3 p){ vec3 i=floor(p); vec3 f=fract(p); f=f*f*(3.0-2.0*f);
  return mix(mix(mix(hash13(i),hash13(i+vec3(1,0,0)),f.x),mix(hash13(i+vec3(0,1,0)),hash13(i+vec3(1,1,0)),f.x),f.y),
             mix(mix(hash13(i+vec3(0,0,1)),hash13(i+vec3(1,0,1)),f.x),mix(hash13(i+vec3(0,1,1)),hash13(i+vec3(1,1,1)),f.x),f.y),f.z); }
float fbm(vec3 p){ float a=0.5, s=0.0; for(int i=0;i<4;i++){ s+=a*vnoise(p); p*=2.03; a*=0.5; } return s; }
void regions(vec3 b, float sleeve_len, out vec4 r1, out vec4 r2){
  float ax = abs(b.x);
  float wob = (vnoise(b*14.0)-0.5)*0.012;
  float arm_zone = smoothstep(0.17, 0.21, ax) * smoothstep(1.18, 1.24, b.y);
  float hand_zone = smoothstep(0.682, 0.692, ax + wob*0.3);
  float sleeve_end = mix(0.36, 0.695, sleeve_len);
  float slv = arm_zone * (1.0 - smoothstep(sleeve_end-0.005, sleeve_end+0.005, ax + wob)) * step(1.25, b.y);
  float top_y = 1.565 + 0.05*smoothstep(0.07,0.15,ax) - 0.06*(1.0-smoothstep(0.03,0.075,ax))*smoothstep(-0.02,0.04,b.z) - 0.02*smoothstep(-0.02,0.04,b.z);
  float torso = (1.0-arm_zone) * smoothstep(0.93, 0.95, b.y+wob) * (1.0 - smoothstep(top_y-0.008, top_y, b.y + wob*0.5));
  float sh = clamp(slv + torso, 0.0, 1.0);
  float legs = (1.0-arm_zone) * (1.0 - smoothstep(0.935, 0.95, b.y + wob));
  float bt = legs * (1.0 - smoothstep(0.16, 0.175, b.y + wob*0.5));
  float pn = legs - bt;
  float bl = (1.0-arm_zone) * smoothstep(0.925, 0.93, b.y) * (1.0 - smoothstep(0.985, 0.99, b.y));
  float seam = (1.0 - smoothstep(0.0, 0.006, abs(b.y - 0.17))) * legs + (1.0 - smoothstep(0.0, 0.006, abs(ax - sleeve_end))) * arm_zone * step(1.25, b.y);
  // jacket: open front placket line and hem
  seam += (1.0 - smoothstep(0.0, 0.004, abs(b.x))) * torso * step(0.02, b.z);
  r1 = vec4(sh, pn, bt, hand_zone * step(1.2, b.y));
  r2 = vec4(0.0, bl, clamp(seam, 0.0, 1.0), torso);
}

void vertex() {
	bind = CUSTOM0.xyz;
	vec4 r1; vec4 r2; regions(bind, sleeve, r1, r2);
	float inflate = r1.x*0.006*bulk + r1.y*0.009 + r1.z*0.013 + r2.y*0.012;
	inflate += r1.y * 0.012 * (1.0 - smoothstep(0.0, 0.12, abs(bind.y - 0.86))) * (1.0 - smoothstep(0.0,0.12,abs(bind.x)));
	VERTEX += NORMAL * inflate;
}

void fragment() {
	vec3 b = bind;
	vec4 r1; vec4 r2; regions(b, sleeve, r1, r2);
	float n1 = fbm(b*9.0); float n2 = fbm(b*31.0+7.0); float n3 = vnoise(b*60.0);
	float cloth = clamp(r1.x + r1.y + r1.z + r2.y, 0.0, 1.0);
	vec3 skin = texture(skin_tex, UV).rgb;
	float lum = dot(skin, vec3(0.3,0.59,0.11));
	vec3 zskin = mix(skin, vec3(lum), 0.55*decay) * skin_tint;
	float bruise = smoothstep(0.55, 0.8, fbm(b*7.0+11.0));
	zskin = mix(zskin, zskin*vec3(0.55,0.42,0.55), bruise*decay*0.8);
	float vein = 1.0 - smoothstep(0.0, 0.035, abs(vnoise(b*40.0+2.0)-0.5));
	zskin = mix(zskin, zskin*vec3(0.45,0.5,0.6), vein*0.35*decay);
	skin = zskin;
	vec3 col = skin;
	float fv = 0.85 + 0.3*n2;
	col = mix(col, shirt*fv, r1.x);
	col = mix(col, pants*fv, r1.y);
	col = mix(col, belt, r2.y);
	col = mix(col, boots*(0.8+0.4*n3), r1.z);
	col = mix(col, vec3(0.02), r1.z*(1.0-smoothstep(0.025,0.035,b.y)));
	col *= 1.0 - r2.z*0.45;
	float d = smoothstep(0.45, 0.75, n1) * dirt;
	col = mix(col, col*vec3(0.55,0.5,0.42), d*cloth);
	col = mix(col, col*vec3(0.6,0.55,0.5), (1.0-smoothstep(0.0,0.55,b.y))*dirt*0.6);
	// rain-soaked shoulders / jacket darkening (Daniel walked in from the storm)
	float wet = wetness * cloth * smoothstep(1.1, 1.5, b.y + n1*0.3);
	col *= 1.0 - wet*0.35;
	float wound = 0.0;
	for (int i = 0; i < 8; i++) {
		vec4 w = wounds[i]; if (w.w <= 0.0) continue;
		vec3 dd = b - w.xyz;
		float core = 1.0 - smoothstep(0.0, 0.022*w.w, length(dd));
		float splat = (1.0 - smoothstep(0.0, 0.09*w.w, length(dd*vec3(1.0,0.45,1.0) + vec3(0.0,0.03,0.0)))) * smoothstep(0.35,0.6,vnoise(b*45.0+float(i)));
		float drip = (1.0 - smoothstep(0.0, 0.012, abs(dd.x + (vnoise(b*20.0)-0.5)*0.02))) * step(dd.y, 0.0) * (1.0 - smoothstep(0.0, 0.18*w.w, -dd.y));
		wound = max(wound, max(core, max(splat*0.85, drip*0.8)));
		col = mix(col, vec3(0.02,0.0,0.0), core);
	}
	col = mix(col, vec3(0.18,0.01,0.008), clamp(wound,0.0,1.0)*0.9);
	ALBEDO = col;
	float sr = texture(skin_rough, UV).r;
	float rough = r1.x*shirt_rough + r1.y*pants_rough + r1.z*boots_rough + r2.y*0.45;
	rough = mix(sr, rough, cloth);
	rough = mix(rough, rough*0.6, wet);
	rough = mix(rough, 0.25, clamp(wound, 0.0, 1.0));
	ROUGHNESS = clamp(rough, 0.05, 1.0);
	vec3 skin_n = texture(skin_normal, UV).rgb;
	vec3 fab = texture(fabric_n, UV * fabric_scale).rgb;
	NORMAL_MAP = mix(skin_n, mix(vec3(0.5, 0.5, 1.0), fab, 0.55), cloth);
	NORMAL_MAP_DEPTH = 1.0;
	SSS_STRENGTH = (1.0 - cloth) * 0.25;
	EMISSION = vec3(0.6,0.05,0.02) * flash;
}
