# Measures native ground speed of locomotion clips from Quaternius UAL *_RM.glb (root motion baked on bone "root").
import json, struct, sys, math
def load(p):
    b = open(p, 'rb').read(); jl = struct.unpack('<I', b[12:16])[0]; j = json.loads(b[20:20 + jl])
    off = 20 + jl; bl = struct.unpack('<I', b[off:off + 4])[0]; bin_ = b[off + 8:off + 8 + bl]; return j, bin_
def acc(j, bin_, i):
    a = j['accessors'][i]; v = j['bufferViews'][a['bufferView']]; n = {'SCALAR': 1, 'VEC3': 3, 'VEC4': 4}[a['type']]
    o = v.get('byteOffset', 0) + a.get('byteOffset', 0); s = v.get('byteStride', 4 * n)
    return [struct.unpack_from('<%df' % n, bin_, o + k * s) for k in range(a['count'])]
out = {}
for p in sys.argv[1:]:
    j, bin_ = load(p); names = {i: nd.get('name') for i, nd in enumerate(j['nodes'])}
    for an in j['animations']:
        for ch in an['channels']:
            if names[ch['target']['node']] == 'root' and ch['target']['path'] == 'translation':
                smp = an['samplers'][ch['sampler']]; t = acc(j, bin_, smp['input']); v = acc(j, bin_, smp['output'])
                dur = t[-1][0] - t[0][0]
                if dur <= 0: continue
                d = [v[-1][k] - v[0][k] for k in range(3)]
                horiz = math.hypot(d[0], d[2]) if abs(d[1]) < abs(d[2]) or True else 0
                out[an['name']] = {'duration': round(dur, 4), 'delta': [round(x, 4) for x in d], 'speed': round(math.hypot(d[0], d[1], d[2]) / dur, 4)}
json.dump(out, sys.stdout, indent=1)
