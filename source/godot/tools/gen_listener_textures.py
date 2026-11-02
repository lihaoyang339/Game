# Procedural 4K PBR skin set for The Listener (albedo / normal / roughness / AO, 4096x4096, deterministic).
# Pale, translucent, stretched skin with dark vein networks, wet patches and fine wrinkles.
import numpy as np
from PIL import Image
N = 4096; rng = np.random.default_rng(1887)
def up(a, n=N):  # bicubic-ish upsample of a coarse grid to NxN (tileable)
    im = Image.fromarray(a.astype(np.float32), mode='F').resize((n, n), Image.BICUBIC); return np.asarray(im, dtype=np.float32)
def fbm(oct=7, base=8, gain=0.55):
    s = np.zeros((N, N), np.float32); a = 1.0; tot = 0
    for o in range(oct):
        g = base * 2 ** o
        if g > N // 2: break
        s += a * up(rng.random((g, g)).astype(np.float32)); tot += a; a *= gain
    return s / tot
def ridge(n): return 1.0 - np.abs(n * 2 - 1)
mott = fbm(7, 6); fine = fbm(5, 64, 0.6); veins = ridge(fbm(6, 10, 0.5)) ** 9; veins2 = ridge(fbm(6, 24, 0.5)) ** 14
wrink = ridge(fbm(4, 160, 0.5)) ** 4
pale = np.array([0.66, 0.67, 0.66]); bruise = np.array([0.36, 0.32, 0.40]); vein_c = np.array([0.18, 0.22, 0.30])
alb = pale[None, None, :] * (0.8 + 0.25 * mott[..., None])
alb = alb * (1 - 0.35 * np.clip((mott - 0.55) * 4, 0, 1)[..., None]) + bruise * 0.35 * np.clip((mott - 0.55) * 4, 0, 1)[..., None]
alb = alb * (1 - (0.55 * veins + 0.35 * veins2)[..., None]) + vein_c * (0.55 * veins + 0.35 * veins2)[..., None]
alb *= (0.92 + 0.08 * fine)[..., None]
Image.fromarray((np.clip(alb, 0, 1) ** (1 / 1.0) * 255).astype(np.uint8)).save('assets/listener/listener_albedo.png', optimize=True)
h = 0.6 * mott + 0.25 * fine + 0.35 * veins + 0.15 * veins2 - 0.3 * wrink
gy, gx = np.gradient(h); s = 18.0
nx, ny, nz = -gx * s * N / 512, gy * s * N / 512, np.ones_like(h)
l = np.sqrt(nx * nx + ny * ny + nz * nz); nrm = np.stack([nx / l, ny / l, nz / l], -1) * 0.5 + 0.5
Image.fromarray((nrm * 255).astype(np.uint8)).save('assets/listener/listener_normal.png', optimize=True)
wet = np.clip((fbm(5, 12) - 0.45) * 3, 0, 1)
rough = np.clip(0.55 - 0.35 * wet + 0.15 * fine + 0.1 * wrink, 0.08, 1)
ao = np.clip(1 - 0.45 * wrink - 0.3 * veins, 0, 1)
Image.fromarray((np.stack([ao, rough, np.zeros_like(ao)], -1) * 255).astype(np.uint8)).save('assets/listener/listener_orm.png', optimize=True)
print('ok', N)
