"""Generación con la API de Higgsfield (SDK oficial higgsfield-client).

Credenciales: HF_KEY="key-id:key-secret" (o HF_API_KEY + HF_API_SECRET) como
secreto del entorno o en presidente/.env.local (ignorado por Git). Nunca se imprimen.

Uso:
  python hf_gen.py check
  python hf_gen.py run <modelo> '<argumentos JSON>' [salida]
"""
import json
import os
import sys
import urllib.request
from pathlib import Path

from dotenv import load_dotenv

load_dotenv(Path(__file__).with_name(".env.local"))
import higgsfield_client as hf  # noqa: E402


def has_credentials() -> bool:
    key = os.getenv("HF_KEY", "")
    return (":" in key and all(key.split(":", 1))) or bool(os.getenv("HF_API_KEY") and os.getenv("HF_API_SECRET"))


def run(model: str, args: dict, out: str | None):
    def upd(st):
        print("estado:", type(st).__name__, flush=True)

    try:
        res = hf.subscribe(model, arguments=args, on_enqueue=lambda rid: print("request_id:", rid, flush=True), on_queue_update=upd)
    except hf.InsufficientCreditsError:
        sys.exit("ERROR: créditos insuficientes")
    except hf.HiggsfieldClientError as e:
        sys.exit(f"ERROR: {type(e).__name__}: {e}")
    status = (res or {}).get("status") if isinstance(res, dict) else None
    if status in ("failed", "nsfw", "canceled"):
        sys.exit(f"ERROR: la generación terminó como «{status}»")
    urls = [m["url"] for k in ("images", "videos", "audios", "audio", "video") for m in (res.get(k) or [] if isinstance(res.get(k), list) else [res.get(k)] if res.get(k) else []) if isinstance(m, dict) and m.get("url")]
    if not urls:
        sys.exit("ERROR: respuesta sin URL de resultado: " + json.dumps(res)[:500])
    for i, u in enumerate(urls):
        print("url:", u)
        if out:
            dst = out if len(urls) == 1 else f"{Path(out).stem}_{i}{Path(out).suffix}"
            urllib.request.urlretrieve(u, dst)
            print("guardado:", dst)


if __name__ == "__main__":
    if not has_credentials():
        sys.exit("ERROR: faltan credenciales (HF_KEY=key-id:key-secret)")
    if sys.argv[1:2] == ["check"]:
        print("credenciales presentes")
    elif sys.argv[1:2] == ["run"]:
        run(sys.argv[2], json.loads(sys.argv[3]), sys.argv[4] if len(sys.argv) > 4 else None)
