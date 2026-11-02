# Step 2 of the art-slice export (after tools/export-artslice.mjs): recompress normal maps and
# alpha-free PNGs to JPEG (Godot re-encodes to GPU formats on import, so this only shrinks the repo/zip).
import json, os
from PIL import Image
p = 'godot/data/artslice.json'; d = json.load(open(p)); T = 'godot/assets/artslice/tex/'
for k, v in d['textures'].items():
    if not v['file'].endswith('.png'): continue
    im = Image.open(T + v['file'])
    if im.mode in ('RGBA', 'LA') and im.getchannel('A').getextrema()[0] < 250: continue
    nf = k + '.jpg'; im.convert('RGB').save(T + nf, quality=95 if v['slot'] == 'normalMap' else 92, subsampling=0 if v['slot'] == 'normalMap' else 2)
    os.remove(T + v['file']); v['file'] = nf
json.dump(d, open(p, 'w'), indent=1)
