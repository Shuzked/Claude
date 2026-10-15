import React from "react";
import { Easing, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import arms from "./arms.json";
import { GREEN, PAPER } from "./theme";
import { ADD, f, HUMERUS, toSrc } from "./timeline";

// Gráficos pegados al cuerpo (dentro de la cámara virtual, coordenadas 1080×1920):
// el húmero (hombro → codo) resaltado y la aducción horizontal del hombro.

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const easeOut = Easing.bezier(0.16, 1, 0.3, 1);
const easeInOut = Easing.bezier(0.65, 0, 0.35, 1);
const NEON = "drop-shadow(0 0 8px rgba(4,228,0,0.9)) drop-shadow(0 0 22px rgba(4,228,0,0.45))";

type P = { x: number; y: number };
const DATA = arms as { fps: number; shots: { t0: number; t1: number; frames: number[][][] }[] };

/** Hombro y codo del brazo izquierdo de la imagen (el que señala Yago). */
const humerusAt = (t: number): { sh: P; el: P } | null => {
  const s = DATA.shots.find((x) => t >= x.t0 && t < x.t1);
  if (!s) return null;
  const i = Math.max(0, Math.min(s.frames.length - 1, Math.round((t - s.t0) * DATA.fps)));
  const fr = s.frames[i];
  // ids: 1/2 hombros, 3/4 codos → el de menor x
  const pick = (a: number, b: number): P => (fr[a][0] < fr[b][0] ? { x: fr[a][0], y: fr[a][1] } : { x: fr[b][0], y: fr[b][1] });
  return { sh: pick(1, 2), el: pick(3, 4) };
};

const useClock = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = toSrc(frame / fps);
  const pop = (at: number, damping = 12, stiffness = 200) => spring({ frame: frame - f(at), fps, config: { damping, stiffness, mass: 0.6 } });
  const ramp = (a: number, b: number, ease = easeOut) => interpolate(frame, [f(a), Math.max(f(a) + 1, f(b))], [0, 1], { ...clamp, easing: ease });
  return { t, frame, fps, pop, ramp };
};

const Svg: React.FC<{ children: React.ReactNode; opacity?: number }> = ({ children, opacity = 1 }) => (
  <svg width={1080} height={1920} style={{ position: "absolute", inset: 0, overflow: "visible", opacity }}>
    {children}
  </svg>
);

// «…el segmento de mi brazo desde el codo hasta el hombro»: el resto se atenúa y el
// húmero queda marcado con una línea que se dibuja con cabeza luminosa
const Humerus: React.FC<{ t: number }> = ({ t }) => {
  const { ramp, pop } = useClock();
  const h = humerusAt(Math.min(Math.max(t, 7.0), 8.6));
  if (!h) return null;
  const dim = ramp(HUMERUS.from, HUMERUS.from + 0.4) * (1 - ramp(HUMERUS.to - 0.4, HUMERUS.to, easeInOut));
  const p = ramp(HUMERUS.line, HUMERUS.line + 0.55);
  const out = ramp(HUMERUS.to - 0.4, HUMERUS.to, easeInOut);
  const e = { x: h.sh.x + (h.el.x - h.sh.x) * p, y: h.sh.y + (h.el.y - h.sh.y) * p };
  const d1 = pop(HUMERUS.line - 0.05, 8, 260);
  const d2 = pop(HUMERUS.line + 0.5, 8, 260);
  const mid = { x: (h.sh.x + h.el.x) / 2, y: (h.sh.y + h.el.y) / 2 };
  // máscara: todo oscuro salvo una cápsula alrededor del húmero
  const ang = (Math.atan2(h.el.y - h.sh.y, h.el.x - h.sh.x) * 180) / Math.PI;
  const len = Math.hypot(h.el.x - h.sh.x, h.el.y - h.sh.y);
  return (
    <>
      <svg width={1080} height={1920} style={{ position: "absolute", inset: 0, opacity: dim * 0.6 }}>
        <defs>
          <mask id="hum-mask">
            <rect width={1080} height={1920} fill="white" />
            <g transform={`translate(${mid.x} ${mid.y}) rotate(${ang})`}>
              <rect x={-len / 2 - 70} y={-75} width={len + 140} height={150} rx={75} fill="black" style={{ filter: "blur(18px)" }} />
            </g>
          </mask>
        </defs>
        <rect width={1080} height={1920} fill="black" mask="url(#hum-mask)" />
      </svg>
      <Svg opacity={1 - out}>
        {p > 0.01 ? <line x1={h.sh.x} y1={h.sh.y} x2={e.x} y2={e.y} stroke={GREEN} strokeWidth={9} strokeLinecap="round" style={{ filter: NEON }} /> : null}
        {p > 0.02 && p < 0.98 ? <circle cx={e.x} cy={e.y} r={12} fill="#EFFFF0" style={{ filter: NEON }} /> : null}
        {[
          [h.sh, d1, "Hombro"],
          [h.el, d2, "Codo"],
        ].map(([c, q, label], i) => {
          const pt = c as P;
          const k = q as number;
          if (k < 0.01) return null;
          return (
            <g key={i}>
              <circle cx={pt.x} cy={pt.y} r={16 * k} fill={PAPER} stroke={GREEN} strokeWidth={6} style={{ filter: NEON }} />
              <text x={pt.x + 30} y={pt.y + 12} fill={PAPER} fontFamily="Montserrat" fontWeight={900} fontStyle="italic" fontSize={38} opacity={Math.min(1, k)} style={{ textTransform: "uppercase", filter: "drop-shadow(0 2px 8px rgba(0,0,0,0.9))" }}>
                {label as string}
              </text>
            </g>
          );
        })}
      </Svg>
    </>
  );
};

// «…aducción horizontal del hombro»: dos flechas curvas que llevan cada brazo de fuera
// hacia el centro del cuerpo, a la altura de los hombros
const AddArrows: React.FC<{ t: number }> = ({ t }) => {
  const { ramp } = useClock();
  const p = ramp(ADD.from, ADD.from + 0.7);
  const out = ramp(ADD.to - 0.35, ADD.to, easeInOut);
  if (p <= 0.01) return null;
  const y = 1010;
  const arc = (x0: number, x1: number, key: number) => {
    const pts: P[] = [];
    for (let i = 0; i <= 24; i++) {
      const u = (i / 24) * p;
      pts.push({ x: x0 + (x1 - x0) * u, y: y - Math.sin(u * Math.PI) * 70 });
    }
    const e = pts[pts.length - 1];
    const q = pts[pts.length - 3];
    const an = Math.atan2(e.y - q.y, e.x - q.x);
    const hs = 32;
    return (
      <g key={key}>
        <polyline points={pts.map((v) => `${v.x},${v.y}`).join(" ")} fill="none" stroke={GREEN} strokeWidth={10} strokeLinecap="round" />
        <path d={`M ${e.x - Math.cos(an - 0.55) * hs} ${e.y - Math.sin(an - 0.55) * hs} L ${e.x + Math.cos(an) * 8} ${e.y + Math.sin(an) * 8} L ${e.x - Math.cos(an + 0.55) * hs} ${e.y - Math.sin(an + 0.55) * hs} Z`} fill={GREEN} />
      </g>
    );
  };
  const wob = Math.sin(t * 6) * 4;
  return (
    <Svg opacity={1 - out}>
      <g style={{ filter: NEON }} transform={`translate(0 ${wob})`}>
        {arc(70, 430, 0)}
        {arc(1010, 650, 1)}
      </g>
    </Svg>
  );
};

export const BodyLayer: React.FC = () => {
  const { t } = useClock();
  return (
    <div style={{ position: "absolute", inset: 0 }}>
      {t >= HUMERUS.from - 0.05 && t < HUMERUS.to + 0.05 ? <Humerus t={t} /> : null}
      {t >= ADD.from - 0.05 && t < ADD.to + 0.05 ? <AddArrows t={t} /> : null}
    </div>
  );
};
