# Sets per-asset import parameters (run after a first `godot --headless --import`, then import again).
# Memory policy (§21.4, unified memory): every 3D texture is GPU block-compressed (BC1/BC3/BC5/BC7) with
# mipmaps; normal maps use BC5; art-slice architecture/props capped at 2048, small props 1024 by usage;
# Daniel 2K BC7; The Listener 4K BC7 (key creature). Ambience WAVs loop.
import json, re, os, glob, shutil
os.chdir(os.path.dirname(os.path.abspath(__file__)) + '/..')
d = json.load(open('data/artslice.json'))
uses = {}
for m in d['materials'].values():
    for slot, v in m['maps'].items(): uses.setdefault(v['tex'], set()).add(slot)
def setp(path, kv):
    s = open(path).read()
    for k, v in kv.items():
        if re.search(rf'^{re.escape(k)}=', s, re.M): s = re.sub(rf'^{re.escape(k)}=.*$', f'{k}={v}', s, flags=re.M)
        else: s = s.replace('[params]\n', f'[params]\n\n{k}={v}\n', 1)
    open(path, 'w').write(s)
    for f in glob.glob('.godot/imported/' + os.path.basename(path)[:-7] + '-*'): os.remove(f)
n = 0
for tid, t in d['textures'].items():
    p = f"assets/artslice/tex/{t['file']}.import"
    if not os.path.exists(p): continue
    normal = 'normalMap' in uses.get(tid, set()) or t['slot'] == 'normalMap'
    limit = 2048 if max(t['w'], t['h']) > 1024 else 0
    setp(p, {'compress/mode': 2, 'compress/high_quality': 'false', 'mipmaps/generate': 'true', 'compress/normal_map': 1 if normal else 2,
             'process/size_limit': limit, 'detect_3d/compress_to': 0}); n += 1
for p in glob.glob('assets/characters/**/*.png.import', recursive=True) + glob.glob('assets/listener/*.png.import'):
    normal = 'Normal' in p or '_n.' in p
    setp(p, {'compress/mode': 2, 'compress/high_quality': 'true', 'mipmaps/generate': 'true', 'compress/normal_map': 1 if normal else 2, 'detect_3d/compress_to': 0}); n += 1
for p in glob.glob('assets/audio/gen/*_loop.wav.import'):
    setp(p, {'edit/loop_mode': 2, 'edit/loop_begin': 0, 'edit/loop_end': -1}); n += 1
for p in glob.glob('assets/artslice/*.glb.import'):
    setp(p, {'meshes/generate_lods': 'true', 'meshes/create_shadow_meshes': 'true', 'meshes/ensure_tangents': 'true', 'meshes/light_baking': 0}); n += 1
print('configured', n)
