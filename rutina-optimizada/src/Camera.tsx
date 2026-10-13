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
import { impacts, punches, shots, TRIM, whips } from "./timeline";

// Cámara virtual: el vídeo nunca está quieto.
//  1. Cada plano tiene su encuadre base y un empuje lento (alternando dentro/fuera).
//  2. Cada corte entra con un pequeño golpe que se asienta en unos fotogramas.
//  3. Los remates llevan un golpe de zoom con muelle que se mantiene y se suelta.
//  4. Una deriva mínima de cámara en mano para que no parezca un plano fijo.
//  5–7. Entrada de golpe, sacudidas en los golpes y barridos en los cortes.

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

  return {
    scale:
      BASE + tight + drift + cutKick + punch + ctaRelax + slam + impactZoom,
    x: x + shakeX,
    y: y + shakeY + whipY,
    rot,
    blur,
  };
};

export const Camera: React.FC = () => {
  const { scale, x, y, rot, blur } = useCamera();
  const { fps } = useVideoConfig();
  return (
    <AbsoluteFill style={{ overflow: "hidden", backgroundColor: "black" }}>
      <AbsoluteFill
        style={{
          transform: `translate(${x}px, ${y}px) scale(${scale}) rotate(${rot}deg)`,
          // centro en la cara: los zooms acercan el rostro, no el pecho
          transformOrigin: "50% 32%",
        }}
      >
        <Video
          src={staticFile("video.mp4")}
          trimBefore={Math.round(TRIM * fps)}
          objectFit="cover"
          style={{
            width: "100%",
            height: "100%",
            filter: `contrast(1.06) saturate(1.04)${blur > 0.3 ? ` blur(${blur}px)` : ""}`,
          }}
        />
        {/* hook: palabras detrás de la persona recortada */}
        <HookWords />
        <AbsoluteFill
          style={{
            filter: `contrast(1.06) saturate(1.04)${blur > 0.3 ? ` blur(${blur}px)` : ""}`,
          }}
        >
          <HookCutout />
        </AbsoluteFill>
        <HookFront />
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
