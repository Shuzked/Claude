import React from "react";
import { interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import abd from "./abd.json";
import { GREEN, PAPER } from "./theme";
import { ABD, toSrc } from "./timeline";

// Gráficos pegados al cuerpo (dentro de la cámara virtual, coordenadas 1080×1920):
// la flecha de la abducción sigue el movimiento lateral real de la pierna.

const NEON = "drop-shadow(0 0 8px rgba(4,228,0,0.9)) drop-shadow(0 0 22px rgba(4,228,0,0.45))";
const A = abd as { t0: number; fps: number; f: number[][] };

const AbdArrow: React.FC<{ t: number }> = ({ t }) => {
  const i = Math.max(0, Math.min(A.f.length - 1, Math.round((t - A.t0) * A.fps)));
  const [hx, hy, ax, ay] = A.f[i];
  const R = Math.hypot(ax - hx, ay - hy);
  const rest = Math.PI / 2 + 0.12; // pierna recta, ligeramente hacia fuera
  const cur = Math.atan2(ay - hy, ax - hx);
  const k = interpolate(t, [ABD.other, ABD.other + 0.3, ABD.to - 0.3, ABD.to], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const r = R + 60;
  const pt = (a: number, rr = r) => ({ x: hx + Math.cos(a) * rr, y: hy + Math.sin(a) * rr });
  const maxA = rest + 0.95; // hasta dónde llega la separación
  const p0 = pt(rest);
  const pm = pt(maxA);
  const pc = pt(Math.max(rest, cur));
  const prog = Math.max(0, Math.min(1, (cur - rest) / (maxA - rest)));
  const head = pt(rest + (maxA - rest) * Math.max(prog, 0.12));
  const tang = rest + (maxA - rest) * Math.max(prog, 0.12) + Math.PI / 2;
  return (
    <svg width={1080} height={1920} style={{ position: "absolute", inset: 0, overflow: "visible", opacity: k }}>
      {/* recorrido completo (guía) */}
      <path d={`M ${p0.x} ${p0.y} A ${r} ${r} 0 0 1 ${pm.x} ${pm.y}`} fill="none" stroke={PAPER} strokeWidth={5} strokeDasharray="4 14" strokeLinecap="round" opacity={0.7} />
      {/* parte recorrida, pegada al tobillo */}
      {prog > 0.02 ? <path d={`M ${p0.x} ${p0.y} A ${r} ${r} 0 0 1 ${pc.x} ${pc.y}`} fill="none" stroke={GREEN} strokeWidth={12} strokeLinecap="round" style={{ filter: NEON }} /> : null}
      <path d={`M ${head.x + Math.cos(tang - 2.6) * 34} ${head.y + Math.sin(tang - 2.6) * 34} L ${head.x + Math.cos(tang) * 10} ${head.y + Math.sin(tang) * 10} L ${head.x + Math.cos(tang + 2.6) * 34} ${head.y + Math.sin(tang + 2.6) * 34} Z`} fill={GREEN} style={{ filter: NEON }} />
      <circle cx={hx} cy={hy} r={14} fill={PAPER} stroke={GREEN} strokeWidth={5} />
    </svg>
  );
};

export const BodyLayer: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = toSrc(frame / fps);
  return <div style={{ position: "absolute", inset: 0 }}>{t >= ABD.other - 0.05 && t < ABD.to + 0.05 && t >= A.t0 ? <AbdArrow t={t} /> : null}</div>;
};
