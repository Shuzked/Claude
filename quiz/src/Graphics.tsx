import React from "react";
import {
  AbsoluteFill,
  Easing,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { FONT, GREEN, PAPER } from "./theme";
import {
  BLOCKS,
  CTA,
  f,
  HOOK,
  QUESTIONS,
  RES,
  THINK,
  toSrc,
  levelOut,
  type Question,
} from "./timeline";

// Motion graphics del quiz. Todas las capas leen el tiempo del ORIGINAL (toSrc) y
// animan con fotogramas del montaje (f), así nada se desincroniza con los cortes.

const NEON = "#3BFF2E";
const INK = "#0A0A0A";
const GLOW = "drop-shadow(0 0 10px rgba(4,228,0,0.6))";
const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const easeOut = Easing.bezier(0.16, 1, 0.3, 1);
const easeInOut = Easing.bezier(0.65, 0, 0.35, 1);

const display: React.CSSProperties = {
  fontFamily: FONT,
  fontWeight: 900,
  fontStyle: "italic",
  textTransform: "uppercase",
  letterSpacing: -1,
  lineHeight: 0.95,
  whiteSpace: "nowrap",
  color: PAPER,
};
const stroke = (w: number): React.CSSProperties => ({
  WebkitTextStroke: `${w}px rgba(0,0,0,0.88)`,
  paintOrder: "stroke fill",
});
const label: React.CSSProperties = {
  fontFamily: FONT,
  fontWeight: 800,
  fontSize: 24,
  letterSpacing: 5,
  textTransform: "uppercase",
  color: GREEN,
  whiteSpace: "nowrap",
};

/** Tiempo del original y helpers de animación en fotogramas del montaje. */
const useClock = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = toSrc(frame / fps);
  const pop = (at: number, damping = 11, stiffness = 210) =>
    spring({
      frame: frame - f(at),
      fps,
      config: { damping, stiffness, mass: 0.6 },
    });
  const ramp = (a: number, b: number, ease = easeOut) =>
    interpolate(frame, [f(a), Math.max(f(a) + 1, f(b))], [0, 1], {
      ...clamp,
      easing: ease,
    });
  return { t, frame, fps, pop, ramp };
};

/** Tarjeta oscura de cristal, base de todos los recursos. */
const Glass: React.FC<{
  style?: React.CSSProperties;
  children: React.ReactNode;
}> = ({ style, children }) => (
  <div
    style={{
      background:
        "linear-gradient(180deg, rgba(28,28,28,0.94) 0%, rgba(14,14,14,0.96) 100%)",
      border: "2px solid rgba(255,255,255,0.14)",
      borderRadius: 26,
      boxShadow: "0 24px 60px rgba(0,0,0,0.55)",
      ...style,
    }}
  >
    {children}
  </div>
);

const Cite: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div
    style={{
      ...label,
      fontSize: 20,
      letterSpacing: 3,
      color: "rgba(255,255,255,0.55)",
    }}
  >
    {children}
  </div>
);

/** Entrada/salida estándar de un recurso (sube y se desvanece). */
const useEnter = (from: number, to: number) => {
  const { pop, ramp } = useClock();
  const p = pop(from, 13, 190);
  const out = ramp(to - 0.3, to, easeInOut);
  return {
    opacity: Math.min(1, p * 2) * (1 - out),
    transform: `translateY(${(1 - p) * 70 + out * 30}px) scale(${0.92 + 0.08 * p})`,
  } as React.CSSProperties;
};

// ---------------------------------------------------------------------------
// Hook: «¿Entrenamiento o biomecánica?» y los dos casilleros

const HookTitle: React.FC = () => {
  const { t, pop, ramp } = useClock();
  if (t > HOOK.end + 0.2) return null;
  const a = pop(HOOK.training - 0.05, 10);
  const b = pop(HOOK.bio - 0.05, 10);
  const vs = pop(HOOK.bio - 0.3, 8);
  const out = ramp(HOOK.end - 0.15, HOOK.end + 0.15, easeInOut);
  return (
    <AbsoluteFill style={{ opacity: 1 - out }}>
      <div
        style={{
          position: "absolute",
          top: 210,
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
            ...stroke(10),
            fontSize: 84,
            transform: `translateX(${(1 - a) * -300}px)`,
            opacity: Math.min(1, a * 2),
          }}
        >
          ¿Entrenamiento
        </div>
        <div
          style={{
            ...display,
            fontSize: 54,
            color: INK,
            background: GREEN,
            padding: "8px 22px 4px",
            margin: "14px 0",
            transform: `scale(${vs}) rotate(${(1 - vs) * 30 - 4}deg)`,
            filter: GLOW,
          }}
        >
          o
        </div>
        <div
          style={{
            ...display,
            ...stroke(10),
            fontSize: 84,
            color: GREEN,
            transform: `translateX(${(1 - b) * 300}px)`,
            opacity: Math.min(1, b * 2),
          }}
        >
          biomecánica?
        </div>
      </div>
    </AbsoluteFill>
  );
};

const ScoreBox: React.FC<{
  title: string;
  score?: string;
  on?: boolean;
  style?: React.CSSProperties;
}> = ({ title, score = "?", on, style }) => (
  <Glass
    style={{
      width: 430,
      padding: "26px 0 22px",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      ...(on
        ? {
            border: `2.5px solid ${GREEN}`,
            boxShadow: "0 0 30px rgba(4,228,0,0.35)",
          }
        : {}),
      ...style,
    }}
  >
    <div
      style={{
        ...label,
        fontSize: 24,
        color: on ? GREEN : "rgba(255,255,255,0.75)",
      }}
    >
      {title}
    </div>
    <div style={{ ...display, fontSize: 96, marginTop: 10, letterSpacing: 2 }}>
      {score}
      <span style={{ color: "rgba(255,255,255,0.4)" }}>/3</span>
    </div>
  </Glass>
);

const Boards: React.FC = () => {
  const { t, pop, ramp } = useClock();
  if (t < HOOK.boards - 0.1 || t > HOOK.rulesEnd + 0.2) return null;
  const a = pop(HOOK.boards, 11);
  const b = pop(HOOK.boards + 0.25, 11);
  const rule = pop(HOOK.noChange, 10);
  const out = ramp(HOOK.rulesEnd - 0.25, HOOK.rulesEnd + 0.1, easeInOut);
  return (
    <AbsoluteFill style={{ opacity: 1 - out }}>
      <div
        style={{
          position: "absolute",
          top: 1080,
          left: 0,
          right: 0,
          display: "flex",
          justifyContent: "center",
          gap: 40,
        }}
      >
        <div
          style={{
            transform: `translateY(${(1 - a) * 80}px)`,
            opacity: Math.min(1, a * 2),
          }}
        >
          <ScoreBox title="Entrenamiento" />
        </div>
        <div
          style={{
            transform: `translateY(${(1 - b) * 80}px)`,
            opacity: Math.min(1, b * 2),
          }}
        >
          <ScoreBox title="Biomecánica" />
        </div>
      </div>
      <div
        style={{
          position: "absolute",
          top: 1380,
          left: 0,
          right: 0,
          display: "flex",
          justifyContent: "center",
          transform: `scale(${rule})`,
          opacity: Math.min(1, rule * 2),
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 16,
            background: GREEN,
            padding: "14px 28px 10px",
            filter: GLOW,
          }}
        >
          <svg width={34} height={38} viewBox="0 0 34 38">
            <rect x={3} y={16} width={28} height={20} rx={4} fill={INK} />
            <path
              d="M 9 16 L 9 11 C 9 3, 25 3, 25 11 L 25 16"
              fill="none"
              stroke={INK}
              strokeWidth={5}
            />
          </svg>
          <div style={{ ...display, fontSize: 40, color: INK }}>
            No vale cambiar de respuesta
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------------------
// Cabecera: una sola pastilla blanca de principio a fin del juego. Al pasar a
// biomecánica la palabra gira (sale «Entrenamiento», entra «Biomecánica»).

const HEADER_FROM = BLOCKS[0].from;
const HEADER_TO = BLOCKS[1].to;
const SWITCH = 66.4; // «…y ahora biomecánica»

const BlockHeader: React.FC = () => {
  const { t, pop, ramp } = useClock();
  if (t < HEADER_FROM - 0.05 || t > HEADER_TO + 0.05) return null;
  const p = pop(HEADER_FROM, 12);
  const out = ramp(HEADER_TO - 0.3, HEADER_TO, easeInOut);
  const k = ramp(SWITCH - 0.3, SWITCH + 0.25, Easing.bezier(0.7, 0, 0.2, 1));
  const bump = Math.sin(k * Math.PI);
  const b = k < 0.5 ? BLOCKS[0] : BLOCKS[1];
  const qs = QUESTIONS.filter((q) => q.block === b.block);
  const level = qs.filter((q) => t >= q.nivelAt - 0.05).length;
  const word = (text: string, y: number, o: number) => (
    <div
      style={{
        position: "absolute",
        inset: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        ...display,
        fontSize: 40,
        transform: `translateY(${y}px) rotateX(${-y * 1.2}deg)`,
        opacity: o,
        filter: `blur(${Math.abs(y) / 9}px)`,
      }}
    >
      {text}
    </div>
  );
  return (
    <AbsoluteFill style={{ opacity: Math.min(1, p * 2) * (1 - out) }}>
      <div
        style={{
          position: "absolute",
          top: 120,
          left: 0,
          right: 0,
          display: "flex",
          justifyContent: "center",
          transform: `translateY(${(1 - p) * -60}px) scale(${1 + 0.07 * bump})`,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 22,
            padding: "16px 30px 14px",
            background: "rgba(10,10,10,0.78)",
            border: `2px solid ${bump > 0.05 ? `rgba(4,228,0,${0.3 + 0.7 * bump})` : "rgba(255,255,255,0.14)"}`,
            boxShadow: `0 0 ${40 * bump}px rgba(4,228,0,${0.6 * bump})`,
            borderRadius: 999,
          }}
        >
          <div
            style={{
              position: "relative",
              width: interpolate(k, [0, 1], [372, 312]),
              height: 46,
              perspective: 400,
            }}
          >
            {k < 1 ? word("Entrenamiento", -k * 56, 1 - k) : null}
            {k > 0 ? word("Biomecánica", (1 - k) * 56, k) : null}
          </div>
          <div
            style={{
              width: 2,
              height: 34,
              background: "rgba(255,255,255,0.25)",
            }}
          />
          <div
            style={{ ...label, fontSize: 22, color: "rgba(255,255,255,0.8)" }}
          >
            Nivel {Math.max(1, level)}
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            {[1, 2, 3].map((n) => {
              const on = qs[n - 1] ? pop(qs[n - 1].numAt, 8) : 0;
              const lit = n <= level ? Math.min(1, on * 1.2) : 0;
              return (
                <div
                  key={n}
                  style={{
                    width: 16,
                    height: 16,
                    borderRadius: 999,
                    background: lit > 0.5 ? GREEN : "rgba(255,255,255,0.18)",
                    boxShadow:
                      n === level ? "0 0 12px rgba(4,228,0,0.8)" : undefined,
                    transform: `scale(${n === level ? 0.6 + 0.6 * on : 1})`,
                  }}
                />
              );
            })}
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------------------
// Pregunta: enunciado, opciones A/B/C, cuenta atrás de 5 s y revelación.
// La respuesta correcta se queda (sube y acompaña a la explicación).

const LETTERS = ["A", "B", "C"];
const STATEMENT_TOP = 850;
const OPTIONS_TOP = 1112;
const OPTION_H = 104;
const OPTION_GAP = 18;
const CHIP_TOP = 862;
const PANEL_TOP = 990;
/** El enunciado entra cuando se retira el «NIVEL n» de detrás. */
const qShow = (q: Question) => Math.max(q.qFrom - 0.15, levelOut(q) - 0.3);
/** La explicación entra cuando la respuesta ya se ha visto un rato. */
const resStart = (q: Question, at: number) => Math.max(at, q.answerAt + 1.3);

const Scrim: React.FC<{ q: Question }> = ({ q }) => {
  const { ramp } = useClock();
  const o = ramp(qShow(q) - 0.1, qShow(q) + 0.4) * (1 - ramp(q.resEnd - 0.35, q.resEnd, easeInOut));
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        opacity: o,
        background:
          "linear-gradient(180deg, transparent 34%, rgba(0,0,0,0.62) 48%, rgba(0,0,0,0.86) 100%)",
      }}
    />
  );
};

const Statement: React.FC<{ q: Question }> = ({ q }) => {
  const { t, pop, ramp } = useClock();
  if (t < qShow(q) - 0.05) return null;
  const p = pop(qShow(q), 13, 190);
  const out = ramp(q.answerAt + 0.55, q.answerAt + 0.9, easeInOut);
  const ws = q.statement.split(" ");
  return (
    <div
      style={{
        position: "absolute",
        top: STATEMENT_TOP,
        left: 60,
        right: 60,
        opacity: Math.min(1, p * 2) * (1 - out),
        transform: `translateY(${(1 - p) * 40 - out * 24}px)`,
      }}
    >
      <Glass style={{ padding: "22px 34px 26px" }}>
        <div style={{ ...label, fontSize: 20, letterSpacing: 5 }}>
          Pregunta {q.level}
        </div>
        <div
          style={{
            fontFamily: FONT,
            fontWeight: 800,
            fontSize: 40,
            lineHeight: 1.18,
            color: PAPER,
            marginTop: 10,
            paddingRight: 70,
          }}
        >
          {ws.map((w, i) => {
            // se ilumina palabra a palabra mientras lo pregunta
            const at = q.qFrom + ((q.qTo - q.qFrom) * i) / ws.length;
            const a = ramp(at - 0.05, at + 0.2);
            return (
              <span key={i} style={{ opacity: 0.22 + 0.78 * a }}>
                {w}{" "}
              </span>
            );
          })}
        </div>
      </Glass>
    </div>
  );
};

const Timer: React.FC<{ q: Question }> = ({ q }) => {
  const { t, pop, ramp } = useClock();
  const from = q.answerAt - THINK;
  if (t < from - 0.15) return null;
  const run = Math.min(1, Math.max(0, (t - from) / THINK));
  const p = pop(from - 0.1, 11);
  const out = ramp(q.answerAt - 0.05, q.answerAt + 0.25, easeInOut);
  const R = 46;
  const C = 2 * Math.PI * R;
  const secs = Math.max(1, Math.ceil(THINK - run * THINK - 1e-6));
  // último segundo: el aro se pone tenso (late)
  const beat = run > 0.8 ? 1 + 0.06 * Math.abs(Math.sin((t - from) * Math.PI * 2)) : 1;
  return (
    <div
      style={{
        position: "absolute",
        top: STATEMENT_TOP - 52,
        right: 44,
        width: 120,
        height: 120,
        opacity: Math.min(1, p * 2) * (1 - out),
        transform: `scale(${(0.5 + 0.5 * p) * beat * (1 + out * 0.3)})`,
      }}
    >
      <svg width={120} height={120} viewBox="0 0 120 120" style={{ position: "absolute", inset: 0 }}>
        <circle cx={60} cy={60} r={56} fill="rgba(10,10,10,0.92)" />
        <circle cx={60} cy={60} r={R} fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth={9} />
        <circle
          cx={60}
          cy={60}
          r={R}
          fill="none"
          stroke={NEON}
          strokeWidth={9}
          strokeLinecap="round"
          strokeDasharray={C}
          strokeDashoffset={C * run}
          transform="rotate(-90 60 60)"
          style={{ filter: GLOW }}
        />
      </svg>
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          ...display,
          fontSize: 54,
          fontStyle: "normal",
        }}
      >
        {secs}
      </div>
    </div>
  );
};

/** Check de acierto: el círculo se rellena de verde (líquido) y se traza el ✓. */
const CheckFill: React.FC<{ at: number; size?: number }> = ({ at, size = 66 }) => {
  const { t, ramp } = useClock();
  const fill = ramp(at, at + 0.5, Easing.bezier(0.3, 0, 0.2, 1));
  const tick = ramp(at + 0.3, at + 0.6);
  const ring = ramp(at, at + 0.15);
  const level = 60 - 64 * fill; // nivel del líquido (de abajo arriba)
  const wave = (k: number) =>
    `M -10 ${level} ` +
    Array.from({ length: 9 })
      .map((_, i) => {
        const x = i * 10;
        const y = level + Math.sin(i * 1.3 + t * 14 + k) * 3.2 * (1 - fill * 0.85);
        return `L ${x} ${y}`;
      })
      .join(" ") +
    " L 80 70 L -10 70 Z";
  const id = `cf${Math.round(at * 100)}`;
  return (
    <svg width={size} height={size} viewBox="0 0 60 60" style={{ flexShrink: 0, overflow: "visible", filter: GLOW }}>
      <defs>
        <clipPath id={id}>
          <circle cx={30} cy={30} r={27} />
        </clipPath>
      </defs>
      <circle cx={30} cy={30} r={27} fill="rgba(10,10,10,0.9)" stroke={GREEN} strokeWidth={3 * ring} />
      <g clipPath={`url(#${id})`}>
        <path d={wave(2)} fill={NEON} opacity={0.5} />
        <path d={wave(0)} fill={GREEN} />
      </g>
      <path
        d="M 17 31 L 26 40 L 44 21"
        fill="none"
        stroke={INK}
        strokeWidth={6}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray={42}
        strokeDashoffset={42 * (1 - tick)}
      />
    </svg>
  );
};

const Options: React.FC<{ q: Question }> = ({ q }) => {
  const { t, pop, ramp } = useClock();
  const revealed = t >= q.answerAt;
  const rev = ramp(q.answerAt, q.answerAt + 0.3);
  const wrongOut = ramp(q.answerAt + 0.8, q.answerAt + 1.1, easeInOut);
  const lift = ramp(q.answerAt + 1.0, q.answerAt + 1.5, easeInOut);
  const end = ramp(q.resEnd - 0.35, q.resEnd, easeInOut);
  return (
    <>
      {q.options.map((o, i) => {
        if (t < o.at - 0.05) return null;
        const p = pop(o.at - 0.05, 12);
        const right = i === q.answer;
        const onRight = revealed && right;
        const slot = OPTIONS_TOP + i * (OPTION_H + OPTION_GAP);
        const top = right ? slot + (CHIP_TOP - slot) * lift : slot;
        const opacity = right
          ? 1 - end
          : revealed
            ? (0.4 - 0.4 * wrongOut) * Math.min(1, p * 2)
            : Math.min(1, p * 2);
        if (opacity <= 0.001 && revealed) return null;
        return (
          <div
            key={o.text}
            style={{
              position: "absolute",
              top,
              left: 90,
              right: 90,
              height: OPTION_H,
              display: "flex",
              alignItems: "center",
              gap: 22,
              padding: "0 24px",
              borderRadius: 22,
              background: onRight ? `rgba(4,228,0,${0.12 + 0.1 * rev})` : "rgba(12,12,12,0.88)",
              border: `2.5px solid ${onRight ? GREEN : "rgba(255,255,255,0.18)"}`,
              boxShadow: onRight
                ? `0 0 ${36 * rev}px rgba(4,228,0,0.55), inset 0 0 ${24 * rev}px rgba(4,228,0,0.25)`
                : "0 14px 40px rgba(0,0,0,0.45)",
              transform: `translateX(${(1 - p) * (i % 2 ? 120 : -120) + (revealed && !right ? wrongOut * (i % 2 ? 80 : -80) : 0)}px) scale(${onRight ? (1 + 0.06 * Math.sin(rev * Math.PI)) * (1 - 0.12 * lift) : 1})`,
              opacity,
            }}
          >
            {onRight ? (
              <CheckFill at={q.answerAt} />
            ) : (
              <div
                style={{
                  width: 66,
                  height: 66,
                  borderRadius: 16,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: "rgba(255,255,255,0.08)",
                  ...display,
                  fontSize: 40,
                  flexShrink: 0,
                }}
              >
                {LETTERS[i]}
              </div>
            )}
            <div
              style={{
                ...display,
                fontSize: o.text.length > 20 ? 42 : 50,
                whiteSpace: "normal",
                lineHeight: 1,
              }}
            >
              {o.text}
            </div>
          </div>
        );
      })}
    </>
  );
};

const QuestionLayer: React.FC = () => {
  const { t } = useClock();
  const q = QUESTIONS.find((x) => t >= qShow(x) - 0.15 && t < x.resEnd + 0.05);
  if (!q) return null;
  return (
    <AbsoluteFill>
      <Scrim q={q} />
      <Statement q={q} />
      <Options q={q} />
      <Timer q={q} />
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------------------
// Explicaciones (E02–E07): solo lo destacable, debajo de la respuesta correcta.

const Resource: React.FC<{
  q: Question;
  at: number;
  children: React.ReactNode;
}> = ({ q, at, children }) => {
  const { t } = useClock();
  const from = resStart(q, at);
  const st = useEnter(from, q.resEnd);
  if (t < from - 0.05 || t > q.resEnd + 0.05) return null;
  return (
    <AbsoluteFill>
      <div style={{ position: "absolute", top: PANEL_TOP, left: 60, right: 60, ...st }}>
        {children}
      </div>
    </AbsoluteFill>
  );
};

const Title: React.FC<{ children: React.ReactNode; style?: React.CSSProperties }> = ({
  children,
  style,
}) => (
  <div
    style={{
      fontFamily: FONT,
      fontWeight: 800,
      fontSize: 38,
      color: PAPER,
      lineHeight: 1.15,
      ...style,
    }}
  >
    {children}
  </div>
);

const Pill: React.FC<{ p: number; children: React.ReactNode; size?: number }> = ({
  p,
  children,
  size = 40,
}) => (
  <div
    style={{
      display: "flex",
      justifyContent: "center",
      transform: `scale(${0.6 + 0.4 * p})`,
      opacity: Math.min(1, p * 2),
    }}
  >
    <div
      style={{
        ...display,
        fontSize: size,
        color: INK,
        background: GREEN,
        padding: "12px 26px 8px",
        borderRadius: 12,
        filter: GLOW,
      }}
    >
      {children}
    </div>
  </div>
);

// E02 · «no la confundas con los kilos» (Wackerhage et al., 2019)
const E02: React.FC = () => {
  const { t, pop, ramp } = useClock();
  const q = QUESTIONS[0];
  const from = resStart(q, RES.e02.notKilos - 0.2);
  const a = pop(from + 0.1, 12);
  const neq = pop(from + 0.45, 9);
  const b = pop(from + 0.75, 12);
  const pull = 1 + 0.12 * Math.sin(Math.max(0, t - from - 0.75) * 7) * ramp(from + 0.75, from + 1.0);
  return (
    <Resource q={q} at={RES.e02.notKilos - 0.2}>
      <Glass style={{ padding: "34px 40px 30px", display: "flex", flexDirection: "column", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 26, opacity: Math.min(1, a * 2), transform: `translateY(${(1 - a) * 30}px)` }}>
          {/* barra con discos */}
          <svg width={120} height={70} viewBox="0 0 120 70">
            <rect x={4} y={31} width={112} height={8} rx={4} fill="rgba(255,255,255,0.75)" />
            {[14, 28, 92, 106].map((x, i) => (
              <rect key={x} x={x - 6} y={i % 3 === 0 ? 6 : 14} width={12} height={i % 3 === 0 ? 58 : 42} rx={3} fill="rgba(255,255,255,0.75)" />
            ))}
          </svg>
          <div style={{ ...display, fontSize: 56, color: "rgba(255,255,255,0.8)" }}>Kilos en la barra</div>
        </div>
        <div
          style={{
            ...display,
            fontSize: 120,
            color: GREEN,
            filter: GLOW,
            lineHeight: 0.85,
            margin: "18px 0 10px",
            transform: `scale(${neq}) rotate(${(1 - neq) * -40}deg)`,
          }}
        >
          ≠
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 26, opacity: Math.min(1, b * 2), transform: `translateY(${(1 - b) * 30}px)` }}>
          {/* fibra muscular estirada */}
          <svg width={120} height={70} viewBox="0 0 120 70" style={{ overflow: "visible" }}>
            <g transform={`translate(60 35) scale(${pull} 1) translate(-60 -35)`}>
              <path d="M 20 35 C 40 12, 80 12, 100 35 C 80 58, 40 58, 20 35 Z" fill={GREEN} style={{ filter: GLOW }} />
              <path d="M 30 35 L 90 35 M 36 27 L 84 27 M 36 43 L 84 43" stroke={INK} strokeWidth={2.5} opacity={0.5} />
            </g>
            <path d={`M ${16 - 12 * (pull - 1) * 4} 35 L -6 35 M 2 27 L -8 35 L 2 43`} stroke={PAPER} strokeWidth={4} fill="none" strokeLinecap="round" />
            <path d={`M ${104 + 12 * (pull - 1) * 4} 35 L 126 35 M 118 27 L 128 35 L 118 43`} stroke={PAPER} strokeWidth={4} fill="none" strokeLinecap="round" />
          </svg>
          <div style={{ ...display, fontSize: 56, color: GREEN }}>Tensión muscular</div>
        </div>
        <div style={{ marginTop: 26 }}>
          <Cite>Wackerhage et al. · 2019</Cite>
        </div>
      </Glass>
    </Resource>
  );
};

// E03 · duración excéntrica (Amdi y King, 2025): el intervalo cruza el cero
const E03: React.FC = () => {
  const { ramp, pop } = useClock();
  const q = QUESTIONS[1];
  const from = resStart(q, RES.e03.plot);
  const axis = ramp(from + 0.1, from + 0.5);
  const draw = ramp(from + 0.4, from + 1.1);
  const zero = pop(from + 1.0, 10);
  const pill = pop(41.2, 11); // «no garantiza más hipertrofia»
  const W = 860;
  const X = (v: number) => W / 2 + (v / 0.6) * (W / 2 - 30);
  return (
    <Resource q={q} at={RES.e03.plot}>
      <Glass style={{ padding: "30px 30px 34px" }}>
        <Title style={{ textAlign: "center" }}>Excéntrica lenta vs. rápida</Title>
        <svg width={W} height={230} viewBox={`0 0 ${W} 230`} style={{ marginTop: 18, overflow: "visible" }}>
          {/* zona de «sin diferencia» */}
          <line x1={30} y1={120} x2={30 + (W - 60) * axis} y2={120} stroke="rgba(255,255,255,0.3)" strokeWidth={3} />
          <line x1={X(0)} y1={40} x2={X(0)} y2={200} stroke="rgba(255,255,255,0.7)" strokeWidth={3} strokeDasharray="8 8" opacity={axis} />
          <text x={X(-0.32)} y={196} textAnchor="middle" fontFamily={FONT} fontWeight={800} fontSize={26} fill="rgba(255,255,255,0.6)" opacity={axis}>
            ← Mejor rápida
          </text>
          <text x={X(0.32)} y={196} textAnchor="middle" fontFamily={FONT} fontWeight={800} fontSize={26} fill="rgba(255,255,255,0.6)" opacity={axis}>
            Mejor lenta →
          </text>
          {/* intervalo del efecto: cruza el cero */}
          <line x1={X(0.05)} y1={120} x2={X(0.05) + (X(0.33) - X(0.05)) * draw} y2={120} stroke={NEON} strokeWidth={14} strokeLinecap="round" style={{ filter: GLOW }} />
          <line x1={X(0.05)} y1={120} x2={X(0.05) + (X(-0.22) - X(0.05)) * draw} y2={120} stroke={NEON} strokeWidth={14} strokeLinecap="round" style={{ filter: GLOW }} />
          <polygon
            points={`${X(0.05) - 26},120 ${X(0.05)},94 ${X(0.05) + 26},120 ${X(0.05)},146`}
            fill={PAPER}
            stroke={INK}
            strokeWidth={4}
            opacity={Math.min(1, draw * 3)}
          />
          <g transform={`translate(${X(0)} 40) scale(${zero})`}>
            <rect x={-118} y={-38} width={236} height={46} rx={23} fill="rgba(10,10,10,0.95)" stroke="rgba(255,255,255,0.55)" strokeWidth={2} />
            <text y={-6} textAnchor="middle" fontFamily={FONT} fontWeight={800} fontSize={24} fill={PAPER}>
              Sin diferencia
            </text>
          </g>
        </svg>
        <div style={{ marginTop: 14 }}>
          <Pill p={pill}>Más lento ≠ más músculo</Pill>
        </div>
        <div style={{ marginTop: 22, display: "flex", justifyContent: "center" }}>
          <Cite>Amdi y King · 2025 · metaanálisis</Cite>
        </div>
      </Glass>
    </Resource>
  );
};

// E04 · descansos (Longo et al., 2022): crecimiento parecido, más series con 1 min
const E04: React.FC = () => {
  const { ramp, pop } = useClock();
  const q = QUESTIONS[2];
  const from = resStart(q, RES.e04.bars);
  const g = ramp(from + 0.2, from + 0.9);
  const sets = ramp(Math.max(RES.e04.sets, from + 0.5), Math.max(RES.e04.sets, from + 0.5) + 1.3);
  const pill = pop(63.8, 11); // «…más series»
  const row = (name: string, n: number, v: number) => (
    <div style={{ display: "flex", alignItems: "center", marginTop: 22 }}>
      <div style={{ ...display, fontSize: 44, width: 150 }}>{name}</div>
      <div style={{ display: "flex", gap: 8, width: 330 }}>
        {Array.from({ length: 5 }).map((_, i) => {
          const fill = Math.max(0, Math.min(1, n * sets - i));
          if (i >= Math.ceil(n)) return <div key={i} style={{ width: 54 }} />;
          return (
            <div key={i} style={{ width: 54, height: 54, borderRadius: 10, border: "2px solid rgba(255,255,255,0.22)", overflow: "hidden" }}>
              <div style={{ width: `${fill * 100}%`, height: "100%", background: GREEN, filter: GLOW }} />
            </div>
          );
        })}
      </div>
      <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 14 }}>
        <div style={{ height: 30, width: (v / 10) * 210 * g, borderRadius: 8, background: "rgba(255,255,255,0.85)" }} />
        <div style={{ ...display, fontSize: 32, fontStyle: "normal", opacity: g }}>{(v * g).toFixed(1).replace(".", ",")}</div>
      </div>
    </div>
  );
  return (
    <Resource q={q} at={RES.e04.bars}>
      <Glass style={{ padding: "30px 36px 32px" }}>
        <div style={{ display: "flex", ...label, fontSize: 20, letterSpacing: 3 }}>
          <div style={{ width: 150 }}>Descanso</div>
          <div style={{ width: 330 }}>Series</div>
          <div style={{ color: "rgba(255,255,255,0.75)" }}>Crecimiento (cm²)</div>
        </div>
        {row("3 min", 3, 9.8)}
        {row("1 min", 4.5, 9.5)}
        <div style={{ marginTop: 30 }}>
          <Pill p={pill}>Mismo crecimiento, +50 % series</Pill>
        </div>
        <div style={{ marginTop: 22, display: "flex", justifyContent: "center" }}>
          <Cite>Longo et al. · 2022</Cite>
        </div>
      </Glass>
    </Resource>
  );
};

// E05 · prensa con los pies más bajos: más flexión de rodilla → más cuádriceps.
// Pierna dibujada en lateral; el pie baja por la plataforma y el cuádriceps se enciende.
const limb = (
  a: [number, number],
  b: [number, number],
  wa: number,
  wm: number,
  wb: number,
  bulge = 0.4,
) => {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const L = Math.hypot(dx, dy);
  const u = [dx / L, dy / L];
  const n = [-u[1], u[0]];
  const P = (s: number, w: number) => [a[0] + dx * s + n[0] * w, a[1] + dy * s + n[1] * w];
  const [p0, p1, p2] = [P(0, wa), P(bulge, wm), P(1, wb)];
  const [q0, q1, q2] = [P(0, -wa), P(bulge, -wm * 0.9), P(1, -wb)];
  const f = (p: number[]) => `${p[0].toFixed(1)} ${p[1].toFixed(1)}`;
  return (
    `M ${f(p0)} Q ${f(p1)} ${f(p2)} ` +
    `A ${wb} ${wb} 0 0 0 ${f(q2)} Q ${f(q1)} ${f(q0)} A ${wa} ${wa} 0 0 0 ${f(p0)} Z`
  );
};

const E05: React.FC = () => {
  const { ramp, pop, t } = useClock();
  const q = QUESTIONS[3];
  const from = resStart(q, RES.e05.arrow);
  const k = ramp(from + 0.4, from + 1.6, easeInOut); // pies: arriba → abajo
  const glow = ramp(from + 1.0, from + 1.8);
  const lab = pop(from + 1.4, 11);
  const W = 860;
  const H = 440;
  // plataforma inclinada (a la derecha) y cadera fija (izquierda)
  const A: [number, number] = [680, 40];
  const B: [number, number] = [620, 400];
  const s = 0.18 + 0.62 * k;
  const ankle: [number, number] = [A[0] + (B[0] - A[0]) * s - 34, A[1] + (B[1] - A[1]) * s];
  const hip: [number, number] = [250, 360];
  const L1 = 250;
  const L2 = 240;
  const d = Math.min(L1 + L2 - 1, Math.hypot(ankle[0] - hip[0], ankle[1] - hip[1]));
  const base = Math.atan2(ankle[1] - hip[1], ankle[0] - hip[0]);
  const alpha = Math.acos((L1 * L1 + d * d - L2 * L2) / (2 * L1 * d));
  const knee: [number, number] = [hip[0] + L1 * Math.cos(base - alpha), hip[1] + L1 * Math.sin(base - alpha)];
  const kneeAngle = Math.round(
    (Math.acos(((hip[0] - knee[0]) * (ankle[0] - knee[0]) + (hip[1] - knee[1]) * (ankle[1] - knee[1])) / (L1 * L2)) * 180) / Math.PI,
  );
  // cuádriceps: cara anterior (arriba) del muslo
  const tu = [(knee[0] - hip[0]) / L1, (knee[1] - hip[1]) / L1];
  const tn = [tu[1], -tu[0]];
  const QP = (s2: number, w: number) => [hip[0] + (knee[0] - hip[0]) * s2 + tn[0] * w, hip[1] + (knee[1] - hip[1]) * s2 + tn[1] * w];
  const fq = (p: number[]) => `${p[0].toFixed(1)} ${p[1].toFixed(1)}`;
  const quads =
    `M ${fq(QP(0.1, 12))} Q ${fq(QP(0.42, 64))} ${fq(QP(0.86, 32))} ` +
    `Q ${fq(QP(0.98, 14))} ${fq(QP(0.88, 0))} Q ${fq(QP(0.45, 0))} ${fq(QP(0.1, 12))} Z`;
  const pulse = 0.75 + 0.25 * Math.sin(t * 6);
  const arcR = 70;
  const up = [(A[0] - B[0]) / Math.hypot(A[0] - B[0], A[1] - B[1]), (A[1] - B[1]) / Math.hypot(A[0] - B[0], A[1] - B[1])];
  const toe: [number, number] = [ankle[0] + up[0] * 80 + 14, ankle[1] + up[1] * 80];
  const bh = [(hip[0] - knee[0]) / L1 + (ankle[0] - knee[0]) / L2, (hip[1] - knee[1]) / L1 + (ankle[1] - knee[1]) / L2];
  const bis = [bh[0] / Math.hypot(bh[0], bh[1]), bh[1] / Math.hypot(bh[0], bh[1])];
  const a1 = Math.atan2(hip[1] - knee[1], hip[0] - knee[0]);
  const a2 = Math.atan2(ankle[1] - knee[1], ankle[0] - knee[0]);
  const arc = `M ${knee[0] + arcR * Math.cos(a1)} ${knee[1] + arcR * Math.sin(a1)} A ${arcR} ${arcR} 0 0 0 ${knee[0] + arcR * Math.cos(a2)} ${knee[1] + arcR * Math.sin(a2)}`;
  return (
    <Resource q={q} at={RES.e05.arrow}>
      <Glass style={{ padding: "28px 30px 26px" }}>
        <Title style={{ textAlign: "center" }}>
          Pies más bajos <span style={{ color: GREEN }}>→ más flexión de rodilla</span>
        </Title>
        <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ marginTop: 10, overflow: "visible" }}>
          {/* respaldo y plataforma */}
          <path d={`M ${A[0]} ${A[1]} L ${B[0]} ${B[1]}`} stroke="rgba(255,255,255,0.5)" strokeWidth={16} strokeLinecap="round" />
          {/* solo las piernas: contorno unido (trazos primero, rellenos encima) */}
          {[0, 1].map((pass) => (
            <g
              key={pass}
              fill={pass ? "#262626" : "none"}
              stroke={pass ? "none" : "rgba(255,255,255,0.7)"}
              strokeWidth={pass ? 0 : 7}
            >
              <path d={limb(knee, ankle, 36, 42, 21, 0.3)} />
              <path d={limb(ankle, toe, 22, 20, 13, 0.4)} />
              <path d={limb(hip, knee, 60, 54, 38, 0.4)} />
            </g>
          ))}
          <path d={quads} fill={NEON} opacity={(0.3 + 0.7 * glow) * pulse} style={{ filter: `drop-shadow(0 0 ${8 + 16 * glow}px rgba(4,228,0,0.9))` }} />
          {/* ángulo de rodilla */}
          <path d={arc} fill="none" stroke={PAPER} strokeWidth={4} strokeDasharray="2 10" strokeLinecap="round" />
          <text x={knee[0] + bis[0] * 118} y={knee[1] + bis[1] * 118 + 12} textAnchor="middle" fontFamily={FONT} fontWeight={900} fontSize={34} fill={PAPER}>
            {kneeAngle}°
          </text>
          <g transform={`translate(${knee[0] - 40} ${knee[1] - 100}) scale(${lab})`} opacity={Math.min(1, lab * 2)}>
            <text textAnchor="middle" fontFamily={FONT} fontWeight={900} fontStyle="italic" fontSize={42} fill={NEON} style={{ filter: GLOW }}>
              CUÁDRICEPS
            </text>
          </g>
        </svg>
      </Glass>
    </Resource>
  );
};

// E06 · profundidad de sentadilla (Kubo et al., 2019)
const E06: React.FC = () => {
  const { pop } = useClock();
  const q = QUESTIONS[4];
  const from = resStart(q, RES.e06.card);
  const quadsAt = 107.0; // «…no apareció la misma ventaja sobre los cuádriceps»
  const row = (name: string, more: boolean, at: number) => {
    const p = pop(at, 12);
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginTop: 16,
          padding: "16px 24px",
          borderRadius: 16,
          background: more ? "rgba(4,228,0,0.14)" : "rgba(255,255,255,0.05)",
          border: `2px solid ${more ? GREEN : "rgba(255,255,255,0.22)"}`,
          transform: `translateX(${(1 - p) * -60}px)`,
          opacity: Math.min(1, p * 2),
        }}
      >
        <div style={{ ...display, fontSize: 46, color: more ? PAPER : "rgba(255,255,255,0.65)" }}>{name}</div>
        <div style={{ ...display, fontSize: 40, fontStyle: "normal", color: more ? GREEN : "rgba(255,255,255,0.65)", filter: more ? GLOW : undefined }}>
          {more ? "▲ Más" : "= Igual"}
        </div>
      </div>
    );
  };
  return (
    <Resource q={q} at={RES.e06.card}>
      <Glass style={{ padding: "30px 36px 30px" }}>
        <Title style={{ textAlign: "center" }}>
          Sentadilla <span style={{ color: GREEN }}>profunda</span> vs. media
        </Title>
        {row("Aductores", true, from + 0.3)}
        {row("Glúteo mayor", true, from + 0.55)}
        {row("Cuádriceps", false, Math.max(quadsAt, from + 0.8))}
        <div style={{ marginTop: 22, display: "flex", justifyContent: "center" }}>
          <Cite>Kubo et al. · 2019</Cite>
        </div>
      </Glass>
    </Resource>
  );
};

// E07 · glúteo mayor visto por detrás: la región superior en verde, nada más.
const E07: React.FC = () => {
  const { ramp, t } = useClock();
  const q = QUESTIONS[5];
  const from = resStart(q, RES.e07.map);
  const draw = ramp(from + 0.05, from + 0.7);
  const lit = ramp(from + 0.6, from + 1.2);
  const pulse = 0.82 + 0.18 * Math.sin(t * 5);
  const line = "rgba(255,255,255,0.6)";
  const glute = "M 297 168 C 240 150, 150 178, 126 250 C 110 310, 132 372, 192 392 C 236 404, 280 398, 297 386 Z";
  const gluteR = "M 303 168 C 360 150, 450 178, 474 250 C 490 310, 468 372, 408 392 C 364 404, 320 398, 303 386 Z";
  const len = 1600;
  return (
    <Resource q={q} at={RES.e07.map}>
      <Glass style={{ padding: "26px 30px 26px", display: "flex", flexDirection: "column", alignItems: "center" }}>
        <svg width={560} height={470} viewBox="20 20 560 470">
          <defs>
            {/* región superior: por encima de la línea de las fibras (medial-alta → lateral-baja) */}
            <clipPath id="gsup">
              <polygon points="0,0 600,0 600,318 300,238 0,318" />
            </clipPath>
          </defs>
          {/* silueta: cintura, caderas y muslos (vista posterior) */}
          <g fill="none" stroke={line} strokeWidth={4} strokeLinecap="round" strokeDasharray={len} strokeDashoffset={len * (1 - draw)}>
            <path d="M 196 30 C 182 100, 112 158, 100 250 C 90 330, 112 420, 136 490" />
            <path d="M 404 30 C 418 100, 488 158, 500 250 C 510 330, 488 420, 464 490" />
            <path d="M 280 490 C 284 450, 292 420, 300 404 C 308 420, 316 450, 320 490" />
            <path d="M 300 40 L 300 150" stroke="rgba(255,255,255,0.25)" />
            <path d="M 176 110 C 230 86, 370 86, 424 110" stroke="rgba(255,255,255,0.3)" />
          </g>
          <path d={glute} fill="rgba(255,255,255,0.07)" stroke={line} strokeWidth={3} opacity={draw} />
          <path d={gluteR} fill="rgba(255,255,255,0.07)" stroke={line} strokeWidth={3} opacity={draw} />
          {/* zona superior encendida */}
          <g clipPath="url(#gsup)" opacity={lit * pulse} style={{ filter: "drop-shadow(0 0 14px rgba(4,228,0,0.9))" }}>
            <path d={glute} fill={NEON} />
            <path d={gluteR} fill={NEON} />
          </g>
          {/* fibras */}
          <g stroke="rgba(10,10,10,0.35)" strokeWidth={2} opacity={lit}>
            {[0, 1, 2].map((i) => (
              <path key={i} d={`M ${290 - i * 6} ${185 + i * 14} L ${150 + i * 4} ${250 + i * 20}`} />
            ))}
            {[0, 1, 2].map((i) => (
              <path key={`r${i}`} d={`M ${310 + i * 6} ${185 + i * 14} L ${450 - i * 4} ${250 + i * 20}`} />
            ))}
          </g>
        </svg>
        <div style={{ ...display, fontSize: 56, color: GREEN, filter: GLOW, marginTop: 4, opacity: lit }}>Región superior</div>
        <div style={{ marginTop: 14 }}>
          <Cite>Takahashi et al. · 2025</Cite>
        </div>
      </Glass>
    </Resource>
  );
};

// ---------------------------------------------------------------------------
// Cierre: «Comenta» + bocadillo con el marcador; luego solo «Sígueme», subiendo
// de nivel letra a letra por una escalera.

/** «Sígueme» minimalista: una línea verde se traza, la palabra sube a través de
 *  ella (como si subiera de nivel) y una flecha fina sigue empujando hacia arriba. */
const Follow: React.FC = () => {
  const { t, ramp } = useClock();
  const at = CTA.follow;
  const line = ramp(at - 0.05, at + 0.35, easeInOut);
  const rise = ramp(at + 0.2, at + 0.75, Easing.bezier(0.2, 1.4, 0.35, 1));
  const arrow = ramp(at + 0.7, at + 1.05, Easing.bezier(0.2, 1.3, 0.4, 1));
  const bob = Math.sin(Math.max(0, t - at - 1.0) * 5) * 8 * arrow;
  const W = 560;
  return (
    <div
      style={{
        position: "absolute",
        top: 1120,
        left: 0,
        right: 0,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
      }}
    >
      {/* flecha fina que sube */}
      <svg width={120} height={70} viewBox="0 0 120 70" style={{ opacity: Math.min(1, arrow * 3), transform: `translateY(${(1 - arrow) * 190 - bob}px) scaleX(${0.4 + 0.6 * arrow})`, filter: GLOW }}>
        <path d="M 14 56 L 60 14 L 106 56" fill="none" stroke={GREEN} strokeWidth={8} strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      {/* la palabra emerge por encima de la línea (máscara) */}
      <div style={{ height: 140, overflow: "hidden", marginTop: 6, display: "flex", alignItems: "flex-end" }}>
        <div
          style={{
            ...display,
            fontSize: 132,
            letterSpacing: interpolate(rise, [0, 1], [30, 2]),
            transform: `translateY(${(1 - rise) * 150}px)`,
            textShadow: "0 6px 30px rgba(0,0,0,0.6)",
          }}
        >
          Sígueme
        </div>
      </div>
      <div
        style={{
          width: W * line,
          height: 5,
          borderRadius: 3,
          background: GREEN,
          boxShadow: "0 0 18px rgba(4,228,0,0.8)",
          marginTop: 6,
        }}
      />
    </div>
  );
};

const CtaLayer: React.FC = () => {
  const { t, pop, ramp } = useClock();
  if (t < CTA.comment - 0.1) return null;
  const a = pop(CTA.comment, 11);
  const key = pop(CTA.comment + 0.7, 9);
  const out = ramp(CTA.follow - 0.3, CTA.follow, easeInOut);
  const scrim = ramp(CTA.comment - 0.1, CTA.comment + 0.3);
  const breathe = 1 + Math.sin(t * 5.5) * 0.012 * key;
  return (
    <AbsoluteFill>
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "linear-gradient(180deg, transparent 40%, rgba(0,0,0,0.55) 56%, rgba(0,0,0,0.85) 100%)",
          opacity: scrim,
        }}
      />
      {t < CTA.follow + 0.05 ? (
        <div
          style={{
            position: "absolute",
            top: 1000,
            left: 0,
            right: 0,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            opacity: 1 - out,
            transform: `translateY(${out * -40}px)`,
          }}
        >
          <div
            style={{
              ...display,
              ...stroke(8),
              fontSize: 92,
              transform: `translateY(${(1 - a) * 40}px) scale(${0.4 + 0.6 * a}) rotate(${(1 - a) * -8}deg)`,
              opacity: Math.min(1, a * 2.5),
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
              filter: "drop-shadow(0 0 18px rgba(4,228,0,0.45))",
            }}
          >
            <svg width={700} height={300} style={{ position: "absolute", inset: 0 }}>
              <path d="M 10 12 L 690 4 L 680 226 L 220 236 L 130 294 L 142 236 L 18 240 Z" fill={GREEN} />
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
                fontSize: 64,
                lineHeight: 1.05,
                color: INK,
                transform: "translateX(-10px)",
              }}
            >
              <div>Entrenamiento 2</div>
              <div>Biomecánica 3</div>
            </div>
          </div>
        </div>
      ) : null}
      {t >= CTA.follow - 0.05 ? <Follow /> : null}
    </AbsoluteFill>
  );
};

export const Graphics: React.FC = () => (
  <AbsoluteFill>
    <HookTitle />
    <Boards />
    <BlockHeader />
    <QuestionLayer />
    <E02 />
    <E03 />
    <E04 />
    <E05 />
    <E06 />
    <E07 />
    <CtaLayer />
  </AbsoluteFill>
);
