import { Video } from "@remotion/media";
import React from "react";
import {
  AbsoluteFill,
  Easing,
  interpolate,
  Sequence,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import faceTrack from "./faceTrack.json";
import { KneeArrow } from "./KneeArrow";
import { JUMPS, punches, segmentsOut, toSrc, WIDE } from "./timeline";

// Cámara virtual sobre una toma única y fija:
//  1. Encuadre base que alterna (medio / cerrado) en cada corte de pausa: el salto
//     de la toma se convierte en un cambio de plano.
//  2. Empuje lento dentro de cada tramo.
//  3. Golpes de zoom en los remates y en cada revelación.
//  4. Deriva mínima de cámara en mano.
//  5. Tracking de cabeza: la cara se mantiene en el tercio superior.

const ORIGIN = { x: 540, y: 1920 * 0.32 };
const TARGET = { x: 540, y: 640 };
const EDGE_MARGIN = 14;

const track = faceTrack as { fps: number; points: [number, number][] };
const faceAt = (t: number) => {
  const i = Math.min(
    track.points.length - 1,
    Math.max(0, Math.round(t * track.fps)),
  );
  return { x: track.points[i][0], y: track.points[i][1] };
};

const FRAMING = [1.32, 1.6]; // medio, cerrado

export const cameraAt = (frame: number, fps: number) => {
  const outT = frame / fps;
  const t = toSrc(outT);
  const index = JUMPS.filter((j) => t >= j).length;
  const segStart = index === 0 ? 0 : JUMPS[index - 1];
  const segEnd = index < JUMPS.length ? JUMPS[index] : segStart + 20;
  const progress = Math.min(1, (t - segStart) / Math.max(1, segEnd - segStart));

  const base = FRAMING[index % 2];
  const drift = 0.05 * progress;

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

  // entrada de golpe en el primer fotograma
  const slam = interpolate(frame, [0, 7], [0.2, 0], {
    extrapolateRight: "clamp",
    easing: Easing.bezier(0.16, 1, 0.3, 1),
  });

  const x = Math.sin(frame / 41) * 6 + Math.sin(frame / 17) * 2;
  const y = Math.cos(frame / 53) * 5 + Math.sin(frame / 23) * 1.5;
  const rot = Math.sin(frame / 67) * 0.25;

  // plano abierto (E05): se ve la pierna entera
  let wide = 0;
  for (const [a, b] of WIDE) {
    wide = Math.max(
      wide,
      Math.min(
        interpolate(t, [a - 0.01, a + 0.01], [0, 1], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        }),
        interpolate(t, [b - 0.4, b], [1, 0], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
          easing: Easing.inOut(Easing.cubic),
        }),
      ),
    );
  }
  const scale =
    (base + drift + punch + slam) * (1 - wide) + (1.04 + punch * 0.3) * wide;
  const face = faceAt(t);
  const clampAxis = (tr: number, o: number, size: number) =>
    Math.max(
      -(scale - 1) * (size - o) + EDGE_MARGIN,
      Math.min((scale - 1) * o - EDGE_MARGIN, tr),
    );
  const trX = clampAxis(
    TARGET.x - ORIGIN.x - scale * (face.x - ORIGIN.x),
    ORIGIN.x,
    1080,
  );
  const trY = clampAxis(
    TARGET.y - ORIGIN.y - scale * (face.y - ORIGIN.y),
    ORIGIN.y,
    1920,
  );
  return { scale, x: trX + x, y: trY + y, rot, t };
};

export const Camera: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { scale, x, y, rot } = cameraAt(frame, fps);
  const transform: React.CSSProperties = {
    transform: `translate(${x}px, ${y}px) scale(${scale}) rotate(${rot}deg)`,
    transformOrigin: "50% 32%",
  };
  return (
    <AbsoluteFill style={{ overflow: "hidden", backgroundColor: "black" }}>
      <AbsoluteFill style={transform}>
        {segmentsOut.map((s) => (
          <Sequence
            key={s.src}
            from={Math.round(s.out * fps)}
            durationInFrames={
              Math.round((s.out + s.dur) * fps) - Math.round(s.out * fps)
            }
            name={`Toma · ${s.src.toFixed(2)}s`}
          >
            <Video
              src={staticFile("video.mp4")}
              trimBefore={Math.round(s.src * fps)}
              objectFit="cover"
              style={{ width: "100%", height: "100%" }}
            />
          </Sequence>
        ))}
        <KneeArrow />
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
