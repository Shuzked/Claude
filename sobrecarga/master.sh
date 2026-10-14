#!/usr/bin/env bash
# Masterización del audio final: compresión suave de bus, normalización a -14 LUFS
# (estándar de Instagram/TikTok) y limitador a -1 dBTP. La imagen se copia sin tocar.
#
#   ./master.sh out/render.mp4 out/final.mp4
set -euo pipefail
IN="$1"
OUT="$2"
PRE="acompressor=threshold=-18dB:ratio=2:attack=20:release=200:makeup=1.5,equalizer=f=60:t=q:w=1:g=1"
# 1ª pasada: medir
STATS=$(ffmpeg -hide_banner -i "$IN" -af "$PRE,loudnorm=I=-13:TP=-1:LRA=9:print_format=json" -f null - 2>&1 | sed -n '/^{/,/^}/p')
get() { echo "$STATS" | grep "\"$1\"" | sed -E 's/.*: "([^"]+)".*/\1/'; }
# 2ª pasada: aplicar con las medidas
ffmpeg -hide_banner -y -i "$IN" -c:v copy -c:a aac -b:a 256k -movflags +faststart \
  -af "$PRE,loudnorm=I=-13:TP=-1:LRA=9:measured_I=$(get input_i):measured_TP=$(get input_tp):measured_LRA=$(get input_lra):measured_thresh=$(get input_thresh):offset=$(get target_offset):linear=true,alimiter=limit=0.89:level=false" \
  "$OUT"
ffmpeg -hide_banner -i "$OUT" -af ebur128=peak=true -f null - 2>&1 | grep -E "^\s+(I|Peak|LRA):" || true
