"""Cartesia TTS con una sola petición HTTP (sin SDK).

Lee CARTESIA_API_KEY de presidente/.env.local y escribe el WAV tal cual llega.
  python tts.py "<texto>" salida.wav [voice_id] [speed] [volume]
"""
import json, os, sys, urllib.request
from pathlib import Path

def load_env():
    p = Path(__file__).resolve().parent.parent / ".env.local"
    if p.exists():
        for line in p.read_text().splitlines():
            if "=" in line and not line.startswith("#"):
                k, v = line.split("=", 1)
                os.environ.setdefault(k.strip(), v.strip())

def tts(transcript, out, voice="13ff5deb-2591-42ad-a356-63a04e524411", speed=1.0, volume=1.0, model="sonic-3.6", language=None):
    load_env()
    body = {
        "model_id": model,
        "transcript": transcript,
        "voice": voice,
        "output_format": {"container": "wav", "encoding": "pcm_s16le", "sample_rate": 44100},
        "generation_config": {"speed": speed, "volume": volume},
    }
    if language:
        body["language"] = language
    req = urllib.request.Request(
        "https://api.cartesia.ai/tts/bytes",
        data=json.dumps(body).encode(),
        headers={"Content-Type": "application/json", "X-API-Key": os.environ["CARTESIA_API_KEY"], "Cartesia-Version": "2026-08-14"},
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=120) as r:
        Path(out).write_bytes(r.read())
    return out

if __name__ == "__main__":
    a = sys.argv[1:]
    tts(a[0], a[1], *(a[2:3] or []), *(map(float, a[3:5])))
    print("ok", a[1])
