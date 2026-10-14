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

/** Subrayador verde detrás de un texto (funciona en varias líneas). */
const Marker: React.FC<{ p: number; children: React.ReactNode }> = ({
  p,
  children,
}) => (
  <span
    style={{
      backgroundImage: `linear-gradient(${GREEN}, ${GREEN})`,
      backgroundRepeat: "no-repeat",
      backgroundSize: `${p * 100}% 100%`,
      boxDecorationBreak: "clone",
      WebkitBoxDecorationBreak: "clone",
      padding: "0 6px",
      borderRadius: 4,
      color: p > 0.5 ? INK : PAPER,
    }}
  >
    {children}
  </span>
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
}> = ({ title, score = "__", on, style }) => (
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
// Identificación del bloque y del nivel (arriba)

const BlockHeader: React.FC = () => {
  const { t, pop, ramp } = useClock();
  const b = BLOCKS.find((x) => t >= x.from && t < x.to);
  if (!b) return null;
  const p = pop(b.from, 12);
  const out = ramp(b.to - 0.3, b.to, easeInOut);
  const qs = QUESTIONS.filter((q) => q.block === b.block);
  const level = qs.filter((q) => t >= q.nivelAt - 0.05).length;
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
          transform: `translateY(${(1 - p) * -60}px)`,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 22,
            padding: "16px 30px 14px",
            background: "rgba(10,10,10,0.78)",
            border: "2px solid rgba(255,255,255,0.14)",
            borderRadius: 999,
          }}
        >
          <div
            style={{
              ...display,
              fontSize: 40,
              color: b.block === "T" ? PAPER : GREEN,
            }}
          >
            {b.title}
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
            {[1, 2, 3].map((n) => (
              <div
                key={n}
                style={{
                  width: 16,
                  height: 16,
                  borderRadius: 999,
                  background: n <= level ? GREEN : "rgba(255,255,255,0.18)",
                  boxShadow:
                    n === level ? "0 0 12px rgba(4,228,0,0.8)" : undefined,
                  transform: `scale(${n === level ? 1.2 : 1})`,
                }}
              />
            ))}
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};

/** Cambio de bloque: el título grande barre la pantalla al decir «ahora biomecánica». */
const BlockSwitch: React.FC = () => {
  const { t, ramp } = useClock();
  const at = BLOCKS[1].from;
  if (t < at - 0.05 || t > at + 1.2) return null;
  const k = ramp(at, at + 1.15, Easing.bezier(0.45, 0, 0.2, 1));
  const x = interpolate(k, [0, 0.35, 0.65, 1], [1200, 0, 0, -1200]);
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <div
        style={{
          position: "absolute",
          top: 820,
          left: 0,
          right: 0,
          display: "flex",
          justifyContent: "center",
          transform: `translateX(${x}px) skewX(-8deg)`,
        }}
      >
        <div
          style={{
            ...display,
            fontSize: 130,
            color: INK,
            background: GREEN,
            padding: "18px 40px 8px",
            filter: GLOW,
          }}
        >
          Biomecánica
        </div>
      </div>
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------------------
// Pregunta: opciones A/B/C, reloj de 2 s y revelación

const LETTERS = ["A", "B", "C"];

const Timer: React.FC<{ q: Question }> = ({ q }) => {
  const { t, pop, ramp } = useClock();
  // el reloj corre en el montaje: de qEnd hasta el corte (2 s exactos)
  const run =
    t >= q.answerAt ? 1 : Math.min(1, Math.max(0, (t - q.qEnd) / THINK));
  const p = pop(q.qEnd - 0.1, 12);
  const out = ramp(q.answerAt + 0.15, q.answerAt + 0.45, easeInOut);
  if (t < q.qEnd - 0.15) return null;
  const R = 54;
  const C = 2 * Math.PI * R;
  const secs = Math.max(0, Math.ceil(THINK - run * THINK - 1e-6));
  return (
    <div
      style={{
        position: "absolute",
        top: 905,
        left: 0,
        right: 0,
        display: "flex",
        justifyContent: "center",
        opacity: Math.min(1, p * 2) * (1 - out),
        transform: `scale(${0.6 + 0.4 * p})`,
      }}
    >
      <div style={{ position: "relative", width: 140, height: 140 }}>
        <svg
          width={140}
          height={140}
          viewBox="0 0 140 140"
          style={{ position: "absolute", inset: 0 }}
        >
          <circle cx={70} cy={70} r={62} fill="rgba(10,10,10,0.85)" />
          <circle
            cx={70}
            cy={70}
            r={R}
            fill="none"
            stroke="rgba(255,255,255,0.15)"
            strokeWidth={10}
          />
          <circle
            cx={70}
            cy={70}
            r={R}
            fill="none"
            stroke={NEON}
            strokeWidth={10}
            strokeLinecap="round"
            strokeDasharray={C}
            strokeDashoffset={C * run}
            transform="rotate(-90 70 70)"
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
            fontSize: 62,
            fontStyle: "normal",
          }}
        >
          {t >= q.answerAt ? "✓" : secs}
        </div>
      </div>
    </div>
  );
};

const Options: React.FC<{ q: Question }> = ({ q }) => {
  const { t, pop, ramp } = useClock();
  const revealed = t >= q.answerAt;
  const rev = ramp(q.answerAt, q.answerAt + 0.25);
  // las opciones se retiran para dejar sitio al recurso (salvo E05, sobre la pierna)
  const out = ramp(q.answerAt + 0.7, q.answerAt + 1.0, easeInOut);
  return (
    <div
      style={{
        position: "absolute",
        top: 1085,
        left: 90,
        right: 90,
        opacity: 1 - out,
        transform: `translateY(${out * 60}px)`,
      }}
    >
      {q.options.map((o, i) => {
        if (t < o.at - 0.05) return null;
        const p = pop(o.at - 0.05, 12);
        const right = i === q.answer;
        const onRight = revealed && right;
        return (
          <div
            key={o.text}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 22,
              height: 118,
              marginBottom: 20,
              padding: "0 26px",
              borderRadius: 22,
              background: onRight ? GREEN : "rgba(12,12,12,0.86)",
              border: `2.5px solid ${onRight ? GREEN : "rgba(255,255,255,0.18)"}`,
              boxShadow: onRight
                ? `0 0 ${30 * rev}px rgba(4,228,0,0.6)`
                : "0 14px 40px rgba(0,0,0,0.45)",
              transform: `translateX(${(1 - p) * (i % 2 ? 120 : -120)}px) scale(${onRight ? 1 + 0.05 * Math.sin(rev * Math.PI) : 1})`,
              opacity: Math.min(1, p * 2) * (revealed && !right ? 0.42 : 1),
            }}
          >
            <div
              style={{
                width: 70,
                height: 70,
                borderRadius: 16,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: onRight ? INK : "rgba(255,255,255,0.08)",
                ...display,
                fontSize: 42,
                color: onRight ? GREEN : PAPER,
                flexShrink: 0,
              }}
            >
              {onRight ? "✓" : LETTERS[i]}
            </div>
            <div
              style={{
                ...display,
                fontSize: o.text.length > 20 ? 44 : 52,
                color: onRight ? INK : PAPER,
                whiteSpace: "normal",
                lineHeight: 1,
              }}
            >
              {o.text}
            </div>
          </div>
        );
      })}
    </div>
  );
};

const QuestionLayer: React.FC = () => {
  const { t } = useClock();
  const q = QUESTIONS.find(
    (x) => t >= x.options[0].at - 0.1 && t < x.answerAt + 1.1,
  );
  if (!q) return null;
  return (
    <AbsoluteFill>
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "linear-gradient(180deg, transparent 38%, rgba(0,0,0,0.55) 55%, rgba(0,0,0,0.8) 100%)",
        }}
      />
      <Timer q={q} />
      <Options q={q} />
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------------------
// Recursos de las respuestas (E02–E07)

const Resource: React.FC<{
  from: number;
  to: number;
  children: React.ReactNode;
  top?: number;
}> = ({ from, to, children, top = 1010 }) => {
  const { t } = useClock();
  const st = useEnter(from, to);
  if (t < from - 0.05 || t > to + 0.05) return null;
  return (
    <AbsoluteFill>
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "linear-gradient(180deg, transparent 35%, rgba(0,0,0,0.6) 52%, rgba(0,0,0,0.85) 100%)",
          opacity: st.opacity,
        }}
      />
      <div style={{ position: "absolute", top, left: 60, right: 60, ...st }}>
        {children}
      </div>
    </AbsoluteFill>
  );
};

// E02 · tensión mecánica (Wackerhage et al., 2019)
const E02: React.FC = () => {
  const { t, ramp, pop } = useClock();
  const q = QUESTIONS[0];
  const m = ramp(RES.e02.quote + 0.4, RES.e02.quote + 1.0);
  const swap = ramp(RES.e02.notKilos - 0.1, RES.e02.notKilos + 0.25, easeInOut);
  const k = pop(RES.e02.notKilos, 10);
  return (
    <Resource from={RES.e02.quote} to={q.resEnd}>
      <div style={{ position: "relative", height: 640 }}>
        <Glass
          style={{
            position: "absolute",
            inset: 0,
            padding: "34px 40px",
            opacity: 1 - swap,
            transform: `translateX(${-swap * 80}px)`,
          }}
        >
          <Cite>Wackerhage et al. · 2019 · J Appl Physiol</Cite>
          <div
            style={{
              fontFamily: FONT,
              fontWeight: 600,
              fontSize: 24,
              color: "rgba(255,255,255,0.5)",
              marginTop: 12,
              lineHeight: 1.3,
            }}
          >
            Stimuli and sensors that initiate skeletal muscle hypertrophy
            following resistance exercise
          </div>
          <div
            style={{
              fontFamily: FONT,
              fontWeight: 800,
              fontSize: 50,
              color: PAPER,
              marginTop: 34,
              lineHeight: 1.22,
            }}
          >
            «
            <Marker p={m}>
              Mechanical signals are the prime hypertrophy stimuli candidates
            </Marker>
            »
          </div>
          <div
            style={{
              ...label,
              fontSize: 26,
              letterSpacing: 2,
              marginTop: 34,
              textTransform: "none",
            }}
          >
            Señales mecánicas: candidatos principales
          </div>
        </Glass>
        {t >= RES.e02.notKilos - 0.1 ? (
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              opacity: swap,
              transform: `scale(${0.8 + 0.2 * k})`,
            }}
          >
            <Glass
              style={{
                padding: "50px 46px",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 22,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 28 }}>
                <div style={{ ...display, fontSize: 66 }}>Carga externa</div>
              </div>
              <div
                style={{
                  ...display,
                  fontSize: 110,
                  color: GREEN,
                  filter: GLOW,
                  lineHeight: 0.9,
                }}
              >
                ≠
              </div>
              <div style={{ ...display, fontSize: 66 }}>Tensión muscular</div>
            </Glass>
          </div>
        ) : null}
      </div>
    </Resource>
  );
};

// E03 · duración excéntrica (Amdi y King, 2025): fila «RE Model for All Studies»
const E03: React.FC = () => {
  const { ramp } = useClock();
  const q = QUESTIONS[1];
  const draw = ramp(RES.e03.plot + 0.3, RES.e03.plot + 1.1);
  const lab = ramp(RES.e03.plot + 1.0, RES.e03.plot + 1.4);
  const W = 820;
  const X = (v: number) => ((v + 0.6) / 1.2) * W;
  return (
    <Resource from={RES.e03.plot} to={q.resEnd}>
      <Glass style={{ padding: "34px 40px 38px" }}>
        <Cite>Amdi y King · 2025 · J Sports Sci · hipertrofia</Cite>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginTop: 26,
            fontFamily: FONT,
            fontWeight: 700,
            fontSize: 24,
            color: "rgba(255,255,255,0.65)",
          }}
        >
          <span>RE Model for All Studies</span>
          <span>Estimate [90% CI]</span>
        </div>
        <svg
          width={W}
          height={170}
          viewBox={`0 0 ${W} 170`}
          style={{ marginTop: 18, overflow: "visible" }}
        >
          <line
            x1={0}
            y1={130}
            x2={W}
            y2={130}
            stroke="rgba(255,255,255,0.4)"
            strokeWidth={2}
          />
          {[-0.6, -0.3, 0, 0.3, 0.6].map((v) => (
            <g key={v}>
              <line
                x1={X(v)}
                y1={130}
                x2={X(v)}
                y2={140}
                stroke="rgba(255,255,255,0.4)"
                strokeWidth={2}
              />
              <text
                x={X(v)}
                y={166}
                textAnchor="middle"
                fontFamily={FONT}
                fontWeight={700}
                fontSize={22}
                fill="rgba(255,255,255,0.55)"
              >
                {v.toFixed(1).replace(".", ",").replace("-", "−")}
              </text>
            </g>
          ))}
          <line
            x1={X(0)}
            y1={0}
            x2={X(0)}
            y2={130}
            stroke="rgba(255,255,255,0.55)"
            strokeWidth={2}
            strokeDasharray="6 6"
          />
          {/* intervalo de confianza del 90 % y estimación */}
          <line
            x1={X(0.05)}
            y1={60}
            x2={X(0.05) + (X(0.33) - X(0.05)) * draw}
            y2={60}
            stroke={NEON}
            strokeWidth={6}
          />
          <line
            x1={X(0.05)}
            y1={60}
            x2={X(0.05) + (X(-0.22) - X(0.05)) * draw}
            y2={60}
            stroke={NEON}
            strokeWidth={6}
          />
          <polygon
            points={`${X(0.05) - 22},60 ${X(0.05)},40 ${X(0.05) + 22},60 ${X(0.05)},80`}
            fill={NEON}
            style={{ filter: GLOW }}
            opacity={Math.min(1, draw * 2)}
          />
        </svg>
        <div
          style={{
            ...display,
            fontSize: 44,
            fontStyle: "normal",
            marginTop: 6,
            textAlign: "center",
            opacity: draw,
          }}
        >
          0,05 <span style={{ color: GREEN }}>[−0,22, 0,33]</span>
        </div>
        <div
          style={{
            marginTop: 26,
            display: "flex",
            justifyContent: "center",
            opacity: lab,
          }}
        >
          <div
            style={{
              ...display,
              fontSize: 40,
              color: INK,
              background: GREEN,
              padding: "12px 24px 8px",
              filter: GLOW,
            }}
          >
            Sin superioridad general demostrada
          </div>
        </div>
      </Glass>
    </Resource>
  );
};

// E04 · descansos (Longo et al., 2022): resultado y coste en series
const E04: React.FC = () => {
  const { t, ramp } = useClock();
  const q = QUESTIONS[2];
  const g = ramp(RES.e04.bars + 0.25, RES.e04.bars + 1.0);
  const swap = ramp(RES.e04.sets - 0.1, RES.e04.sets + 0.3, easeInOut);
  const sets = ramp(RES.e04.sets + 0.2, RES.e04.sets + 1.2);
  const bar = (v: number, name: string, sub: string) => (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        width: 260,
      }}
    >
      <div style={{ ...display, fontSize: 46, fontStyle: "normal" }}>
        {(v * g).toFixed(1).replace(".", ",")}
      </div>
      <div
        style={{
          height: 300,
          display: "flex",
          alignItems: "flex-end",
          marginTop: 10,
        }}
      >
        <div
          style={{
            width: 120,
            height: (v / 11) * 300 * g,
            background: `linear-gradient(180deg, ${NEON}, ${GREEN})`,
            borderRadius: "10px 10px 0 0",
            filter: GLOW,
          }}
        />
      </div>
      <div style={{ ...display, fontSize: 34, marginTop: 14 }}>{name}</div>
      <div
        style={{
          ...label,
          fontSize: 18,
          letterSpacing: 2,
          color: "rgba(255,255,255,0.6)",
          marginTop: 6,
        }}
      >
        {sub}
      </div>
    </div>
  );
  const row = (name: string, n: number) => (
    <div
      style={{ display: "flex", alignItems: "center", gap: 20, marginTop: 26 }}
    >
      <div style={{ ...display, fontSize: 40, width: 150 }}>{name}</div>
      <div style={{ display: "flex", gap: 10 }}>
        {Array.from({ length: 5 }).map((_, i) => {
          const fill = Math.max(0, Math.min(1, n * sets - i));
          return (
            <div
              key={i}
              style={{
                width: 70,
                height: 70,
                borderRadius: 12,
                border: "2px solid rgba(255,255,255,0.18)",
                overflow: "hidden",
                opacity: i < Math.ceil(n) ? 1 : 0.25,
              }}
            >
              <div
                style={{
                  width: `${fill * 100}%`,
                  height: "100%",
                  background: GREEN,
                  filter: GLOW,
                }}
              />
            </div>
          );
        })}
      </div>
      <div
        style={{ ...display, fontSize: 40, fontStyle: "normal", color: GREEN }}
      >
        {n.toString().replace(".", ",")}
      </div>
    </div>
  );
  return (
    <Resource from={RES.e04.bars} to={q.resEnd}>
      <div style={{ position: "relative", height: 660 }}>
        <Glass
          style={{
            position: "absolute",
            inset: 0,
            padding: "30px 40px",
            opacity: 1 - swap,
          }}
        >
          <Cite>Longo et al. · 2022 · 10 semanas · prensa unilateral</Cite>
          <div
            style={{
              ...label,
              fontSize: 20,
              letterSpacing: 2,
              color: "rgba(255,255,255,0.75)",
              marginTop: 10,
              textTransform: "none",
            }}
          >
            Cambio absoluto del área del cuádriceps (cm²)
          </div>
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              gap: 70,
              marginTop: 30,
            }}
          >
            {bar(9.8, "3 min", "LI")}
            {bar(9.5, "1 min", "VLI-SI · volumen igualado")}
          </div>
        </Glass>
        {t >= RES.e04.sets - 0.1 ? (
          <Glass
            style={{
              position: "absolute",
              inset: 0,
              padding: "40px 46px",
              opacity: swap,
            }}
          >
            <Cite>Longo et al. · 2022 · series de media</Cite>
            <div
              style={{
                ...display,
                fontSize: 52,
                marginTop: 26,
                whiteSpace: "normal",
              }}
            >
              Para igualar el trabajo
            </div>
            {row("3 min", 3)}
            {row("1 min", 4.5)}
            <div
              style={{
                ...label,
                fontSize: 24,
                letterSpacing: 2,
                marginTop: 40,
                textTransform: "none",
              }}
            >
              3 min: 3 series / 1 min: 4,5 series de media
            </div>
          </Glass>
        ) : null}
      </div>
    </Resource>
  );
};

// E05 · cuádriceps (sobre su pierna en Camera.tsx): aquí solo el rótulo
const E05: React.FC = () => {
  const q = QUESTIONS[3];
  return (
    <Resource from={RES.e05.arrow + 0.3} to={q.resEnd} top={300}>
      <div style={{ display: "flex", justifyContent: "center" }}>
        <Glass
          style={{
            padding: "22px 34px 18px",
            display: "flex",
            alignItems: "center",
            gap: 18,
          }}
        >
          <div style={{ ...display, fontSize: 42 }}>Extender la rodilla</div>
          <div style={{ ...display, fontSize: 42, color: GREEN }}>
            → cuádriceps
          </div>
        </Glass>
      </div>
    </Resource>
  );
};

// E06 · profundidad de sentadilla (Kubo et al., 2019)
const E06: React.FC = () => {
  const { pop, ramp } = useClock();
  const q = QUESTIONS[4];
  const quadsAt = 107.0; // «…no apareció la misma ventaja sobre los cuádriceps»
  const a = pop(RES.e06.card + 0.35, 12);
  const b = pop(RES.e06.card + 0.6, 12);
  const c = ramp(quadsAt, quadsAt + 0.35);
  const muscle = (name: string, pv: string, p: number) => (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        marginTop: 18,
        padding: "18px 24px",
        borderRadius: 16,
        background: "rgba(4,228,0,0.14)",
        border: `2px solid ${GREEN}`,
        transform: `translateX(${(1 - p) * -60}px)`,
        opacity: Math.min(1, p * 2),
      }}
    >
      <div style={{ ...display, fontSize: 44 }}>{name}</div>
      <div
        style={{ ...display, fontSize: 32, fontStyle: "normal", color: GREEN }}
      >
        {pv}
      </div>
    </div>
  );
  return (
    <Resource from={RES.e06.card} to={q.resEnd}>
      <Glass style={{ padding: "32px 40px 36px" }}>
        <Cite>Kubo et al. · 2019 · 17 hombres · 10 semanas</Cite>
        <div
          style={{
            fontFamily: FONT,
            fontWeight: 800,
            fontSize: 36,
            color: PAPER,
            marginTop: 20,
            lineHeight: 1.2,
          }}
        >
          Mayor crecimiento con la sentadilla profunda:
        </div>
        {muscle("Aductores", "p = 0,026", a)}
        {muscle("Glúteo mayor", "p = 0,008", b)}
        <div
          style={{
            marginTop: 24,
            padding: "16px 24px",
            borderRadius: 16,
            border: "2px solid rgba(255,255,255,0.2)",
            opacity: c,
            transform: `translateY(${(1 - c) * 20}px)`,
          }}
        >
          <div style={{ ...display, fontSize: 36, whiteSpace: "normal" }}>
            Cuádriceps:{" "}
            <span style={{ color: "rgba(255,255,255,0.7)" }}>
              sin ventaja entre grupos detectada
            </span>
          </div>
        </div>
      </Glass>
    </Resource>
  );
};

// E07 · regiones del glúteo mayor (Takahashi et al., 2025): potencial mecánico
const E07: React.FC = () => {
  const { ramp } = useClock();
  const q = QUESTIONS[5];
  const lit = ramp(RES.e07.map + 0.3, RES.e07.map + 0.9);
  const note = ramp(RES.e07.note, RES.e07.note + 0.4);
  // abanico del glúteo mayor: del borde de la pelvis/sacro hacia el fémur, en 3 regiones
  const region = (d: string, on: boolean) => (
    <path
      d={d}
      fill={
        on ? `rgba(59,255,46,${0.25 + 0.6 * lit})` : "rgba(255,255,255,0.08)"
      }
      stroke={on ? NEON : "rgba(255,255,255,0.35)"}
      strokeWidth={3}
      style={on ? { filter: GLOW } : undefined}
    />
  );
  return (
    <Resource from={RES.e07.map} to={q.resEnd}>
      <Glass style={{ padding: "30px 40px 34px" }}>
        <Cite>Takahashi et al. · 2025 · J Biomech · abducción de cadera</Cite>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 30,
            marginTop: 18,
          }}
        >
          <svg width={360} height={360} viewBox="0 0 360 360">
            {/* pelvis y fémur de referencia */}
            <path
              d="M 40 70 C 120 30, 240 30, 320 70"
              fill="none"
              stroke="rgba(255,255,255,0.35)"
              strokeWidth={6}
              strokeLinecap="round"
            />
            <line
              x1={270}
              y1={250}
              x2={300}
              y2={350}
              stroke="rgba(255,255,255,0.35)"
              strokeWidth={14}
              strokeLinecap="round"
            />
            {region(
              "M 60 80 C 140 55, 230 55, 300 85 L 275 150 C 210 125, 140 125, 75 140 Z",
              true,
            )}
            {region(
              "M 75 140 C 140 125, 210 125, 275 150 L 270 205 C 210 185, 140 190, 85 205 Z",
              false,
            )}
            {region(
              "M 85 205 C 140 190, 210 185, 270 205 L 275 255 C 210 250, 150 265, 100 280 Z",
              false,
            )}
            <text
              x={330}
              y={120}
              fontFamily={FONT}
              fontWeight={800}
              fontSize={18}
              fill={NEON}
            >
              proximal
            </text>
            <text
              x={330}
              y={180}
              fontFamily={FONT}
              fontWeight={800}
              fontSize={18}
              fill="rgba(255,255,255,0.5)"
            >
              middle
            </text>
            <text
              x={330}
              y={240}
              fontFamily={FONT}
              fontWeight={800}
              fontSize={18}
              fill="rgba(255,255,255,0.5)"
            >
              distal
            </text>
          </svg>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div
              style={{
                ...display,
                fontSize: 64,
                color: GREEN,
                filter: GLOW,
                opacity: lit,
              }}
            >
              Superior
            </div>
            <div
              style={{ ...label, fontSize: 24, letterSpacing: 3, opacity: lit }}
            >
              / proximal
            </div>
            <div
              style={{
                ...display,
                fontSize: 40,
                color: "rgba(255,255,255,0.45)",
                marginTop: 10,
              }}
            >
              Media
            </div>
            <div
              style={{
                ...display,
                fontSize: 40,
                color: "rgba(255,255,255,0.45)",
              }}
            >
              Inferior
            </div>
          </div>
        </div>
        <div
          style={{
            marginTop: 22,
            padding: "14px 22px",
            borderRadius: 14,
            background: "rgba(255,255,255,0.06)",
            border: "2px solid rgba(255,255,255,0.18)",
            opacity: note,
          }}
        >
          <div
            style={{
              fontFamily: FONT,
              fontWeight: 800,
              fontSize: 30,
              color: PAPER,
              textAlign: "center",
            }}
          >
            Potencial mecánico estimado · no crecimiento muscular
          </div>
        </div>
      </Glass>
    </Resource>
  );
};

// ---------------------------------------------------------------------------
// Cierre: marcador y ejemplo de comentario, «sígueme para subir de nivel»

const CtaLayer: React.FC = () => {
  const { t, pop } = useClock();
  if (t < CTA.comment - 0.1) return null;
  const a = pop(CTA.comment, 12);
  const ex = pop(CTA.example, 10);
  const fo = pop(CTA.follow, 9);
  return (
    <AbsoluteFill>
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "linear-gradient(180deg, transparent 40%, rgba(0,0,0,0.6) 58%, rgba(0,0,0,0.85) 100%)",
          opacity: a,
        }}
      />
      <div
        style={{
          position: "absolute",
          top: 1010,
          left: 0,
          right: 0,
          display: "flex",
          justifyContent: "center",
          gap: 40,
          transform: `translateY(${(1 - a) * 80}px)`,
          opacity: Math.min(1, a * 2),
        }}
      >
        <ScoreBox title="Entrenamiento" />
        <ScoreBox title="Biomecánica" />
      </div>
      <div
        style={{
          position: "absolute",
          top: 1290,
          left: 0,
          right: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          transform: `scale(${0.7 + 0.3 * ex})`,
          opacity: Math.min(1, ex * 2),
        }}
      >
        <div
          style={{
            ...label,
            fontSize: 22,
            letterSpacing: 4,
            color: "rgba(255,255,255,0.7)",
          }}
        >
          Ejemplo de comentario
        </div>
        <div style={{ position: "relative", marginTop: 14 }}>
          <Glass
            style={{
              padding: "22px 34px 18px",
              border: `2.5px solid ${GREEN}`,
            }}
          >
            <div
              style={{
                ...display,
                fontSize: 42,
                fontStyle: "normal",
                textTransform: "none",
                letterSpacing: 0,
              }}
            >
              Entrenamiento 2 — Biomecánica 3
            </div>
          </Glass>
        </div>
      </div>
      <div
        style={{
          position: "absolute",
          top: 1560,
          left: 0,
          right: 0,
          display: "flex",
          justifyContent: "center",
          transform: `scale(${fo})`,
          opacity: Math.min(1, fo * 2),
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 16,
            background: GREEN,
            padding: "16px 32px 12px",
            borderRadius: 999,
            filter: GLOW,
          }}
        >
          <div style={{ ...display, fontSize: 46, color: INK }}>+ Sígueme</div>
          <div style={{ ...display, fontSize: 30, color: INK, opacity: 0.8 }}>
            para subir de nivel
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};

export const Graphics: React.FC = () => (
  <AbsoluteFill>
    <HookTitle />
    <Boards />
    <BlockHeader />
    <BlockSwitch />
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
