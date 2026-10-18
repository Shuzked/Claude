# Genera las preguntas del periodista con Cartesia (una petición HTTP por frase).
import json, os, sys, urllib.request, time
sys.path.insert(0, os.path.dirname(__file__)); import tts; tts.load_env()
VOCES = {"gonzalo": "58e531e3-b212-49df-adee-c335a19c2429", "javier": "e9f0368b-3662-4a01-b037-e13ca5203c74", "paloma": "d4db5fb9-f44b-4bd1-85fa-192e0f0d75f9"}
# (n, texto, emoción, velocidad): intención de cada pregunta según el guion
P = [
    (1, "¿Las elevaciones frontales sobran, porque ya hacemos presses?", "curious", 1.0),
    (3, "¿Las series rectas hacen crecer más que los drop sets?", "confident", 1.02),
    (4, "¿Entrenar el mismo músculo dos días seguidos impide que crezca?", "curious", 1.0),
    (5, "¿Usar straps para levantar más peso... no es hacer trampa?", "skeptical", 0.97),
    (6, "¿Para ganar más músculo siempre es mejor hacer menos series?", "hopeful", 1.0),
    (7, "¿Para ganar músculo hay que dejar el cardio?", "determined", 1.04),
    (8, "¿Toda serie que no llegue al fallo es una serie perdida?", "confident", 1.0),
    (9, "Menuda mierda de presidente... ¿Entonces qué promete tu programa electoral?", "frustrated", 1.0),
]
out = sys.argv[1]; os.makedirs(out, exist_ok=True)
for nombre, vid in VOCES.items():
    for n, txt, emo, sp in P:
        body = {"model_id": "sonic-3.6", "transcript": txt, "voice": vid, "language": "es",
                "output_format": {"container": "wav", "encoding": "pcm_s16le", "sample_rate": 44100},
                "generation_config": {"speed": sp, "volume": 1, "emotion": emo}}
        req = urllib.request.Request("https://api.cartesia.ai/tts/bytes", data=json.dumps(body).encode(),
              headers={"Content-Type": "application/json", "X-API-Key": os.environ["CARTESIA_API_KEY"], "Cartesia-Version": "2026-08-14"}, method="POST")
        for k in range(3):
            try:
                data = urllib.request.urlopen(req, timeout=120).read(); break
            except urllib.error.HTTPError as e:
                print(nombre, n, e.code, e.read().decode()[:200]); time.sleep(2)
        open(f"{out}/{nombre}_p{n}.wav", "wb").write(data); print("ok", nombre, n, flush=True)
