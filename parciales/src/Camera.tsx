import { Video } from "@remotion/media";
import React from "react";
import {
  AbsoluteFill,
  Easing,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { HookCutout, HookFront, HookWords } from "./Hook";
import { ThighGlow } from "./ThighGlow";
import faceTrack from "./faceTrack.json";
import { poseAt } from "./pose";
import { Tracked } from "./Tracked";
import {
  BURLA,
  focuses,
  impacts,
  punches,
  shots,
  TRIM,
  whips,
} from "./timeline";

// Cámara virtual: el vídeo nunca está quieto.
//  1. Cada plano tiene su encuadre base y un empuje lento (alternando dentro/fuera).
//  2. Cada corte entra con un pequeño golpe que se asienta en unos fotogramas.
//  3. Los remates llevan un golpe de zoom con muelle que se mantiene y se suelta.
//  4. Una deriva mínima de cámara en mano para que no parezca un plano fijo.
//  5–7. Entrada de golpe, sacudidas en los golpes y barridos en los cortes.
//  9. Enfoques: en los momentos del músculo la cámara se va al muslo.
//  8. Tracking de cabeza: el encuadre sigue la cara (faceTrack.json, detectada y
//     suavizada por plano) y la lleva hacia el centro; sube el zoom solo lo
//     necesario para no enseñar bordes.

const ORIGIN = { x: 540, y: 1920 * 0.32 };
const TARGET = { x: 540, y: 700 }; // dónde queremos la cara en pantalla
const CENTERING = 0.5; // cuánto se corrige el descentrado (0 = nada, 1 = centrado total)
const MAX_TRACK_ZOOM = 1.4;
const EDGE_MARGIN = 14; // px de margen para la deriva y las sacudidas

const track = faceTrack as { fps: number; points: [number, number][] };
const faceAt = (sourceSeconds: number) => {
  const i = Math.min(
    track.points.length - 1,
    Math.max(0, Math.round(sourceSeconds * track.fps)),
  );
  return { x: track.points[i][0], y: track.points[i][1] };
};

const BASE = 1.04; // margen para que la deriva nunca enseñe bordes

const useCamera = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = TRIM + frame / fps;

  const index = Math.max(
    0,
    shots.findIndex((s) => t >= s.start && t < s.end),
  );
  const shot = shots[index];
  const progress = (t - shot.start) / (shot.end - shot.start);

  // 1. encuadre base + empuje lento
  const tight = index % 2 === 1 ? 0.06 : 0;
  const pushIn = index % 3 !== 2;
  const drift = pushIn
    ? interpolate(progress, [0, 1], [0, 0.05])
    : interpolate(progress, [0, 1], [0.05, 0]);

  // 2. golpe de entrada en el corte
  const sinceCut = (t - shot.start) * fps;
  const cutKick = index === 0 ? 0 : 0.035 * Math.exp(-sinceCut / 3.5);

  // 3. golpes en los remates
  let punch = 0;
  for (const p of punches) {
    const local = (t - p.at) * fps;
    if (local < -1 || t > p.at + p.hold + 0.6) continue;
    const inS = spring({
      frame: local,
      fps,
      config: { damping: 15, stiffness: 160, mass: 0.7 },
    });
    const outS = interpolate(t, [p.at + p.hold, p.at + p.hold + 0.6], [0, 1], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: Easing.inOut(Easing.cubic),
    });
    punch = Math.max(punch, p.amount * inS * (1 - outS));
  }

  // 4. cámara en mano (muy leve)
  const x = Math.sin(frame / 41) * 6 + Math.sin(frame / 17) * 2;
  const y = Math.cos(frame / 53) * 5 + Math.sin(frame / 23) * 1.5;
  const rot = Math.sin(frame / 67) * 0.25;

  // El CTA es plano abierto: menos zoom base.
  const ctaRelax = shot.who === "CTA" ? -0.02 : 0;

  // 5. entrada de golpe en el primer fotograma
  const slam = interpolate(frame, [0, 7], [0.22, 0], {
    extrapolateRight: "clamp",
    easing: Easing.bezier(0.16, 1, 0.3, 1),
  });

  // 6. golpes (apertura): sacudida que se amortigua
  let shakeX = 0;
  let shakeY = 0;
  let impactZoom = 0;
  for (const at of impacts) {
    const k = (t - at) * fps;
    if (k < 0 || k > 12) continue;
    const amp = Math.exp(-k / 3.2);
    shakeX += Math.sin(k * 2.9) * 16 * amp;
    shakeY += Math.cos(k * 3.7) * 12 * amp;
    impactZoom += 0.05 * amp;
  }

  // 7. barridos en los cortes: desenfoque de movimiento + empujón
  let blur = 0;
  let whipY = 0;
  for (const at of whips) {
    const k = (t - at) * fps;
    if (k < -3 || k > 6) continue;
    const a = k < 0 ? (k + 3) / 3 : Math.exp(-k / 1.8);
    blur = Math.max(blur, 14 * a);
    whipY += (k < 0 ? -1 : 1) * 40 * a;
  }

  // 8. tracking de cabeza
  const face = faceAt(t);
  const want = {
    x: face.x + (TARGET.x - face.x) * CENTERING,
    y: face.y + (TARGET.y - face.y) * CENTERING,
  };
  const camScale =
    BASE + tight + drift + cutKick + punch + ctaRelax + slam + impactZoom;
  // zoom mínimo para poder desplazar la cara hasta `want` sin enseñar bordes
  const ax = Math.abs(face.x - ORIGIN.x);
  const bx = Math.abs(want.x - ORIGIN.x);
  const needX =
    ORIGIN.x - ax > 1
      ? (ORIGIN.x - bx + EDGE_MARGIN) / (ORIGIN.x - ax)
      : MAX_TRACK_ZOOM;
  const scale = Math.min(
    MAX_TRACK_ZOOM + slam + punch + impactZoom,
    Math.max(camScale, needX),
  );
  const clampAxis = (tr: number, o: number, size: number) =>
    Math.max(
      -(scale - 1) * (size - o) + EDGE_MARGIN,
      Math.min((scale - 1) * o - EDGE_MARGIN, tr),
    );
  const trX = clampAxis(
    want.x - ORIGIN.x - scale * (face.x - ORIGIN.x),
    ORIGIN.x,
    1080,
  );
  const trY = clampAxis(
    want.y - ORIGIN.y - scale * (face.y - ORIGIN.y),
    ORIGIN.y,
    1920,
  );

  // 9. enfoque al muslo: mezcla el encuadre de la cara con uno centrado en los muslos
  let fScale = scale;
  let fX = trX;
  let fY = trY;
  for (const fc of focuses) {
    const w = Math.min(
      interpolate(t, [fc.from, fc.from + 0.4], [0, 1], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
        easing: Easing.bezier(0.65, 0, 0.35, 1),
      }),
      interpolate(t, [fc.to - 0.45, fc.to], [1, 0], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
        easing: Easing.bezier(0.65, 0, 0.35, 1),
      }),
    );
    const p = poseAt(t);
    if (w <= 0 || !p) continue;
    const c = {
      x: (p.lh[0] + p.rh[0] + p.lk[0] + p.rk[0]) / 4,
      y: (p.lh[1] + p.rh[1] + p.lk[1] + p.rk[1]) / 4,
    };
    const zs = fc.zoom + punch * 0.5;
    const clampF = (tr: number, o: number, size: number) =>
      Math.max(
        -(zs - 1) * (size - o) + EDGE_MARGIN,
        Math.min((zs - 1) * o - EDGE_MARGIN, tr),
      );
    const zx = clampF(540 - ORIGIN.x - zs * (c.x - ORIGIN.x), ORIGIN.x, 1080);
    const zy = clampF(1060 - ORIGIN.y - zs * (c.y - ORIGIN.y), ORIGIN.y, 1920);
    fScale = scale + (zs - scale) * w;
    fX = trX + (zx - trX) * w;
    fY = trY + (zy - trY) * w;
  }

  // 10. burla: tambaleo de dibujos animados
  const wob = interpolate(
    t,
    [
      BURLA.wobble[0],
      BURLA.wobble[0] + 0.15,
      BURLA.wobble[1] - 0.2,
      BURLA.wobble[1],
    ],
    [0, 1, 1, 0],
    {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    },
  );

  return {
    scale: fScale,
    x: fX + x + shakeX,
    y: fY + y + shakeY + whipY,
    rot: rot + Math.sin(t * 13) * 2.4 * wob,
    blur,
  };
};

export const Camera: React.FC = () => {
  const { scale, x, y, rot, blur } = useCamera();
  const { fps } = useVideoConfig();
  const transform: React.CSSProperties = {
    transform: `translate(${x}px, ${y}px) scale(${scale}) rotate(${rot}deg)`,
    // centro en la cara: los zooms acercan el rostro, no el pecho
    transformOrigin: "50% 32%",
  };
  // color original del vídeo: sin etalonaje, solo el desenfoque de los barridos
  const look = blur > 0.3 ? `blur(${blur}px)` : undefined;
  return (
    <AbsoluteFill style={{ overflow: "hidden", backgroundColor: "black" }}>
      <AbsoluteFill style={transform}>
        <Video
          src={staticFile("video.mp4")}
          trimBefore={Math.round(TRIM * fps)}
          objectFit="cover"
          style={{ width: "100%", height: "100%", filter: look }}
        />
      </AbsoluteFill>
      {/* hook: las palabras van en coordenadas de pantalla (siempre caben) y el
          recorte de la persona se pinta encima con la MISMA transformación que
          el vídeo, así queda perfectamente alineado */}
      <AbsoluteFill style={transform}>
        <ThighGlow />
      </AbsoluteFill>
      <HookWords />
      <AbsoluteFill style={{ ...transform, filter: look }}>
        <HookCutout />
      </AbsoluteFill>
      <HookFront />
      <AbsoluteFill style={transform}>
        <Tracked />
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
