# Generates ASSETS.md (provenance + license record) from the download manifests.
import json, os
m = json.load(open('assets_src/polyhaven/manifest.json'))
used = set(f[:-4] for f in os.listdir('public/assets/models')) | set(os.listdir('public/assets/textures'))
L = ['# Asset provenance & licenses', '',
     'All third-party assets in this project are **CC0 1.0 (public domain)**. Every downloaded file was',
     'verified against the publisher\'s MD5 (Poly Haven API) before use, converted to GLB/WebP by',
     '`tools/build-assets.mjs`, and checked by `tools/validate-models.mjs` (index ranges, finite positions,',
     'normals/UVs, plausible real-world bounds) and visually in `docs/asset-contact-sheet.jpg`.', '',
     '## Characters & animation (Quaternius, CC0)', '',
     '| Asset | Source | License |', '|---|---|---|',
     '| Universal Base Characters (Standard) — male/female bodies, hair, eyebrows | https://quaternius.itch.io/universal-base-characters | CC0 1.0 |',
     '| Universal Animation Library (Standard) — idle/walk/jog clips | https://quaternius.itch.io/universal-animation-library | CC0 1.0 |',
     '| Universal Animation Library 2 (Standard) | https://quaternius.itch.io/universal-animation-library-2 | CC0 1.0 |', '',
     'The base bodies ship with two broken texture URIs (`*_png.png`), patched during import. Clothing is not a',
     'separate mesh: the outfit shader + bind-pose smoothing in `src/actors/character.js` / `clothsim.js` paints it.', '',
     '## Poly Haven (CC0) — models, textures, HDRI', '', 'Source: https://polyhaven.com — license: CC0 1.0.', '',
     '| Type | ID | Name | Authors | Resolution | Page |', '|---|---|---|---|---|---|']
for a in m['assets']:
    if a['id'] not in used and a['type'] != 'hdri': continue
    L.append(f"| {a['type']} | `{a['id']}` | {a.get('name','')} | {', '.join(a.get('authors', []))} | {a['res']} | {a['url']} |")
L += ['', '## Rejected assets', '',
      '| Asset | Reason |', '|---|---|',
      '| `vintage_grandfather_clock_01` (Poly Haven) | Published `.bin` fails its own MD5 and is 128 bytes short of the glTF `byteLength`; GPU read out-of-range data and rendered long spikes in the foyer. Removed; a Gothic hall chair took its place. |',
      '| `decorative_book_set_01` (Poly Haven) | Texture-only set (no glTF). Books are built procedurally (`bookRow` in `src/world/fixtures.js`) with a generated spine atlas. |',
      '', '## Procedural / generated in code (original to this project)', '',
      '- Architectural trim (baseboard, chair rail, crown, picture rail, casings) extruded from profile curves — `src/world/arch.js`.',
      '- Raised-panel wainscoting, coffered/beamed ceilings, door joinery, sash windows, velvet curtains, marble chimneypieces with ember/flame shaders, Persian rug weaves, book spines, bell board, pedestal desk, dining table with turned legs, library bookcases, kitchen range, stone sink, conservatory ironwork — `src/world/fixtures.js`, `src/world/furniture.js`, `src/rooms/*.js`.',
      '- Wallpaper (Victorian stripe & sprig), house plan drawing, letters/papers, footprints, soot, storm backdrop — canvas textures generated at runtime.']
open('ASSETS.md', 'w').write('\n'.join(L) + '\n')
print(len(L), 'lines')
