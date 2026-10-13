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
import {
  ArrowIcon,
  BatteryIcon,
  CalendarIcon,
  ClockIcon,
  DropIcon,
  LogIcon,
  MoveIcon,
  Phone,
  TargetIcon,
  VolumeIcon,
} from "./Icons";
import { Character, QuestionMarks, type Mood, type Pose } from "./Characters";
import { FONT, GREEN, INK, PAPER } from "./theme";
import {
  f,
  HEADLINE_STAGGER,
  headlines,
  SCENE_IN,
  SCENE_OUT,
  scenes,
  SOURCE_END,
  type HeadlineLine,
  type Scene,
} from "./timeline";

// ---------------------------------------------------------------------------
// Estilo y animación

const BG = "#E9E9E5"; // gris claro neutro de las escenas completas
const GLOW = "drop-shadow(0 0 10px rgba(4, 228, 0, 0.55))";
const GLOW_SOFT = "drop-shadow(0 0 18px rgba(4, 228, 0, 0.35))";
const TEXT_GLOW = "var(--text-glow)";
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
  color: "var(--fg)",
  textShadow: TEXT_GLOW,
};

const label: React.CSSProperties = {
  fontFamily: FONT,
  fontWeight: 700,
  fontSize: 24,
  letterSpacing: 6,
  textTransform: "uppercase",
  color: "var(--accent-text)",
  whiteSpace: "nowrap",
  textShadow: "var(--accent-glow)",
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
          filter: `drop-shadow(0 0 ${6 + 12 * p}px rgba(var(--glow-rgb),${0.25 + 0.45 * p}))`,
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
              "radial-gradient(ellipse 80% 45% at 50% 28%, rgba(255,255,255,0.6), transparent 70%)",
          }}
        />
        {/* cuadrícula técnica */}
        <AbsoluteFill
          style={{
            backgroundImage:
              "linear-gradient(rgba(0,0,0,0.035) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.035) 1px, transparent 1px)",
            backgroundSize: "60px 60px",
            backgroundPosition: `${-drift * 0.3}px ${-drift * 0.15}px`,
          }}
        />
        {/* título gigante en contorno, desplazándose. El contorno sale de dilatar la
            silueta y restarle la palabra rellena: solo queda el borde exterior, sin
            las líneas internas que deja text-stroke en los glifos solapados. */}
        <svg
          width={4200}
          height={400}
          style={{
            position: "absolute",
            top: 1470,
            left: 60 - drift,
            overflow: "visible",
          }}
        >
          <defs>
            <filter
              id={`outline-${scene.id}`}
              x="-5%"
              y="-20%"
              width="110%"
              height="140%"
            >
              <feMorphology
                in="SourceAlpha"
                operator="dilate"
                radius={2.5}
                result="grown"
              />
              <feComposite
                in="grown"
                in2="SourceAlpha"
                operator="out"
                result="ring"
              />
              <feFlood floodColor="#000000" floodOpacity={0.06} />
              <feComposite in2="ring" operator="in" />
            </filter>
          </defs>
          <text
            x={0}
            y={330}
            fill="#ffffff"
            filter={`url(#outline-${scene.id})`}
            fontFamily={FONT}
            fontWeight={900}
            fontStyle="italic"
            fontSize={330}
          >
            {`${scene.title} · ${scene.title}`.toUpperCase()}
          </text>
        </svg>
        {/* grano */}
        <svg
          width="100%"
          height="100%"
          style={{
            position: "absolute",
            opacity: 0.1,
            mixBlendMode: "multiply",
          }}
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
              "repeating-linear-gradient(0deg, rgba(0,0,0,0.012) 0px, rgba(0,0,0,0.012) 1px, transparent 1px, transparent 4px)",
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
              background: "rgba(0,0,0,0.07)",
            }}
          />
        ) : null}
        <AbsoluteFill
          style={{ boxShadow: "inset 0 0 200px rgba(0,0,0,0.06)" }}
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
  // Variables de tema: escenas completas en claro, gráficos sobre la persona en oscuro.
  const vars = (
    overlay
      ? {
          "--fg": PAPER,
          "--muted": "rgba(255,255,255,0.5)",
          "--text-glow": "0 0 22px rgba(255,255,255,0.22)",
          "--glow-rgb": "255,255,255",
          "--accent-text": GREEN,
          "--accent-glow": "0 0 18px rgba(4,228,0,0.55)",
          "--card-bg": "rgba(255,255,255,0.035)",
          "--card-border": "1.5px solid rgba(255,255,255,0.1)",
          "--rule": "1.5px solid rgba(255,255,255,0.08)",
        }
      : {
          "--fg": INK,
          "--muted": "rgba(0,0,0,0.45)",
          "--text-glow": "none",
          "--glow-rgb": "255,255,255",
          "--accent-text": INK,
          "--accent-glow": "none",
          "--card-bg": "#FFFFFF",
          "--card-border": "1.5px solid rgba(0,0,0,0.08)",
          "--rule": "1.5px solid rgba(0,0,0,0.08)",
        }
  ) as React.CSSProperties;
  return (
    <AbsoluteFill style={vars}>
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
const HEADLINE_TOP = 330;
const VISUAL_TOP = 690;

/** Titular palabra a palabra. `lines` en segundos del original; `origin` es el
 *  segundo del original en el que empieza la Sequence donde se pinta. */
const Headline: React.FC<{
  lines: HeadlineLine[];
  origin: number;
  size?: number;
  absolute?: boolean;
}> = ({ lines, origin, size = 118, absolute = true }) => (
  <div
    style={
      absolute
        ? { position: "absolute", top: HEADLINE_TOP, left: 0, right: 0 }
        : undefined
    }
  >
    {lines.map((l, i) => (
      <HeadlineRow key={i} line={l} origin={origin} size={size} />
    ))}
  </div>
);

const HeadlineWord: React.FC<{ text: string; at: number; size: number }> = ({
  text,
  at,
  size,
}) => {
  const p = useReveal(at, 0.32);
  return (
    <MaskUp p={p} style={{ display: "inline-block" }}>
      <div style={{ ...display, fontSize: size }}>{text}</div>
    </MaskUp>
  );
};

const HeadlineRow: React.FC<{
  line: HeadlineLine;
  origin: number;
  size: number;
}> = ({ line, origin, size }) => {
  const m = useReveal(
    line.marker !== undefined ? line.marker - origin : 999,
    0.35,
  );
  const row = (
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        gap: size * 0.22,
        padding: "0 10px",
      }}
    >
      {line.text.split(" ").map((w, i) => (
        <HeadlineWord
          key={i}
          text={w}
          at={line.at - origin + i * HEADLINE_STAGGER}
          size={size}
        />
      ))}
    </div>
  );
  return (
    <div style={{ marginBottom: 4, display: "flex", justifyContent: "center" }}>
      {line.marker !== undefined ? <Marker p={m}>{row}</Marker> : row}
    </div>
  );
};

const Visual: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div style={{ position: "absolute", top: VISUAL_TOP, left: 0, right: 0 }}>
    {children}
  </div>
);

/** Personaje en la parte baja de una escena completa. `talkFrom`/`talkTo` en s del original. */
const Actor: React.FC<{
  who: "trainer" | "client";
  pose?: Pose;
  mood?: Mood;
  at?: number;
  questions?: number; // segundos desde el inicio de la escena en que salen los «?»
}> = ({ who, pose, mood, at = SCENE_IN, questions }) => (
  <div
    style={{
      position: "absolute",
      top: 1150,
      left: 0,
      right: 0,
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
    }}
  >
    {questions !== undefined ? (
      <div style={{ position: "absolute", top: -70 }}>
        <QuestionMarks at={questions} />
      </div>
    ) : null}
    <Character who={who} pose={pose} mood={mood} at={at} talking scale={1.45} />
  </div>
);

const sceneFrom = (id: string) => scenes.find((s) => s.id === id)!.from;

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
              background: i === 0 ? GREEN : "rgba(0,0,0,0.18)",
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
            fill="rgba(0,0,0,0.4)"
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
            fill="rgba(0,0,0,0.4)"
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
            stroke="rgba(0,0,0,0.14)"
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
              stroke="rgba(0,0,0,0.14)"
              strokeWidth={1.5}
            />
          );
        })}
        <line
          x1={x0 + W}
          x2={x0 + W}
          y1={28}
          y2={28 + rowH * (rows + 1) * grid}
          stroke="rgba(0,0,0,0.14)"
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
              fill="#C4C8CE"
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

// Maniquí masculino minimalista: una sola silueta continua (simétrica, suavizada
// con splines). Entra dibujando el contorno y rellenándose; al decir «pecho» se
// iluminan los pectorales y luego la cámara hace zoom al pecho con un foco: la
// zona del pecho y su alrededor se mantienen y el resto del cuerpo se apaga.
const MANNEQUIN_FILL = "#303030";
const MANNEQUIN_EDGE = "rgba(255,255,255,0.32)";
const CX = 165; // eje de simetría (lienzo 330×640)
const CHEST = { x: CX, y: 184 };

// Medio contorno derecho: [desplazamiento desde el eje, y], de la coronilla a la entrepierna.
const HALF: [number, number][] = [
  [0, 10],
  [20, 13],
  [32, 28],
  [35, 50],
  [31, 72],
  [22, 90],
  [13, 100],
  [14, 112],
  [18, 124],
  [42, 132],
  [68, 140],
  [86, 152],
  [95, 172],
  [98, 200],
  [100, 236],
  [99, 264],
  [101, 300],
  [98, 336],
  [99, 356],
  [92, 372],
  [80, 372],
  [76, 352],
  [77, 334],
  [74, 298],
  [70, 262],
  [67, 232],
  [64, 210],
  [61, 236],
  [55, 278],
  [53, 302],
  [58, 330],
  [63, 356],
  [63, 392],
  [60, 436],
  [53, 482],
  [55, 522],
  [49, 568],
  [41, 604],
  [47, 620],
  [42, 630],
  [20, 630],
  [18, 612],
  [20, 570],
  [16, 522],
  [14, 482],
  [11, 432],
  [5, 376],
  [0, 368],
];

/** Spline Catmull-Rom cerrada → path SVG con curvas Bézier cúbicas. */
const smoothPath = (pts: [number, number][]) => {
  const n = pts.length;
  let d = `M ${pts[0][0]} ${pts[0][1]}`;
  for (let i = 0; i < n; i++) {
    const p0 = pts[(i - 1 + n) % n];
    const p1 = pts[i];
    const p2 = pts[(i + 1) % n];
    const p3 = pts[(i + 2) % n];
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += ` C ${c1[0]} ${c1[1]}, ${c2[0]} ${c2[1]}, ${p2[0]} ${p2[1]}`;
  }
  return d + " Z";
};

const SILHOUETTE = smoothPath([
  ...HALF.map(([dx, y]) => [CX + dx, y] as [number, number]),
  ...HALF.slice(1, -1)
    .reverse()
    .map(([dx, y]) => [CX - dx, y] as [number, number]),
]);

const PEC_L =
  "M 163 160 C 150 151, 124 151, 110 161 C 103 180, 111 205, 135 209 C 151 211, 163 203, 163 190 Z";
const PEC_R =
  "M 167 160 C 180 151, 206 151, 220 161 C 227 180, 219 205, 195 209 C 179 211, 167 203, 167 190 Z";

const BODY_W = 420; // recuadro donde se ve el cuerpo
const BODY_H = 560;
const FIT = BODY_H / 640;

const Torso: React.FC<{ at: number; glowAt: number; zoomAt: number }> = ({
  at,
  glowAt,
  zoomAt,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  // entrada: contorno que se dibuja + relleno + rebote
  const draw = interpolate(t, [at, at + 0.35], [0, 1], {
    ...clamp,
    easing: easeInOut,
  });
  const fillIn = interpolate(t, [at + 0.15, at + 0.4], [0, 1], clamp);
  const bounce = spring({
    frame: frame - at * fps,
    fps,
    config: { damping: 10, stiffness: 170, mass: 0.6 },
  });
  // pecho
  const fill = interpolate(t, [glowAt, glowAt + 0.4], [0, 1], {
    ...clamp,
    easing: easeOut,
  });
  const lit = t >= glowAt;
  const pulse = lit ? 0.5 + 0.5 * Math.sin((t - glowAt) * 8) : 0;
  // zoom con foco
  const focus = interpolate(t, [zoomAt, zoomAt + 0.5], [0, 1], {
    ...clamp,
    easing: easeInOut,
  });
  const zoom = 1 + 1.0 * focus;
  const shiftY = (320 - CHEST.y) * focus;
  const dim = 1 - 0.72 * focus;
  const breathe = 1 + Math.sin(t * 3) * 0.006;
  const rings = [0, 0.45, 0.9].map((o) => {
    const k = ((t - glowAt - o) % 1.35) / 1.35;
    return lit && t - glowAt - o > 0 ? k : -1;
  });
  const LEN = 2600;
  return (
    <div
      style={{
        width: BODY_W,
        height: BODY_H,
        overflow: "hidden",
        position: "relative",
      }}
    >
      <svg
        width={330}
        height={640}
        viewBox="0 0 330 640"
        style={{
          position: "absolute",
          left: (BODY_W - 330 * FIT) / 2,
          top: 0,
          overflow: "visible",
          transformOrigin: "0 0",
          transform: `scale(${FIT})`,
        }}
      >
        <defs>
          <filter id="pec-glow" x="-60%" y="-60%" width="220%" height="220%">
            <feGaussianBlur stdDeviation={7 + 7 * pulse} result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <clipPath id="pec-fill">
            <rect
              x={90}
              y={215 - 66 * fill}
              width={150}
              height={66 * fill + 2}
            />
          </clipPath>
          {/* foco: elipse alrededor del pecho con borde difuminado */}
          <radialGradient
            id="spot"
            cx={CHEST.x}
            cy={CHEST.y}
            r={120}
            gradientUnits="userSpaceOnUse"
          >
            <stop offset="0.55" stopColor="#fff" stopOpacity={1} />
            <stop offset="1" stopColor="#fff" stopOpacity={0} />
          </radialGradient>
          <mask id="spot-mask">
            <rect x={-200} y={-200} width={800} height={1100} fill="#000" />
            <ellipse
              cx={CHEST.x}
              cy={CHEST.y}
              rx={150}
              ry={120}
              fill="url(#spot)"
            />
          </mask>
        </defs>
        <g
          style={{
            transformOrigin: `${CHEST.x}px ${CHEST.y}px`,
            transform: `translate(0px, ${shiftY}px) scale(${zoom * breathe * (0.92 + 0.08 * bounce)})`,
          }}
        >
          {/* cuerpo completo (se apaga con el foco) */}
          <g opacity={dim}>
            <path d={SILHOUETTE} fill={MANNEQUIN_FILL} opacity={fillIn} />
            <path
              d={SILHOUETTE}
              fill="none"
              stroke={MANNEQUIN_EDGE}
              strokeWidth={2.5}
              strokeDasharray={LEN}
              strokeDashoffset={LEN * (1 - draw)}
            />
          </g>
          {/* zona del pecho y alrededor, siempre visible */}
          <g mask="url(#spot-mask)" opacity={focus}>
            <path d={SILHOUETTE} fill={MANNEQUIN_FILL} />
            <path
              d={SILHOUETTE}
              fill="none"
              stroke={MANNEQUIN_EDGE}
              strokeWidth={2.5}
            />
          </g>
          {/* detalle mínimo del maniquí: línea del esternón y borde de pectorales */}
          <g opacity={fillIn * 0.8}>
            <path
              d="M 165 150 V 300"
              stroke="rgba(255,255,255,0.1)"
              strokeWidth={2}
            />
            <path
              d={PEC_L}
              fill="none"
              stroke="rgba(255,255,255,0.14)"
              strokeWidth={2}
            />
            <path
              d={PEC_R}
              fill="none"
              stroke="rgba(255,255,255,0.14)"
              strokeWidth={2}
            />
          </g>
          {/* ondas */}
          {rings.map((k, i) =>
            k >= 0 ? (
              <ellipse
                key={i}
                cx={CHEST.x}
                cy={CHEST.y}
                rx={66 + 60 * k}
                ry={34 + 34 * k}
                fill="none"
                stroke={GREEN}
                strokeWidth={(2.5 * (1 - k) + 0.5) / zoom}
                opacity={(1 - k) * 0.55}
              />
            ) : null,
          )}
          {/* pectorales iluminados */}
          <g
            clipPath="url(#pec-fill)"
            filter="url(#pec-glow)"
            opacity={0.85 + 0.15 * pulse}
          >
            <path d={PEC_L} fill={GREEN} />
            <path d={PEC_R} fill={GREEN} />
          </g>
          <path
            d="M 118 166 C 128 159, 142 157, 154 160"
            fill="none"
            stroke="rgba(255,255,255,0.6)"
            strokeWidth={3.5}
            strokeLinecap="round"
            opacity={fill}
          />
          <path
            d="M 176 160 C 188 157, 202 159, 212 166"
            fill="none"
            stroke="rgba(255,255,255,0.6)"
            strokeWidth={3.5}
            strokeLinecap="round"
            opacity={fill}
          />
        </g>
      </svg>
    </div>
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
            stroke="rgba(0,0,0,0.07)"
            strokeWidth={1.5}
            opacity={axes}
          />
        ))}
        <path
          d={`M 30 0 L 30 ${H} L ${W} ${H}`}
          fill="none"
          stroke={INK}
          strokeWidth={3}
          strokeDasharray={W + H}
          strokeDashoffset={(W + H) * (1 - axes)}
        />
        {Array.from({ length: 8 }).map((_, i) => (
          <text
            key={i}
            x={46 + i * 60}
            y={H + 28}
            fill="rgba(0,0,0,0.45)"
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
        <Headline lines={headlines.excelA} origin={sceneFrom("excel")} />
        <Visual>
          <div
            style={{
              margin: "0 auto",
              width: 930,
              padding: "22px 0 16px 6px",
              background: "#FFFFFF",
              borderRadius: 18,
              boxShadow: "0 18px 40px rgba(0,0,0,0.08)",
              transform: "rotate(-1.2deg)",
            }}
          >
            <div
              style={{ transform: "scale(0.95)", transformOrigin: "top left" }}
            >
              <Spreadsheet at={SCENE_IN} />
            </div>
          </div>
        </Visual>
        <Actor who="client" pose="laptop" mood="smug" at={SCENE_IN - 0.05} />
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
            lines={headlines.excelB}
            origin={sceneFrom("excel") + swapAt}
          />
          <Visual>
            {/* pecho arriba y gráfica debajo, centrados y con aire */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 56,
              }}
            >
              <Torso
                at={0.02}
                glowAt={rel("excel", 8.2) - swapAt}
                zoomAt={rel("excel", 8.48) - swapAt}
              />
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
}> = ({ at, index, title, children, width = 290, marker }) => {
  const p = useSpringAt(at, 15);
  const line = useReveal(at + 0.1, 0.4);
  const m = useReveal(at + 0.12, 0.35);
  return (
    <div
      style={{
        position: "relative",
        width,
        height: 380,
        background: "var(--card-bg)",
        border: "var(--card-border)",
        transform: `translateY(${(1 - p) * 60}px)`,
        opacity: Math.min(1, p * 2),
        padding: "20px 18px 34px",
        overflow: "hidden",
        // todo el contenido centrado en la tarjeta
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        textAlign: "center",
      }}
    >
      <div
        style={{
          position: "absolute",
          top: 0,
          left: "50%",
          height: 4,
          width: `${line * 100}%`,
          transform: "translateX(-50%)",
          background: GREEN,
          filter: GLOW,
        }}
      />
      <div
        style={{
          ...label,
          fontSize: 20,
          color: "var(--muted)",
          textShadow: "none",
          letterSpacing: 4,
          paddingLeft: 4,
        }}
      >
        {String(index).padStart(2, "0")}
      </div>
      <div
        style={{
          flex: 1,
          width: "100%",
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
          display: "flex",
          justifyContent: "center",
          width: "100%",
          marginTop: 24,
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

const ToolsScene: React.FC = () => (
  <>
    <Headline lines={headlines.tools} origin={sceneFrom("tools")} />
    <Visual>
      <div style={{ display: "flex", gap: 45, justifyContent: "center" }}>
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
    <Actor who="client" pose="phone" mood="happy" at={SCENE_IN} />
  </>
);

// ---------------------------------------------------------------------------
// 03 · E04 «tres vídeos» (sin creadores ni contenido ajeno)

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

const PrioScene: React.FC = () => {
  return (
    <>
      <Headline lines={headlines.prio} origin={sceneFrom("prio")} />
      <Visual>
        <div style={{ display: "flex", gap: 40, justifyContent: "center" }}>
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
      <Actor who="trainer" pose="point" mood="neutral" at={SCENE_IN} />
    </>
  );
};

// ---------------------------------------------------------------------------
// 05 · E06 «solo lo que haga falta»

const FaltaScene: React.FC = () => {
  const t = useT();
  const [first, second] = headlines.falta;
  // la rutina se mantiene y solo se ajustan dos piezas
  const blocks = 8;
  const changed = [2, 5];
  return (
    <div>
      <Headline
        lines={[first]}
        origin={sceneFrom("falta")}
        size={70}
        absolute={false}
      />
      <div style={{ marginTop: 8 }}>
        <Headline
          lines={[second]}
          origin={sceneFrom("falta")}
          size={96}
          absolute={false}
        />
      </div>
      <div
        style={{
          display: "flex",
          gap: 14,
          marginTop: 34,
          justifyContent: "center",
        }}
      >
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
        gap: 40,
        height: 104,
        borderBottom: "var(--rule)",
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
          stroke={tick > 0 ? GREEN : INK}
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
      <Headline lines={headlines.check} origin={sceneFrom("check")} />
      <Visual>
        <div style={{ width: 680, margin: "0 auto" }}>
          <CheckRow
            at={rel("check", 47.32)}
            text="Registros"
            icon={<LogIcon at={rel("check", 47.32) - 0.25} />}
          />
          <CheckRow
            at={rel("check", 48.16)}
            text="Ejecución"
            icon={<MoveIcon at={rel("check", 48.16) - 0.25} />}
          />
          <CheckRow
            at={rel("check", 49.24)}
            text="Recuperación"
            icon={<BatteryIcon at={rel("check", 49.24) - 0.25} p={battery} />}
          />
        </div>
      </Visual>
      <Actor who="trainer" pose="think" mood="neutral" at={SCENE_IN} />
    </>
  );
};

// ---------------------------------------------------------------------------
// 07 · E07 «hacer más / hacer menos / dejar de cambiar» (una misma línea)

const OptionCard: React.FC<{
  at: number;
  dir: "up" | "down" | "pause";
  text: string;
  index: number;
}> = ({ at, dir, text, index }) => {
  return (
    <Card
      at={at}
      index={index}
      width={304}
      marker
      title={
        <span
          style={{ fontSize: 24, letterSpacing: -0.5, whiteSpace: "nowrap" }}
        >
          {text}
        </span>
      }
    >
      <ArrowIcon dir={dir} at={at + 0.05} />
    </Card>
  );
};

const OptionsScene: React.FC = () => (
  <>
    <Headline lines={headlines.options} origin={sceneFrom("options")} />
    <Visual>
      <div style={{ display: "flex", gap: 24, justifyContent: "center" }}>
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
    <Actor
      who="client"
      pose="shrug"
      mood="doubt"
      at={SCENE_IN}
      questions={SCENE_IN + 0.3}
    />
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
