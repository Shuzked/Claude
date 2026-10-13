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
// Animación

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const easeOut = Easing.bezier(0.16, 1, 0.3, 1);
const easeIn = Easing.bezier(0.7, 0, 0.84, 0);

// Los paneles necesitan este tiempo para entrar antes de mostrar contenido.
const PANEL_IN = 0.32;
const PANEL_OUT = 0.26;

/** 0→1 desde `at` (segundos desde el inicio del bloque) en `dur` segundos. */
const useReveal = (at: number, dur = 0.35, ease = easeOut) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return interpolate(frame / fps, [at, at + dur], [0, 1], { ...clamp, easing: ease });
};

const useSpringAt = (at: number, damping = 14) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return spring({ frame: frame - at * fps, fps, config: { damping, stiffness: 210, mass: 0.6 } });
};

const display: React.CSSProperties = {
  fontFamily: FONT,
  fontWeight: 900,
  fontStyle: "italic",
  textTransform: "uppercase",
  letterSpacing: -1,
  lineHeight: 0.95,
  whiteSpace: "nowrap",
};

const label: React.CSSProperties = {
  fontFamily: FONT,
  fontWeight: 700,
  fontSize: 26,
  letterSpacing: 6,
  textTransform: "uppercase",
  color: GREEN,
  whiteSpace: "nowrap",
};

/** Texto que sube detrás de una máscara. */
const MaskUp: React.FC<{ p: number; children: React.ReactNode; style?: React.CSSProperties }> = ({
  p,
  children,
  style,
}) => (
  <div style={{ overflow: "hidden", padding: "0 10px 4px 0", ...style }}>
    <div style={{ transform: `translateY(${(1 - p) * 110}%)` }}>{children}</div>
  </div>
);

/** Subrayado verde que se dibuja de izquierda a derecha. */
const Underline: React.FC<{ p: number; height?: number }> = ({ p, height = 8 }) => (
  <div
    style={{
      height,
      marginTop: 6,
      background: GREEN,
      transformOrigin: "left center",
      transform: `scaleX(${p}) skewX(-12deg)`,
    }}
  />
);

// ---------------------------------------------------------------------------
// Panel: negro neutro (no puro) con textura de vídeo vintage y transiciones

const Texture: React.FC<{ id: string }> = ({ id }) => {
  const frame = useCurrentFrame();
  const seed = Math.floor(frame / 2) % 9;
  // un arañazo vertical que aparece de vez en cuando
  const scratch = (frame * 37) % 97 < 6;
  const scratchX = ((frame * 53) % 89) + 5;
  const flicker = 1 + Math.sin(frame * 1.7) * 0.015 + Math.sin(frame * 0.37) * 0.01;
  return (
    <AbsoluteFill style={{ filter: `brightness(${flicker})` }}>
      <AbsoluteFill style={{ background: "#141414" }} />
      <AbsoluteFill
        style={{
          background: "radial-gradient(ellipse 90% 80% at 40% 30%, rgba(255,255,255,0.05), transparent 70%)",
        }}
      />
      <svg width="100%" height="100%" style={{ position: "absolute", opacity: 0.22, mixBlendMode: "screen" }}>
        <filter id={`n-${id}-${seed}`}>
          <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves={2} seed={seed} />
          <feColorMatrix type="saturate" values="0" />
        </filter>
        <rect width="100%" height="100%" filter={`url(#n-${id}-${seed})`} />
      </svg>
      <AbsoluteFill
        style={{
          background:
            "repeating-linear-gradient(0deg, rgba(255,255,255,0.035) 0px, rgba(255,255,255,0.035) 1px, transparent 1px, transparent 4px)",
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
            background: "rgba(255,255,255,0.18)",
          }}
        />
      ) : null}
      <AbsoluteFill style={{ boxShadow: "inset 0 0 60px rgba(0,0,0,0.65)" }} />
    </AbsoluteFill>
  );
};

const Panel: React.FC<{
  id: string;
  top: number;
  width: number;
  height: number;
  children: React.ReactNode;
}> = ({ id, top, width, height, children }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const t = frame / fps;
  const end = durationInFrames / fps;
  const inP = interpolate(t, [0, PANEL_IN], [0, 1], { ...clamp, easing: easeOut });
  const outP = interpolate(t, [end - PANEL_OUT, end], [0, 1], { ...clamp, easing: easeIn });
  // entra barriendo desde la izquierda y sale barriendo hacia la derecha
  const clip = `inset(0 ${(1 - inP) * 100}% 0 ${outP * 100}%)`;
  return (
    <AbsoluteFill style={{ top, height, alignItems: "center" }}>
      <div
        style={{
          position: "relative",
          width,
          height,
          overflow: "hidden",
          clipPath: clip,
          transform: `translateX(${(1 - inP) * -50 + outP * 50}px) skewX(${(1 - inP) * -6 + outP * 6}deg)`,
        }}
      >
        <Texture id={id} />
        <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 7, background: GREEN }} />
        <div style={{ position: "absolute", inset: 0, border: "1.5px solid rgba(255,255,255,0.08)" }} />
        <div style={{ position: "absolute", inset: 0, padding: "34px 44px 30px 52px" }}>{children}</div>
      </div>
    </AbsoluteFill>
  );
};

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
// E02 · «el Excel» → «el pecho sigue igual» (mismo panel, cambio con barrido)

const SWAP = 1.17; // segundos tras la entrada del panel: justo antes de «pecho» (8,2 s)

const ExcelGrid: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const grid = useReveal(PANEL_IN - 0.1, 0.3);
  const head = useReveal(PANEL_IN - 0.15, 0.3);
  const title = useSpringAt(PANEL_IN + 0.02, 15);
  const cols = 5;
  const rows = 4;
  const W = 560;
  const H = 150;
  return (
    <div>
      <MaskUp p={head}>
        <div style={label}>rutina.xlsx</div>
      </MaskUp>
      <svg width={W} height={H} style={{ marginTop: 14, display: "block" }}>
        <rect x={0} y={0} width={W * grid} height={H / rows} fill={GREEN} opacity={0.9} />
        {Array.from({ length: cols + 1 }).map((_, i) => (
          <line
            key={`c${i}`}
            x1={(W / cols) * i}
            x2={(W / cols) * i}
            y1={0}
            y2={H * grid}
            stroke="rgba(245,245,240,0.3)"
            strokeWidth={2}
          />
        ))}
        {Array.from({ length: rows + 1 }).map((_, i) => (
          <line
            key={`r${i}`}
            y1={(H / rows) * i}
            y2={(H / rows) * i}
            x1={0}
            x2={W * grid}
            stroke="rgba(245,245,240,0.3)"
            strokeWidth={2}
          />
        ))}
        {Array.from({ length: cols * (rows - 1) }).map((_, i) => {
          const at = PANEL_IN + i * 0.03;
          const p = interpolate(frame / fps, [at, at + 0.08], [0, 1], clamp);
          const c = i % cols;
          const r = Math.floor(i / cols) + 1;
          const w = ((i * 37) % 44) + 26;
          return (
            <rect
              key={`v${i}`}
              x={(W / cols) * c + 12}
              y={(H / rows) * r + 16}
              width={w * p}
              height={9}
              fill={PAPER}
              opacity={0.7}
            />
          );
        })}
      </svg>
      <div style={{ marginTop: 18 }}>
        <MaskUp p={title}>
          <div style={{ ...display, fontSize: 64, color: PAPER }}>El Excel</div>
        </MaskUp>
      </div>
    </div>
  );
};

const FlatChart: React.FC = () => {
  const frame = useCurrentFrame();
  const axes = useReveal(0.05, 0.3);
  const line = useReveal(0.18, 0.5, Easing.linear);
  const stamp = useSpringAt(0.4, 13);
  const under = useReveal(0.55, 0.3);
  const W = 560;
  const H = 150;
  const wobble = Math.sin(frame / 2.2) * 2 * (1 - line);
  return (
    <div>
      <MaskUp p={axes}>
        <div style={label}>Pecho · progreso</div>
      </MaskUp>
      <svg width={W} height={H} style={{ marginTop: 14, display: "block", overflow: "visible" }}>
        <path
          d={`M 3 0 L 3 ${H - 3} L ${W} ${H - 3}`}
          fill="none"
          stroke={PAPER}
          strokeWidth={4}
          strokeDasharray={W + H}
          strokeDashoffset={(W + H) * (1 - axes)}
        />
        <path
          d={`M 18 ${H * 0.58} L ${W - 24} ${H * 0.58 + wobble}`}
          fill="none"
          stroke={GREEN}
          strokeWidth={8}
          strokeDasharray={W}
          strokeDashoffset={W * (1 - line)}
        />
        <rect
          x={18 + (W - 42) * line - 9}
          y={H * 0.58 - 9}
          width={18}
          height={18}
          fill={GREEN}
          opacity={line > 0.02 ? 1 : 0}
        />
      </svg>
      <div style={{ marginTop: 22, transform: `scale(${0.85 + 0.15 * stamp})`, transformOrigin: "left center" }}>
        <MaskUp p={stamp}>
          <div style={{ ...display, fontSize: 64, color: PAPER }}>Sigue igual</div>
        </MaskUp>
        <div style={{ width: 380 }}>
          <Underline p={under} />
        </div>
      </div>
    </div>
  );
};

const ExcelToChart: React.FC = () => {
  const { fps } = useVideoConfig();
  // barrido vertical entre las dos vistas
  const swap = useReveal(SWAP - 0.05, 0.3);
  return (
    <Panel id="excel" top={960} width={680} height={370}>
      <div style={{ position: "relative", height: "100%" }}>
        <div style={{ position: "absolute", inset: 0, transform: `translateY(${-swap * 110}%)` }}>
          <ExcelGrid />
        </div>
        <div style={{ position: "absolute", inset: 0, transform: `translateY(${(1 - swap) * 110}%)` }}>
          <Sequence from={Math.round(SWAP * fps)} layout="none">
            <FlatChart />
          </Sequence>
        </div>
      </div>
    </Panel>
  );
};

// ---------------------------------------------------------------------------
// E03 · herramientas en una misma línea (sin cruces ni valoración)

const Tools: React.FC<{ items: { text: string; at: number }[] }> = ({ items }) => (
  <Panel id="tools" top={1110} width={960} height={140}>
    <div style={{ display: "flex", alignItems: "center", height: "100%", gap: 14 }}>
      {items.map((it, i) => (
        <ToolItem key={i} {...it} first={i === 0} />
      ))}
    </div>
  </Panel>
);

const ToolItem: React.FC<{ text: string; at: number; first: boolean }> = ({ text, at, first }) => {
  const p = useSpringAt(at, 15);
  const u = useReveal(at + 0.1, 0.3);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
      {!first ? <div style={{ ...display, fontSize: 34, color: GREEN, opacity: p }}>+</div> : null}
      <div>
        <MaskUp p={p}>
          <div style={{ ...display, fontSize: 36, color: PAPER }}>{text}</div>
        </MaskUp>
        <Underline p={u} height={5} />
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// E04 · «tres vídeos» (sin mostrar creadores ni contenido ajeno)

const Phone: React.FC<{ at: number; rot: number; dx: number }> = ({ at, rot, dx }) => {
  const p = useSpringAt(at, 12);
  return (
    <div
      style={{
        position: "absolute",
        left: "50%",
        top: 6,
        width: 112,
        height: 196,
        marginLeft: -56 + dx * p,
        transform: `translateY(${(1 - p) * 70}px) rotate(${rot * p}deg) scale(${0.6 + 0.4 * p})`,
        opacity: Math.min(1, p * 2),
        border: `5px solid ${PAPER}`,
        borderRadius: 18,
        background: "#1c1c1c",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <svg width={38} height={44}>
        <path d="M 5 3 L 35 22 L 5 41 Z" fill={GREEN} />
      </svg>
    </div>
  );
};

const ThreeVideos: React.FC = () => {
  const lbl = useSpringAt(PANEL_IN + 0.3, 14);
  const under = useReveal(PANEL_IN + 0.45, 0.3);
  return (
    <Panel id="videos" top={930} width={620} height={400}>
      <div style={{ position: "relative", height: 220 }}>
        <Phone at={PANEL_IN - 0.05} rot={-12} dx={-150} />
        <Phone at={PANEL_IN + 0.1} rot={12} dx={150} />
        <Phone at={PANEL_IN + 0.25} rot={0} dx={0} />
      </div>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginTop: 18 }}>
        <MaskUp p={lbl}>
          <div style={{ ...display, fontSize: 70, color: PAPER }}>3 vídeos</div>
        </MaskUp>
        <div style={{ width: 300 }}>
          <Underline p={under} />
        </div>
      </div>
    </Panel>
  );
};

// ---------------------------------------------------------------------------
// Tono útil (desde E04): paneles sobrios

const Rows: React.FC<{
  id: string;
  top: number;
  width: number;
  title: string;
  items: { text: string; at: number }[];
}> = ({ id, top, width, title, items }) => {
  const head = useReveal(PANEL_IN - 0.1, 0.3);
  return (
    <Panel id={id} top={top} width={width} height={110 + items.length * 78}>
      <MaskUp p={head}>
        <div style={label}>{title}</div>
      </MaskUp>
      <div style={{ marginTop: 14 }}>
        {items.map((it, i) => (
          <Row key={i} {...it} />
        ))}
      </div>
    </Panel>
  );
};

const Row: React.FC<{ text: string; at: number }> = ({ text, at }) => {
  const p = useReveal(Math.max(PANEL_IN, at), 0.35);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 20, height: 78 }}>
      <div style={{ width: 16, height: 16, background: GREEN, transform: `scale(${p})` }} />
      <MaskUp p={p}>
        <div style={{ fontFamily: FONT, fontWeight: 800, fontSize: 50, color: PAPER, whiteSpace: "nowrap" }}>
          {text}
        </div>
      </MaskUp>
    </div>
  );
};

// E06 · «solo lo que haga falta»
const OnlyWhatsNeeded: React.FC = () => {
  const a = useReveal(PANEL_IN - 0.05, 0.35);
  const b = useReveal(PANEL_IN + 0.1, 0.35);
  const under = useReveal(PANEL_IN + 0.35, 0.35);
  return (
    <Panel id="falta" top={990} width={760} height={290}>
      <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", height: "100%" }}>
        <MaskUp p={a}>
          <div style={{ ...display, fontSize: 64, color: PAPER }}>Solo lo que</div>
        </MaskUp>
        <MaskUp p={b}>
          <div style={{ ...display, fontSize: 84, color: GREEN }}>haga falta</div>
        </MaskUp>
        <div style={{ width: 470 }}>
          <Underline p={under} />
        </div>
      </div>
    </Panel>
  );
};

// «antes de añadir más, revisaría tus registros, cómo ejecutas, cómo te recuperas»
const Checklist: React.FC<{ items: { text: string; at: number }[] }> = ({ items }) => {
  const head = useReveal(PANEL_IN - 0.1, 0.3);
  return (
    <Panel id="check" top={900} width={680} height={350}>
      <MaskUp p={head}>
        <div style={label}>Antes de añadir más</div>
      </MaskUp>
      <div style={{ marginTop: 24 }}>
        {items.map((it, i) => (
          <CheckRow key={i} {...it} />
        ))}
      </div>
    </Panel>
  );
};

const CheckRow: React.FC<{ text: string; at: number }> = ({ text, at }) => {
  const box = useReveal(at - 0.2, 0.25);
  const tick = useReveal(at, 0.3);
  const txt = useReveal(at - 0.12, 0.35);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 24, height: 80, opacity: box }}>
      <svg width={50} height={50}>
        <rect x={3} y={3} width={44} height={44} fill="none" stroke={PAPER} strokeWidth={4} />
        <path
          d="M 11 26 L 21 36 L 40 14"
          fill="none"
          stroke={GREEN}
          strokeWidth={7}
          strokeDasharray={50}
          strokeDashoffset={50 * (1 - tick)}
        />
      </svg>
      <MaskUp p={txt}>
        <div style={{ fontFamily: FONT, fontWeight: 800, fontSize: 52, color: PAPER, whiteSpace: "nowrap" }}>
          {text}
        </div>
      </MaskUp>
    </div>
  );
};

// E07 · «hacer más / hacer menos / dejar de cambiar» en una misma línea
const Options: React.FC<{ items: { text: string; at: number }[] }> = ({ items }) => (
  <Panel id="options" top={1100} width={960} height={140}>
    <div style={{ display: "flex", alignItems: "center", height: "100%", gap: 12 }}>
      {items.map((it, i) => (
        <Option key={i} {...it} sep={i > 0} />
      ))}
    </div>
  </Panel>
);

const Option: React.FC<{ text: string; at: number; sep: boolean }> = ({ text, at, sep }) => {
  const txt = useReveal(at, 0.3);
  const under = useReveal(at + 0.12, 0.35);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
      {sep ? <div style={{ ...display, fontSize: 30, color: GREEN, opacity: txt }}>/</div> : null}
      <div>
        <MaskUp p={txt}>
          <div style={{ ...display, fontSize: 30, color: PAPER, letterSpacing: 0 }}>{text}</div>
        </MaskUp>
        <Underline p={under} height={5} />
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// E08 · CTA

const Cta: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const comenta = useReveal(PANEL_IN - 0.05, 0.35);
  const plan = useSpringAt(0.44, 12);
  const sub = useReveal(0.96, 0.4);
  const breathe = 1 + Math.sin(frame / fps / 0.55) * 0.012 * plan;
  return (
    <Panel id="cta" top={900} width={720} height={420}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", height: "100%" }}>
        <MaskUp p={comenta}>
          <div style={{ ...display, fontSize: 76, color: PAPER }}>Comenta</div>
        </MaskUp>
        <div
          style={{
            position: "relative",
            marginTop: 8,
            width: 360,
            height: 170,
            transform: `scale(${(0.5 + 0.5 * plan) * breathe}) rotate(${-4 + 2 * plan}deg)`,
            opacity: Math.min(1, plan * 2),
          }}
        >
          <svg width={360} height={170} style={{ position: "absolute", inset: 0 }}>
            <path d="M 8 8 L 352 4 L 346 128 L 112 134 L 66 166 L 72 134 L 14 136 Z" fill={GREEN} />
          </svg>
          <div
            style={{
              ...display,
              position: "absolute",
              left: 0,
              right: 0,
              top: 10,
              textAlign: "center",
              fontSize: 118,
              color: INK,
            }}
          >
            Plan
          </div>
        </div>
        <div style={{ marginTop: 26, opacity: sub, transform: `translateY(${(1 - sub) * 14}px)` }}>
          <div style={{ fontFamily: FONT, fontWeight: 700, fontSize: 40, color: PAPER, whiteSpace: "nowrap" }}>
            Te escribo por privado
          </div>
        </div>
      </div>
    </Panel>
  );
};

// ---------------------------------------------------------------------------

export const Graphics: React.FC = () => (
  <AbsoluteFill>
    <At from={7.3 - PANEL_IN} to={9.62} name="E02 · El Excel → el pecho sigue igual">
      <ExcelToChart />
    </At>

    <At from={11.5} to={14.6} name="E03 · Volumen + frecuencia 3 + drop sets">
      <Tools
        items={[
          { text: "Volumen", at: 0.28 },
          { text: "Frecuencia 3", at: 1.08 },
          { text: "Drop sets", at: 2.36 },
        ]}
      />
    </At>

    <At from={24.32 - PANEL_IN} to={25.9} name="E04 · Tres vídeos">
      <ThreeVideos />
    </At>

    <At from={33.6} to={36.05} name="Prioridades · tiempo">
      <Rows
        id="prio"
        top={1000}
        width={620}
        title="Ajustar el trabajo a"
        items={[
          { text: "Tus prioridades", at: 0.16 },
          { text: "Tu tiempo", at: 1.32 },
        ]}
      />
    </At>

    <At from={38.96 - PANEL_IN} to={40.7} name="E06 · Solo lo que haga falta">
      <OnlyWhatsNeeded />
    </At>

    <At from={45.24} to={50.0} name="Antes de añadir más">
      <Checklist
        items={[
          { text: "Registros", at: 2.08 },
          { text: "Ejecución", at: 2.92 },
          { text: "Recuperación", at: 4.0 },
        ]}
      />
    </At>

    <At from={53.9} to={57.1} name="E07 · Hacer más / hacer menos / dejar de cambiar">
      <Options
        items={[
          { text: "Hacer más", at: 0.1 + PANEL_IN },
          { text: "Hacer menos", at: 0.82 },
          { text: "Dejar de cambiar", at: 1.9 },
        ]}
      />
    </At>

    <At from={61.68} to={65.6} name="E08 · Comenta PLAN">
      <Cta />
    </At>
  </AbsoluteFill>
);
