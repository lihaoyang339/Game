# Procedurally synthesised ambience/SFX for the Godot port (no third-party audio, so no licence terms).
# Writes 16-bit mono WAVs to assets/audio/gen/. Deterministic (fixed seeds).
import numpy as np, scipy.signal as sg, scipy.io.wavfile as wf, os
SR = 44100; OUT = 'assets/audio/gen'; os.makedirs(OUT, exist_ok=True)
def norm(x, peak=0.9): return (x / (np.max(np.abs(x)) + 1e-9) * peak)
def save(name, x, loop_xfade=0):
    if loop_xfade:  # seamless loop: crossfade tail into head
        n = loop_xfade; head = x[:n].copy(); tail = x[-n:]; w = np.linspace(0, 1, n)
        x = x[:-n].copy(); x[:n] = head * w + tail * (1 - w)
    wf.write(f'{OUT}/{name}.wav', SR, (norm(x) * 32767).astype(np.int16))
def bp(x, lo, hi, order=2): return sg.sosfilt(sg.butter(order, [lo, hi], 'band', fs=SR, output='sos'), x)
def lp(x, f, order=2): return sg.sosfilt(sg.butter(order, f, 'low', fs=SR, output='sos'), x)
def hp(x, f, order=2): return sg.sosfilt(sg.butter(order, f, 'high', fs=SR, output='sos'), x)
rng = np.random.default_rng(7)
# rain: broadband hiss + dense droplet ticks + gutter gurgle, 12 s seamless loop
n = SR * 12 + SR
hiss = bp(rng.normal(size=n), 600, 9000) * 0.5 + lp(rng.normal(size=n), 400) * 0.35
ticks = np.zeros(n); idx = rng.integers(0, n - 400, 9000)
for i in idx:
    l = rng.integers(60, 300); a = rng.uniform(0.05, 0.6); ticks[i:i + l] += a * np.exp(-np.arange(l) / (l / 5)) * rng.normal(size=l)
rain = hiss + hp(ticks, 1200) * 0.8
rain *= 1 + 0.15 * np.sin(np.arange(n) / SR * 2 * np.pi * 0.11)
save('rain_loop', rain, loop_xfade=SR)
# thunder x3: low rumble bursts with crackle onset, 6-9 s
for k in range(3):
    r = np.random.default_rng(100 + k); d = int(SR * r.uniform(6, 9)); t = np.arange(d) / SR
    env = np.zeros(d)
    for _ in range(r.integers(4, 8)):
        c = r.uniform(0.0, 2.5); w = r.uniform(0.4, 1.8); env += r.uniform(0.4, 1.0) * np.exp(-((t - c) / w) ** 2) * (t > c - w)
    env += np.exp(-t / 2.5) * 0.6; env *= np.minimum(1, t / 0.05)
    rumble = lp(r.normal(size=d), 120, 4) * 3 + lp(r.normal(size=d), 400) * 0.6
    crack = hp(r.normal(size=d), 2000) * np.exp(-t / 0.25) * 0.5
    save(f'thunder_{k}', rumble * env + crack)
# wind: slowly modulated band noise (loop)
n = SR * 16 + SR; t = np.arange(n) / SR; x = rng.normal(size=n)
wind = bp(x, 180, 900) * (0.6 + 0.4 * np.sin(2 * np.pi * 0.07 * t) * np.sin(2 * np.pi * 0.023 * t + 1))
save('wind_loop', wind, loop_xfade=SR)
# listener vocalisations: wet clicks (echolocation-like) and a low breath
for k in range(4):
    r = np.random.default_rng(300 + k); d = int(SR * 1.4); out = np.zeros(d)
    for j in range(r.integers(3, 7)):
        p = int(r.uniform(0.0, 1.1) * SR); l = int(SR * 0.012)
        f = r.uniform(1800, 3200); tt = np.arange(l) / SR
        out[p:p + l] += np.sin(2 * np.pi * f * tt) * np.exp(-tt / 0.003) * r.uniform(0.5, 1)
    out = bp(out, 900, 6000) + bp(r.normal(size=d), 300, 1500) * 0.03
    save(f'listener_click_{k}', out)
for k in range(3):
    r = np.random.default_rng(400 + k); d = int(SR * 2.4); t = np.arange(d) / SR
    env = np.sin(np.pi * np.clip(t / 2.2, 0, 1)) ** 2
    br = bp(r.normal(size=d), 120 + 40 * k, 700) * env + np.sin(2 * np.pi * (55 + 8 * k) * t) * 0.15 * env
    save(f'listener_breath_{k}', br)
# knife swing + flesh hit, punch/shove whoosh
d = int(SR * 0.35); t = np.arange(d) / SR
save('whoosh', bp(rng.normal(size=d), 500, 3000) * np.sin(np.pi * t / t[-1]) ** 3)
print(sorted(os.listdir(OUT)))
