import React from "react";
import {
  Easing,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { FONT, GREEN, INK, PAPER } from "./theme";

// Iconos estilo Lottie: formas planas y redondeadas, entrada elástica con rebote,
// partes escalonadas y un movimiento secundario suave mientras están en pantalla.
// Todos los tiempos son segundos desde el inicio de su Sequence.

export const ICON_DARK = "#2c2c2c";
export const ICON_MID = "#3a3a3a";
const EDGE = "rgba(255,255,255,0.22)";
const GLOW = "drop-shadow(0 0 10px rgba(4, 228, 0, 0.55))";
const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

const useT = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return frame / fps;
};

/** Muelle con rebote marcado (el «pop» típico de Lottie). Función pura: se puede usar en bucles. */
const popAt = (frame: number, fps: number, at: number, damping = 9) =>
  spring({
    frame: frame - at * fps,
    fps,
    config: { damping, stiffness: 190, mass: 0.6 },
  });

export const usePop = (at: number, damping = 9) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return popAt(frame, fps, at, damping);
};

const useClock = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return { frame, fps };
};

/** Grupo SVG que entra escalando desde su punto de anclaje. */
export const Pop: React.FC<{
  at: number;
  ox: number;
  oy: number;
  children: React.ReactNode;
  rot?: number;
}> = ({ at, ox, oy, children, rot = 0 }) => {
  const p = usePop(at);
  return (
    <g
      style={{
        transformOrigin: `${ox}px ${oy}px`,
        transform: `scale(${p}) rotate(${(1 - p) * rot}deg)`,
        opacity: Math.min(1, p * 3),
      }}
    >
      {children}
    </g>
  );
};

// --- Volumen: barras que crecen con rebote y una insignia «+» -----------------
export const VolumeIcon: React.FC<{ at: number }> = ({ at }) => {
  const clk = useClock();
  const t = useT();
  const heights = [44, 62, 80, 98, 118];
  return (
    <svg
      width={200}
      height={150}
      viewBox="0 0 200 150"
      style={{ overflow: "visible" }}
    >
      {heights.map((h, i) => {
        const p = popAt(clk.frame, clk.fps, at + i * 0.06, 8);
        const idle =
          1 +
          Math.sin(t * 6 + i) * 0.03 * Math.min(1, Math.max(0, t - at - 0.6));
        const hh = h * p * idle;
        const last = i === heights.length - 1;
        return (
          <rect
            key={i}
            x={10 + i * 34}
            y={140 - hh}
            width={24}
            height={hh}
            rx={12}
            fill={last ? GREEN : ICON_MID}
            stroke={last ? "none" : EDGE}
            strokeWidth={2}
            style={last ? { filter: GLOW } : undefined}
          />
        );
      })}
      <Pop at={at + 0.45} ox={176} oy={24} rot={-90}>
        <circle cx={176} cy={24} r={20} fill={GREEN} style={{ filter: GLOW }} />
        <path
          d="M 176 15 V 33 M 167 24 H 185"
          stroke={INK}
          strokeWidth={5}
          strokeLinecap="round"
        />
      </Pop>
    </svg>
  );
};

// --- Frecuencia: calendario con 3 días marcados -------------------------------
export const CalendarIcon: React.FC<{ at: number }> = ({ at }) => {
  const clk = useClock();
  const days = ["L", "M", "X", "J", "V", "S", "D"];
  const on = [0, 2, 4];
  return (
    <svg
      width={220}
      height={160}
      viewBox="0 0 220 160"
      style={{ overflow: "visible" }}
    >
      <Pop at={at} ox={110} oy={150}>
        <rect
          x={6}
          y={18}
          width={208}
          height={136}
          rx={22}
          fill={ICON_DARK}
          stroke={EDGE}
          strokeWidth={2.5}
        />
        <path
          d="M 6 40 Q 6 18, 28 18 H 192 Q 214 18, 214 40 V 52 H 6 Z"
          fill={GREEN}
        />
        <rect x={52} y={6} width={12} height={28} rx={6} fill={PAPER} />
        <rect x={156} y={6} width={12} height={28} rx={6} fill={PAPER} />
      </Pop>
      {days.map((d, i) => {
        const x = 24 + i * 28.5;
        const sel = on.includes(i);
        const p = popAt(clk.frame, clk.fps, at + 0.15 + i * 0.03, 10);
        const check = popAt(
          clk.frame,
          clk.fps,
          at + 0.45 + on.indexOf(i) * 0.12,
          8,
        );
        return (
          <g key={i}>
            <text
              x={x}
              y={80}
              textAnchor="middle"
              fill="rgba(255,255,255,0.55)"
              fontFamily={FONT}
              fontWeight={800}
              fontSize={14}
              opacity={p}
            >
              {d}
            </text>
            <g
              style={{
                transformOrigin: `${x}px 112px`,
                transform: `scale(${sel ? 0.6 * p + 0.4 * check * p : p})`,
              }}
            >
              <circle
                cx={x}
                cy={112}
                r={11}
                fill={sel && check > 0.05 ? GREEN : ICON_MID}
                style={sel && check > 0.05 ? { filter: GLOW } : undefined}
              />
              {sel && check > 0.05 ? (
                <path
                  d={`M ${x - 5} 112 L ${x - 1} 116 L ${x + 6} 108`}
                  fill="none"
                  stroke={INK}
                  strokeWidth={3}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              ) : null}
            </g>
          </g>
        );
      })}
      <Pop at={at + 0.85} ox={196} oy={146} rot={20}>
        <rect
          x={160}
          y={130}
          width={56}
          height={30}
          rx={15}
          fill={GREEN}
          style={{ filter: GLOW }}
        />
        <text
          x={188}
          y={151}
          textAnchor="middle"
          fill={INK}
          fontFamily={FONT}
          fontWeight={900}
          fontStyle="italic"
          fontSize={17}
        >
          3×
        </text>
      </Pop>
    </svg>
  );
};

// --- Drop sets: discos que caen y rebotan, cada uno más pequeño ---------------
export const DropIcon: React.FC<{ at: number }> = ({ at }) => {
  const clk = useClock();
  const t = useT();
  const plates = [
    { w: 150, h: 34 },
    { w: 118, h: 30 },
    { w: 86, h: 26 },
  ];
  let y = 150;
  const arrow = interpolate(t, [at + 0.55, at + 0.9], [0, 1], {
    ...clamp,
    easing: Easing.bezier(0.16, 1, 0.3, 1),
  });
  return (
    <svg
      width={220}
      height={160}
      viewBox="0 0 220 160"
      style={{ overflow: "visible" }}
    >
      {plates.map((pl, i) => {
        const p = popAt(clk.frame, clk.fps, at + i * 0.14, 8);
        y -= pl.h + 6;
        const drop = (1 - p) * -90;
        return (
          <g
            key={i}
            transform={`translate(0 ${drop})`}
            opacity={Math.min(1, p * 3)}
          >
            <rect
              x={90 - pl.w / 2}
              y={y}
              width={pl.w}
              height={pl.h}
              rx={pl.h / 2}
              fill={i === 2 ? GREEN : ICON_MID}
              stroke={i === 2 ? "none" : EDGE}
              strokeWidth={2}
              style={i === 2 ? { filter: GLOW } : undefined}
            />
            <circle
              cx={90}
              cy={y + pl.h / 2}
              r={5}
              fill={i === 2 ? INK : "rgba(255,255,255,0.35)"}
            />
          </g>
        );
      })}
      <g opacity={arrow} transform={`translate(0 ${(1 - arrow) * -14})`}>
        <path
          d="M 192 28 V 120"
          stroke={GREEN}
          strokeWidth={6}
          strokeLinecap="round"
          style={{ filter: GLOW }}
        />
        <path
          d="M 178 106 L 192 122 L 206 106"
          fill="none"
          stroke={GREEN}
          strokeWidth={6}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </g>
    </svg>
  );
};

// --- Móvil con vídeo (sin contenido ajeno) ------------------------------------
export const Phone: React.FC<{ at: number; n: number; rot: number }> = ({
  at,
  n,
  rot,
}) => {
  const t = useT();
  const p = usePop(at, 9);
  const play = usePop(at + 0.25, 7);
  const prog = interpolate(t, [at + 0.3, at + 1.8], [0, 1], clamp);
  const wobble =
    Math.sin((t - at) * 5) * 1.2 * Math.min(1, Math.max(0, t - at - 0.4));
  return (
    <div
      style={{
        transform: `translateY(${(1 - p) * 90}px) rotate(${rot * p + wobble}deg) scale(${0.5 + 0.5 * p})`,
        opacity: Math.min(1, p * 3),
      }}
    >
      <svg width={170} height={300} viewBox="0 0 170 300">
        <rect
          x={4}
          y={4}
          width={162}
          height={292}
          rx={30}
          fill={ICON_DARK}
          stroke={PAPER}
          strokeWidth={5}
        />
        <rect x={16} y={34} width={138} height={196} rx={14} fill={ICON_MID} />
        <rect
          x={60}
          y={14}
          width={50}
          height={9}
          rx={4.5}
          fill="rgba(255,255,255,0.3)"
        />
        <g
          style={{ transformOrigin: "85px 132px", transform: `scale(${play})` }}
        >
          <circle
            cx={85}
            cy={132}
            r={30}
            fill={GREEN}
            style={{ filter: GLOW }}
          />
          <path
            d="M 76 118 L 100 132 L 76 146 Z"
            fill={INK}
            strokeLinejoin="round"
            stroke={INK}
            strokeWidth={4}
          />
        </g>
        <rect
          x={16}
          y={246}
          width={138}
          height={7}
          rx={3.5}
          fill="rgba(255,255,255,0.15)"
        />
        <rect
          x={16}
          y={246}
          width={138 * prog}
          height={7}
          rx={3.5}
          fill={GREEN}
        />
        <text
          x={18}
          y={280}
          fill={PAPER}
          fontFamily={FONT}
          fontWeight={800}
          fontSize={15}
          letterSpacing={2}
        >
          VÍDEO {n}
        </text>
      </svg>
    </div>
  );
};

// --- Prioridades: diana y flecha que impacta --------------------------------
export const TargetIcon: React.FC<{ at: number }> = ({ at }) => {
  const t = useT();
  const fly = interpolate(t, [at + 0.35, at + 0.6], [0, 1], {
    ...clamp,
    easing: Easing.in(Easing.cubic),
  });
  const hit = t > at + 0.6;
  const shake = hit
    ? Math.sin((t - at - 0.6) * 60) * 4 * Math.exp(-(t - at - 0.6) * 8)
    : 0;
  const rings = [64, 46, 28, 12];
  return (
    <svg
      width={170}
      height={150}
      viewBox="-85 -75 170 150"
      style={{ overflow: "visible" }}
    >
      <g transform={`translate(${shake} 0)`}>
        {rings.map((r, i) => (
          <Pop key={r} at={at + i * 0.07} ox={0} oy={0}>
            <circle
              r={r}
              fill={i % 2 === 0 ? ICON_MID : i === 3 ? GREEN : ICON_DARK}
              stroke={EDGE}
              strokeWidth={2}
              style={i === 3 ? { filter: GLOW } : undefined}
            />
          </Pop>
        ))}
      </g>
      <g
        transform={`translate(${(1 - fly) * 110} ${(1 - fly) * -110})`}
        opacity={t > at + 0.3 ? 1 : 0}
      >
        <path
          d="M 0 0 L 46 -46"
          stroke={PAPER}
          strokeWidth={6}
          strokeLinecap="round"
        />
        <path
          d="M 38 -58 L 58 -58 L 58 -38"
          fill="none"
          stroke={GREEN}
          strokeWidth={6}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle r={5} fill={PAPER} />
      </g>
    </svg>
  );
};

// --- Tiempo: reloj con anillo de progreso -----------------------------------
export const ClockIcon: React.FC<{ at: number }> = ({ at }) => {
  const t = useT();
  const ring = interpolate(t, [at + 0.2, at + 1.2], [0, 1], {
    ...clamp,
    easing: Easing.inOut(Easing.cubic),
  });
  const spin = Math.max(0, t - at) * 260;
  const C = 2 * Math.PI * 62;
  return (
    <svg
      width={160}
      height={160}
      viewBox="-80 -80 160 160"
      style={{ overflow: "visible" }}
    >
      <Pop at={at} ox={0} oy={0}>
        <circle r={62} fill={ICON_DARK} stroke={EDGE} strokeWidth={2.5} />
        <circle
          r={62}
          fill="none"
          stroke={GREEN}
          strokeWidth={8}
          strokeLinecap="round"
          strokeDasharray={C}
          strokeDashoffset={C * (1 - ring)}
          transform="rotate(-90)"
          style={{ filter: GLOW }}
        />
        {Array.from({ length: 12 }).map((_, i) => (
          <circle
            key={i}
            cx={0}
            cy={-46}
            r={i % 3 === 0 ? 4 : 2.5}
            fill="rgba(255,255,255,0.45)"
            transform={`rotate(${i * 30})`}
          />
        ))}
        <rect
          x={-3.5}
          y={-38}
          width={7}
          height={42}
          rx={3.5}
          fill={GREEN}
          transform={`rotate(${spin})`}
        />
        <rect
          x={-4}
          y={-24}
          width={8}
          height={28}
          rx={4}
          fill={PAPER}
          transform={`rotate(${spin / 12 + 60})`}
        />
        <circle r={8} fill={PAPER} />
      </Pop>
    </svg>
  );
};

// --- Checklist: registros, ejecución, recuperación ---------------------------
export const LogIcon: React.FC<{ at: number }> = ({ at }) => {
  const t = useT();
  return (
    <svg width={56} height={56} viewBox="0 0 56 56">
      <Pop at={at} ox={28} oy={50}>
        <rect
          x={8}
          y={8}
          width={40}
          height={44}
          rx={9}
          fill={ICON_MID}
          stroke={EDGE}
          strokeWidth={2}
        />
        <rect x={19} y={3} width={18} height={10} rx={5} fill={GREEN} />
        {[22, 31, 40].map((y, i) => {
          const p = interpolate(
            t,
            [at + 0.2 + i * 0.08, at + 0.35 + i * 0.08],
            [0, 1],
            clamp,
          );
          return (
            <rect
              key={y}
              x={16}
              y={y}
              width={(i === 2 ? 14 : 24) * p}
              height={4.5}
              rx={2.25}
              fill={PAPER}
            />
          );
        })}
      </Pop>
    </svg>
  );
};

export const MoveIcon: React.FC<{ at: number }> = ({ at }) => {
  const t = useT();
  const lift =
    Math.max(0, Math.sin((t - at - 0.3) * 5)) * 4 * (t > at + 0.3 ? 1 : 0);
  return (
    <svg width={60} height={56} viewBox="0 0 60 56">
      <Pop at={at} ox={30} oy={28}>
        <g transform={`translate(0 ${-lift})`}>
          <rect x={10} y={25} width={40} height={6} rx={3} fill={PAPER} />
          <rect x={4} y={14} width={10} height={28} rx={5} fill={GREEN} />
          <rect x={46} y={14} width={10} height={28} rx={5} fill={GREEN} />
          <rect x={0} y={19} width={6} height={18} rx={3} fill={ICON_MID} />
          <rect x={54} y={19} width={6} height={18} rx={3} fill={ICON_MID} />
        </g>
      </Pop>
    </svg>
  );
};

export const BatteryIcon: React.FC<{ at: number; p: number }> = ({ at, p }) => (
  <svg width={64} height={56} viewBox="0 0 64 56">
    <Pop at={at} ox={30} oy={28}>
      <rect
        x={4}
        y={14}
        width={50}
        height={28}
        rx={9}
        fill={ICON_DARK}
        stroke={PAPER}
        strokeWidth={3}
      />
      <rect x={56} y={22} width={6} height={12} rx={3} fill={PAPER} />
      <rect
        x={9}
        y={19}
        width={40 * p}
        height={18}
        rx={5}
        fill={GREEN}
        style={{ filter: GLOW }}
      />
      <path
        d="M 31 17 L 23 30 H 30 L 27 40 L 36 26 H 29 Z"
        fill={p > 0.5 ? INK : PAPER}
      />
    </Pop>
  </svg>
);

// --- Opciones: flechas en insignia --------------------------------------------
export const ArrowIcon: React.FC<{
  dir: "up" | "down" | "pause";
  at: number;
}> = ({ dir, at }) => {
  const t = useT();
  const ring = interpolate(t, [at, at + 0.5], [0, 1], {
    ...clamp,
    easing: Easing.bezier(0.16, 1, 0.3, 1),
  });
  const bob =
    Math.sin((t - at) * 6) * 4 * Math.min(1, Math.max(0, t - at - 0.4));
  const C = 2 * Math.PI * 48;
  return (
    <svg
      width={120}
      height={120}
      viewBox="-60 -60 120 120"
      style={{ overflow: "visible" }}
    >
      <Pop at={at} ox={0} oy={0}>
        <circle r={48} fill={ICON_DARK} stroke={EDGE} strokeWidth={2} />
        <circle
          r={48}
          fill="none"
          stroke={GREEN}
          strokeWidth={6}
          strokeLinecap="round"
          strokeDasharray={C}
          strokeDashoffset={C * (1 - ring)}
          transform="rotate(-90)"
          style={{ filter: GLOW }}
        />
        <Pop at={at + 0.18} ox={0} oy={0}>
          {dir === "pause" ? (
            <g>
              <rect
                x={-17}
                y={-20}
                width={12}
                height={40}
                rx={6}
                fill={PAPER}
              />
              <rect x={5} y={-20} width={12} height={40} rx={6} fill={PAPER} />
            </g>
          ) : (
            <g transform={`translate(0 ${dir === "up" ? -bob : bob})`}>
              <path
                d={
                  dir === "up"
                    ? "M 0 20 V -18 M -16 -2 L 0 -18 L 16 -2"
                    : "M 0 -20 V 18 M -16 2 L 0 18 L 16 2"
                }
                fill="none"
                stroke={PAPER}
                strokeWidth={8}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </g>
          )}
        </Pop>
      </Pop>
    </svg>
  );
};
