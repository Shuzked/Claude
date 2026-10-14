import React from "react";
import {
  AbsoluteFill,
  Easing,
  Img,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { cameraAt } from "./Camera";
import { FONT, GREEN, PAPER } from "./theme";
import { f, levelOut, QUESTIONS, toSrc } from "./timeline";

// «NIVEL» y el número, en grande DETRÁS de Yago: al decir «nivel» golpea la palabra,
// al decir el número golpea la cifra. El recorte de Yago (public/roto/p_NNNNN.png,
// por fotograma del original) va encima, con la misma cámara que el vídeo.

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const ROTO_FPS = 25;

const slam = (frame: number, at: number, fps: number) =>
  spring({
    frame: frame - f(at),
    fps,
    config: { damping: 14, stiffness: 260, mass: 0.7 },
  });

/** Sacudida que decae tras cada golpe. */
const shake = (t: number, at: number) => {
  const d = t - at;
  if (d < 0 || d > 0.35) return 0;
  return Math.sin(d * 90) * 14 * (1 - d / 0.35);
};

/** Parpadeo de tubo de neón: tras el golpe titila un par de veces y queda vibrando. */
const FLICKS: [number, number][] = [
  [0.14, 0.2],
  [0.28, 0.31],
  [0.52, 0.58],
  [0.66, 0.69],
];
const neon = (d: number) => {
  if (d < 0) return 0;
  if (FLICKS.some(([a, b]) => d >= a && d < b)) return 0.15;
  return 0.85 + 0.15 * Math.sin(d * 47) * Math.sin(d * 13);
};

export const LevelLayer: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = toSrc(frame / fps);
  const q = QUESTIONS.find((x) => t >= x.nivelAt - 0.1 && t < levelOut(x));
  if (!q) return null;
  const end = levelOut(q);
  const a = slam(frame, q.nivelAt, fps);
  const b = slam(frame, q.numAt, fps);
  const out = interpolate(t, [end - 0.35, end], [0, 1], {
    ...clamp,
    easing: Easing.bezier(0.65, 0, 0.35, 1),
  });
  const dim = interpolate(t, [q.nivelAt - 0.1, q.nivelAt + 0.05], [0, 1], clamp) * (1 - out);
  const sx = shake(t, q.nivelAt) + shake(t, q.numAt);
  const light = neon(t - q.numAt);
  const cam = cameraAt(frame, fps);
  const rotoFrame = Math.round(t * ROTO_FPS);
  const big: React.CSSProperties = {
    fontFamily: FONT,
    fontWeight: 900,
    fontStyle: "italic",
    textTransform: "uppercase",
    lineHeight: 0.8,
    whiteSpace: "nowrap",
    position: "absolute",
    left: 0,
    right: 0,
    textAlign: "center",
  };
  return (
    <AbsoluteFill>
      {/* el fondo se apaga para que el rótulo mande */}
      <AbsoluteFill
        style={{
          background:
            "radial-gradient(ellipse at 50% 38%, rgba(4,228,0,0.16) 0%, rgba(0,0,0,0.55) 55%, rgba(0,0,0,0.7) 100%)",
          opacity: dim,
        }}
      />
      <AbsoluteFill
        style={{
          transform: `translate(${sx}px, ${sx * 0.4}px) scale(${1 + out * 0.12})`,
          opacity: 1 - out,
        }}
      >
        <div
          style={{
            ...big,
            top: 300,
            fontSize: 270,
            letterSpacing: -6,
            color: PAPER,
            transform: `scale(${1.8 - 0.8 * a})`,
            opacity: Math.min(1, a * 3),
            filter: `blur(${(1 - Math.min(1, a)) * 18}px)`,
          }}
        >
          Nivel
        </div>
        <div
          style={{
            ...big,
            top: 380,
            left: 600,
            fontSize: 720,
            color: GREEN,
            // contorno por fuera (el trazo queda debajo del relleno)
            WebkitTextStroke: "14px #A6FF9E",
            paintOrder: "stroke fill",
            textShadow: `0 0 ${30 + 60 * light}px rgba(4,228,0,${0.35 + 0.55 * light}), 0 0 ${120 * light}px rgba(59,255,46,${0.5 * light})`,
            transform: `scale(${2.2 - 1.2 * b}) rotate(${(1 - b) * 12}deg)`,
            opacity: Math.min(1, b * 3) * (0.55 + 0.45 * light),
            filter: `blur(${(1 - Math.min(1, b)) * 24}px)`,
          }}
        >
          {q.level}
        </div>
      </AbsoluteFill>
      {/* Yago por delante */}
      <AbsoluteFill
        style={{
          transform: `translate(${cam.x}px, ${cam.y}px) scale(${cam.scale}) rotate(${cam.rot}deg)`,
          transformOrigin: "50% 32%",
        }}
      >
        <Img
          src={staticFile(`roto/p_${String(rotoFrame).padStart(5, "0")}.png`)}
          style={{ width: "100%", height: "100%" }}
        />
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
