# La rutina «optimizada» · Entrenador y cliente

Edición en Remotion del Short vertical (1080×1920, 25 fps) según el guion PLAN.

## Qué hace

- Subtítulos palabra a palabra (resaltado en amarillo), fuera de la cara y de la interfaz de Instagram.
- Etiquetas «ENTRENADOR» y «CLIENTE» solo en su primera intervención (E01).
- Rótulos de los remates y conceptos, cada uno al pronunciarse: «EL EXCEL», «EL PECHO SIGUE IGUAL»,
  «VOLUMEN / FRECUENCIA 3 / DROP SETS», «TRES VÍDEOS», «SOLO LO QUE HAGA FALTA»,
  «HACER MÁS / HACER MENOS / DEJAR DE CAMBIAR» (E02–E07). Sin cruces ni risas enlatadas.
- Zoom digital suave en «el Excel» (E02).
- CTA final: «COMENTA PLAN» + «Te escribo por privado» (E08). Sin cortinilla ni segundo CTA.

## Dónde se toca todo

`src/edit.ts`: cada frase con su inicio y fin en segundos, los rótulos y el zoom.
Las frases marcadas `"estimado"` necesitan revisarse con el audio (ver abajo).

## Usar el metraje bueno

El vídeo no se sube a Git. Pon tu exportación final (sin marca de agua) en `public/video.mp4`.
Si es 4K, renderiza desde una copia a 1080×1920: el navegador decodifica el 4K muy despacio.

```bash
npm i
npx remotion studio            # previsualizar y ajustar
npx remotion render RutinaOptimizada out/final.mp4
```

Si cambia la duración del montaje, actualiza `DURATION_SECONDS` en `src/edit.ts`.

## Pendiente

- Tiempos exactos de 25,9–65,3 s: hace falta transcripción o el `.srt` del vídeo.
- 44,7–49,8 s: el entrenador dice algo que no está en el guion; sin subtítulo por ahora.
- Antes de publicar: confirmar quién responde los comentarios PLAN o que el flujo esté probado (E08).
