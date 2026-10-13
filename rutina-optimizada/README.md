# La rutina «optimizada» · Entrenador y cliente

Reel vertical (1080×1920, 25 fps, 64,4 s) editado en Remotion según el guion PLAN (notas E01–E08)
y la transcripción por palabra de la toma.

## Identidad

- Tipografía: **Montserrat** (600–900, Black Italic para rótulos). Archivos en `public/fonts/` (OFL).
- Color: verde Heracles Fit `#04E400` sobre negro `#0A0A0A` y blanco roto `#F5F5F0`.
- Lenguaje gráfico: bordes duros, máscaras y barridos, trazos que se dibujan, grano de película.
  Sin sombras difusas, degradados ni píldoras redondeadas.

## Qué hay en cada archivo

| Archivo | Qué controla |
| --- | --- |
| `src/timeline.ts` | Recorte inicial, quién habla, correcciones de la transcripción, palabras clave, planos, golpes de zoom y efectos de sonido. Todo en segundos del original. |
| `src/transcript.json` | Transcripción por palabra de la toma. |
| `src/Camera.tsx` | Zoom continuo: empuje lento por plano, golpe en cada corte, golpes en los remates y deriva de cámara en mano. |
| `src/Captions.tsx` | Subtítulos de 3 palabras, palabra activa sobre caja verde, palabras clave en verde. |
| `src/Graphics.tsx` | Motion graphics de cada nota del guion (Excel, gráfica plana, herramientas, 3 vídeos, checklist, CTA…). |
| `src/Sound.tsx` | Música y efectos. |
| `src/Finish.tsx` | Grano y viñeta. |
| `audio-src/synth.py` | Genera la música y los efectos (originales, sin samples de terceros). |

## Renderizar

El metraje no se sube a Git. Pon la toma limpia en `public/video.mp4` a 1080×1920
(si es 4K, reescálala antes: el navegador decodifica el 4K muy despacio).

```bash
npm i
npx remotion studio                                   # previsualizar
npx remotion render RutinaOptimizada out/final.mp4    # exportar
```

Para regenerar el audio: `python3 audio-src/synth.py public/audio` (necesita numpy y scipy) y
convertir los `.wav` a `.mp3`.

## Antes de publicar (E08)

Confirmar quién responde los comentarios PLAN o que el flujo automático esté configurado y probado
para esta publicación.
