# Presidente de la hipertrofia — 8 mitos (Yago 9, Heracles Fit)

## Fuente
- Release `video-yago-9`: `yago.9.mov` (4K vertical 2160×3840, 25 fps, 78 s). Descargar a `presidente/src-media/` (ignorado por Git).
- Transcripción de Yago: `yago_9_.json` (subida por el usuario). Yago deja huecos entre respuestas para las preguntas.
- Plano fijo: Yago sentado tras una mesa de madera, fondo negro, trípode azul delante.

## Objetivo
Rueda de prensa ficticia «presidente de la hipertrofia». Se conserva la imagen, voz y actuación reales de Yago; la IA solo
ambienta (sala de prensa, micrófonos en la mesa) y pone la voz del periodista fuera de plano (natural, «de fondo pero no tanto»).
Un único contraplano de periodista ficticio reutilizable (opcional). Sin partidos, escudos, medios ni personas reales.
Rótulos manuales: «RUEDA DE PRENSA DEL GIMNASIO», «Sátira · escenario IA», contador 1/8–8/8, CTA «SÍGUEME · @heracles_fit».
Duración objetivo 75–85 s (< 90 s). Estilo de la casa: Montserrat, verde #04E400, subtítulos palabra a palabra (≤3), master −13 LUFS.

## Preguntas del periodista (TTS)
1. ¿Las elevaciones frontales sobran porque ya hacemos presses?  → 1/8 · Elevaciones frontales — «Trabajo recibido + prioridad»
2. ¿Para desarrollar bíceps y tríceps basta con presses y tirones? → 2/8 · Bíceps y tríceps — «Crecer ≠ maximizar»
3. ¿Las series rectas hacen crecer más que los drop sets? → 3/8 · Series rectas vs. drop sets — «Pueden ahorrar tiempo» (+reloj)
4. ¿Entrenar el mismo músculo dos días seguidos impide que crezca? → 4/8 · Días consecutivos — «Importa la dosis, no solo el calendario»
5. ¿Usar straps para levantar más peso no es hacer trampa? → 5/8 · Straps — «Espalda ≠ competición de agarre»
6. ¿Para ganar más músculo siempre es mejor hacer menos series? → 6/8 · Volumen — «Más puede aportar más» / «Con rendimientos decrecientes»
7. ¿Para ganar músculo hay que dejar el cardio? → 7/8 · Cardio — «Dosis + organización»
8. ¿Toda serie que no llegue al fallo es una serie perdida? → 8/8 · Llegar al fallo — «Crecer sin llegar» / «Menos fatiga»
9. Menuda mierda de presidente… ¿Entonces qué promete tu programa electoral? → cierre y CTA

Nota: en la transcripción aparecen solo 8 respuestas de Yago (la de bíceps/tríceps no está en la toma); revisar el audio.

## Estado
- [x] Fuente descargada y revisada (sin cortes de plano).
- [x] Prueba de recorte rápido de Yago: MediaPipe pose (máscara) + filtro guiado; la mesa se conserva del original.
- [x] SDK de Higgsfield instalado (`requirements.txt`) y `hf_gen.py` listo (lee `HF_KEY=key-id:key-secret` sin mostrarla).
- [ ] Credenciales de Higgsfield en el entorno (`HF_KEY`) → `python hf_gen.py check`.
- [ ] Generar: fondo de sala de prensa vertical, micrófonos (PNG), contraplano del periodista, 9 voces (ElevenLabs v4 vía Higgsfield).
- [ ] Recorte completo, proyecto Remotion, montaje, rótulos, sonido de sala, master y preview rápida.
