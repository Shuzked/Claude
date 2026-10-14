import React from "react";
import {
  Easing,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { FONT, GREEN, PAPER } from "./theme";

// Ilustraciones estilo Lottie: formas planas, trazos que se dibujan y un único
// acento verde con glow. Los tiempos `at` son segundos desde el inicio de la
// Sequence que las contiene.

const GLOW = "drop-shadow(0 0 12px rgba(4, 228, 0, 0.6))";
const BASE = "#2e2e2e";
const MID = "#3b3b3b";
const EDGE = "rgba(255,255,255,0.28)";
const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const easeOut = Easing.bezier(0.16, 1, 0.3, 1);

const useT = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return frame / fps;
};

const usePop = (at: number, damping = 10) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return spring({
    frame: frame - at * fps,
    fps,
    config: { damping, stiffness: 200, mass: 0.6 },
  });
};

// ---------------------------------------------------------------------------
// Piernas en vista frontal (pelvis + dos muslos) con el cuádriceps. Lienzo
// 300×560. Cada pierna se dibuja en su propio lienzo de 150 de ancho con la cara
// lateral a la izquierda; la pierna de la derecha del espectador es su espejo.

export const THIGH =
  "M 12 62 C 0 160, 6 280, 30 390 C 38 430, 44 455, 48 470 L 106 470 C 112 450, 120 410, 128 340 C 140 240, 144 140, 142 62 Z";
export const SHIN =
  "M 46 504 C 42 530, 48 550, 52 560 L 102 560 C 106 550, 110 530, 108 504 Z";
export const RF =
  "M 80 78 C 58 150, 54 260, 60 350 C 64 400, 70 440, 72 458 L 86 458 C 90 440, 96 400, 100 350 C 106 260, 102 150, 80 78 Z";
export const VL =
  "M 22 88 C 6 190, 8 300, 28 382 C 36 420, 46 446, 60 460 L 66 452 C 54 410, 48 330, 50 250 C 52 170, 58 120, 64 90 Z";
export const VM =
  "M 110 272 C 136 316, 140 390, 124 434 C 116 450, 104 460, 92 462 L 90 450 C 102 410, 106 350, 110 272 Z";
const RF_FIBERS = [
  "M 80 110 C 70 200, 70 320, 78 440",
  "M 80 110 C 90 200, 90 320, 82 440",
];
const VL_FIBERS = ["M 36 120 C 24 220, 30 340, 58 444"];
const SHORTS =
  "M 2 0 L 298 0 L 298 74 C 230 96, 170 92, 150 72 C 130 92, 70 96, 2 74 Z";

export type Muscle = "rf" | "vl";

export const LegAnatomy: React.FC<{
  at: number;
  lit: Muscle;
  litAt: number;
  scale?: number;
}> = ({ at, lit, litAt, scale = 1 }) => {
  const t = useT();
  const draw = interpolate(t, [at, at + 0.6], [0, 1], {
    ...clamp,
    easing: easeOut,
  });
  const muscles = usePop(at + 0.15, 12);
  // el músculo se rellena de arriba abajo, como una carga
  const fill = interpolate(t, [litAt, litAt + 0.45], [0, 1], {
    ...clamp,
    easing: easeOut,
  });
  const pulse = 1 + Math.sin((t - litAt) * 6) * 0.03 * fill;
  const dim = 1 - 0.45 * fill; // el resto del muslo se atenúa
  const W = 300 * scale;
  const H = 560 * scale;
  const shape = (
    side: string,
    d: string,
    m: Muscle | "vm",
    fibers: string[] = [],
  ) => {
    const on = m === lit;
    const id = `clip-${side}-${m}-${lit}`;
    return (
      <g opacity={on ? 1 : dim}>
        <path
          d={d}
          fill="#4a4a4a"
          stroke="rgba(255,255,255,0.35)"
          strokeWidth={2}
        />
        {on ? (
          <g style={{ filter: GLOW }}>
            <clipPath id={id}>
              <rect x={0} y={0} width={150} height={60 + 420 * fill} />
            </clipPath>
            <path
              d={d}
              fill={GREEN}
              clipPath={`url(#${id})`}
              transform={`translate(78 270) scale(${pulse}) translate(-78 -270)`}
            />
          </g>
        ) : null}
        {fibers.map((fd, i) => (
          <path
            key={i}
            d={fd}
            fill="none"
            stroke={
              on && fill > 0.5 ? "rgba(10,10,10,0.35)" : "rgba(255,255,255,0.1)"
            }
            strokeWidth={2}
          />
        ))}
      </g>
    );
  };
  const leg = (side: string) => (
    <>
      <path
        d={THIGH}
        fill={BASE}
        fillOpacity={draw}
        stroke={PAPER}
        strokeOpacity={0.55}
        strokeWidth={2.5}
        strokeDasharray={1100}
        strokeDashoffset={1100 * (1 - draw)}
      />
      <path
        d={SHIN}
        fill={BASE}
        fillOpacity={draw}
        stroke={EDGE}
        strokeWidth={2}
      />
      <ellipse
        cx={78}
        cy={487}
        rx={19}
        ry={16}
        fill={MID}
        stroke={EDGE}
        strokeWidth={2}
        opacity={draw}
      />
      <g
        opacity={Math.min(1, muscles * 1.5)}
        transform={`translate(78 270) scale(${0.9 + 0.1 * muscles}) translate(-78 -270)`}
      >
        {shape(side, VL, "vl", VL_FIBERS)}
        {shape(side, VM, "vm")}
        {shape(side, RF, "rf", RF_FIBERS)}
      </g>
    </>
  );
  return (
    <svg
      width={W}
      height={H}
      viewBox="0 0 300 560"
      style={{ overflow: "visible", display: "block" }}
    >
      <g>{leg("r")}</g>
      <g transform="translate(300 0) scale(-1 1)">{leg("l")}</g>
      {/* pantalón corto: da la lectura de «piernas» de un vistazo */}
      <path
        d={SHORTS}
        fill="#1f1f1f"
        stroke={EDGE}
        strokeWidth={2}
        opacity={draw}
      />
    </svg>
  );
};

// ---------------------------------------------------------------------------
// Esquema de la extensión de rodilla con el tramo de recorrido trabajado.
// 0° = rodilla extendida (pierna horizontal); 90° = pierna vertical. El muslo va
// horizontal hacia la izquierda y la pierna gira alrededor de la rodilla.

const KNEE = { x: 150, y: 96 };
const SHIN_LEN = 128;
const R_ARC = 70;

const polar = (deg: number, r: number) => {
  const a = (deg * Math.PI) / 180;
  return { x: KNEE.x + Math.cos(a) * r, y: KNEE.y + Math.sin(a) * r };
};

const arc = (a: number, b: number, r: number) => {
  const p = polar(a, r);
  const q = polar(b, r);
  return `M ${p.x} ${p.y} A ${r} ${r} 0 0 ${b > a ? 1 : 0} ${q.x} ${q.y}`;
};

export const RomDiagram: React.FC<{
  at: number;
  from: number; // flexión inicial (°)
  to: number; // flexión final (°)
  title: string;
  active: boolean; // la que se nombra ahora: en verde
  scale?: number;
  pop?: boolean; // entrada con muelle (desactivar si la anima el contenedor)
}> = ({ at, from, to, title, active, scale = 1, pop = true }) => {
  const t = useT();
  const popIn = usePop(at, 11);
  const p = pop ? popIn : 1;
  const sweep = interpolate(t, [at + 0.1, at + 0.6], [0, 1], {
    ...clamp,
    easing: easeOut,
  });
  // repeticiones en bucle dentro del tramo: nunca dejan de moverse
  const cycle = (1 - Math.cos((t - at) * 4.2)) / 2;
  const angle = from + (to - from) * cycle;
  const shin = polar(angle, SHIN_LEN);
  const color = active ? GREEN : "rgba(255,255,255,0.55)";
  const lab = (deg: number, txt: string) => {
    const q = polar(deg, R_ARC + 40);
    return (
      <text
        x={q.x}
        y={q.y + 8}
        textAnchor="middle"
        fontFamily={FONT}
        fontWeight={800}
        fontSize={22}
        fill={color}
        opacity={sweep}
      >
        {txt}
      </text>
    );
  };
  return (
    <div
      style={{
        width: 300 * scale,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        transform: `translateY(${(1 - p) * 40}px) scale(${0.8 + 0.2 * p})`,
        opacity: Math.min(1, p * 2),
      }}
    >
      <svg
        width={300 * scale}
        height={250 * scale}
        viewBox="0 0 300 250"
        style={{ overflow: "visible" }}
      >
        {/* recorrido de referencia 0°–100° */}
        <path
          d={arc(0, 100, R_ARC)}
          fill="none"
          stroke="rgba(255,255,255,0.14)"
          strokeWidth={10}
          strokeDasharray="2 8"
        />
        {/* tramo trabajado */}
        <path
          d={arc(from, from + (to - from) * sweep, R_ARC)}
          fill="none"
          stroke={color}
          strokeWidth={12}
          strokeLinecap="round"
          style={{ filter: active ? GLOW : undefined }}
        />
        {/* asiento y muslo */}
        <rect x={18} y={KNEE.y + 18} width={120} height={14} fill="#262626" />
        <line
          x1={30}
          y1={KNEE.y}
          x2={KNEE.x}
          y2={KNEE.y}
          stroke={PAPER}
          strokeWidth={22}
          strokeLinecap="round"
        />
        {/* pierna */}
        <line
          x1={KNEE.x}
          y1={KNEE.y}
          x2={shin.x}
          y2={shin.y}
          stroke={active ? PAPER : "rgba(245,245,240,0.7)"}
          strokeWidth={18}
          strokeLinecap="round"
        />
        {/* rodillo */}
        <circle
          cx={shin.x}
          cy={shin.y}
          r={13}
          fill="#1b1b1b"
          stroke={color}
          strokeWidth={4}
        />
        <circle cx={KNEE.x} cy={KNEE.y} r={9} fill={active ? GREEN : "#555"} />
        {lab(from, `${from}°`)}
        {lab(to, `${to}°`)}
      </svg>
      <div
        style={{
          marginTop: 10 * scale,
          fontFamily: FONT,
          fontWeight: 900,
          fontStyle: "italic",
          fontSize: 30 * scale,
          letterSpacing: -0.5,
          textTransform: "uppercase",
          color: active ? GREEN : PAPER,
          textShadow: active ? "0 0 18px rgba(4,228,0,0.55)" : "none",
          whiteSpace: "nowrap",
        }}
      >
        {title}
      </div>
      <div
        style={{
          marginTop: 4,
          fontFamily: FONT,
          fontWeight: 700,
          fontSize: 24 * scale,
          letterSpacing: 2,
          color: "rgba(255,255,255,0.6)",
          whiteSpace: "nowrap",
        }}
      >
        {`${from}°–${to}°`}
      </div>
    </div>
  );
};
