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

print("ok", sorted(os.listdir(OUT)))
