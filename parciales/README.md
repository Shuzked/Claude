# Parciales — Reel de Yago (Heracles Fit)

Edición en Remotion del Reel «Estas repeticiones parecen trampa…», siguiendo el guion
(notas E01–E09) y la transcripción por palabra. Mismo sistema que `../rutina-optimizada`:
Montserrat, verde `#04E400`, fondo oscuro con grano, escenas a pantalla completa
alternadas con gráficos sobre la persona, subtítulos palabra a palabra.

| Archivo | Qué controla |
| --- | --- |
| `src/timeline.ts` | Correcciones de transcripción, planos, zooms, escenas, titulares y sonido (segundos del original). |
| `src/Figures.tsx` | Ilustraciones: piernas con el cuádriceps (recto femoral / vasto lateral) y esquema del recorrido de la extensión. |
| `src/Graphics.tsx` | Escenas E02–E09. |
| `src/Hook.tsx` | Hook rotoscopiado: «ESTAS REPETICIONES PARECEN» detrás y «¿TRAMPA?» delante. |

Metraje: release `video-yago1` del repo. `public/video.mp4` = proxy 1080 con la voz procesada.

```bash
npx remotion render Parciales out/preview.mp4 --scale=0.5
./master.sh out/preview.mp4 out/preview-master.mp4
```
