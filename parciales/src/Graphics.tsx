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
import { RomDiagram } from "./Figures";
import { FONT, GREEN, PAPER } from "./theme";
import {
  f,
  HEADLINE_STAGGER,
  headlines,
  SCENE_IN,
  SCENE_OUT,
  scenes,
  SOURCE_END,
  BURLA,
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

/** Sello que cae de golpe sobre un elemento. */
const RED = "#FF2E3A";

/** Sello rojo que cae de golpe en el centro de la pantalla. */
const Stamp: React.FC<{ at: number; text: string; top?: number }> = ({
  at,
  text,
  top = 800,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  if (t < at) return null;
  const slam = spring({
    frame: frame - at * fps,
    fps,
    config: { damping: 11, stiffness: 320, mass: 0.6 },
  });
  const k = (t - at) * fps;
  const shake = k < 10 ? Math.sin(k * 2.7) * 10 * Math.exp(-k / 3) : 0;
  return (
    <div
      style={{
        position: "absolute",
        top,
        left: 0,
        right: 0,
        display: "flex",
        justifyContent: "center",
        transform: `translate(${shake}px, ${-shake * 0.6}px)`,
      }}
    >
      <div
        style={{
          transform: `rotate(-9deg) scale(${2.6 - 1.6 * slam})`,
          opacity: Math.min(1, slam * 2),
          border: `10px solid ${RED}`,
          borderRadius: 18,
          padding: "14px 40px 8px",
          ...display,
          fontSize: 120,
          color: RED,
          textShadow: "0 0 24px rgba(255,46,58,0.55)",
          filter: "drop-shadow(0 0 16px rgba(255,46,58,0.5))",
          background: "rgba(255,46,58,0.06)",
        }}
      >
        {text}
      </div>
    </div>
  );
};

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

const StudyScene: React.FC = () => (
  <>
    <Headline lines={headlines.study} origin={sceneFrom("study")} top={520} />
    <Rise
      at={rel("study", T.context)}
      style={{ position: "absolute", top: 680, left: 0, right: 0 }}
    >
      <div style={{ ...body(40, "rgba(255,255,255,0.75)"), fontWeight: 800 }}>
        45 mujeres · 12 semanas
      </div>
    </Rise>
    <Headline
      lines={headlines.studySerie}
      origin={sceneFrom("study")}
      size={100}
      top={940}
    />
  </>
);

// ---------------------------------------------------------------------------
// E03 · las tres formas, mientras las lee del móvil (sobre la persona)

const FORMS = [
  { title: "Completa", from: 100, to: 30 },
  { title: "Parcial inicial", from: 100, to: 65 },
  { title: "Parcial final", from: 65, to: 30 },
];

const FormsScene: React.FC = () => {
  const t = useT();
  const times = T.forms.map((x) => rel("forms", x));
  const current = times.filter((x) => t >= x).length - 1;
  return (
    <div style={{ paddingTop: 130 }}>
      <div style={{ display: "flex", justifyContent: "center", gap: 18 }}>
        {FORMS.map((fm, i) => (
          <RomDiagram
            key={fm.title}
            at={times[i]}
            from={fm.from}
            to={fm.to}
            title={fm.title}
            active={i === current}
            scale={0.98}
          />
        ))}
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// E05 · dos parciales no son lo mismo (pantalla completa)

const TramoScene: React.FC = () => {
  const t = useT();
  const pulse = rel("tramo", T.tramoInitial);
  const both = rel("tramo", 36.7);
  return (
    <>
      <Headline
        lines={headlines.tramo}
        origin={sceneFrom("tramo")}
        size={96}
        top={420}
      />
      <div
        style={{
          position: "absolute",
          top: 760,
          left: 0,
          right: 0,
          display: "flex",
          justifyContent: "center",
          gap: 40,
        }}
      >
        <RomDiagram
          at={both}
          from={100}
          to={65}
          title="Parcial inicial"
          active={t >= pulse}
          scale={1.3}
        />
        <RomDiagram
          at={both + 0.15}
          from={65}
          to={30}
          title="Parcial final"
          active={t < pulse}
          scale={1.3}
        />
      </div>
    </>
  );
};

// ---------------------------------------------------------------------------
// Rótulo mínimo mientras brilla el músculo (sin velo, se ve la persona)

const MuscleLabel: React.FC<{
  text: string;
  sub?: string;
  subAt?: number;
  up?: boolean;
}> = ({ text, sub, subAt = 0, up }) => {
  const p = useSpringAt(0.08, 11);
  const q = useSpringAt(subAt, 11);
  return (
    <div
      style={{
        position: "absolute",
        top: 380,
        left: 0,
        right: 0,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
      }}
    >
      <div
        style={{
          ...display,
          fontSize: 78,
          WebkitTextStroke: "9px rgba(0,0,0,0.9)",
          paintOrder: "stroke fill",
          transform: `translateY(${(1 - p) * 30}px) scale(${0.7 + 0.3 * p})`,
          opacity: Math.min(1, p * 2),
        }}
      >
        {text}
      </div>
      {sub ? (
        <div
          style={{
            marginTop: 12,
            display: "flex",
            alignItems: "center",
            gap: 12,
            ...label,
            fontSize: 30,
            letterSpacing: 3,
            WebkitTextStroke: "6px rgba(0,0,0,0.85)",
            paintOrder: "stroke fill",
            transform: `translateY(${(1 - q) * 20}px)`,
            opacity: Math.min(1, q * 2),
          }}
        >
          {up ? "▲" : null}
          {sub}
        </div>
      ) : null}
    </div>
  );
};

const LblRf1: React.FC = () => <MuscleLabel text="Recto femoral" />;
const LblRf2: React.FC = () => (
  <MuscleLabel
    text="Recto femoral"
    sub="Más crecimiento"
    subAt={rel("lblRf2", 25.3)}
    up
  />
);
const LblVl: React.FC = () => (
  <MuscleLabel
    text="Vasto lateral"
    sub="Sin ventaja detectada"
    subAt={rel("lblVl", T.vlSub)}
  />
);

// ---------------------------------------------------------------------------
// Burla: el doble repite el mito con subtítulos «de burla» y se lleva un FALSO

const MOCK = [
  { text: "hAcEr", at: 42.32 },
  { text: "MeNoS", at: 42.56 },
  { text: "rEcOrRiDo", at: 42.84 },
  { text: "Es", at: 43.28 },
  { text: "MeJoR", at: 43.44 },
];

const MockWord: React.FC<{ text: string; at: number; i: number }> = ({
  text,
  at,
  i,
}) => {
  const p = useSpringAt(at, 7);
  const t = useT();
  if (t < at) return null;
  const wob = Math.sin((t - at) * 16 + i * 2) * 5;
  return (
    <span
      style={{
        display: "inline-block",
        transform: `scale(${0.3 + 0.7 * p}) rotate(${(i % 2 ? 7 : -7) + wob}deg)`,
        margin: "0 10px",
      }}
    >
      {text}
    </span>
  );
};

const BurlaScene: React.FC = () => {
  const origin = sceneFrom("burla");
  const t = useT();
  const stampAt = rel("burla", BURLA.stamp);
  const fade = interpolate(
    t,
    [stampAt - 0.05, stampAt + 0.1],
    [1, 0.35],
    clamp,
  );
  return (
    <>
      <div
        style={{
          position: "absolute",
          top: 110,
          left: 0,
          right: 0,
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "center",
          fontFamily: FONT,
          fontWeight: 900,
          fontSize: 84,
          color: "#FFE14D",
          WebkitTextStroke: "11px rgba(0,0,0,0.92)",
          paintOrder: "stroke fill",
          opacity: fade,
          padding: "0 40px",
        }}
      >
        {MOCK.map((w, i) => (
          <MockWord key={i} text={w.text} at={w.at - origin} i={i} />
        ))}
      </div>
      <Stamp at={stampAt} text="Falso" top={-170} />
    </>
  );
};

// ---------------------------------------------------------------------------
// E08 · masterclass gratuita (un solo rótulo, sobre la persona)

const MasterScene: React.FC = () => {
  const a = useSpringAt(rel("master", T.master), 10);
  const b = useSpringAt(rel("master", T.master) + 0.6, 9);
  const t = useT();
  const ring = (t * 0.8) % 1;
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
        <svg
          width={92}
          height={92}
          viewBox="0 0 92 92"
          style={{ overflow: "visible", filter: GLOW }}
        >
          <circle
            cx={46}
            cy={46}
            r={40 + ring * 16}
            fill="none"
            stroke={GREEN}
            strokeWidth={3}
            opacity={1 - ring}
          />
          <circle
            cx={46}
            cy={46}
            r={40}
            fill="none"
            stroke={GREEN}
            strokeWidth={5}
          />
          <path d="M 36 28 L 66 46 L 36 64 Z" fill={GREEN} />
        </svg>
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
  lblRf1: LblRf1,
  study: StudyScene,
  forms: FormsScene,
  lblRf2: LblRf2,
  lblVl: LblVl,
  tramo: TramoScene,
  burla: BurlaScene,
  master: MasterScene,
  cta: CtaScene,
};

/** Capa por encima del vídeo: contenido de cada escena. */
export const Graphics: React.FC = () => (
  <AbsoluteFill>
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
