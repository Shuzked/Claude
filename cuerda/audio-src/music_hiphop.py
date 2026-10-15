"""Música de «Cuerda» (antes «Bucal»): hip hop de gimnasio (boom bap duro, 90 BPM).

Bombo con cuerpo y golpe, caja seca con palmada, charles con swing, 808 que sigue
la progresión menor y un riff oscuro de piano/pluck. Intro filtrada en el hook y
entrada completa en DROP (el «Pues ojo»). Todo sintetizado aquí, sin samples.

    python3 audio-src/music_hiphop.py music.wav DURACION DROP
"""
import sys

import numpy as np
from scipy.io import wavfile
from scipy.signal import butter, sosfilt

SR = 48000
LENGTH = float(sys.argv[2]) if len(sys.argv) > 2 else 80.0
DROP = float(sys.argv[3]) if len(sys.argv) > 3 else 4.0
N = int(LENGTH * SR)
BPM = 90
BEAT = 60 / BPM
STEP = BEAT / 4
SWING = 0.18  # retraso de las semicorcheas pares
rng = np.random.default_rng(23)
L = np.zeros(N)
R = np.zeros(N)


def note(m):
    return 440.0 * 2 ** ((m - 69) / 12)


def filt(x, f, kind="low", order=2):
    return sosfilt(butter(order, f, btype=kind, fs=SR, output="sos"), x)


def add(x, t0, g=1.0, pan=0.0):
    s = int(t0 * SR)
    if s >= N or s < 0:
        return
    e = min(N, s + len(x))
    L[s:e] += x[: e - s] * g * np.sqrt((1 - pan) / 2)
    R[s:e] += x[: e - s] * g * np.sqrt((1 + pan) / 2)


def tt(d):
    return np.arange(int(d * SR)) / SR


# --- instrumentos -------------------------------------------------------------
def kick():
    t = tt(0.45)
    f = 48 + 110 * np.exp(-t * 32)
    body = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 7)
    click = filt(rng.standard_normal(len(t)), 2500, "high") * np.exp(-t * 300) * 0.4
    return np.tanh(2.2 * (body + click))


def snare():
    t = tt(0.32)
    tone = np.sin(2 * np.pi * 190 * t) * np.exp(-t * 30) * 0.6
    noise = filt(rng.standard_normal(len(t)), [1200, 9000], "band") * np.exp(-t * 16)
    clap = np.zeros(len(t))
    for d in (0.0, 0.011, 0.022):
        s = int(d * SR)
        clap[s:] += filt(rng.standard_normal(len(t) - s), [900, 5000], "band") * np.exp(-t[: len(t) - s] * 45)
    return np.tanh(1.6 * (tone + noise + 0.6 * clap))


def hat(open_=False):
    t = tt(0.25 if open_ else 0.06)
    x = filt(rng.standard_normal(len(t)), 7000, "high")
    return x * np.exp(-t * (14 if open_ else 70))


def bass808(m, d):
    t = tt(d)
    f = note(m) * (1 + 0.5 * np.exp(-t * 40))
    x = np.sin(2 * np.pi * np.cumsum(f) / SR)
    env = np.minimum(1, t / 0.005) * np.exp(-t * 0.9) * np.minimum(1, (d - t) / 0.03)
    return np.tanh(1.8 * x) * env


def pluck(m, d=0.5):
    t = tt(d)
    f = note(m)
    x = sum(np.sin(2 * np.pi * f * k * t) / k ** 1.4 for k in range(1, 6))
    return filt(x * np.exp(-t * 6), 3200) * np.minimum(1, t / 0.003)


def pad(ch, d):
    t = tt(d)
    x = sum(
        np.sin(2 * np.pi * note(m) * t * (1 + det)) for m in ch for det in (-0.003, 0.003)
    )
    env = np.minimum(1, t / 0.4) * np.minimum(1, (d - t) / 0.4)
    return filt(x * env, 1400) / (len(ch) * 2)


K, S, H, HO = kick(), snare(), hat(), hat(True)

# progresión menor oscura (Am – F – C – E), 1 compás cada acorde
prog = [(45, [57, 60, 64]), (41, [53, 57, 60]), (48, [55, 60, 64]), (40, [56, 59, 64])]
riff = [69, 72, 76, 72, 71, 72, 69, 67]  # sobre el primer compás, se transpone

# patrón de bombo (16 pasos) y 808 (posiciones donde suena)
KICK = [0, 7, 10]
KICK_B = [0, 3, 7, 10, 14]
BAR = 4 * BEAT
bars = int(LENGTH / BAR) + 2
drop_bar = int(DROP / BAR + 0.5)
offset = DROP - drop_bar * BAR  # el compás del drop empieza exactamente en DROP

for b in range(bars):
    t0 = offset + b * BAR
    root, ch = prog[b % 4]
    full = b >= drop_bar
    # pad siempre (en el intro es lo único, con el bombo apagado)
    add(pad(ch, BAR), t0, 0.22 if full else 0.3)
    # riff de pluck cada dos compases
    if b % 2 == 0:
        shift = root - 45
        for i, m in enumerate(riff):
            add(pluck(m + shift - 12 if m + shift > 76 else m + shift), t0 + i * BEAT / 2, 0.16 if full else 0.1, pan=-0.3 + 0.6 * (i % 2))
    if not full:
        # intro: charles suaves anticipando
        for s in range(0, 16, 2):
            add(H, t0 + s * STEP, 0.08, pan=0.3)
        continue
    pattern = KICK_B if b % 4 == 3 else KICK
    for s in pattern:
        add(K, t0 + s * STEP, 0.9)
    for s in (4, 12):
        add(S, t0 + s * STEP, 0.55)
    for s in range(16):
        sw = SWING * STEP if s % 2 else 0
        if s in (6, 14) and b % 2:
            add(HO, t0 + s * STEP + sw, 0.12, pan=0.25)
        else:
            add(H, t0 + s * STEP + sw, 0.14 if s % 4 == 2 else 0.09, pan=0.25)
    # 808 con el bombo
    for i, s in enumerate(pattern):
        nxt = pattern[i + 1] if i + 1 < len(pattern) else 16
        add(bass808(root - 12 + (12 if s == 10 and b % 2 else 0), (nxt - s) * STEP), t0 + s * STEP, 0.5)

# golpe de entrada en el drop
add(K, DROP, 0.6)
mix = np.stack([L, R], 1)
mix = filt(mix.T, 30, "high").T  # sin subgraves inútiles
fade = np.minimum(1, np.arange(N) / (0.02 * SR))[:, None]
mix *= fade
mix = np.tanh(mix / (np.max(np.abs(mix)) + 1e-9) * 1.4) * 0.85
wavfile.write(sys.argv[1], SR, (mix * 32767).astype(np.int16))
print("ok", LENGTH, "drop", DROP)
