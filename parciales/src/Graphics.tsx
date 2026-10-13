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
import { LegAnatomy, RomDiagram } from "./Figures";
import { FONT, GREEN, PAPER } from "./theme";
import {
  f,
  HEADLINE_STAGGER,
  headlines,
  SCENE_IN,
  SCENE_OUT,
  scenes,
  SOURCE_END,
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

/** Cita del estudio: original en inglés y traducción, con barra verde. */
const Quote: React.FC<{
  at: number;
  en: string;
  es: string;
  width?: number;
}> = ({ at, en, es, width = 900 }) => {
  const bar = useReveal(at, 0.4);
  return (
    <Rise at={at} style={{ display: "flex", justifyContent: "center" }}>
      <div
        style={{
          position: "relative",
          width,
          padding: "18px 26px 18px 34px",
          background: "rgba(255,255,255,0.04)",
          border: "1.5px solid rgba(255,255,255,0.1)",
        }}
      >
        <div
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            width: 6,
            height: `${bar * 100}%`,
            background: GREEN,
            filter: GLOW,
          }}
        />
        <div
          style={{
            ...body(22, "rgba(255,255,255,0.55)"),
            fontStyle: "italic",
            fontWeight: 600,
            textAlign: "left",
          }}
        >
          «{en}»
        </div>
        <div style={{ ...body(28), textAlign: "left", marginTop: 8 }}>{es}</div>
        <div
          style={{
            ...label,
            fontSize: 16,
            letterSpacing: 3,
            marginTop: 10,
            color: "rgba(255,255,255,0.4)",
            textShadow: "none",
          }}
        >
          Pedrosa et al. · 2022
        </div>
      </div>
    </Rise>
  );
};

// ---------------------------------------------------------------------------
// E02 · recto femoral (sobre la persona)

const RfScene: React.FC = () => (
  <div
    style={{
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      gap: 50,
      paddingTop: 40,
    }}
  >
    <LegAnatomy at={0.05} lit="rf" litAt={rel("rf", T.rfLight)} scale={0.68} />
    <div
      style={{ display: "flex", flexDirection: "column", alignItems: "center" }}
    >
      <Headline
        lines={headlines.rf.map((l) => ({ ...l, text: "Recto" }))}
        origin={sceneFrom("rf")}
        size={92}
        absolute={false}
      />
      <Headline
        lines={[{ text: "femoral", at: 7.91, marker: headlines.rf[0].marker }]}
        origin={sceneFrom("rf")}
        size={92}
        absolute={false}
      />
      <Rise at={rel("rf", T.anterior)} style={{ marginTop: 30 }}>
        <div style={{ ...body(32, "rgba(255,255,255,0.75)") }}>
          Parte anterior
          <br />
          del muslo
        </div>
      </Rise>
    </div>
  </div>
);

// ---------------------------------------------------------------------------
// E03 · el estudio (pantalla completa)

const Chip: React.FC<{ at: number; children: React.ReactNode }> = ({
  at,
  children,
}) => {
  const p = useSpringAt(at, 11);
  const line = useReveal(at + 0.05, 0.3);
  return (
    <div
      style={{
        position: "relative",
        padding: "16px 34px 16px 40px",
        background: "rgba(255,255,255,0.04)",
        border: "1.5px solid rgba(255,255,255,0.12)",
        transform: `translateX(${(1 - p) * -60}px)`,
        opacity: Math.min(1, p * 2),
        ...body(40),
        fontWeight: 800,
        whiteSpace: "nowrap",
      }}
    >
      <div
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          bottom: 0,
          width: 7 * line,
          background: GREEN,
          filter: GLOW,
        }}
      />
      {children}
    </div>
  );
};

const StudyScene: React.FC = () => (
  <>
    <Headline lines={headlines.study} origin={sceneFrom("study")} top={330} />
    <div
      style={{
        position: "absolute",
        top: 560,
        left: 0,
        right: 0,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 22,
      }}
    >
      <Chip at={rel("study", T.chips[0])}>45 mujeres sin entrenamiento</Chip>
      <Chip at={rel("study", T.chips[1])}>12 semanas</Chip>
      <Chip at={rel("study", T.chips[2])}>9 por grupo</Chip>
    </div>
    <Headline
      lines={headlines.studySerie}
      origin={sceneFrom("study")}
      size={92}
      top={1030}
    />
    <Rise
      at={rel("study", 16.08) + 0.15}
      style={{ position: "absolute", top: 1260, left: 0, right: 0 }}
    >
      <div style={{ ...body(30, "rgba(255,255,255,0.6)") }}>
        No añadidas después del fallo
      </div>
    </Rise>
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
  const note = useReveal(times[2] + 0.6, 0.4);
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
      <div
        style={{
          ...body(22, "rgba(255,255,255,0.45)"),
          marginTop: 26,
          opacity: note,
        }}
      >
        0° = rodilla extendida
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// E04 · resultado en el recto femoral (pantalla completa)

const UpArrow: React.FC<{ at: number }> = ({ at }) => {
  const p = useSpringAt(at, 9);
  const t = useT();
  const bob =
    Math.sin((t - at) * 5) * 4 * Math.min(1, Math.max(0, t - at - 0.4));
  return (
    <svg
      width={70}
      height={80}
      viewBox="0 0 70 80"
      style={{
        filter: GLOW,
        transform: `translateY(${(1 - p) * 30 + bob}px) scale(${p})`,
      }}
    >
      <path
        d="M 35 4 L 66 40 L 46 40 L 46 76 L 24 76 L 24 40 L 4 40 Z"
        fill={GREEN}
      />
    </svg>
  );
};

const ResultScene: React.FC = () => (
  <>
    <Headline
      lines={headlines.result}
      origin={sceneFrom("result")}
      size={110}
      top={300}
    />
    <div
      style={{
        position: "absolute",
        top: 520,
        left: 0,
        right: 0,
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        gap: 50,
      }}
    >
      <LegAnatomy
        at={0.1}
        lit="rf"
        litAt={rel("result", headlines.result[0].at)}
        scale={0.9}
      />
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          width: 430,
        }}
      >
        <Rise at={rel("result", T.initialWin)}>
          <div
            style={{
              ...label,
              fontSize: 28,
              letterSpacing: 4,
              textAlign: "center",
            }}
          >
            Parcial inicial
          </div>
        </Rise>
        <div style={{ marginTop: 18 }}>
          <UpArrow at={rel("result", T.initialWin) + 0.12} />
        </div>
        <Rise at={rel("result", T.initialWin) + 0.2} style={{ marginTop: 10 }}>
          <div
            style={{
              ...display,
              fontSize: 52,
              textAlign: "center",
              lineHeight: 1,
            }}
          >
            Más
            <br />
            crecimiento
          </div>
        </Rise>
        <Rise at={rel("result", T.vsFull)} style={{ marginTop: 26 }}>
          <div style={{ ...body(34, "rgba(255,255,255,0.7)") }}>
            que las completas
          </div>
        </Rise>
      </div>
    </div>
    <div style={{ position: "absolute", top: 1100, left: 0, right: 0 }}>
      <Quote
        at={rel("result", T.rfQuote)}
        en="For the RF, INITIALROM and VARROM groups presented a greater change than the other groups"
        es="Recto femoral: el parcial inicial y el variado superaron a los demás grupos"
      />
    </div>
  </>
);

// ---------------------------------------------------------------------------
// E04 · vasto lateral (sobre la persona)

const VlScene: React.FC = () => (
  <div style={{ paddingTop: 20 }}>
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 40,
      }}
    >
      <LegAnatomy
        at={0.05}
        lit="vl"
        litAt={rel("vl", T.vlLight)}
        scale={0.56}
      />
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          width: 520,
        }}
      >
        <Headline
          lines={headlines.vl}
          origin={sceneFrom("vl")}
          size={74}
          absolute={false}
        />
        <Rise at={rel("vl", T.vlNoAdv)} style={{ marginTop: 22 }}>
          <div
            style={{
              ...display,
              fontSize: 46,
              textAlign: "center",
              lineHeight: 1.05,
            }}
          >
            Sin ventaja
            <br />
            detectada
          </div>
        </Rise>
        <Rise at={rel("vl", T.vlNoAdv) + 0.25} style={{ marginTop: 14 }}>
          <div style={{ ...body(26, "rgba(255,255,255,0.7)") }}>
            del parcial inicial
            <br />
            frente al completo
          </div>
        </Rise>
      </div>
    </div>
    <div style={{ marginTop: 26 }}>
      <Quote
        at={rel("vl", T.vlQuote)}
        en="For the VL, the INITIALROM, FULLROM, and VARROM groups presented similar responses"
        es="Vasto lateral: respuestas similares entre parcial inicial, completo y variado"
      />
    </div>
  </div>
);

// ---------------------------------------------------------------------------
// E05 · dos parciales no son lo mismo (pantalla completa)

const Badge: React.FC<{ at: number; text: string }> = ({ at, text }) => {
  const p = useSpringAt(at, 10);
  return (
    <div
      style={{
        ...display,
        fontSize: 40,
        color: "#0A0A0A",
        background: GREEN,
        padding: "8px 20px 4px",
        textShadow: "none",
        filter: GLOW_SOFT,
        transform: `scale(${p}) rotate(${-3 + 3 * p}deg)`,
        opacity: Math.min(1, p * 2),
      }}
    >
      {text}
    </div>
  );
};

const TramoScene: React.FC = () => {
  const t = useT();
  const initialAt = rel("tramo", T.tramoFinal) + 0.3;
  const finalAt = rel("tramo", T.tramoFinal);
  // cada parcial repite cuando se nombra
  const initialActive =
    t < rel("tramo", T.tramoFinal) || t >= rel("tramo", T.tramoInitial);
  return (
    <>
      <Headline
        lines={headlines.tramo}
        origin={sceneFrom("tramo")}
        size={96}
        top={300}
      />
      <div
        style={{
          position: "absolute",
          top: 600,
          left: 0,
          right: 0,
          display: "flex",
          justifyContent: "center",
          gap: 40,
        }}
      >
        {[
          {
            title: "Parcial inicial",
            from: 100,
            to: 65,
            at: initialAt,
            active: initialActive,
          },
          {
            title: "Parcial final",
            from: 65,
            to: 30,
            at: finalAt,
            active: !initialActive,
          },
        ].map((d) => (
          <div
            key={d.title}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 22,
            }}
          >
            <RomDiagram
              at={d.at}
              from={d.from}
              to={d.to}
              title={d.title}
              active={d.active}
              scale={1.3}
            />
            <Badge at={rel("tramo", headlines.tramo[0].at) + 0.15} text="35°" />
          </div>
        ))}
      </div>
      <Rise
        at={rel("tramo", T.tramoSynth)}
        style={{
          position: "absolute",
          top: 1270,
          left: 0,
          right: 0,
          display: "flex",
          justifyContent: "center",
        }}
      >
        <div style={{ ...label, fontSize: 34, letterSpacing: 3 }}>
          El tramo del recorrido importa
        </div>
      </Rise>
    </>
  );
};

// ---------------------------------------------------------------------------
// E06 · qué tramo / qué músculo (sobre la persona)

const FocusScene: React.FC = () => (
  <div style={{ paddingTop: 110 }}>
    <Headline
      lines={headlines.focus1}
      origin={sceneFrom("focus")}
      size={120}
      absolute={false}
    />
    <div style={{ height: 30 }} />
    <Headline
      lines={headlines.focus2}
      origin={sceneFrom("focus")}
      size={120}
      absolute={false}
    />
  </div>
);

// ---------------------------------------------------------------------------
// E07 · sustituir o añadir (sobre la persona). Tarjetas conceptuales, sin números.

const ROW_H = 78;

const RoutineRow: React.FC<{
  y: number;
  x?: number;
  opacity?: number;
  accent?: boolean;
  text?: string;
}> = ({ y, x = 0, opacity = 1, accent, text }) => (
  <div
    style={{
      position: "absolute",
      left: 0,
      top: y,
      width: 400,
      height: ROW_H - 14,
      transform: `translateX(${x}px)`,
      opacity,
      background: accent ? "rgba(4,228,0,0.16)" : "rgba(255,255,255,0.05)",
      border: `2px solid ${accent ? GREEN : "rgba(255,255,255,0.16)"}`,
      filter: accent ? GLOW : undefined,
      display: "flex",
      alignItems: "center",
      gap: 14,
      padding: "0 18px",
    }}
  >
    <div
      style={{
        width: 14,
        height: 14,
        background: accent ? GREEN : "rgba(255,255,255,0.35)",
      }}
    />
    {text ? (
      <div
        style={{
          ...body(26),
          fontWeight: 800,
          textTransform: "uppercase",
          letterSpacing: 1,
        }}
      >
        {text}
      </div>
    ) : (
      <div
        style={{
          flex: 1,
          height: 10,
          background: "rgba(255,255,255,0.14)",
          maxWidth: 180,
        }}
      />
    )}
  </div>
);

const FitPanel: React.FC<{
  at: number;
  act: number;
  mode: "replace" | "add";
  title: string;
}> = ({ at, act, mode, title }) => {
  const t = useT();
  const p = useSpringAt(at, 12);
  const k = interpolate(t, [act, act + 0.5], [0, 1], {
    ...clamp,
    easing: easeInOut,
  });
  const m = useReveal(act, 0.35);
  const rows = [0, 1, 2];
  return (
    <div
      style={{
        width: 420,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        transform: `translateY(${(1 - p) * 50}px)`,
        opacity: Math.min(1, p * 2),
      }}
    >
      <div style={{ height: 96, display: "flex", alignItems: "center" }}>
        <Marker p={m}>
          <div style={{ ...display, fontSize: 60, padding: "0 10px" }}>
            {title}
          </div>
        </Marker>
      </div>
      <div
        style={{
          position: "relative",
          width: 360,
          height: 4 * ROW_H,
          marginTop: 16,
        }}
      >
        {rows.map((i) =>
          mode === "replace" && i === 1 ? (
            <RoutineRow key={i} y={i * ROW_H} x={k * 260} opacity={1 - k} />
          ) : (
            <RoutineRow key={i} y={i * ROW_H} />
          ),
        )}
        {mode === "replace" ? (
          <RoutineRow
            y={ROW_H}
            x={(1 - k) * -260}
            opacity={k}
            accent
            text="Parciales"
          />
        ) : (
          <RoutineRow
            y={3 * ROW_H - (1 - k) * 40}
            opacity={k}
            accent
            text="+ Parciales"
          />
        )}
      </div>
    </div>
  );
};

const FitScene: React.FC = () => (
  <div
    style={{
      paddingTop: 90,
      display: "flex",
      justifyContent: "center",
      gap: 60,
    }}
  >
    <FitPanel
      at={0.05}
      act={rel("fit", T.replace)}
      mode="replace"
      title="Sustituir"
    />
    <FitPanel
      at={rel("fit", T.add) - 0.6}
      act={rel("fit", T.add)}
      mode="add"
      title="Añadir"
    />
  </div>
);

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
  rf: RfScene,
  study: StudyScene,
  forms: FormsScene,
  result: ResultScene,
  vl: VlScene,
  tramo: TramoScene,
  focus: FocusScene,
  fit: FitScene,
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
