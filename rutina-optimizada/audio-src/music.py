"""Música del vídeo: electrónica con ritmo todo el rato (127 BPM).

Secciones: intro con toda la energía en el hook, groove A, groove B con arpegio,
subida con redoble y drop justo en el CTA. Todo sintetizado aquí (sin samples).

    python3 audio-src/music.py public/audio/music.wav
"""
import sys

import numpy as np
from scipy.io import wavfile
from scipy.signal import butter, sosfilt

SR = 48000
BPM = 127.27
BEAT = 60 / BPM
BAR = 4 * BEAT
INTRO_BARS = 7
SWITCH = INTRO_BARS * BAR  # ≈ 13,2 s: fin de «drop sets» en el vídeo recortado
LENGTH = 64.6
N = int(LENGTH * SR)
rng = np.random.default_rng(11)

L = np.zeros(N)
R = np.zeros(N)


def tt(sec):
    return np.arange(int(sec * SR)) / SR


def note(m):
    return 440.0 * 2 ** ((m - 69) / 12)


def lp(x, f, o=2):
    return sosfilt(butter(o, f, btype="low", fs=SR, output="sos"), x)


def hp(x, f, o=2):
    return sosfilt(butter(o, f, btype="high", fs=SR, output="sos"), x)


def bpf(x, lo, hi, o=2):
    return sosfilt(butter(o, [lo, hi], btype="band", fs=SR, output="sos"), x)


def decay(n, tau):
    return np.exp(-np.arange(n) / SR / tau)


def add(x, at, gain=1.0, pan=0.0):
    s = int(at * SR)
    if s >= N or s < 0:
        return
    e = min(N, s + len(x))
    lg = gain * np.sqrt((1 - pan) / 2)
    rg = gain * np.sqrt((1 + pan) / 2)
    L[s:e] += x[: e - s] * lg
    R[s:e] += x[: e - s] * rg


# --- Instrumentos -------------------------------------------------------------

def kick(punch=1.0):
    x = tt(0.42)
    f = 46 + 120 * np.exp(-x * 34)
    body = np.sin(2 * np.pi * np.cumsum(f) / SR) * decay(len(x), 0.16)
    click = hp(rng.standard_normal(len(x)), 3000) * decay(len(x), 0.004) * 0.35 * punch
    return np.tanh((body + click) * 1.6)


def soft_kick():
    x = tt(0.4)
    f = 44 + 60 * np.exp(-x * 25)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * decay(len(x), 0.18)


def clap():
    n = int(0.3 * SR)
    noise = bpf(rng.standard_normal(n), 900, 5000)
    env = np.zeros(n)
    for k, d in enumerate([0, 0.011, 0.022]):
        s = int(d * SR)
        env[s:] += decay(n - s, 0.008 if k < 2 else 0.09)
    return noise * env * 0.8


def rim():
    x = tt(0.12)
    tone = np.sin(2 * np.pi * 1700 * x) * decay(len(x), 0.012)
    nz = bpf(rng.standard_normal(len(x)), 2000, 7000) * decay(len(x), 0.02)
    return tone * 0.6 + nz * 0.5


def hat(open_=False):
    n = int((0.25 if open_ else 0.06) * SR)
    return hp(rng.standard_normal(n), 7500) * decay(n, 0.07 if open_ else 0.015)


def stab(midis, dur=0.18):
    x = tt(dur)
    s = np.zeros(len(x))
    for m in midis:
        for d in (-0.1, 0.1):
            ph = 2 * np.pi * note(m) * 2 ** (d / 12) * x
            s += 2 * (ph / (2 * np.pi) % 1) - 1  # sierra
    return lp(s, 2600) * decay(len(x), 0.07) * 0.3


def pluck_bass(m, dur):
    x = tt(dur)
    saw = 2 * (note(m) * x % 1) - 1
    cut = 300 + 1500 * np.exp(-x * 25)
    out = np.zeros(len(x))
    # filtro que se cierra: aproximado por bloques
    blk = 480
    for i in range(0, len(x), blk):
        out[i : i + blk] = lp(saw[max(0, i - 2000) : i + blk], float(cut[i]))[-len(saw[i : i + blk]) :]
    return out * decay(len(x), 0.25)


def sub(m, dur):
    x = tt(dur)
    e = np.minimum(1, x / 0.02) * np.minimum(1, (dur - x) / 0.05)
    return np.sin(2 * np.pi * note(m) * x) * e


def rhodes(midis, dur):
    x = tt(dur)
    s = np.zeros(len(x))
    for m in midis:
        f = note(m)
        mod = np.sin(2 * np.pi * f * 1.0 * x) * 1.3 * decay(len(x), 0.6)
        s += np.sin(2 * np.pi * f * x + mod) * decay(len(x), 1.6)
    trem = 1 + 0.12 * np.sin(2 * np.pi * 4.2 * x)
    attack = np.minimum(1, x / 0.006)
    return lp(s * trem * attack, 3500) * 0.22


def arp_note(m, dur=0.12):
    x = tt(dur)
    sq = np.sign(np.sin(2 * np.pi * note(m) * x))
    return lp(sq, 3000) * decay(len(x), 0.05) * 0.18


def noise_sweep(dur, up=True):
    n = int(dur * SR)
    nz = rng.standard_normal(n)
    out = np.zeros(n)
    blk = 960
    for i in range(0, n, blk):
        p = i / n if up else 1 - i / n
        f = 400 + 7000 * p**2
        seg = nz[max(0, i - 2000) : i + blk]
        out[i : i + blk] = bpf(seg, f * 0.7, min(f * 1.4, 20000))[-len(nz[i : i + blk]) :]
    vol = np.linspace(0, 1, n) ** 2 if up else np.linspace(1, 0, n) ** 2
    return out * vol


# --- Intro: house rítmico ---------------------------------------------------
intro_prog = [[57, 60, 64, 67], [53, 57, 60, 64], [48, 52, 55, 59], [55, 59, 62, 65]]  # Am7 Fmaj7 Cmaj7 G7
pump_env = np.ones(N)

for b in range(INTRO_BARS):
    t0 = b * BAR
    chord = intro_prog[b % 4]
    for k in range(4):
        beat = t0 + k * BEAT
        add(kick(), beat, 0.95)
        # bombeo (sidechain) para bajo, acordes y arpegio
        s = int(beat * SR)
        e = min(N, s + int(BEAT * SR))
        ramp = np.linspace(0, 1, e - s) ** 0.5
        pump_env[s:e] = np.minimum(pump_env[s:e], 0.35 + 0.65 * ramp)
        add(hat(open_=True), beat + BEAT / 2, 0.22, pan=0.25)
        for q in range(4):
            add(hat(), beat + q * BEAT / 4, 0.09 if q % 2 else 0.05, pan=-0.3)
        if k in (1, 3):
            add(clap(), beat, 0.5)
    # el último compás hace redoble de palmas
    if b == INTRO_BARS - 1:
        for q in range(8):
            add(clap(), t0 + 2 * BEAT + q * BEAT / 4, 0.18 + 0.04 * q)

# capas melódicas con bombeo, en buffers aparte
mel_L = np.zeros(N)
mel_R = np.zeros(N)


def add_mel(x, at, gain=1.0, pan=0.0):
    s = int(at * SR)
    if s >= N:
        return
    e = min(N, s + len(x))
    mel_L[s:e] += x[: e - s] * gain * np.sqrt((1 - pan) / 2)
    mel_R[s:e] += x[: e - s] * gain * np.sqrt((1 + pan) / 2)


arp = [0, 2, 3, 2, 1, 3, 2, 0]
for b in range(INTRO_BARS):
    t0 = b * BAR
    chord = intro_prog[b % 4]
    root = chord[0] - 24
    for k in range(8):
        # bajo a contratiempo
        if k % 2 == 1:
            add_mel(pluck_bass(root, BEAT * 0.45), t0 + k * BEAT / 2, 0.5)
        # acordes cortos en las corcheas a contratiempo
        if k in (1, 4, 6):
            add_mel(stab([m + 12 for m in chord[1:]]), t0 + k * BEAT / 2, 0.9, pan=0.15)
    for q in range(16):
        add_mel(arp_note(chord[arp[q % 8]] + 24), t0 + q * BEAT / 4, 0.7, pan=-0.2 if q % 2 else 0.2)

intro_end = int(SWITCH * SR)
mel_L[:intro_end] *= pump_env[:intro_end]
mel_R[:intro_end] *= pump_env[:intro_end]
L += mel_L
R += mel_R

# subida de ruido en el último compás y bajada tras el cambio
add(noise_sweep(BAR, up=True), SWITCH - BAR, 0.14)
add(noise_sweep(2 * BAR, up=False), SWITCH, 0.12)

# --- Grooves con ritmo hasta el final ----------------------------------------
GROOVE_A_END = 20 * BAR  # ≈ 37,7 s
BUILD_START = 30 * BAR  # ≈ 56,6 s
DROP = 32 * BAR  # ≈ 60,4 s: entra el CTA

groove_prog = [[57, 60, 64, 67], [53, 57, 60, 64], [48, 52, 55, 59], [55, 59, 62, 65]]
g_mel_L = np.zeros(N)
g_mel_R = np.zeros(N)


def add_g(x, at, gain=1.0, pan=0.0):
    s = int(at * SR)
    if s >= N:
        return
    e = min(N, s + len(x))
    g_mel_L[s:e] += x[: e - s] * gain * np.sqrt((1 - pan) / 2)
    g_mel_R[s:e] += x[: e - s] * gain * np.sqrt((1 + pan) / 2)


pump2 = np.ones(N)
b = INTRO_BARS
while b * BAR < LENGTH:
    t0 = b * BAR
    chord = groove_prog[b % 4]
    root = chord[0] - 24
    building = BUILD_START <= t0 < DROP
    dropped = t0 >= DROP
    section_b = t0 >= GROOVE_A_END
    for k in range(4):
        beat = t0 + k * BEAT
        add(kick(), beat, 0.9 if not building else 0.8)
        s0 = int(beat * SR)
        e0 = min(N, s0 + int(BEAT * SR))
        if s0 < N:
            pump2[s0:e0] = np.minimum(pump2[s0:e0], 0.4 + 0.6 * np.linspace(0, 1, e0 - s0) ** 0.5)
        add(hat(open_=True), beat + BEAT / 2, 0.18, pan=0.25)
        for q in range(4):
            add(hat(), beat + q * BEAT / 4, 0.08 if q % 2 else 0.045, pan=-0.3)
        if k in (1, 3) and not building:
            add(clap(), beat, 0.45)
        # percusión extra en el groove B y en el drop
        if (section_b or dropped) and k in (0, 2):
            add(rim(), beat + 0.75 * BEAT, 0.16, pan=0.4)
    # redoble de subida
    if building:
        steps = 8 if t0 < BUILD_START + BAR else 16
        for q in range(steps):
            add(clap(), t0 + q * BAR / steps, 0.12 + 0.25 * q / steps)
    # bajo, acordes y arpegio
    cut = 1700 if not (section_b or dropped) else 2600
    for k in range(8):
        if k % 2 == 1:
            add_g(pluck_bass(root, BEAT * 0.45), t0 + k * BEAT / 2, 0.55)
        if k in (1, 4, 6):
            add_g(lp(stab([m + 12 for m in chord[1:]]), cut), t0 + k * BEAT / 2, 0.85, pan=0.15)
    if section_b or dropped:
        for q in range(16):
            add_g(arp_note(chord[arp[q % 8]] + 24), t0 + q * BEAT / 4, 0.6 if not dropped else 0.75, pan=-0.2 if q % 2 else 0.2)
    b += 1

g_start = int(SWITCH * SR)
g_mel_L[g_start:] *= pump2[g_start:]
g_mel_R[g_start:] *= pump2[g_start:]
L += g_mel_L
R += g_mel_R

# subidas de ruido: hacia el groove B y hacia el drop del CTA
add(noise_sweep(BAR, up=True), GROOVE_A_END - BAR, 0.08)
add(noise_sweep(2 * BAR, up=True), DROP - 2 * BAR, 0.16)
add(noise_sweep(2 * BAR, up=False), DROP, 0.1)

# Entrada y salida
fade = int(2.5 * SR)
for ch in (L, R):
    ch[:400] *= np.linspace(0, 1, 400)
    ch[-fade:] *= np.linspace(1, 0, fade)

mix = np.stack([L, R], axis=1)
mix = np.tanh(mix * 1.1) / np.tanh(1.1)
mix = mix / (np.max(np.abs(mix)) + 1e-9) * 0.9
out = sys.argv[1] if len(sys.argv) > 1 else "music.wav"
wavfile.write(out, SR, (mix * 32767).astype(np.int16))
print("ok", out, f"SWITCH={SWITCH:.3f}s")
