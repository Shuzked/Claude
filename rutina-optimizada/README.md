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
| `src/timeline.ts` | Recorte inicial, quién habla, correcciones de la transcripción, palabras subrayadas, planos, golpes de zoom, sacudidas, barridos y efectos de sonido. Todo en segundos del original. |
| `src/transcript.json` | Transcripción por palabra de la toma. |
| `src/Camera.tsx` | Vídeo a pantalla completa o en ventana durante las escenas. Zoom continuo: empuje lento por plano, golpe en cada corte, golpes en los remates, deriva de cámara en mano, entrada de golpe, sacudidas y barridos con desenfoque. |
| `src/Captions.tsx` | Subtítulos palabra a palabra (1 a 3 en pantalla) con glow sutil; los destacados del guion se pintan con subrayador verde al pronunciarse. |
| `src/Graphics.tsx` | Escenas de motion graphics a pantalla completa (fondo negro neutro con textura vintage, cortinilla diagonal, vídeo en ventana) con figuras e iconos animados: hoja de Excel, torso con el pecho iluminado, gráfica plana, calendario, móviles, diana, reloj, checklist, caja de comentario PLAN. |
| `src/Sound.tsx` | Música y efectos (cada efecto se alinea por su punto de impacto). |
| `src/Finish.tsx` | Grano, viñeta y destellos en los golpes. |
| `audio-src/music.py` | Genera la música: intro electrónica a 127 BPM y parte chill a medio tiempo. |

## Renderizar

El metraje no se sube a Git. El original (`yago 8.mov`, 4K a 50 Mbps) está como release
`video-yago8` del repo. Para renderizar, recodifícalo con keyframes frecuentes y ponlo en
`public/video.mp4`:

```bash
ffmpeg -i "yago 8.mov" -c:v libx264 -preset fast -crf 12 -g 10 -pix_fmt yuv420p -c:a aac -b:a 256k public/video.mp4
```

```bash
npm i
npx remotion studio                                   # previsualizar
npx remotion render RutinaOptimizada out/final.mp4 --scale=2   # exportar a 4K (2160×3840)
```

Efectos de sonido: van en `public/audio/fx/` (`tic`, `whoosh-a`, `whoosh-b`, `hit`, `snap`, `riser`,
en `.wav`). Son de Epidemic Sound y blogovs (licencia de quien edita), así que no se suben al repo.

Para regenerar la música: `python3 audio-src/music.py music.wav` (necesita numpy y scipy) y
convertirla a `public/audio/music.mp3`.

## Antes de publicar (E08)

Confirmar quién responde los comentarios PLAN o que el flujo automático esté configurado y probado
para esta publicación.
