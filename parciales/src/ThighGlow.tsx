import React from "react";
import {
  Easing,
  Img,
  interpolate,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { DOUBLE, GLOW_FRAMES, glows, TRIM } from "./timeline";

// El músculo se enciende: rotoscopia del muslo (la propia piel teñida de verde,
// con su textura) que sube, brilla un momento y se apaga. Va dentro de la cámara
// virtual, así que sigue exactamente los zooms.

const MAX = 0.9; // verde lima luminoso con glow (referencias del cliente) // sutil: se sigue viendo el músculo

const envelope = (t: number) => {
  let e = 0;
  for (const g of glows) {
    const up = interpolate(t, [g.at - 0.05, g.at + 0.3], [0, 1], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: Easing.bezier(0.16, 1, 0.3, 1),
    });
    const down = interpolate(t, [g.end - 0.7, g.end], [1, 0], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: Easing.bezier(0.65, 0, 0.35, 1),
    });
    // destello al encenderse
    const flash = 1 + 0.35 * Math.exp(-Math.max(0, t - g.at - 0.25) * 6) * up;
    e = Math.max(e, up * down * flash);
  }
  return e;
};

export const ThighGlow: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = TRIM + frame / fps;
  const e = envelope(t);
  const has = GLOW_FRAMES.some(([a, b]) => t >= a && t < b - 0.02);
  if (e < 0.01 || !has) return null;
  const n = String(Math.round(t * 25)).padStart(4, "0");
  return (
    <Img
      src={staticFile(`glow/g_${n}.png`)}
      style={{
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        opacity: Math.min(1, e) * MAX,
        filter: `drop-shadow(0 0 ${8 + 10 * e}px rgba(110,255,60,${0.75 * Math.min(1, e)})) drop-shadow(0 0 ${22 + 18 * e}px rgba(4,228,0,${0.45 * Math.min(1, e)}))`,
      }}
    />
  );
};

// Cuando aparece el doble: todo lo que no es él, desenfocado (capa precalculada).
export const BgBlur: React.FC<{ filter?: string }> = ({ filter }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = TRIM + frame / fps;
  if (t < DOUBLE.from + 0.02 || t >= DOUBLE.to - 0.02) return null;
  const n = String(Math.round(t * 25)).padStart(4, "0");
  const o = interpolate(t, [DOUBLE.from, DOUBLE.from + 0.25], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  return (
    <Img
      src={staticFile(`bgblur/b_${n}.png`)}
      style={{
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        opacity: o,
        filter,
      }}
    />
  );
};
