"""Sintetiza la música de fondo y los efectos de sonido del vídeo.

Todo el audio es original y generado aquí, sin samples de terceros.

    python3 audio-src/synth.py public/audio
"""
import os
import sys

import numpy as np
from scipy.io import wavfile
from scipy.signal import butter, sosfilt

SR = 48000
OUT = sys.argv[1] if len(sys.argv) > 1 else "public/audio"
os.makedirs(OUT, exist_ok=True)
rng = np.random.default_rng(7)


def t(sec):
    return np.arange(int(sec * SR)) / SR


def env(n, a, d, curve=4.0):
    """Envolvente ataque/decay en muestras."""
    a = max(1, int(a * SR))
    e = np.ones(n)
    e[:a] = np.linspace(0, 1, a)
    tail = np.linspace(0, 1, n - a)
    e[a:] = np.exp(-curve * tail / max(d, 1e-3) * (n - a) / SR)
    return e


def bp(x, lo, hi, order=2):
    return sosfilt(butter(order, [lo, hi], btype="band", fs=SR, output="sos"), x)


def lp(x, f, order=2):
    return sosfilt(butter(order, f, btype="low", fs=SR, output="sos"), x)


def hp(x, f, order=2):
    return sosfilt(butter(order, f, btype="high", fs=SR, output="sos"), x)


def save(name, x, peak=0.9):
    x = x / (np.max(np.abs(x)) + 1e-9) * peak
    st = np.stack([x, x], axis=1)
    wavfile.write(os.path.join(OUT, name), SR, (st * 32767).astype(np.int16))


# --- Efectos ---------------------------------------------------------------

def whoosh(dur=0.5, lo=300, hi=5000):
    n = int(dur * SR)
    noise = rng.standard_normal(n)
    out = np.zeros(n)
    # barrido de un filtro paso banda por bloques
    blocks = 40
    for i in range(blocks):
        s, e = i * n // blocks, (i + 1) * n // blocks
        f = lo * (hi / lo) ** (i / blocks)
        out[s:e] = bp(noise[max(0, s - 2000):e], f * 0.6, min(f * 1.6, 20000))[-(e - s):]
    shape = np.sin(np.linspace(0, np.pi, n)) ** 2
    return out * shape


def pop(f0=900, f1=320, dur=0.12):
    x = t(dur)
    freq = f1 + (f0 - f1) * np.exp(-x * 40)
    ph = 2 * np.pi * np.cumsum(freq) / SR
    return np.sin(ph) * env(len(x), 0.002, 0.08, 5)


def tick(f=3200, dur=0.04):
    x = t(dur)
    click = rng.standard_normal(len(x)) * env(len(x), 0.0005, 0.01, 6)
    return hp(click, 1500) * 0.6 + np.sin(2 * np.pi * f * x) * env(len(x), 0.0005, 0.015, 6) * 0.4


def thump(dur=0.5):
    x = t(dur)
    freq = 45 + 90 * np.exp(-x * 18)
    body = np.sin(2 * np.pi * np.cumsum(freq) / SR) * env(len(x), 0.003, 0.35, 5)
    air = lp(rng.standard_normal(len(x)), 900) * env(len(x), 0.001, 0.06, 6) * 0.3
    return body + air


def keys(count=5, gap=0.075):
    total = np.zeros(int((count * gap + 0.08) * SR))
    for i in range(count):
        k = tick(f=2200 + rng.integers(-300, 300), dur=0.035) * (0.7 + 0.3 * rng.random())
        s = int(i * gap * SR + rng.integers(-300, 300))
        s = max(0, s)
        total[s : s + len(k)] += k
    return total


def ding(f=1318.5, dur=1.2):
    x = t(dur)
    tone = (np.sin(2 * np.pi * f * x) + 0.35 * np.sin(2 * np.pi * f * 2.01 * x)
            + 0.15 * np.sin(2 * np.pi * f * 3.02 * x))
    return tone * env(len(x), 0.004, 0.9, 4)


def swipe(dur=0.28):
    return whoosh(dur, 1200, 9000) * 0.8


save("whoosh.wav", whoosh())
save("swipe.wav", swipe())
save("pop.wav", pop())
save("pop-low.wav", pop(600, 200, 0.14))
save("tick.wav", tick())
save("thump.wav", thump())
save("keys.wav", keys())
save("ding.wav", ding(), peak=0.6)

# --- Música ----------------------------------------------------------------
BPM = 96
BEAT = 60 / BPM
LENGTH = 64.6
# Momento (en el vídeo ya recortado) en que la escena pasa a tono útil (E04).
TONE_CHANGE = 24.6

n_total = int(LENGTH * SR)
music = np.zeros(n_total)


def note(m):
    return 440 * 2 ** ((m - 69) / 12)


def pad_chord(midis, dur):
    x = t(dur)
    s = np.zeros(len(x))
    for m in midis:
        for det in (-0.08, 0.0, 0.08):
            f = note(m) * 2 ** (det / 12)
            s += np.sign(np.sin(2 * np.pi * f * x)) * 0.25 + np.sin(2 * np.pi * f * x)
    s = lp(s, 1400, 2)
    a = int(0.6 * SR)
    e = np.ones(len(x))
    e[:a] = np.linspace(0, 1, a)
    e[-a:] = np.linspace(1, 0, a)
    return s * e


def pluck(m, dur=0.35):
    x = t(dur)
    f = note(m)
    s = np.sin(2 * np.pi * f * x) + 0.4 * np.sin(2 * np.pi * 2 * f * x)
    return lp(s, 2600) * env(len(x), 0.002, 0.18, 6)


def kick():
    x = t(0.3)
    freq = 48 + 70 * np.exp(-x * 30)
    return np.sin(2 * np.pi * np.cumsum(freq) / SR) * env(len(x), 0.002, 0.22, 5)


def hat():
    x = t(0.05)
    return hp(rng.standard_normal(len(x)), 7000) * env(len(x), 0.0005, 0.03, 6)


# La m – Fa – Do – Sol, dos compases por acorde
progression = [[57, 60, 64], [53, 57, 60], [48, 52, 55, 60], [55, 59, 62]]
bar = 4 * BEAT
chord_len = 2 * bar
pos = 0.0
i = 0
while pos < LENGTH:
    c = pad_chord(progression[i % 4], chord_len + 0.6)
    s = int(pos * SR)
    e = min(n_total, s + len(c))
    music[s:e] += c[: e - s] * 0.16
    # bajo
    b = progression[i % 4][0] - 12
    for k in range(int(chord_len / BEAT)):
        bs = int((pos + k * BEAT) * SR)
        bx = t(BEAT * 0.9)
        bass = np.sin(2 * np.pi * note(b) * bx) * env(len(bx), 0.01, 0.5, 3)
        be = min(n_total, bs + len(bass))
        music[bs:be] += bass[: be - bs] * 0.22
    pos += chord_len
    i += 1

# Pulso: kick suave y hats; plucks juguetones solo en la parte cómica
beat_t = 0.0
step = 0
arp = [69, 72, 76, 72, 67, 71, 74, 71]
while beat_t < LENGTH:
    s = int(beat_t * SR)
    comic = beat_t < TONE_CHANGE
    if step % 2 == 0:
        k = kick() * (0.5 if comic else 0.32)
        e = min(n_total, s + len(k))
        music[s:e] += k[: e - s]
    hs = int((beat_t + BEAT / 2) * SR)
    h = hat() * (0.08 if comic else 0.05)
    he = min(n_total, hs + len(h))
    if hs < n_total:
        music[hs:he] += h[: he - hs]
    if comic:
        p = pluck(arp[step % len(arp)]) * 0.12
        ps = int((beat_t + BEAT * 0.75) * SR)
        pe = min(n_total, ps + len(p))
        if ps < n_total:
            music[ps:pe] += p[: pe - ps]
    beat_t += BEAT
    step += 1

# Entrada y salida suaves
fade_in = int(0.4 * SR)
music[:fade_in] *= np.linspace(0, 1, fade_in)
fade_out = int(2.5 * SR)
music[-fade_out:] *= np.linspace(1, 0, fade_out)
save("music.wav", music, peak=0.85)
print("ok", sorted(os.listdir(OUT)))
