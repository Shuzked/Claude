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
import { PANEL_X, toScreen } from "./Camera";
import { LegAnatomy, RomDiagram } from "./Figures";
import { poseAt } from "./pose";
import { FONT, GREEN, PAPER } from "./theme";
import {
  f,
  HEADLINE_STAGGER,
  headlines,
  SCENE_IN,
  SCENE_OUT,
  scenes,
  SOURCE_END,
  anatomyCards,
  LIST_END,
  listItems,
  T,
  type HeadlineLine,
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
              <feFlood floodColor="#ffffff" floodOpacity={0.08} />
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
      {overlay && scene.scrim !== false ? (
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
          height: overlay ? 860 : 1920,
          opacity: 1 - out,
          transform: `scale(${1 - 0.12 * out}) translateY(${out * 30}px)`,
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

/** Titular palabra a palabra. `lines` en segundos del original; `origin` es el
 *  segundo del original en el que empieza la Sequence donde se pinta. */
const Headline: React.FC<{
  lines: HeadlineLine[];
  origin: number;
  size?: number;
  absolute?: boolean;
  top?: number;
}> = ({ lines, origin, size = 118, absolute = true, top = HEADLINE_TOP }) => (
  <div
    style={
      absolute ? { position: "absolute", top, left: 0, right: 0 } : undefined
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
  // pop elástico: escala con rebote, giro que se asienta y pequeño salto
  const p = useSpringAt(at, 9);
  const shown = useT() >= at;
  return (
    <div
      style={{
        display: "inline-block",
        transform: `translateY(${(1 - p) * 40}px) scale(${0.3 + 0.7 * p}) rotate(${(1 - p) * -10}deg)`,
        opacity: shown ? Math.min(1, p * 2.5) : 0,
        transformOrigin: "50% 80%",
      }}
    >
      <div style={{ ...display, fontSize: size }}>{text}</div>
    </div>
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

const sceneFrom = (id: string) => scenes.find((s) => s.id === id)!.from;

/** Tiempo del original → segundos desde el inicio de la escena. */
const rel = (id: string, sourceSeconds: number) =>
  sourceSeconds - scenes.find((s) => s.id === id)!.from;

// ---------------------------------------------------------------------------
// Piezas comunes de esta pieza

/** Texto de apoyo en Montserrat bold, sin cursiva. */
const body = (size: number, color = PAPER): React.CSSProperties => ({
  fontFamily: FONT,
  fontWeight: 700,
  fontSize: size,
  color,
  lineHeight: 1.25,
  textAlign: "center",
});

/** Aparece con muelle desde abajo. */
const Rise: React.FC<{
  at: number;
  children: React.ReactNode;
  style?: React.CSSProperties;
}> = ({ at, children, style }) => {
  const p = useSpringAt(at, 12);
  return (
    <div
      style={{
        transform: `translateY(${(1 - p) * 30}px) scale(${0.9 + 0.1 * p})`,
        opacity: Math.min(1, p * 2),
        ...style,
      }}
    >
      {children}
    </div>
  );
};

// ---------------------------------------------------------------------------
// E03 · el estudio (pantalla completa)

/** Carrusel de esquemas: el que se nombra sale en grande en el centro; al nombrar
 *  el siguiente, encoge a su hueco en la fila inferior. Todos siguen moviéndose y el
 *  que se está nombrando lleva un pequeño pulso de escala. Tiempos relativos a la escena. */
const RomCarousel: React.FC<{
  items: { title: string; from: number; to: number; at: number }[];
  bigTop: number;
  smallTop: number;
}> = ({ items, bigTop, smallTop }) => {
  const t = useT();
  const { fps } = useVideoConfig();
  const frame = useCurrentFrame();
  const BIG = 2.4;
  const SMALL = 1.0;
  const CX = 480; // centro del área de contenido (960 de ancho)
  const W = 300; // ancho base del esquema
  const gap = 30;
  const rowW = items.length * W * SMALL + (items.length - 1) * gap;
  const current = items.filter((it) => t >= it.at).length - 1;
  return (
    <>
      {items.map((it, i) => {
        if (t < it.at) return null;
        const next = items[i + 1];
        const enter = spring({
          frame: frame - it.at * fps,
          fps,
          config: { damping: 13, stiffness: 170, mass: 0.7 },
        });
        const shrink = next
          ? interpolate(t, [next.at - 0.05, next.at + 0.45], [0, 1], {
              ...clamp,
              easing: easeInOut,
            })
          : 0;
        // grande en el centro → pequeño en su hueco de la fila
        const bigX = CX - (W * BIG) / 2;
        const smallX = CX - rowW / 2 + i * (W * SMALL + gap);
        const x = bigX + (smallX - bigX) * shrink;
        const y = bigTop + (smallTop - bigTop) * shrink;
        const k = (BIG + (SMALL - BIG) * shrink) * (0.6 + 0.4 * enter);
        // pulso de escala al nombrarse
        const pulse =
          i === current
            ? 1 +
              0.05 *
                Math.exp(-Math.max(0, t - it.at - 0.2) * 3) *
                Math.sin((t - it.at) * 9)
            : 1;
        return (
          <div
            key={it.title}
            style={{
              position: "absolute",
              left: x,
              top: y,
              width: W,
              transform: `scale(${k * pulse})`,
              transformOrigin: "0 0",
              opacity: Math.min(1, enter * 2) * (i === current ? 1 : 0.7),
            }}
          >
            <RomDiagram
              at={it.at}
              from={it.from}
              to={it.to}
              title={it.title}
              active={i === current}
              pop={false}
            />
          </div>
        );
      })}
    </>
  );
};

const FORMS_AT = 16.32; // el estudio deja paso a las tres formas

const StudyScene: React.FC = () => {
  const t = useT();
  const exit = interpolate(
    t,
    [rel("study", FORMS_AT), rel("study", FORMS_AT) + 0.3],
    [0, 1],
    { ...clamp, easing: easeInOut },
  );
  return (
    <>
      <div
        style={{
          position: "absolute",
          inset: 0,
          opacity: 1 - exit,
          transform: `translateY(${-exit * 120}px) scale(${1 - 0.1 * exit})`,
        }}
      >
        <Headline
          lines={headlines.study}
          origin={sceneFrom("study")}
          top={520}
        />
        <Rise
          at={rel("study", T.context)}
          style={{ position: "absolute", top: 680, left: 0, right: 0 }}
        >
          <div
            style={{ ...body(40, "rgba(255,255,255,0.75)"), fontWeight: 800 }}
          >
            45 mujeres · 12 semanas
          </div>
        </Rise>
        <Headline
          lines={headlines.studySerie}
          origin={sceneFrom("study")}
          size={100}
          top={940}
        />
      </div>
      <RomCarousel
        bigTop={250}
        smallTop={1150}
        items={[
          {
            title: "Completa",
            from: 100,
            to: 30,
            at: rel("study", T.forms[0]),
          },
          {
            title: "Parcial inicial",
            from: 100,
            to: 65,
            at: rel("study", T.forms[1]),
          },
          {
            title: "Parcial final",
            from: 65,
            to: 30,
            at: rel("study", T.forms[2]),
          },
        ]}
      />
    </>
  );
};

// ---------------------------------------------------------------------------
// Tarjeta anatómica (estilo de las referencias): abajo, redondeada, con la pierna y
// el músculo en verde. Va fuera de las escenas para que los subtítulos sigan.

const AnatomyCard: React.FC<{
  muscle: "rf" | "vl";
  title: string;
  sub?: string;
  subAt?: number; // segundos desde que entra la tarjeta
  dur: number;
}> = ({ muscle, title, sub, subAt = 0, dur }) => {
  const t = useT();
  const p = useSpringAt(0, 12);
  const q = useSpringAt(subAt, 12);
  const out = interpolate(t, [dur - 0.3, dur], [1, 0], clamp);
  const float = Math.sin(t * 2.2) * 5;
  return (
    <AbsoluteFill style={{ opacity: out }}>
      <div
        style={{
          position: "absolute",
          left: 540 - 165,
          top: 1520 + float,
          width: 330,
          borderRadius: 28,
          border: "3px solid rgba(255,255,255,0.85)",
          background: "linear-gradient(180deg, #232323 0%, #121212 100%)",
          boxShadow: "0 18px 50px rgba(0,0,0,0.6), 0 0 24px rgba(4,228,0,0.25)",
          overflow: "hidden",
          padding: "18px 0 16px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          transform: `translateY(${(1 - p) * 60}px) scale(${0.7 + 0.3 * p})`,
          opacity: Math.min(1, p * 2),
        }}
      >
        <div style={{ height: 200, display: "flex", alignItems: "center" }}>
          <LegAnatomy at={0.05} lit={muscle} litAt={0.25} scale={0.36} />
        </div>
        <div style={{ ...display, fontSize: 34, marginTop: 10 }}>{title}</div>
        {sub ? (
          <div
            style={{
              ...label,
              fontSize: 18,
              letterSpacing: 2,
              marginTop: 6,
              opacity: Math.min(1, q * 2),
              transform: `translateY(${(1 - q) * 10}px)`,
            }}
          >
            {sub}
          </div>
        ) : null}
      </div>
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------------------
// Parte final: panel a toda la altura a la derecha (la persona queda en la mitad
// izquierda, ver Camera.tsx). Tres filas, una palabra clave cada una; cada punto
// sale de la punta del dedo y vuela a su fila, que se enciende.

const LIST_FROM = 57.86; // el panel entra con el plano

const fingerTip = (t: number) => {
  for (const d of [0, -0.04, 0.04, -0.08, 0.08]) {
    const p = poseAt(t + d);
    if (!p) continue;
    const dx = p.li[0] - p.le[0];
    const dy = p.li[1] - p.le[1];
    const len = Math.hypot(dx, dy) || 1;
    return { x: p.li[0] + (dx / len) * 40, y: p.li[1] + (dy / len) * 40 };
  }
  return null;
};

const ListIcon: React.FC<{ i: number; on: boolean }> = ({ i, on }) => {
  const c = on ? GREEN : "rgba(255,255,255,0.55)";
  return (
    <svg
      width={96}
      height={96}
      viewBox="0 0 96 96"
      style={{ filter: on ? GLOW : undefined, flexShrink: 0 }}
    >
      {i === 0 ? (
        <g fill="none" stroke={c} strokeWidth={7} strokeLinecap="round">
          <circle cx={48} cy={50} r={36} />
          <path d="M 48 28 L 48 50 L 64 60" />
        </g>
      ) : i === 1 ? (
        <g
          fill="none"
          stroke={c}
          strokeWidth={7}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M 12 32 L 70 32 M 58 20 L 70 32 L 58 44" />
          <path d="M 84 64 L 26 64 M 38 52 L 26 64 L 38 76" />
        </g>
      ) : (
        <path
          d="M 14 30 L 36 30 C 36 16, 58 16, 58 30 L 80 30 L 80 50 C 66 50, 66 72, 80 72 L 80 86 L 14 86 Z"
          fill="none"
          stroke={c}
          strokeWidth={7}
          strokeLinejoin="round"
        />
      )}
    </svg>
  );
};

const ListLayer: React.FC = () => {
  const local = useCurrentFrame();
  const { fps } = useVideoConfig();
  const frame = local + f(LIST_FROM);
  const t = frame / fps;
  const W = 1080 - PANEL_X;
  const ROW = { top: 300, h: 440, gap: 26 };
  const panelIn = spring({
    frame: local,
    fps,
    config: { damping: 18, stiffness: 150, mass: 0.8 },
  });
  const panelOut = interpolate(t, [LIST_END - 0.3, LIST_END + 0.05], [0, 1], {
    ...clamp,
    easing: easeInOut,
  });
  const current = listItems.filter((l) => t >= l.at).length - 1;
  const seed = Math.floor(local / 2) % 9;
  return (
    <AbsoluteFill>
      <div
        style={{
          position: "absolute",
          left: PANEL_X,
          top: 0,
          width: W,
          height: 1920,
          transform: `translateX(${(1 - panelIn + panelOut) * W}px)`,
          background: BG,
          overflow: "hidden",
          boxShadow: "-30px 0 60px rgba(0,0,0,0.55)",
        }}
      >
        {/* textura como los fondos de escena */}
        <AbsoluteFill
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.035) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.035) 1px, transparent 1px)",
            backgroundSize: "60px 60px",
          }}
        />
        <svg
          width="100%"
          height="100%"
          style={{
            position: "absolute",
            opacity: 0.18,
            mixBlendMode: "screen",
          }}
        >
          <filter id={`lg-${seed}`}>
            <feTurbulence
              type="fractalNoise"
              baseFrequency="0.8"
              numOctaves={2}
              seed={seed}
            />
            <feColorMatrix type="saturate" values="0" />
          </filter>
          <rect width="100%" height="100%" filter={`url(#lg-${seed})`} />
        </svg>
        <div
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            width: 6,
            height: "100%",
            background: GREEN,
            filter: GLOW,
          }}
        />
        <div
          style={{
            position: "absolute",
            top: 170,
            left: 0,
            right: 0,
            textAlign: "center",
            ...label,
            fontSize: 30,
            letterSpacing: 8,
          }}
        >
          Parciales
        </div>
        {listItems.map((l, i) => {
          const shown = t >= l.at + 0.3;
          const on = i === current && shown;
          const pop = spring({
            frame: frame - f(l.at + 0.3),
            fps,
            config: { damping: 11, stiffness: 210, mass: 0.55 },
          });
          return (
            <div
              key={l.text}
              style={{
                position: "absolute",
                left: 34,
                right: 28,
                top: ROW.top + i * (ROW.h + ROW.gap),
                height: ROW.h,
                border: `2px solid ${on ? GREEN : "rgba(255,255,255,0.12)"}`,
                background: on
                  ? "rgba(4,228,0,0.08)"
                  : "rgba(255,255,255,0.025)",
                boxShadow: on
                  ? "0 0 30px rgba(4,228,0,0.35), inset 0 0 40px rgba(4,228,0,0.12)"
                  : undefined,
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
                padding: "0 34px",
                gap: 22,
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 24,
                  opacity: shown ? Math.min(1, pop * 2) : 0.18,
                  transform: `scale(${shown ? 0.85 + 0.15 * pop : 1})`,
                  transformOrigin: "0 50%",
                }}
              >
                <div
                  style={{
                    ...display,
                    fontSize: 110,
                    color: on ? GREEN : "rgba(255,255,255,0.35)",
                    textShadow: on ? GREEN_TEXT_GLOW : "none",
                  }}
                >
                  {String(i + 1).padStart(2, "0")}
                </div>
                <ListIcon i={i} on={on} />
              </div>
              <div
                style={{
                  ...display,
                  // tamaño ajustado para que ninguna palabra se salga del panel
                  fontSize: Math.min(
                    56,
                    Math.floor(
                      370 /
                        (Math.max(...l.text.split(" ").map((w) => w.length)) *
                          0.72),
                    ),
                  ),
                  lineHeight: 1.02,
                  whiteSpace: "normal",
                  paddingRight: 12,
                  opacity: shown ? Math.min(1, pop * 2) * (on ? 1 : 0.6) : 0,
                  transform: `translateY(${(1 - pop) * 24}px)`,
                }}
              >
                {l.text}
              </div>
            </div>
          );
        })}
      </div>
      {/* chispa: sale de la punta del dedo y vuela a su fila */}
      {listItems.map((l, i) => {
        const k = interpolate(t, [l.at, l.at + 0.32], [0, 1], {
          ...clamp,
          easing: Easing.in(Easing.quad),
        });
        if (t < l.at || k >= 1) return null;
        const tipV = fingerTip(l.at);
        const tip = tipV
          ? toScreen(f(l.at), fps, tipV)
          : { x: PANEL_X, y: 900 };
        const dst = {
          x: PANEL_X + 110,
          y: ROW.top + i * (ROW.h + ROW.gap) + ROW.h / 2,
        };
        const x = tip.x + (dst.x - tip.x) * k;
        const y = tip.y + (dst.y - tip.y) * k - Math.sin(k * Math.PI) * 120;
        return (
          <div
            key={`spark-${i}`}
            style={{
              position: "absolute",
              left: x - 14,
              top: y - 14,
              width: 28,
              height: 28,
              borderRadius: "50%",
              background: "white",
              boxShadow: "0 0 16px #3BFF2E, 0 0 40px rgba(4,228,0,0.8)",
            }}
          />
        );
      })}
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------------------
// E08 · masterclass gratuita (un solo rótulo, sobre la persona)

const MasterScene: React.FC = () => {
  const a = useSpringAt(rel("master", T.master), 10);
  const b = useSpringAt(rel("master", T.master) + 0.6, 9);
  return (
    <div
      style={{
        paddingTop: 120,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 26,
          transform: `translateY(${(1 - a) * 40}px) scale(${0.6 + 0.4 * a})`,
          opacity: Math.min(1, a * 2),
        }}
      >
        <div style={{ ...display, fontSize: 104 }}>Masterclass</div>
      </div>
      <div
        style={{
          marginTop: 18,
          transform: `scale(${b}) rotate(${-4 + 2 * b}deg)`,
          opacity: Math.min(1, b * 2),
          ...display,
          fontSize: 76,
          color: "#0A0A0A",
          background: GREEN,
          padding: "10px 30px 4px",
          textShadow: "none",
          filter: GLOW_SOFT,
        }}
      >
        Gratuita
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// E09 · CTA: «Comenta» + bocadillo con la palabra clave completa

const CtaScene: React.FC = () => {
  const t = useT();
  const comenta = useSpringAt(rel("cta", T.comenta), 11);
  const key = useSpringAt(rel("cta", T.keyword), 9);
  const breathe = 1 + Math.sin(t * 5.5) * 0.012 * key;
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        paddingTop: 60,
      }}
    >
      <div
        style={{
          ...display,
          fontSize: 92,
          transform: `translateY(${(1 - comenta) * 40}px) scale(${0.4 + 0.6 * comenta}) rotate(${(1 - comenta) * -8}deg)`,
          opacity: Math.min(1, comenta * 2.5),
        }}
      >
        Comenta
      </div>
      <div
        style={{
          position: "relative",
          marginTop: 18,
          width: 700,
          height: 300,
          transform: `scale(${(0.3 + 0.7 * key) * breathe}) rotate(${-3 + 2 * key}deg)`,
          opacity: Math.min(1, key * 2.5),
          filter: GLOW_SOFT,
        }}
      >
        <svg
          width={700}
          height={300}
          style={{ position: "absolute", inset: 0 }}
        >
          <path
            d="M 10 12 L 690 4 L 680 226 L 220 236 L 130 294 L 142 236 L 18 240 Z"
            fill={GREEN}
          />
        </svg>
        <div
          style={{
            ...display,
            position: "absolute",
            left: 0,
            right: 0,
            top: 8,
            height: 226,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 74,
            lineHeight: 1,
            color: "#0A0A0A",
            textShadow: "none",
            transform: "translateX(-14px)",
          }}
        >
          <div>Técnicas de</div>
          <div>intensidad</div>
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

const SCENES: Record<string, React.FC> = {
  study: StudyScene,
  master: MasterScene,
  cta: CtaScene,
};

/** Capa por encima del vídeo: contenido de cada escena y capas sueltas. */
export const Graphics: React.FC = () => (
  <AbsoluteFill>
    {anatomyCards.map((c) => (
      <Sequence
        key={c.from}
        from={f(c.from)}
        durationInFrames={f(c.to) - f(c.from)}
        name={`Tarjeta · ${c.title}`}
      >
        <AnatomyCard
          muscle={c.muscle}
          title={c.title}
          sub={c.sub}
          subAt={c.subAt ? c.subAt - c.from : 0}
          dur={c.to - c.from}
        />
      </Sequence>
    ))}
    <Sequence
      from={f(LIST_FROM)}
      durationInFrames={f(LIST_END) - f(LIST_FROM)}
      name="Lista final"
    >
      <ListLayer />
    </Sequence>
    {scenes.map((s) => {
      const C = SCENES[s.id];
      return (
        <SceneContent key={s.id} id={s.id}>
          <C />
        </SceneContent>
      );
    })}
  </AbsoluteFill>
);
