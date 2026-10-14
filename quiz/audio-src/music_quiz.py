"""Música del quiz: misterio suave (pad menor, bajo pulsante, campanitas y un
pulso ligero de reloj). Va por debajo de la voz; sube un poco en las pausas.

    python3 audio-src/music_quiz.py music.wav DURACION
"""
import sys

import numpy as np
from scipy.io import wavfile
from scipy.signal import butter, sosfilt

SR = 48000
LENGTH = float(sys.argv[2]) if len(sys.argv) > 2 else 125.0
N = int(LENGTH * SR)
BPM = 92
BEAT = 60 / BPM
rng = np.random.default_rng(7)
L = np.zeros(N)
R = np.zeros(N)


def note(m):
    return 440.0 * 2 ** ((m - 69) / 12)


def lp(x, f):
    return sosfilt(butter(2, f, btype="low", fs=SR, output="sos"), x)


def add(x, t0, g=1.0, pan=0.0):
    s = int(t0 * SR)
    if s >= N:
        return
    e = min(N, s + len(x))
    L[s:e] += x[: e - s] * g * np.sqrt((1 - pan) / 2)
    R[s:e] += x[: e - s] * g * np.sqrt((1 + pan) / 2)


# progresión menor misteriosa (Am – F – Dm – E)
prog = [[57, 60, 64], [53, 57, 60], [50, 53, 57], [52, 56, 59]]
bar = 4 * BEAT
b = 0
while b * bar < LENGTH:
    chord = prog[b % 4]
    t0 = b * bar
    n = int(bar * SR * 1.05)
    t = np.arange(n) / SR
    env = np.minimum(1, t / 0.6) * np.minimum(1, (bar * 1.05 - t) / 0.5)
    pad = sum(
        np.sin(2 * np.pi * note(m) * t + 0.3 * np.sin(2 * np.pi * 0.2 * t)) + 0.5 * np.sin(2 * np.pi * note(m) * 1.003 * t)
        for m in chord
    )
    add(lp(pad * env, 1400) * 0.05, t0, pan=-0.2)
    add(lp(pad * env, 1400) * 0.05, t0 + 0.01, pan=0.2)
    # bajo pulsante en negras
    for k in range(4):
        nb = int(BEAT * 0.8 * SR)
        tb = np.arange(nb) / SR
        bass = np.sin(2 * np.pi * note(chord[0] - 24) * tb) * np.exp(-tb * 4) * np.minimum(1, tb / 0.01)
        add(bass * 0.22, t0 + k * BEAT)
    # campanitas (arpegio suave cada 2 tiempos)
    for k in range(0, 8, 3):
        m = chord[k % 3] + 24
        nn = int(1.2 * SR)
        tt = np.arange(nn) / SR
        bell = (np.sin(2 * np.pi * note(m) * tt) + 0.3 * np.sin(2 * np.pi * note(m) * 2.76 * tt)) * np.exp(-tt * 3.5)
        add(bell * 0.035, t0 + k * BEAT / 2, pan=0.35 if k % 2 else -0.35)
    # pulso ligero de reloj (hi-hat cerrado muy suave)
    for k in range(8):
        nh = int(0.05 * SR)
        hat = sosfilt(butter(2, 7000, btype="high", fs=SR, output="sos"), rng.standard_normal(nh)) * np.exp(-np.arange(nh) / SR * 80)
        add(hat * (0.03 if k % 2 else 0.05), t0 + k * BEAT / 2, pan=0.25)
    b += 1

fade = int(2.5 * SR)
for ch in (L, R):
    ch[:2000] *= np.linspace(0, 1, 2000)
    ch[-fade:] *= np.linspace(1, 0, fade)
mix = np.stack([L, R], 1)
mix = np.tanh(mix * 1.2) / np.tanh(1.2)
mix = mix / (np.max(np.abs(mix)) + 1e-9) * 0.9
wavfile.write(sys.argv[1], SR, (mix * 32767).astype(np.int16))
print("ok", LENGTH)
