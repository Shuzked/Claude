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
import { f } from "./timeline";

// ---------------------------------------------------------------------------
// Utilidades de animación (todas en segundos del ORIGINAL, relativas al bloque)

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const easeOut = Easing.bezier(0.16, 1, 0.3, 1);
const easeIn = Easing.bezier(0.7, 0, 0.84, 0);

/** 0→1 desde `at` (segundos desde el inicio del bloque) en `dur` segundos. */
const useReveal = (at: number, dur = 0.35, ease = easeOut) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return interpolate(frame / fps, [at, at + dur], [0, 1], { ...clamp, easing: ease });
};

/** 1 mientras dura el bloque, cae a 0 en los últimos `dur` segundos. */
const useExit = (dur = 0.25) => {
  const frame = useCurrentFrame();
  const { durationInFrames, fps } = useVideoConfig();
  const end = durationInFrames / fps;
  return 1 - interpolate(frame / fps, [end - dur, end], [0, 1], { ...clamp, easing: easeIn });
};

const useSpringAt = (at: number, damping = 13) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return spring({ frame: frame - at * fps, fps, config: { damping, stiffness: 200, mass: 0.7 } });
};

const display: React.CSSProperties = {
  fontFamily: FONT,
  fontWeight: 900,
  fontStyle: "italic",
  textTransform: "uppercase",
  letterSpacing: -1,
  lineHeight: 0.95,
};

/** Texto que sube detrás de una máscara (sin fundidos). */
const MaskUp: React.FC<{ p: number; children: React.ReactNode; style?: React.CSSProperties }> = ({
  p,
  children,
  style,
}) => (
  <div style={{ overflow: "hidden", paddingRight: 12, ...style }}>
    <div style={{ transform: `translateY(${(1 - p) * 105}%)` }}>{children}</div>
  </div>
);

/** Bloque verde que barre de izquierda a derecha detrás del contenido. */
const Swipe: React.FC<{ p: number; color?: string; children: React.ReactNode; pad?: string }> = ({
  p,
  color = GREEN,
  children,
  pad = "6px 18px 2px 14px",
}) => (
  <div style={{ position: "relative", display: "inline-block", padding: pad }}>
    <div
      style={{
        position: "absolute",
        inset: 0,
        background: color,
        transformOrigin: "left center",
        transform: `scaleX(${p}) skewX(-8deg)`,
      }}
    />
    <div style={{ position: "relative" }}>{children}</div>
  </div>
);

const At: React.FC<{ from: number; to: number; name: string; children: React.ReactNode }> = ({
  from,
  to,
  name,
  children,
}) => (
  <Sequence from={f(from)} durationInFrames={f(to) - f(from)} name={name}>
    {children}
  </Sequence>
);

// ---------------------------------------------------------------------------
// E01 · Etiqueta de personaje en su primera intervención

const SpeakerTag: React.FC<{ text: string }> = ({ text }) => {
  const line = useReveal(0, 0.4);
  const txt = useReveal(0.08, 0.35);
  const exit = useExit(0.2);
  return (
    <AbsoluteFill style={{ top: 250, left: 72, opacity: exit }}>
      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        <div style={{ width: 14, height: 14, background: GREEN, transform: `scale(${line})` }} />
        <MaskUp p={txt}>
          <div
            style={{
              fontFamily: FONT,
              fontWeight: 700,
              fontSize: 34,
              letterSpacing: 8,
              color: PAPER,
              textShadow: "0 1px 2px rgba(0,0,0,0.6)",
            }}
          >
            {text}
          </div>
        </MaskUp>
      </div>
      <div style={{ marginTop: 10, width: 300 * line, height: 3, background: GREEN }} />
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------------------
// E02 · «el Excel» → «el pecho sigue igual»

const ExcelCard: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const grid = useReveal(0, 0.35);
  const title = useSpringAt(0.06);
  const exit = useExit(0.12);
  const cols = 5;
  const rows = 4;
  const W = 520;
  const H = 230;
  return (
    <AbsoluteFill style={{ top: 960, alignItems: "center", opacity: exit }}>
      <svg width={W + 8} height={H + 8} style={{ overflow: "visible" }}>
        <rect x={4} y={4} width={W} height={H} fill="rgba(10,10,10,0.82)" />
        <rect x={4} y={4} width={W * grid} height={H / rows} fill={GREEN} />
        {Array.from({ length: cols + 1 }).map((_, i) => (
          <line
            key={`c${i}`}
            x1={4 + (W / cols) * i}
            x2={4 + (W / cols) * i}
            y1={4}
            y2={4 + H * grid}
            stroke="rgba(245,245,240,0.35)"
            strokeWidth={2}
          />
        ))}
        {Array.from({ length: rows + 1 }).map((_, i) => (
          <line
            key={`r${i}`}
            y1={4 + (H / rows) * i}
            y2={4 + (H / rows) * i}
            x1={4}
            x2={4 + W * grid}
            stroke="rgba(245,245,240,0.35)"
            strokeWidth={2}
          />
        ))}
        {/* celdas que se rellenan como si alguien tecleara */}
        {Array.from({ length: cols * (rows - 1) }).map((_, i) => {
          const at = 0.12 + i * 0.035;
          const p = interpolate(frame / fps, [at, at + 0.08], [0, 1], clamp);
          const c = i % cols;
          const r = Math.floor(i / cols) + 1;
          const w = ((i * 37) % 50) + 30;
          return (
            <rect
              key={`v${i}`}
              x={4 + (W / cols) * c + 12}
              y={4 + (H / rows) * r + 20}
              width={w * p}
              height={10}
              fill={PAPER}
              opacity={0.75}
            />
          );
        })}
      </svg>
      <div style={{ marginTop: -36, transform: `scale(${0.7 + 0.3 * title}) rotate(-3deg)` }}>
        <Swipe p={title}>
          <div style={{ ...display, fontSize: 92, color: INK }}>El Excel</div>
        </Swipe>
      </div>
    </AbsoluteFill>
  );
};

const FlatChart: React.FC = () => {
  const frame = useCurrentFrame();
  const axes = useReveal(0, 0.3);
  const line = useReveal(0.15, 0.55, Easing.linear);
  const label = useSpringAt(0.5);
  const exit = useExit(0.2);
  const W = 560;
  const H = 210;
  // la línea intenta subir y se queda plana
  const wobble = Math.sin(frame / 2.2) * 2 * (1 - line);
  return (
    <AbsoluteFill style={{ top: 960, alignItems: "center", opacity: exit }}>
      <div style={{ position: "relative", width: W, height: H + 40 }}>
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            fontFamily: FONT,
            fontWeight: 700,
            fontSize: 30,
            letterSpacing: 6,
            color: PAPER,
            opacity: axes,
            textShadow: "0 1px 3px rgba(0,0,0,0.7)",
          }}
        >
          PECHO · PROGRESO
        </div>
        <svg width={W} height={H} style={{ position: "absolute", top: 40, overflow: "visible" }}>
          <path
            d={`M 4 0 L 4 ${H} L ${W} ${H}`}
            fill="none"
            stroke={PAPER}
            strokeWidth={5}
            strokeDasharray={W + H}
            strokeDashoffset={(W + H) * (1 - axes)}
          />
          <path
            d={`M 20 ${H * 0.62} L ${W - 30} ${H * 0.62 + wobble}`}
            fill="none"
            stroke={GREEN}
            strokeWidth={9}
            strokeLinecap="square"
            strokeDasharray={W}
            strokeDashoffset={W * (1 - line)}
          />
          <rect
            x={20 + (W - 50) * line - 10}
            y={H * 0.62 - 10}
            width={20}
            height={20}
            fill={GREEN}
            opacity={line > 0.02 ? 1 : 0}
          />
        </svg>
      </div>
      <div style={{ marginTop: -10, transform: `translateY(${(1 - label) * 30}px) rotate(-2deg)`, opacity: label }}>
        <Swipe p={label} color={PAPER}>
          <div style={{ ...display, fontSize: 70, color: INK }}>Sigue igual</div>
        </Swipe>
      </div>
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------------------
// E03 · herramientas en una misma línea (sin cruces ni valoración)

const Tools: React.FC<{ items: { text: string; at: number }[] }> = ({ items }) => {
  const band = useReveal(0, 0.3);
  const exit = useExit(0.2);
  return (
    <AbsoluteFill style={{ top: 1080, alignItems: "center", opacity: exit }}>
      <div
        style={{
          position: "relative",
          display: "flex",
          alignItems: "center",
          gap: 16,
          padding: "20px 30px 14px",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "rgba(10,10,10,0.86)",
            borderLeft: `8px solid ${GREEN}`,
            transformOrigin: "left",
            transform: `scaleX(${band}) skewX(-6deg)`,
          }}
        />
        {items.map((it, i) => (
          <ToolItem key={i} text={it.text} at={it.at} first={i === 0} />
        ))}
      </div>
    </AbsoluteFill>
  );
};

const ToolItem: React.FC<{ text: string; at: number; first: boolean }> = ({ text, at, first }) => {
  const p = useSpringAt(at, 14);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 16, position: "relative" }}>
      {!first ? (
        <div style={{ ...display, fontSize: 40, color: GREEN, opacity: p }}>+</div>
      ) : null}
      <MaskUp p={p}>
        <div style={{ ...display, fontSize: 40, color: PAPER, whiteSpace: "nowrap" }}>{text}</div>
      </MaskUp>
    </div>
  );
};

// ---------------------------------------------------------------------------
// E04 · «tres vídeos» (sin mostrar creadores ni contenido ajeno)

const Phone: React.FC<{ at: number; rot: number; dx: number }> = ({ at, rot, dx }) => {
  const p = useSpringAt(at, 11);
  return (
    <div
      style={{
        position: "absolute",
        left: "50%",
        top: 0,
        width: 132,
        height: 232,
        marginLeft: -66 + dx * p,
        transform: `translateY(${(1 - p) * 80}px) rotate(${rot * p}deg) scale(${0.6 + 0.4 * p})`,
        opacity: Math.min(1, p * 2),
        border: `6px solid ${PAPER}`,
        borderRadius: 22,
        background: "rgba(10,10,10,0.82)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <svg width={44} height={50}>
        <path d="M 6 4 L 40 25 L 6 46 Z" fill={GREEN} />
      </svg>
    </div>
  );
};

const ThreeVideos: React.FC = () => {
  const label = useSpringAt(0.5);
  const exit = useExit(0.2);
  return (
    <AbsoluteFill style={{ top: 920, alignItems: "center", opacity: exit }}>
      <div style={{ position: "relative", width: 600, height: 260 }}>
        <Phone at={0} rot={-13} dx={-170} />
        <Phone at={0.18} rot={13} dx={170} />
        <Phone at={0.36} rot={0} dx={0} />
      </div>
      <div style={{ marginTop: 6, transform: `rotate(-2deg) scale(${0.8 + 0.2 * label})` }}>
        <Swipe p={label}>
          <div style={{ ...display, fontSize: 84, color: INK }}>3 vídeos</div>
        </Swipe>
      </div>
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------------------
// Tono útil (desde E04): rótulos sobrios, sin rebotes

const SideTags: React.FC<{ items: { text: string; at: number }[] }> = ({ items }) => {
  const exit = useExit(0.25);
  return (
    <AbsoluteFill style={{ top: 1060, left: 90, opacity: exit }}>
      {items.map((it, i) => (
        <SideTag key={i} {...it} />
      ))}
    </AbsoluteFill>
  );
};

const SideTag: React.FC<{ text: string; at: number }> = ({ text, at }) => {
  const bar = useReveal(at, 0.3);
  const txt = useReveal(at + 0.06, 0.35);
  return (
    <div style={{ display: "flex", alignItems: "stretch", gap: 16, marginBottom: 14 }}>
      <div style={{ width: 8, background: GREEN, transform: `scaleY(${bar})`, transformOrigin: "top" }} />
      <MaskUp p={txt}>
        <div
          style={{
            fontFamily: FONT,
            fontWeight: 800,
            fontSize: 46,
            letterSpacing: 2,
            color: PAPER,
            textShadow: "0 2px 6px rgba(0,0,0,0.7)",
          }}
        >
          {text}
        </div>
      </MaskUp>
    </div>
  );
};

// E06 · «solo lo que haga falta»
const OnlyWhatsNeeded: React.FC = () => {
  const a = useReveal(0, 0.35);
  const b = useReveal(0.18, 0.35);
  const swipe = useReveal(0.35, 0.4);
  const exit = useExit(0.25);
  return (
    <AbsoluteFill style={{ top: 1000, alignItems: "center", opacity: exit }}>
      <div style={{ transform: "rotate(-2deg)", display: "flex", flexDirection: "column", alignItems: "center" }}>
        <MaskUp p={a}>
          <div style={{ ...display, fontSize: 74, color: PAPER, textShadow: "0 3px 10px rgba(0,0,0,0.6)" }}>
            Solo lo que
          </div>
        </MaskUp>
        <MaskUp p={b}>
          <Swipe p={swipe}>
            <div style={{ ...display, fontSize: 96, color: swipe > 0.5 ? INK : PAPER }}>haga falta</div>
          </Swipe>
        </MaskUp>
      </div>
    </AbsoluteFill>
  );
};

// «revisaría tus registros, cómo ejecutas, cómo te recuperas»
const Checklist: React.FC<{ title: string; items: { text: string; at: number }[] }> = ({ title, items }) => {
  const head = useReveal(0, 0.35);
  const exit = useExit(0.25);
  return (
    <AbsoluteFill style={{ top: 940, left: 90, opacity: exit }}>
      <MaskUp p={head}>
        <div style={{ fontFamily: FONT, fontWeight: 700, fontSize: 30, letterSpacing: 6, color: GREEN }}>
          {title}
        </div>
      </MaskUp>
      <div style={{ width: 420 * head, height: 3, background: GREEN, margin: "12px 0 22px" }} />
      {items.map((it, i) => (
        <CheckRow key={i} {...it} />
      ))}
    </AbsoluteFill>
  );
};

const CheckRow: React.FC<{ text: string; at: number }> = ({ text, at }) => {
  const box = useReveal(at - 0.15, 0.25);
  const tick = useReveal(at, 0.3);
  const txt = useReveal(at - 0.1, 0.35);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 24, marginBottom: 18, opacity: box }}>
      <svg width={52} height={52}>
        <rect x={3} y={3} width={46} height={46} fill="rgba(10,10,10,0.7)" stroke={PAPER} strokeWidth={4} />
        <path
          d="M 12 27 L 22 37 L 41 15"
          fill="none"
          stroke={GREEN}
          strokeWidth={7}
          strokeLinecap="square"
          strokeDasharray={50}
          strokeDashoffset={50 * (1 - tick)}
        />
      </svg>
      <MaskUp p={txt}>
        <div
          style={{
            fontFamily: FONT,
            fontWeight: 800,
            fontSize: 54,
            color: PAPER,
            textShadow: "0 2px 6px rgba(0,0,0,0.7)",
          }}
        >
          {text}
        </div>
      </MaskUp>
    </div>
  );
};

// E07 · «hacer más / hacer menos / dejar de cambiar» en una misma línea
const Options: React.FC<{ items: { text: string; at: number }[] }> = ({ items }) => {
  const exit = useExit(0.25);
  return (
    <AbsoluteFill style={{ top: 1150, alignItems: "center", opacity: exit }}>
      <div style={{ display: "flex", alignItems: "flex-end", gap: 10 }}>
        {items.map((it, i) => (
          <Option key={i} {...it} sep={i > 0} />
        ))}
      </div>
    </AbsoluteFill>
  );
};

const Option: React.FC<{ text: string; at: number; sep: boolean }> = ({ text, at, sep }) => {
  const txt = useReveal(at, 0.3);
  const under = useReveal(at + 0.12, 0.35);
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 14 }}>
      {sep ? (
        <div style={{ ...display, fontSize: 32, color: GREEN, opacity: txt, paddingBottom: 12 }}>/</div>
      ) : null}
      <div>
        <MaskUp p={txt}>
          <div
            style={{
              fontFamily: FONT,
              fontWeight: 900,
              fontStyle: "italic",
              fontSize: 32,
              color: PAPER,
              whiteSpace: "nowrap",
              textShadow: "0 2px 6px rgba(0,0,0,0.75)",
            }}
          >
            {text}
          </div>
        </MaskUp>
        <div style={{ height: 6, background: GREEN, width: `${under * 100}%`, marginTop: 4 }} />
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// E08 · CTA

const Cta: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const comenta = useReveal(0, 0.35);
  const plan = useSpringAt(0.44, 11);
  const sub = useReveal(0.96, 0.4);
  // tras entrar, PLAN respira muy levemente para atraer la mirada sin parpadear
  const breathe = 1 + Math.sin(frame / fps / 0.55) * 0.012 * plan;
  return (
    <AbsoluteFill style={{ top: 990, alignItems: "center" }}>
      <MaskUp p={comenta}>
        <div style={{ ...display, fontSize: 92, color: PAPER, textShadow: "0 3px 12px rgba(0,0,0,0.6)" }}>
          Comenta
        </div>
      </MaskUp>
      <div
        style={{
          position: "relative",
          marginTop: 6,
          transform: `scale(${(0.5 + 0.5 * plan) * breathe}) rotate(${-4 + 2 * plan}deg)`,
          opacity: Math.min(1, plan * 2),
        }}
      >
        <svg width={420} height={210} style={{ position: "absolute", left: -20, top: -10 }}>
          {/* bocadillo de comentario dibujado a mano alzada */}
          <path d="M 12 10 L 408 4 L 400 160 L 120 166 L 70 204 L 78 166 L 18 168 Z" fill={GREEN} />
        </svg>
        <div style={{ ...display, position: "relative", fontSize: 150, color: INK, padding: "4px 30px 0" }}>Plan</div>
      </div>
      <div style={{ marginTop: 56, opacity: sub, transform: `translateY(${(1 - sub) * 16}px)` }}>
        <div
          style={{
            fontFamily: FONT,
            fontWeight: 700,
            fontSize: 44,
            color: PAPER,
            letterSpacing: 1,
            textShadow: "0 2px 8px rgba(0,0,0,0.8)",
          }}
        >
          Te escribo por privado
        </div>
      </div>
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------------------

export const Graphics: React.FC = () => (
  <AbsoluteFill>
    <At from={1.28} to={3.7} name="Etiqueta · ENTRENADOR">
      <SpeakerTag text="ENTRENADOR" />
    </At>
    <At from={3.72} to={4.78} name="Etiqueta · CLIENTE">
      <SpeakerTag text="CLIENTE" />
    </At>

    <At from={7.3} to={8.2} name="E02 · El Excel">
      <ExcelCard />
    </At>
    <At from={8.2} to={9.6} name="E02 · El pecho sigue igual">
      <FlatChart />
    </At>

    <At from={11.6} to={14.5} name="E03 · Volumen + frecuencia 3 + drop sets">
      <Tools
        items={[
          { text: "Volumen", at: 0.08 },
          { text: "Frecuencia 3", at: 0.88 },
          { text: "Drop sets", at: 2.16 },
        ]}
      />
    </At>

    <At from={24.3} to={25.84} name="E04 · Tres vídeos">
      <ThreeVideos />
    </At>

    <At from={33.7} to={36.0} name="Prioridades · tiempo">
      <SideTags
        items={[
          { text: "TUS PRIORIDADES", at: 0.06 },
          { text: "TU TIEMPO", at: 1.22 },
        ]}
      />
    </At>

    <At from={38.96} to={40.6} name="E06 · Solo lo que haga falta">
      <OnlyWhatsNeeded />
    </At>

    <At from={45.24} to={49.96} name="Antes de añadir más">
      <Checklist
        title="ANTES DE AÑADIR MÁS"
        items={[
          { text: "Registros", at: 2.08 },
          { text: "Ejecución", at: 2.92 },
          { text: "Recuperación", at: 4.0 },
        ]}
      />
    </At>

    <At from={53.9} to={57.06} name="E07 · Hacer más / hacer menos / dejar de cambiar">
      <Options
        items={[
          { text: "HACER MÁS", at: 0.1 },
          { text: "HACER MENOS", at: 0.82 },
          { text: "DEJAR DE CAMBIAR", at: 1.9 },
        ]}
      />
    </At>

    <At from={61.68} to={65.6} name="E08 · Comenta PLAN">
      <Cta />
    </At>
  </AbsoluteFill>
);
