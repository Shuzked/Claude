import React from "react";
import {
  AbsoluteFill,
  Easing,
  interpolate,
  Sequence,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { FONT, GREEN, INK, PAPER } from "./theme";
import {
  f,
  SCENE_IN,
  SCENE_OUT,
  scenes,
  SOURCE_END,
  type Scene,
} from "./timeline";

// ---------------------------------------------------------------------------
// Estilo y animación

const BG = "#121212"; // negro neutro, no puro
const GLOW = "drop-shadow(0 0 10px rgba(4, 228, 0, 0.55))";
const GLOW_SOFT = "drop-shadow(0 0 18px rgba(4, 228, 0, 0.35))";
const TEXT_GLOW = "0 0 22px rgba(255,255,255,0.22)";
const GREEN_TEXT_GLOW = "0 0 18px rgba(4,228,0,0.55)";

// Zona de contenido bajo la ventana del vídeo (encima de los subtítulos).
const AREA = { x: 60, y: 925, w: 960, h: 395 };

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const easeOut = Easing.bezier(0.16, 1, 0.3, 1);
const easeInOut = Easing.bezier(0.65, 0, 0.35, 1);

const useT = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return frame / fps;
};

/** 0→1 desde `at` (segundos desde el inicio de la escena) en `dur` segundos. */
const useReveal = (at: number, dur = 0.35, ease = easeOut) => {
  const t = useT();
  return interpolate(t, [at, at + dur], [0, 1], { ...clamp, easing: ease });
};

const useSpringAt = (at: number, damping = 14) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return spring({
    frame: frame - at * fps,
    fps,
    config: { damping, stiffness: 210, mass: 0.6 },
  });
};

const display: React.CSSProperties = {
  fontFamily: FONT,
  fontWeight: 900,
  fontStyle: "italic",
  textTransform: "uppercase",
  letterSpacing: -1,
  lineHeight: 0.95,
  whiteSpace: "nowrap",
  color: PAPER,
  textShadow: TEXT_GLOW,
};

const label: React.CSSProperties = {
  fontFamily: FONT,
  fontWeight: 700,
  fontSize: 24,
  letterSpacing: 6,
  textTransform: "uppercase",
  color: GREEN,
  whiteSpace: "nowrap",
  textShadow: GREEN_TEXT_GLOW,
};

/** Texto que sube detrás de una máscara. */
const MaskUp: React.FC<{
  p: number;
  children: React.ReactNode;
  style?: React.CSSProperties;
}> = ({ p, children, style }) => (
  <div
    style={{
      overflow: "hidden",
      padding: "6px 14px 6px 4px",
      margin: "-6px -14px -6px -4px",
      ...style,
    }}
  >
    <div style={{ transform: `translateY(${(1 - p) * 115}%)` }}>{children}</div>
  </div>
);

/** Subrayador: trazo verde irregular que pinta de izquierda a derecha detrás del
 *  contenido; el texto se mantiene en blanco y gana glow al pintarse. */
const Marker: React.FC<{ p: number; children: React.ReactNode }> = ({
  p,
  children,
}) => {
  return (
    <div style={{ position: "relative", display: "inline-block" }}>
      <svg
        viewBox="0 0 200 52"
        preserveAspectRatio="none"
        style={{
          position: "absolute",
          left: -12,
          top: "14%",
          width: "calc(100% + 24px)",
          height: "80%",
          overflow: "visible",
          transform: "rotate(-1.5deg)",
          clipPath: `inset(0 ${(1 - p) * 100}% 0 0)`,
          filter: GLOW,
        }}
      >
        <path
          d="M 2 9 C 20 5, 45 7, 70 5 S 120 6, 150 4 L 198 3 L 196 47 C 170 49, 140 46, 110 48 S 50 46, 24 49 L 0 50 Z"
          fill={GREEN}
          opacity={0.95}
        />
      </svg>
      {/* el texto sigue en blanco y gana glow cuando lo pinta el subrayador */}
      <div
        style={{
          position: "relative",
          filter: `drop-shadow(0 0 ${6 + 12 * p}px rgba(255,255,255,${0.25 + 0.45 * p}))`,
        }}
      >
        {children}
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Fondo de escena a pantalla completa: textura vintage con detalle

const Backdrop: React.FC<{ scene: Scene }> = ({ scene }) => {
  const frame = useCurrentFrame();
  const t = useT();
  const { durationInFrames, fps } = useVideoConfig();
  const end = durationInFrames / fps;
  const last = scene.to >= SOURCE_END - 0.05;
  const inQ = interpolate(t, [0, SCENE_IN], [0, 1], {
    ...clamp,
    easing: easeInOut,
  });
  const outQ = last
    ? 0
    : interpolate(t, [end - SCENE_OUT, end], [0, 1], {
        ...clamp,
        easing: easeInOut,
      });
  // cortinilla diagonal: entra desde la izquierda y sale hacia la derecha
  const a = inQ * 130;
  const b = outQ * 130;
  const clip = `polygon(${b}% 0, ${a}% 0, ${a - 30}% 100%, ${b - 30}% 100%)`;

  const seed = Math.floor(frame / 2) % 9;
  const flicker =
    1 + Math.sin(frame * 1.7) * 0.015 + Math.sin(frame * 0.37) * 0.012;
  const scratch = (frame * 37) % 97 < 5;
  const scratchX = ((frame * 53) % 89) + 5;
  const drift = t * 26;

  return (
    <AbsoluteFill style={{ clipPath: clip }}>
      <AbsoluteFill
        style={{ background: BG, filter: `brightness(${flicker})` }}
      >
        {/* luz de estudio muy suave */}
        <AbsoluteFill
          style={{
            background:
              "radial-gradient(ellipse 80% 45% at 50% 28%, rgba(255,255,255,0.06), transparent 70%)",
          }}
        />
        {/* cuadrícula técnica */}
        <AbsoluteFill
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.035) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.035) 1px, transparent 1px)",
            backgroundSize: "60px 60px",
            backgroundPosition: `${-drift * 0.3}px ${-drift * 0.15}px`,
          }}
        />
        {/* título gigante en contorno, desplazándose */}
        <div
          style={{
            position: "absolute",
            top: 1500,
            left: 60 - drift,
            fontFamily: FONT,
            fontWeight: 900,
            fontStyle: "italic",
            fontSize: 330,
            lineHeight: 1,
            textTransform: "uppercase",
            whiteSpace: "nowrap",
            color: "transparent",
            WebkitTextStroke: "2px rgba(255,255,255,0.07)",
          }}
        >
          {scene.title} · {scene.title}
        </div>
        {/* grano */}
        <svg
          width="100%"
          height="100%"
          style={{ position: "absolute", opacity: 0.2, mixBlendMode: "screen" }}
        >
          <filter id={`bd-${scene.id}-${seed}`}>
            <feTurbulence
              type="fractalNoise"
              baseFrequency="0.8"
              numOctaves={2}
              seed={seed}
            />
            <feColorMatrix type="saturate" values="0" />
          </filter>
          <rect
            width="100%"
            height="100%"
            filter={`url(#bd-${scene.id}-${seed})`}
          />
        </svg>
        {/* líneas de escaneo */}
        <AbsoluteFill
          style={{
            background:
              "repeating-linear-gradient(0deg, rgba(255,255,255,0.03) 0px, rgba(255,255,255,0.03) 1px, transparent 1px, transparent 4px)",
          }}
        />
        {scratch ? (
          <div
            style={{
              position: "absolute",
              top: 0,
              bottom: 0,
              left: `${scratchX}%`,
              width: 1.5,
              background: "rgba(255,255,255,0.14)",
            }}
          />
        ) : null}
        <AbsoluteFill
          style={{ boxShadow: "inset 0 0 200px rgba(0,0,0,0.3)" }}
        />
      </AbsoluteFill>
      {/* borde de la cortinilla */}
      {inQ < 1 || outQ > 0 ? (
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: GREEN,
            clipPath: `polygon(${a - 1.2}% 0, ${a}% 0, ${a - 30}% 100%, ${a - 31.2}% 100%)`,
            filter: GLOW,
          }}
        />
      ) : null}
    </AbsoluteFill>
  );
};

/** Contenedor del contenido. En escenas completas ocupa el centro de la pantalla;
 *  sobre la persona va en la parte baja con una sombra para que se lea. */
const Content: React.FC<{ scene: Scene; children: React.ReactNode }> = ({
  scene,
  children,
}) => {
  const t = useT();
  const { durationInFrames, fps } = useVideoConfig();
  const end = durationInFrames / fps;
  const last = scene.to >= SOURCE_END - 0.05;
  const overlay = scene.mode === "overlay";
  const out = last
    ? 0
    : interpolate(t, [end - SCENE_OUT - 0.05, end - 0.08], [0, 1], {
        ...clamp,
        easing: easeInOut,
      });
  const scrimIn = interpolate(t, [0, 0.3], [0, 1], clamp);
  return (
    <AbsoluteFill>
      {overlay ? (
        <AbsoluteFill
          style={{
            opacity: scrimIn * (1 - out),
            background:
              "linear-gradient(180deg, transparent 0%, transparent 42%, rgba(12,12,12,0.78) 58%, rgba(12,12,12,0.9) 100%)",
          }}
        />
      ) : null}
      <div
        style={{
          position: "absolute",
          left: AREA.x,
          top: overlay ? 1060 : 0,
          width: AREA.w,
          height: overlay ? 520 : 1920,
          opacity: 1 - out,
          transform: `translateX(${out * 60}px)`,
        }}
      >
        {children}
      </div>
    </AbsoluteFill>
  );
};

const SceneBlock: React.FC<{ id: string }> = ({ id }) => {
  const scene = scenes.find((s) => s.id === id)!;
  return (
    <Sequence
      from={f(scene.from)}
      durationInFrames={f(scene.to) - f(scene.from)}
      name={`Fondo · ${scene.title}`}
    >
      <Backdrop scene={scene} />
    </Sequence>
  );
};

const SceneContent: React.FC<{ id: string; children: React.ReactNode }> = ({
  id,
  children,
}) => {
  const scene = scenes.find((s) => s.id === id)!;
  return (
    <Sequence
      from={f(scene.from)}
      durationInFrames={f(scene.to) - f(scene.from)}
      name={`Gráfico · ${scene.title}`}
    >
      <Content scene={scene}>{children}</Content>
    </Sequence>
  );
};

// Composición de una escena completa: titular arriba y recurso visual debajo.
const HEADLINE_TOP = 430;
const VISUAL_TOP = 880;

type HeadLine = { text: string; at: number; marker?: number };

const Headline: React.FC<{ lines: HeadLine[]; size?: number }> = ({
  lines,
  size = 118,
}) => (
  <div style={{ position: "absolute", top: HEADLINE_TOP, left: 0, right: 0 }}>
    {lines.map((l, i) => (
      <HeadlineLine key={i} {...l} size={size} />
    ))}
  </div>
);

const HeadlineLine: React.FC<HeadLine & { size: number }> = ({
  text,
  at,
  marker,
  size,
}) => {
  const p = useReveal(at, 0.42);
  const m = useReveal(marker ?? 999, 0.35);
  const body = (
    <div style={{ ...display, fontSize: size, padding: "0 10px" }}>{text}</div>
  );
  return (
    <MaskUp p={p} style={{ display: "block", marginBottom: 4 }}>
      {marker !== undefined ? <Marker p={m}>{body}</Marker> : body}
    </MaskUp>
  );
};

const Visual: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div style={{ position: "absolute", top: VISUAL_TOP, left: 0, right: 0 }}>
    {children}
  </div>
);

/** Tiempo del original → segundos desde el inicio de la escena. */
const rel = (id: string, sourceSeconds: number) =>
  sourceSeconds - scenes.find((s) => s.id === id)!.from;

// ---------------------------------------------------------------------------
// 01 · E02 «el Excel» → «el pecho sigue igual»

const Spreadsheet: React.FC<{ at: number }> = ({ at }) => {
  const t = useT();
  const grid = useReveal(at, 0.4);
  const cols = ["Ejercicio", "Series", "Reps", "Carga", "Notas"];
  const widths = [250, 150, 150, 150, 180];
  const rows = 4;
  const rowH = 46;
  const x0 = 46;
  const W = widths.reduce((a, b) => a + b, 0);
  // cursor de celda que salta como si alguien estuviera editando
  const step = Math.max(0, Math.floor((t - at - 0.3) / 0.14));
  const cr = (step * 3) % rows;
  const cc = (step * 2 + 1) % cols.length;
  const cx = x0 + widths.slice(0, cc).reduce((a, b) => a + b, 0);
  return (
    <div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 14,
          opacity: grid,
        }}
      >
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            style={{
              width: 12,
              height: 12,
              borderRadius: 6,
              background: i === 0 ? GREEN : "rgba(255,255,255,0.25)",
            }}
          />
        ))}
        <div style={{ ...label, marginLeft: 8 }}>rutina.xlsx</div>
      </div>
      <svg
        width={x0 + W}
        height={30 + rowH * (rows + 1)}
        style={{ marginTop: 16, display: "block", overflow: "visible" }}
      >
        {/* letras de columna */}
        {cols.map((_, i) => (
          <text
            key={`l${i}`}
            x={x0 + widths.slice(0, i).reduce((a, b) => a + b, 0) + 10}
            y={18}
            fill="rgba(255,255,255,0.35)"
            fontFamily={FONT}
            fontWeight={700}
            fontSize={16}
            opacity={grid}
          >
            {String.fromCharCode(65 + i)}
          </text>
        ))}
        {/* cabecera */}
        <rect
          x={x0}
          y={28}
          width={W * grid}
          height={rowH}
          fill={GREEN}
          opacity={0.95}
          style={{ filter: GLOW_SOFT }}
        />
        {cols.map((c, i) => (
          <text
            key={`h${i}`}
            x={x0 + widths.slice(0, i).reduce((a, b) => a + b, 0) + 12}
            y={28 + 30}
            fill={INK}
            fontFamily={FONT}
            fontWeight={800}
            fontSize={19}
            opacity={interpolate(
              t,
              [at + 0.15 + i * 0.04, at + 0.3 + i * 0.04],
              [0, 1],
              clamp,
            )}
          >
            {c.toUpperCase()}
          </text>
        ))}
        {/* números de fila */}
        {Array.from({ length: rows + 1 }).map((_, r) => (
          <text
            key={`n${r}`}
            x={14}
            y={28 + rowH * r + 30}
            fill="rgba(255,255,255,0.35)"
            fontFamily={FONT}
            fontWeight={700}
            fontSize={16}
            opacity={grid}
          >
            {r + 1}
          </text>
        ))}
        {/* rejilla */}
        {Array.from({ length: rows + 2 }).map((_, r) => (
          <line
            key={`r${r}`}
            x1={x0}
            x2={x0 + W * grid}
            y1={28 + rowH * r}
            y2={28 + rowH * r}
            stroke="rgba(255,255,255,0.22)"
            strokeWidth={1.5}
          />
        ))}
        {widths.map((_, i) => {
          const x = x0 + widths.slice(0, i).reduce((a, b) => a + b, 0);
          return (
            <line
              key={`c${i}`}
              x1={x}
              x2={x}
              y1={28}
              y2={28 + rowH * (rows + 1) * grid}
              stroke="rgba(255,255,255,0.22)"
              strokeWidth={1.5}
            />
          );
        })}
        <line
          x1={x0 + W}
          x2={x0 + W}
          y1={28}
          y2={28 + rowH * (rows + 1) * grid}
          stroke="rgba(255,255,255,0.22)"
          strokeWidth={1.5}
        />
        {/* contenido de celdas: barras como texto difuminado */}
        {Array.from({ length: rows * cols.length }).map((_, i) => {
          const r = Math.floor(i / cols.length);
          const c = i % cols.length;
          const s0 = at + 0.3 + i * 0.025;
          const p = interpolate(t, [s0, s0 + 0.1], [0, 1], clamp);
          const w = Math.min(widths[c] - 30, ((i * 41) % 70) + 34);
          const x = x0 + widths.slice(0, c).reduce((a, b) => a + b, 0) + 12;
          return (
            <rect
              key={`v${i}`}
              x={x}
              y={28 + rowH * (r + 1) + 19}
              width={w * p}
              height={9}
              rx={2}
              fill={PAPER}
              opacity={0.55}
            />
          );
        })}
        {/* cursor */}
        {t > at + 0.3 ? (
          <rect
            x={cx}
            y={28 + rowH * (cr + 1)}
            width={widths[cc]}
            height={rowH}
            fill="rgba(4,228,0,0.12)"
            stroke={GREEN}
            strokeWidth={3}
            style={{ filter: GLOW }}
          />
        ) : null}
      </svg>
    </div>
  );
};

// Torso minimalista de línea: el pecho se ilumina
const Torso: React.FC<{ at: number; glowAt: number }> = ({ at, glowAt }) => {
  const t = useT();
  const draw = useReveal(at, 0.7, easeInOut);
  const glow = useReveal(glowAt, 0.35);
  const pulse = glow * (0.75 + 0.25 * Math.sin((t - glowAt) * 9));
  const L = 1400;
  const stroke = {
    fill: "none",
    stroke: PAPER,
    strokeWidth: 3.5,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    strokeDasharray: L,
    strokeDashoffset: L * (1 - draw),
    opacity: 0.9,
  };
  return (
    <svg
      width={330}
      height={330}
      viewBox="0 0 330 330"
      style={{ overflow: "visible" }}
    >
      <defs>
        <filter id="pec-glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation={10 + 6 * pulse} result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      {/* pectorales: relleno que se enciende */}
      <g filter="url(#pec-glow)" opacity={glow}>
        <path
          d="M 163 112 C 140 104, 108 104, 88 118 C 80 140, 92 162, 118 166 C 140 168, 158 160, 163 148 Z"
          fill={GREEN}
          opacity={0.55 + 0.35 * pulse}
        />
        <path
          d="M 167 112 C 190 104, 222 104, 242 118 C 250 140, 238 162, 212 166 C 190 168, 172 160, 167 148 Z"
          fill={GREEN}
          opacity={0.55 + 0.35 * pulse}
        />
      </g>
      {/* contorno del torso */}
      <path
        {...stroke}
        d="M 140 40 C 142 58, 140 70, 128 78 C 104 86, 72 88, 56 100 C 40 112, 36 140, 38 176 L 40 240"
      />
      <path
        {...stroke}
        d="M 190 40 C 188 58, 190 70, 202 78 C 226 86, 258 88, 274 100 C 290 112, 294 140, 292 176 L 290 240"
      />
      <path {...stroke} d="M 72 150 C 76 200, 88 250, 100 300" />
      <path {...stroke} d="M 258 150 C 254 200, 242 250, 230 300" />
      {/* línea de pectorales */}
      <path
        {...stroke}
        d="M 88 118 C 80 140, 92 162, 118 166 C 140 168, 158 160, 165 146 C 172 160, 190 168, 212 166 C 238 162, 250 140, 242 118"
      />
      {/* clavículas */}
      <path
        {...stroke}
        d="M 128 80 C 140 92, 152 96, 165 96 C 178 96, 190 92, 202 80"
      />
      {/* abdomen */}
      <path {...stroke} d="M 165 170 L 165 296" strokeWidth={2.5} />
      <path
        {...stroke}
        d="M 135 196 C 150 200, 180 200, 195 196 M 137 232 C 150 236, 180 236, 193 232 M 140 266 C 152 270, 178 270, 190 266"
        strokeWidth={2.5}
      />
      {/* etiqueta de zona */}
      <g opacity={glow}>
        <line
          x1={242}
          y1={130}
          x2={300}
          y2={70}
          stroke={GREEN}
          strokeWidth={2.5}
          style={{ filter: GLOW }}
        />
        <circle cx={242} cy={130} r={5} fill={GREEN} />
      </g>
    </svg>
  );
};

const FlatChart: React.FC<{ at: number }> = ({ at }) => {
  const t = useT();
  const axes = useReveal(at, 0.35);
  const line = useReveal(at + 0.2, 0.6, Easing.linear);
  const W = 520;
  const H = 190;
  const y = H * 0.55;
  const dot = 0.6 + 0.4 * Math.sin(t * 10);
  return (
    <div>
      <div style={label}>Pecho · progreso</div>
      <svg
        width={W}
        height={H + 34}
        style={{ marginTop: 14, display: "block", overflow: "visible" }}
      >
        {[0.2, 0.4, 0.6, 0.8].map((g) => (
          <line
            key={g}
            x1={30}
            x2={W}
            y1={H * g}
            y2={H * g}
            stroke="rgba(255,255,255,0.08)"
            strokeWidth={1.5}
            opacity={axes}
          />
        ))}
        <path
          d={`M 30 0 L 30 ${H} L ${W} ${H}`}
          fill="none"
          stroke={PAPER}
          strokeWidth={3}
          strokeDasharray={W + H}
          strokeDashoffset={(W + H) * (1 - axes)}
        />
        {Array.from({ length: 8 }).map((_, i) => (
          <text
            key={i}
            x={46 + i * 60}
            y={H + 28}
            fill="rgba(255,255,255,0.4)"
            fontFamily={FONT}
            fontWeight={700}
            fontSize={15}
            opacity={axes}
          >
            S{i + 1}
          </text>
        ))}
        <path
          d={`M 40 ${y} L ${W - 20} ${y}`}
          fill="none"
          stroke={GREEN}
          strokeWidth={7}
          strokeLinecap="round"
          strokeDasharray={W}
          strokeDashoffset={W * (1 - line)}
          style={{ filter: GLOW }}
        />
        {Array.from({ length: 8 }).map((_, i) => {
          const x = 52 + i * 60;
          const vis = line * (W - 60) + 40 > x ? 1 : 0;
          return (
            <circle
              key={i}
              cx={x}
              cy={y}
              r={6}
              fill={BG}
              stroke={GREEN}
              strokeWidth={3}
              opacity={vis}
            />
          );
        })}
        <circle
          cx={40 + (W - 60) * line}
          cy={y}
          r={9 * dot + 4}
          fill={GREEN}
          opacity={line > 0.02 ? 0.5 : 0}
          style={{ filter: GLOW }}
        />
      </svg>
    </div>
  );
};

const ExcelScene: React.FC = () => {
  const swapAt = rel("excel", 8.06);
  const swap = useReveal(swapAt, 0.4, easeInOut);
  const { fps } = useVideoConfig();
  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
        overflow: "hidden",
      }}
    >
      {/* vista A: «de momento, el Excel» + hoja de cálculo */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          transform: `translateX(${-swap * 110}%)`,
        }}
      >
        <Headline
          lines={[
            { text: "De momento,", at: SCENE_IN - 0.15 },
            {
              text: "el Excel",
              at: SCENE_IN - 0.02,
              marker: rel("excel", 7.36),
            },
          ]}
        />
        <Visual>
          <Spreadsheet at={SCENE_IN} />
        </Visual>
      </div>
      {/* vista B: «el pecho sigue igual» + torso iluminado + gráfica plana */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          transform: `translateX(${(1 - swap) * 110}%)`,
        }}
      >
        <Sequence from={Math.round(swapAt * fps)} layout="none">
          <Headline
            lines={[
              {
                text: "El pecho",
                at: 0.05,
                marker: rel("excel", 8.2) - swapAt,
              },
              {
                text: "sigue igual",
                at: 0.2,
                marker: rel("excel", 8.48) - swapAt,
              },
            ]}
          />
          <Visual>
            <div style={{ display: "flex", alignItems: "center", gap: 30 }}>
              <div
                style={{
                  transform: "scale(1.15)",
                  transformOrigin: "left center",
                  width: 380,
                }}
              >
                <Torso at={0.05} glowAt={rel("excel", 8.2) - swapAt} />
              </div>
              <FlatChart at={0.15} />
            </div>
          </Visual>
        </Sequence>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// 02 · E03 herramientas (sin cruces ni valoración)

const Card: React.FC<{
  at: number;
  index: number;
  title: React.ReactNode;
  children: React.ReactNode;
  width?: number;
  // pinta el título con subrayador (destacados del guion)
  marker?: boolean;
  // título centrado en la caja
  center?: boolean;
}> = ({ at, index, title, children, width = 290, marker, center }) => {
  const p = useSpringAt(at, 15);
  const line = useReveal(at + 0.1, 0.4);
  const m = useReveal(at + 0.12, 0.35);
  return (
    <div
      style={{
        position: "relative",
        width,
        height: 330,
        background: "rgba(255,255,255,0.035)",
        border: "1.5px solid rgba(255,255,255,0.1)",
        transform: `translateY(${(1 - p) * 60}px)`,
        opacity: Math.min(1, p * 2),
        padding: "20px 22px",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          height: 4,
          width: `${line * 100}%`,
          background: GREEN,
          filter: GLOW,
        }}
      />
      <div
        style={{
          ...label,
          fontSize: 20,
          color: "rgba(255,255,255,0.45)",
          textShadow: "none",
        }}
      >
        {String(index).padStart(2, "0")}
      </div>
      <div
        style={{
          height: 170,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {children}
      </div>
      <div
        style={{
          ...display,
          fontSize: 30,
          textAlign: center ? "center" : "left",
        }}
      >
        {marker ? (
          <Marker p={m}>
            <div style={{ padding: "2px 6px" }}>{title}</div>
          </Marker>
        ) : (
          title
        )}
      </div>
    </div>
  );
};

const VolumeIcon: React.FC<{ at: number }> = ({ at }) => {
  const t = useT();
  return (
    <svg width={190} height={140} style={{ overflow: "visible", filter: GLOW }}>
      {[0, 1, 2, 3, 4, 5].map((i) => {
        const p = interpolate(t, [at + i * 0.06, at + i * 0.06 + 0.3], [0, 1], {
          ...clamp,
          easing: easeOut,
        });
        const h = (40 + i * 18) * p;
        return (
          <rect
            key={i}
            x={i * 32}
            y={140 - h}
            width={22}
            height={h}
            fill={i === 5 ? GREEN : PAPER}
            opacity={i === 5 ? 1 : 0.85}
          />
        );
      })}
    </svg>
  );
};

const CalendarIcon: React.FC<{ at: number }> = ({ at }) => {
  const t = useT();
  const days = ["L", "M", "X", "J", "V", "S", "D"];
  const on = [0, 2, 4];
  return (
    <svg width={230} height={120} style={{ overflow: "visible" }}>
      {days.map((d, i) => {
        const p = interpolate(
          t,
          [at + i * 0.04, at + i * 0.04 + 0.2],
          [0, 1],
          clamp,
        );
        const lit = on.includes(i) && t > at + 0.35 + on.indexOf(i) * 0.12;
        return (
          <g key={i} opacity={p}>
            <rect
              x={i * 33}
              y={30}
              width={27}
              height={60}
              fill={lit ? GREEN : "none"}
              stroke={lit ? GREEN : "rgba(255,255,255,0.4)"}
              strokeWidth={2}
              style={lit ? { filter: GLOW } : undefined}
            />
            <text
              x={i * 33 + 13.5}
              y={20}
              textAnchor="middle"
              fill="rgba(255,255,255,0.6)"
              fontFamily={FONT}
              fontWeight={700}
              fontSize={15}
            >
              {d}
            </text>
          </g>
        );
      })}
      <text
        x={115}
        y={118}
        textAnchor="middle"
        fill={GREEN}
        fontFamily={FONT}
        fontWeight={900}
        fontStyle="italic"
        fontSize={22}
        opacity={interpolate(t, [at + 0.6, at + 0.8], [0, 1], clamp)}
        style={{ filter: GLOW }}
      >
        3× / SEMANA
      </text>
    </svg>
  );
};

const DropIcon: React.FC<{ at: number }> = ({ at }) => {
  const t = useT();
  return (
    <svg width={200} height={140} style={{ overflow: "visible" }}>
      {[0, 1, 2, 3].map((i) => {
        const p = interpolate(t, [at + i * 0.1, at + i * 0.1 + 0.25], [0, 1], {
          ...clamp,
          easing: easeOut,
        });
        const h = (120 - i * 26) * p;
        return (
          <rect
            key={i}
            x={i * 48}
            y={140 - h}
            width={36}
            height={h}
            fill={PAPER}
            opacity={0.9 - i * 0.12}
          />
        );
      })}
      <path
        d="M 10 10 L 70 34 L 118 58 L 168 84"
        fill="none"
        stroke={GREEN}
        strokeWidth={5}
        strokeDasharray={200}
        strokeDashoffset={
          200 * (1 - interpolate(t, [at + 0.4, at + 0.8], [0, 1], clamp))
        }
        style={{ filter: GLOW }}
      />
      <path
        d="M 168 84 l -16 -2 M 168 84 l -6 -14"
        stroke={GREEN}
        strokeWidth={5}
        opacity={t > at + 0.8 ? 1 : 0}
      />
    </svg>
  );
};

const ToolsScene: React.FC = () => (
  <>
    <Headline
      lines={[
        { text: "Lo que", at: SCENE_IN - 0.15 },
        { text: "ha cambiado", at: SCENE_IN - 0.02 },
      ]}
    />
    <Visual>
      <div style={{ display: "flex", gap: 45 }}>
        <Card at={rel("tools", 11.62)} index={1} title="Volumen" marker>
          <VolumeIcon at={rel("tools", 11.7)} />
        </Card>
        <Card at={rel("tools", 12.42)} index={2} title="Frecuencia 3" marker>
          <CalendarIcon at={rel("tools", 12.5)} />
        </Card>
        <Card at={rel("tools", 13.7)} index={3} title="Drop sets" marker>
          <DropIcon at={rel("tools", 13.78)} />
        </Card>
      </div>
    </Visual>
  </>
);

// ---------------------------------------------------------------------------
// 03 · E04 «tres vídeos» (sin creadores ni contenido ajeno)

const Phone: React.FC<{ at: number; n: number; rot: number }> = ({
  at,
  n,
  rot,
}) => {
  const t = useT();
  const p = useSpringAt(at, 12);
  const prog = interpolate(t, [at + 0.2, at + 1.6], [0, 1], clamp);
  return (
    <div
      style={{
        width: 170,
        height: 300,
        border: `5px solid ${PAPER}`,
        borderRadius: 26,
        background: "#1a1a1a",
        position: "relative",
        transform: `translateY(${(1 - p) * 80}px) rotate(${rot * p}deg)`,
        opacity: Math.min(1, p * 2),
        overflow: "hidden",
        boxShadow: "0 0 26px rgba(255,255,255,0.08)",
      }}
    >
      <div
        style={{
          position: "absolute",
          top: 10,
          left: "50%",
          marginLeft: -22,
          width: 44,
          height: 7,
          borderRadius: 4,
          background: "rgba(255,255,255,0.25)",
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: "40px 14px 70px",
          border: "1.5px solid rgba(255,255,255,0.12)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <svg width={50} height={56} style={{ filter: GLOW }}>
          <path d="M 6 4 L 46 28 L 6 52 Z" fill={GREEN} />
        </svg>
      </div>
      <div
        style={{
          position: "absolute",
          left: 14,
          right: 14,
          bottom: 46,
          height: 5,
          background: "rgba(255,255,255,0.15)",
        }}
      >
        <div
          style={{
            width: `${prog * 100}%`,
            height: "100%",
            background: GREEN,
            filter: GLOW,
          }}
        />
      </div>
      <div
        style={{
          position: "absolute",
          left: 14,
          bottom: 16,
          ...label,
          fontSize: 16,
          letterSpacing: 3,
          color: PAPER,
          textShadow: "none",
        }}
      >
        Vídeo {n}
      </div>
    </div>
  );
};

const VideosScene: React.FC = () => {
  const three = useSpringAt(rel("videos", 24.32), 12);
  const word = useReveal(rel("videos", 24.6) - 0.05, 0.35);
  const mark = useReveal(rel("videos", 24.6), 0.35);
  return (
    <div
      style={{ display: "flex", alignItems: "center", gap: 46, height: "100%" }}
    >
      <div style={{ display: "flex", gap: 18 }}>
        <Phone at={SCENE_IN - 0.15} n={1} rot={-5} />
        <Phone at={SCENE_IN} n={2} rot={0} />
        <Phone at={SCENE_IN + 0.15} n={3} rot={5} />
      </div>
      {/* «3» grande y «vídeos» debajo, centrados en vertical; solo «vídeos» se subraya */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div
          style={{
            ...display,
            fontSize: 230,
            lineHeight: 0.85,
            letterSpacing: -6,
            transform: `scale(${0.6 + 0.4 * three})`,
            opacity: Math.min(1, three * 2),
          }}
        >
          3
        </div>
        <MaskUp p={word} style={{ marginTop: 6 }}>
          <Marker p={mark}>
            <div style={{ ...display, fontSize: 56, padding: "0 8px" }}>
              vídeos
            </div>
          </Marker>
        </MaskUp>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// 04 · ajustar el trabajo a tus prioridades y al tiempo que tienes

const TargetIcon: React.FC<{ at: number }> = ({ at }) => {
  const t = useT();
  const p = interpolate(t, [at, at + 0.6], [0, 1], {
    ...clamp,
    easing: easeOut,
  });
  const hit = interpolate(t, [at + 0.5, at + 0.7], [0, 1], clamp);
  return (
    <svg
      width={150}
      height={150}
      viewBox="-75 -75 150 150"
      style={{ overflow: "visible" }}
    >
      {[66, 46, 26].map((r, i) => (
        <circle
          key={r}
          r={r}
          fill="none"
          stroke={i === 2 ? GREEN : PAPER}
          strokeWidth={4}
          strokeDasharray={2 * Math.PI * r}
          strokeDashoffset={2 * Math.PI * r * (1 - p)}
          opacity={0.9}
          style={i === 2 ? { filter: GLOW } : undefined}
        />
      ))}
      <circle r={9 * hit} fill={GREEN} style={{ filter: GLOW }} />
    </svg>
  );
};

const ClockIcon: React.FC<{ at: number }> = ({ at }) => {
  const t = useT();
  const p = interpolate(t, [at, at + 0.5], [0, 1], {
    ...clamp,
    easing: easeOut,
  });
  const spin = Math.max(0, t - at) * 220;
  return (
    <svg
      width={150}
      height={150}
      viewBox="-75 -75 150 150"
      style={{ overflow: "visible" }}
    >
      <circle
        r={64}
        fill="none"
        stroke={PAPER}
        strokeWidth={4}
        strokeDasharray={402}
        strokeDashoffset={402 * (1 - p)}
      />
      {Array.from({ length: 12 }).map((_, i) => (
        <line
          key={i}
          x1={0}
          y1={-56}
          x2={0}
          y2={-48}
          stroke="rgba(255,255,255,0.5)"
          strokeWidth={3}
          transform={`rotate(${i * 30})`}
          opacity={p}
        />
      ))}
      <line
        x1={0}
        y1={0}
        x2={0}
        y2={-42}
        stroke={GREEN}
        strokeWidth={5}
        strokeLinecap="round"
        transform={`rotate(${spin})`}
        opacity={p}
        style={{ filter: GLOW }}
      />
      <line
        x1={0}
        y1={0}
        x2={0}
        y2={-28}
        stroke={PAPER}
        strokeWidth={5}
        strokeLinecap="round"
        transform={`rotate(${spin / 12})`}
        opacity={p}
      />
      <circle r={6} fill={GREEN} opacity={p} />
    </svg>
  );
};

const PrioScene: React.FC = () => {
  return (
    <>
      <Headline
        lines={[
          { text: "Ajustar", at: SCENE_IN - 0.15 },
          { text: "el trabajo a", at: SCENE_IN - 0.02 },
        ]}
      />
      <Visual>
        <div style={{ display: "flex", gap: 40 }}>
          <Card
            at={rel("prio", 33.7)}
            index={1}
            title="Tus prioridades"
            width={460}
          >
            <TargetIcon at={rel("prio", 33.8)} />
          </Card>
          <Card at={rel("prio", 34.86)} index={2} title="Tu tiempo" width={460}>
            <ClockIcon at={rel("prio", 34.95)} />
          </Card>
        </div>
      </Visual>
    </>
  );
};

// ---------------------------------------------------------------------------
// 05 · E06 «solo lo que haga falta»

const FaltaScene: React.FC = () => {
  const t = useT();
  const a = useReveal(rel("falta", 38.96) - 0.05, 0.35);
  const b = useReveal(rel("falta", 39.5), 0.35);
  const mark = useReveal(rel("falta", 39.6), 0.35);
  // la rutina se mantiene y solo se ajustan dos piezas
  const blocks = 8;
  const changed = [2, 5];
  return (
    <div>
      <MaskUp p={a}>
        <div style={{ ...display, fontSize: 70 }}>Solo lo que</div>
      </MaskUp>
      <div style={{ marginTop: 8 }}>
        <MaskUp p={b} style={{ display: "inline-block" }}>
          <Marker p={mark}>
            <div
              style={{
                ...display,
                fontSize: 96,
                padding: "0 10px",
                color: PAPER,
              }}
            >
              haga falta
            </div>
          </Marker>
        </MaskUp>
      </div>
      <div style={{ display: "flex", gap: 14, marginTop: 34 }}>
        {Array.from({ length: blocks }).map((_, i) => {
          const p = interpolate(
            t,
            [SCENE_IN + i * 0.04, SCENE_IN + i * 0.04 + 0.25],
            [0, 1],
            clamp,
          );
          const lit =
            changed.includes(i) &&
            t > rel("falta", 39.7) + changed.indexOf(i) * 0.15;
          return (
            <div
              key={i}
              style={{
                width: 100,
                height: 70,
                border: `2px solid ${lit ? GREEN : "rgba(255,255,255,0.3)"}`,
                background: lit
                  ? "rgba(4,228,0,0.18)"
                  : "rgba(255,255,255,0.03)",
                opacity: p,
                transform: `translateY(${(1 - p) * 20}px) scale(${lit ? 1.06 : 1})`,
                filter: lit ? GLOW : undefined,
              }}
            />
          );
        })}
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// 06 · antes de añadir más: registros, ejecución, recuperación

const LogIcon = () => (
  <svg width={44} height={44}>
    <rect
      x={4}
      y={3}
      width={36}
      height={38}
      fill="none"
      stroke={PAPER}
      strokeWidth={3}
    />
    <path
      d="M 11 14 H 33 M 11 22 H 33 M 11 30 H 25"
      stroke={PAPER}
      strokeWidth={3}
    />
  </svg>
);
const MoveIcon = () => (
  <svg width={44} height={44}>
    <path d="M 4 22 H 40" stroke={PAPER} strokeWidth={4} />
    <rect x={6} y={10} width={7} height={24} fill={PAPER} />
    <rect x={31} y={10} width={7} height={24} fill={PAPER} />
  </svg>
);
const BatteryIcon: React.FC<{ p: number }> = ({ p }) => (
  <svg width={52} height={44}>
    <rect
      x={3}
      y={10}
      width={40}
      height={24}
      fill="none"
      stroke={PAPER}
      strokeWidth={3}
    />
    <rect x={44} y={17} width={5} height={10} fill={PAPER} />
    <rect
      x={8}
      y={15}
      width={30 * p}
      height={14}
      fill={GREEN}
      style={{ filter: GLOW }}
    />
  </svg>
);

const CheckRow: React.FC<{
  at: number;
  text: string;
  icon: React.ReactNode;
}> = ({ at, text, icon }) => {
  const row = useReveal(at - 0.25, 0.35);
  const tick = useReveal(at, 0.3);
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 26,
        height: 96,
        borderBottom: "1.5px solid rgba(255,255,255,0.08)",
        opacity: row,
        transform: `translateX(${(1 - row) * -30}px)`,
      }}
    >
      <div style={{ width: 56, display: "flex", justifyContent: "center" }}>
        {icon}
      </div>
      <div
        style={{
          ...display,
          fontStyle: "normal",
          fontWeight: 800,
          fontSize: 52,
          flex: 1,
          textTransform: "none",
          letterSpacing: 0,
        }}
      >
        {text}
      </div>
      <svg
        width={56}
        height={56}
        style={{ filter: tick > 0 ? GLOW : undefined }}
      >
        <rect
          x={3}
          y={3}
          width={50}
          height={50}
          fill={tick > 0.5 ? "rgba(4,228,0,0.15)" : "none"}
          stroke={tick > 0 ? GREEN : PAPER}
          strokeWidth={3.5}
        />
        <path
          d="M 13 29 L 24 40 L 44 16"
          fill="none"
          stroke={GREEN}
          strokeWidth={6}
          strokeDasharray={50}
          strokeDashoffset={50 * (1 - tick)}
        />
      </svg>
    </div>
  );
};

const CheckScene: React.FC = () => {
  const battery = useReveal(rel("check", 49.3), 0.6);
  return (
    <>
      <Headline
        lines={[
          { text: "Antes de", at: rel("check", 45.24) },
          { text: "añadir más", at: rel("check", 45.7) },
        ]}
      />
      <Visual>
        <CheckRow
          at={rel("check", 47.32)}
          text="Registros"
          icon={<LogIcon />}
        />
        <CheckRow
          at={rel("check", 48.16)}
          text="Ejecución"
          icon={<MoveIcon />}
        />
        <CheckRow
          at={rel("check", 49.24)}
          text="Recuperación"
          icon={<BatteryIcon p={battery} />}
        />
      </Visual>
    </>
  );
};

// ---------------------------------------------------------------------------
// 07 · E07 «hacer más / hacer menos / dejar de cambiar» (una misma línea)

const ArrowIcon: React.FC<{ dir: "up" | "down" | "pause"; p: number }> = ({
  dir,
  p,
}) => (
  <svg
    width={110}
    height={110}
    viewBox="-55 -55 110 110"
    style={{ filter: GLOW }}
  >
    <circle
      r={48}
      fill="none"
      stroke="rgba(255,255,255,0.25)"
      strokeWidth={3}
    />
    <circle
      r={48}
      fill="none"
      stroke={GREEN}
      strokeWidth={4}
      strokeDasharray={302}
      strokeDashoffset={302 * (1 - p)}
      transform="rotate(-90)"
    />
    {dir === "pause" ? (
      <g opacity={p}>
        <rect x={-16} y={-20} width={10} height={40} fill={PAPER} />
        <rect x={6} y={-20} width={10} height={40} fill={PAPER} />
      </g>
    ) : (
      <path
        d={
          dir === "up"
            ? "M 0 22 V -20 M -16 -4 L 0 -20 L 16 -4"
            : "M 0 -22 V 20 M -16 4 L 0 20 L 16 4"
        }
        fill="none"
        stroke={PAPER}
        strokeWidth={6}
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity={p}
        transform={`translate(0 ${(1 - p) * (dir === "up" ? 10 : -10)})`}
      />
    )}
  </svg>
);

const OptionCard: React.FC<{
  at: number;
  dir: "up" | "down" | "pause";
  text: string;
  index: number;
}> = ({ at, dir, text, index }) => {
  const p = useReveal(at, 0.45);
  return (
    <Card
      at={at}
      index={index}
      width={304}
      marker
      center
      title={
        <span
          style={{ fontSize: 24, letterSpacing: -0.5, whiteSpace: "nowrap" }}
        >
          {text}
        </span>
      }
    >
      <ArrowIcon dir={dir} p={p} />
    </Card>
  );
};

const OptionsScene: React.FC = () => (
  <>
    <Headline
      lines={[
        { text: "¿Qué tengo", at: SCENE_IN - 0.15 },
        { text: "que hacer?", at: SCENE_IN - 0.02 },
      ]}
    />
    <Visual>
      <div style={{ display: "flex", gap: 24 }}>
        <OptionCard
          at={rel("options", 54.0)}
          dir="up"
          text="Hacer más"
          index={1}
        />
        <OptionCard
          at={rel("options", 54.72)}
          dir="down"
          text="Hacer menos"
          index={2}
        />
        <OptionCard
          at={rel("options", 55.8)}
          dir="pause"
          text="Dejar de cambiar"
          index={3}
        />
      </div>
    </Visual>
  </>
);

// ---------------------------------------------------------------------------
// 08 · E08 CTA: «Comenta PLAN» + «Te escribo por privado»

const CtaScene: React.FC = () => {
  const t = useT();
  const { fps } = useVideoConfig();
  const comenta = useReveal(SCENE_IN - 0.1, 0.35);
  const box = useReveal(SCENE_IN, 0.4);
  const typeAt = rel("cta", 62.12);
  const typed = Math.max(0, Math.min(4, Math.floor((t - typeAt) / 0.07) + 1));
  const sent = useSpringAt(typeAt + 0.45, 12);
  const dm = useReveal(rel("cta", 62.6), 0.4);
  const plane = useReveal(rel("cta", 62.6), 0.7, easeInOut);
  const caret = Math.floor((t * fps) / 8) % 2 === 0;
  return (
    <div
      style={{ display: "flex", flexDirection: "column", alignItems: "center" }}
    >
      <MaskUp p={comenta}>
        <div style={{ ...display, fontSize: 64 }}>Comenta</div>
      </MaskUp>
      {/* caja de comentario donde se teclea PLAN */}
      <div
        style={{
          marginTop: 22,
          width: 760,
          height: 130,
          border: `3px solid ${typed > 0 ? GREEN : "rgba(255,255,255,0.3)"}`,
          borderRadius: 65,
          display: "flex",
          alignItems: "center",
          padding: "0 22px 0 46px",
          opacity: box,
          transform: `scaleX(${0.9 + 0.1 * box})`,
          filter: typed > 0 ? GLOW_SOFT : undefined,
          background: "rgba(255,255,255,0.03)",
        }}
      >
        <div
          style={{
            ...display,
            fontSize: 88,
            flex: 1,
            color: typed > 0 ? GREEN : "rgba(255,255,255,0.3)",
            textShadow: typed > 0 ? GREEN_TEXT_GLOW : "none",
          }}
        >
          {typed > 0
            ? "PLAN".slice(0, typed)
            : "Añade un comentario…".slice(0, 0)}
          <span
            style={{
              opacity: caret && sent < 0.5 ? 1 : 0,
              color: PAPER,
              fontStyle: "normal",
            }}
          >
            |
          </span>
        </div>
        <div
          style={{
            width: 88,
            height: 88,
            borderRadius: 44,
            background: GREEN,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transform: `scale(${0.6 + 0.4 * sent})`,
            opacity: Math.min(1, sent * 2),
            filter: GLOW,
          }}
        >
          <svg width={40} height={40}>
            <path
              d="M 20 32 V 8 M 9 18 L 20 7 L 31 18"
              stroke={INK}
              strokeWidth={5}
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      </div>
      {/* te escribo por privado */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 20,
          marginTop: 40,
          opacity: dm,
          transform: `translateY(${(1 - dm) * 20}px)`,
        }}
      >
        <svg
          width={56}
          height={56}
          style={{
            overflow: "visible",
            filter: GLOW,
            transform: `translate(${plane * 6}px, ${-plane * 6}px)`,
          }}
        >
          <path
            d="M 4 26 L 52 6 L 38 50 L 28 32 Z"
            fill="none"
            stroke={GREEN}
            strokeWidth={4}
            strokeLinejoin="round"
          />
          <path d="M 28 32 L 52 6" stroke={GREEN} strokeWidth={4} />
        </svg>
        <div
          style={{
            fontFamily: FONT,
            fontWeight: 700,
            fontSize: 42,
            color: PAPER,
            textShadow: TEXT_GLOW,
            whiteSpace: "nowrap",
          }}
        >
          Te escribo por privado
        </div>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------

/** Capa por debajo del vídeo: fondos de escena a pantalla completa. */
export const SceneBackdrops: React.FC = () => (
  <AbsoluteFill>
    {scenes
      .filter((s) => s.mode === "full")
      .map((s) => (
        <SceneBlock key={s.id} id={s.id} />
      ))}
  </AbsoluteFill>
);

/** Capa por encima del vídeo: marco de la ventana y contenido de cada escena. */
export const Graphics: React.FC = () => (
  <AbsoluteFill>
    <SceneContent id="excel">
      <ExcelScene />
    </SceneContent>
    <SceneContent id="tools">
      <ToolsScene />
    </SceneContent>
    <SceneContent id="videos">
      <VideosScene />
    </SceneContent>
    <SceneContent id="prio">
      <PrioScene />
    </SceneContent>
    <SceneContent id="falta">
      <FaltaScene />
    </SceneContent>
    <SceneContent id="check">
      <CheckScene />
    </SceneContent>
    <SceneContent id="options">
      <OptionsScene />
    </SceneContent>
    <SceneContent id="cta">
      <CtaScene />
    </SceneContent>
  </AbsoluteFill>
);
