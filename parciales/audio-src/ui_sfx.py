"""Sonidos de interfaz propios: trazo de subrayador y pop suave para los gráficos.

    python3 audio-src/ui_sfx.py public/audio/ui
"""
import os
import sys

import numpy as np
from scipy.io import wavfile
from scipy.signal import butter, sosfilt

SR = 48000
OUT = sys.argv[1] if len(sys.argv) > 1 else "public/audio/ui"
os.makedirs(OUT, exist_ok=True)
rng = np.random.default_rng(5)


def bp(x, lo, hi):
    return sosfilt(butter(2, [lo, hi], btype="band", fs=SR, output="sos"), x)


def save(name, x, peak):
    x = x / (np.max(np.abs(x)) + 1e-9) * peak
    wavfile.write(os.path.join(OUT, name), SR, (np.stack([x, x], 1) * 32767).astype(np.int16))


# Subrayador: rotulador arrastrado sobre papel (ruido filtrado con textura de fibra)
n = int(0.32 * SR)
t = np.arange(n) / SR
noise = bp(rng.standard_normal(n), 1800, 7500)
grain = 0.65 + 0.35 * np.abs(np.sin(2 * np.pi * 38 * t + rng.uniform(0, 6)))
env = np.minimum(1, t / 0.015) * np.exp(-((t / 0.32) ** 3) * 3)
squeak = np.sin(2 * np.pi * (2400 + 300 * t / 0.32) * t) * 0.05
save("marker.wav", (noise * grain + squeak) * env, 0.7)

# Pop suave para la aparición de elementos
n = int(0.09 * SR)
t = np.arange(n) / SR
f = 260 + 520 * np.exp(-t * 55)
body = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 38)
click = bp(rng.standard_normal(n), 2500, 9000) * np.exp(-t * 400) * 0.25
save("pop.wav", body + click, 0.6)
# Papel: hoja que entra (ruido filtrado con dos «pasadas»)
n = int(0.35 * SR)
t = np.arange(n) / SR
paper = bp(rng.standard_normal(n), 900, 6500)
env = (np.exp(-((t - 0.05) / 0.05) ** 2) + 0.6 * np.exp(-((t - 0.17) / 0.07) ** 2))
save("paper.wav", paper * env, 0.6)

# Ding corto y limpio para cada check
n = int(0.6 * SR)
t = np.arange(n) / SR
tone = np.sin(2 * np.pi * 1568 * t) + 0.4 * np.sin(2 * np.pi * 3136 * t) + 0.15 * np.sin(2 * np.pi * 4704 * t)
save("ding.wav", tone * np.exp(-t * 7) * np.minimum(1, t / 0.003), 0.5)

# Sello: golpe seco y grave con chasquido de papel
n = int(0.45 * SR)
t = np.arange(n) / SR
f = 70 + 110 * np.exp(-t * 40)
thud = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 14)
slap = bp(rng.standard_normal(n), 1200, 6000) * np.exp(-t * 60) * 0.6
save("stamp.wav", np.tanh((thud + slap) * 2), 0.8)

# Boing de dibujos: muelle que oscila hacia arriba (nariz de payaso)
n = int(0.55 * SR)
t = np.arange(n) / SR
f = 180 + 260 * (1 - np.exp(-t * 9)) + 60 * np.sin(2 * np.pi * 11 * t) * np.exp(-t * 4)
boing = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 5.5) * np.minimum(1, t / 0.004)
save("boing.wav", np.tanh(boing * 1.4), 0.6)

# Zumbador de respuesta incorrecta
n = int(0.6 * SR)
t = np.arange(n) / SR
saw = 2 * ((t * 110) % 1) - 1 + 0.6 * (2 * ((t * 116.5) % 1) - 1)
buzz = sosfilt(butter(2, 1800, btype="low", fs=SR, output="sos"), saw)
env = np.minimum(1, t / 0.01) * np.where(t < 0.5, 1, np.exp(-(t - 0.5) * 40))
save("buzzer.wav", np.tanh(buzz * env * 2), 0.5)

# Trombón triste «wah wah wah waaah»
notes = [(0.0, 0.32, 233.1), (0.36, 0.32, 220.0), (0.72, 0.32, 207.7), (1.08, 0.9, 196.0)]
n = int(2.1 * SR)
t = np.arange(n) / SR
tromb = np.zeros(n)
for st, du, fr in notes:
    k = (t >= st) & (t < st + du)
    tl = t[k] - st
    vib = 1 + (0.012 * np.sin(2 * np.pi * 6 * tl) if du > 0.5 else 0)
    ph = 2 * np.pi * np.cumsum(fr * vib) / SR
    tone = sum(np.sin(h * ph) / h ** 0.9 for h in range(1, 9))
    wah = 0.35 + 0.65 * np.minimum(1, tl / 0.12)
    env = np.minimum(1, tl / 0.03) * np.minimum(1, (st + du - t[k]) / 0.06)
    tromb[k] += tone * env * wah
tromb = sosfilt(butter(2, [150, 2600], btype="band", fs=SR, output="sos"), tromb)
save("trombone.wav", np.tanh(tromb * 1.2), 0.55)

# Destello: brillo suave cuando se enciende el músculo
n = int(0.7 * SR)
t = np.arange(n) / SR
sh = sum(np.sin(2 * np.pi * f0 * t + rng.uniform(0, 6)) for f0 in (1760, 2217, 2637, 3520))
air = bp(rng.standard_normal(n), 4000, 11000) * 0.4
env = np.minimum(1, t / 0.08) * np.exp(-t * 5)
save("shine.wav", (sh * 0.25 + air) * env, 0.45)

print("ok", sorted(os.listdir(OUT)))
