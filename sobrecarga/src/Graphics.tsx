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
  CALM,
  CHOICE,
  CTA,
  f,
  FATIGUE,
  IDEA,
  NOTES,
  SAYING,
  THOUGHT,
  toSrc,
  TREND,
} from "./timeline";

// Motion graphics de «Sobrecarga progresiva». Todas las capas leen el tiempo del
// ORIGINAL (toSrc) y animan con fotogramas del montaje (f).


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


const RED = "#FF3B30";
const NEON_G = "#3BFF2E";

/** Rótulo sobre la persona con entrada/salida estándar (por encima de los subtítulos). */
const Tag: React.FC<{
  from: number;
  to: number;
  top?: number;
  children: React.ReactNode;
}> = ({ from, to, top = 1080, children }) => {
  const { t } = useClock();
  const st = useEnter(from, to);
  if (t < from - 0.05 || t > to + 0.05) return null;
  return (
    <AbsoluteFill>
      <div
        style={{
          position: "absolute",
          top,
          left: 60,
          right: 60,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          ...st,
        }}
      >
        {children}
      </div>
    </AbsoluteFill>
  );
};

/** Dos líneas: arriba en blanco con contorno, abajo en pastilla verde. */
const TwoLine: React.FC<{ at: number; top: string; bottom: string }> = ({ at, top, bottom }) => {
  const { pop } = useClock();
  const b = pop(at + 0.35, 11);
  return (
    <>
      <div style={{ ...display, ...stroke(8), fontSize: 62 }}>{top}</div>
      <div
        style={{
          ...display,
          fontSize: 52,
          color: INK,
          background: GREEN,
          padding: "12px 24px 8px",
          borderRadius: 12,
          marginTop: 14,
          filter: GLOW,
          transform: `scale(${0.7 + 0.3 * b})`,
          opacity: Math.min(1, b * 2),
        }}
      >
        {bottom}
      </div>
    </>
  );
};

// ---------------------------------------------------------------------------
// E01 · el tópico: «Lo que dicen»

const Saying: React.FC = () => {
  const { pop, t } = useClock();
  const p = pop(SAYING.from, 10);
  if (t < SAYING.from - 0.05 || t > SAYING.to + 0.05) return null;
  return (
    <Tag from={SAYING.from} to={SAYING.to} top={250}>
      <div style={{ display: "flex", alignItems: "flex-start", transform: `rotate(${-4 + (1 - p) * 10}deg)` }}>
        <div style={{ ...display, fontSize: 130, color: GREEN, lineHeight: 0.7, marginRight: 8, filter: GLOW }}>“</div>
        <div
          style={{
            ...display,
            fontSize: 64,
            color: INK,
            background: PAPER,
            padding: "14px 26px 8px",
            borderRadius: 8,
          }}
        >
          Lo que dicen
        </div>
        <div style={{ ...display, fontSize: 130, color: GREEN, lineHeight: 0.7, marginLeft: 8, filter: GLOW }}>”</div>
      </div>
    </Tag>
  );
};

// ---------------------------------------------------------------------------
// E02 · libreta de ejemplo: 10 / 10 / 10 y la undécima que no sale

const Notes: React.FC = () => {
  const { t, frame, pop, ramp } = useClock();
  if (t < NOTES.from - 0.05 || t > NOTES.to + 0.05) return null;
  const card = pop(NOTES.from, 13, 180);
  const out = ramp(NOTES.to - 0.3, NOTES.to, easeInOut);
  const BAR = 470;
  // la cuarta sesión intenta pasar del 10… y rebota
  const push = ramp(NOTES.eleven, NOTES.eleven + 0.6, Easing.bezier(0.3, 0, 0.2, 1));
  const fail = ramp(NOTES.fail, NOTES.fail + 0.12);
  const shake = t > NOTES.fail && t < NOTES.fail + 0.4 ? Math.sin(frame * 2.6) * 14 * (1 - (t - NOTES.fail) / 0.4) : 0;
  const row = (i: number, at: number, last = false) => {
    const p = pop(at, 12);
    const fill = ramp(at, at + 0.5, Easing.bezier(0.2, 0.8, 0.2, 1));
    const over = last ? push * (1 - fail) * 0.1 : 0; // la barra se estira un 10 % más
    const n = last && t >= NOTES.eleven + 0.35 ? 11 : Math.round(10 * fill);
    const red = last && t >= NOTES.fail;
    return (
      <div
        key={i}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 22,
          marginTop: 18,
          opacity: Math.min(1, p * 2),
          transform: `translateX(${(1 - p) * -80 + (last ? shake : 0)}px)`,
        }}
      >
        <div style={{ ...label, fontSize: 22, letterSpacing: 3, color: "rgba(255,255,255,0.7)", width: 140 }}>Sesión {i}</div>
        <div style={{ position: "relative", width: BAR, height: 30, borderRadius: 8, background: "rgba(255,255,255,0.08)" }}>
          <div
            style={{
              position: "absolute",
              left: 0,
              top: 0,
              bottom: 0,
              width: BAR * Math.min(1.1, fill + over),
              borderRadius: 8,
              background: red ? RED : `linear-gradient(90deg, rgba(4,228,0,0.55), ${NEON_G})`,
              boxShadow: red ? "0 0 22px rgba(255,59,48,0.7)" : "0 0 18px rgba(4,228,0,0.55)",
            }}
          />
        </div>
        <div
          style={{
            ...display,
            fontStyle: "italic",
            fontSize: 64,
            width: 110,
            textAlign: "right",
            color: red ? RED : GREEN,
            position: "relative",
            filter: red ? "drop-shadow(0 0 10px rgba(255,59,48,0.6))" : GLOW,
          }}
        >
          <span style={{ position: "relative", display: "inline-block" }}>
            {n}
            {red ? (
              // X centrada sobre el 11
              <svg width={90} height={70} viewBox="0 0 90 70" style={{ position: "absolute", left: "50%", top: "46%", transform: "translate(-50%, -50%)", overflow: "visible" }}>
                <path d="M 8 6 L 82 64" stroke={RED} strokeWidth={9} strokeLinecap="round" strokeDasharray={95} strokeDashoffset={95 * (1 - fail)} />
                <path d="M 82 6 L 8 64" stroke={RED} strokeWidth={9} strokeLinecap="round" strokeDasharray={95} strokeDashoffset={95 * (1 - ramp(NOTES.fail + 0.1, NOTES.fail + 0.22))} />
              </svg>
            ) : null}
          </span>
        </div>
      </div>
    );
  };
  return (
    <AbsoluteFill style={{ opacity: 1 - out }}>
      <div style={{ position: "absolute", top: 830, left: 70, right: 70, transform: `translateY(${(1 - card) * 120}px) scale(${0.94 + 0.06 * card})`, opacity: Math.min(1, card * 2) }}>
        <Glass style={{ padding: "26px 34px 32px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
            <div style={{ ...display, fontSize: 40 }}>
              Curl <span style={{ color: GREEN }}>· misma carga</span>
            </div>
            <div style={{ ...label, fontSize: 18, letterSpacing: 4, color: "rgba(255,255,255,0.45)" }}>Ejemplo</div>
          </div>
          <div style={{ position: "relative" }}>
            {/* tope: la marca de 10 repeticiones */}
            <div style={{ position: "absolute", left: 162 + BAR, top: 6, bottom: -6, width: 0, borderLeft: "3px dashed rgba(255,255,255,0.45)", opacity: ramp(NOTES.rows[0] + 0.4, NOTES.rows[0] + 0.8) }} />
            {NOTES.rows.map((at, i) => row(i + 1, at))}
            {t >= NOTES.eleven - 0.05 ? row(4, NOTES.eleven, true) : null}
          </div>
        </Glass>
      </div>
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------------------
// E03 · pensamiento de Yago 1: viñeta suave que se retira poco a poco cuando
// Yago 2 le llama la atención («A ver, tranquilo»)

const Thought: React.FC = () => {
  const { t, ramp } = useClock();
  if (t < THOUGHT.from - 0.2 || t > THOUGHT.out + 0.05) return null;
  const o = ramp(THOUGHT.from - 0.15, THOUGHT.from + 0.35) * (1 - ramp(THOUGHT.wake, THOUGHT.out, easeInOut));
  return (
    <AbsoluteFill
      style={{
        opacity: o,
        background: "radial-gradient(ellipse 70% 55% at 50% 40%, transparent 45%, rgba(0,12,4,0.55) 80%, rgba(0,0,0,0.8) 100%)",
        backdropFilter: `saturate(${1 - 0.4 * o}) blur(${0.6 * o}px)`,
      }}
    />
  );
};

// ---------------------------------------------------------------------------
// E04 · «Repetir una marca no significa que hayas dejado de crecer»: tipografía
// cinética al ritmo de la frase

const Repeat: React.FC = () => {
  const { t, pop, ramp } = useClock();
  if (t < CALM.in - 0.02 || t > CALM.labelTo + 0.05) return null;
  const out = ramp(CALM.labelTo - 0.3, CALM.labelTo, easeInOut);
  const a = pop(CALM.in, 12, 230);
  const b = pop(CALM.no, 8, 260);
  const c = pop(CALM.grow, 12, 230);
  const blur = (p: number) => `blur(${Math.max(0, 1 - p) * 5}px)`;
  return (
    <AbsoluteFill style={{ opacity: 1 - out }}>
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "linear-gradient(180deg, transparent 45%, rgba(0,0,0,0.6) 62%, rgba(0,0,0,0.75) 100%)",
          opacity: Math.min(1, a * 2),
        }}
      />
      <div style={{ position: "absolute", top: 1040, left: 0, right: 0, display: "flex", flexDirection: "column", alignItems: "center", transform: `translateY(${-out * 40}px)` }}>
        <div style={{ ...display, ...stroke(8), fontSize: 82, opacity: Math.min(1, a * 3), transform: `translateX(${(1 - a) * -500}px) skewX(${(1 - a) * -20}deg)`, filter: blur(a) }}>
          Repetir una marca
        </div>
        <div
          style={{
            ...display,
            fontSize: 96,
            color: INK,
            background: GREEN,
            padding: "10px 30px 4px",
            marginTop: 14,
            filter: GLOW,
            transform: `scale(${1.6 - 0.6 * b}) rotate(${-3 + (1 - b) * 10}deg)`,
            opacity: Math.min(1, b * 3),
          }}
        >
          No significa
        </div>
        <div style={{ ...display, ...stroke(8), fontSize: 54, marginTop: 18, opacity: Math.min(1, c * 3), transform: `translateX(${(1 - c) * 500}px) skewX(${(1 - c) * 20}deg)`, filter: blur(c) }}>
          que hayas dejado de <span style={{ color: GREEN }}>crecer</span>
        </div>
      </div>
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------------------
// E05 · «La fatiga puede limitar…»: batería que se vacía

const Fatigue: React.FC = () => {
  const { t, ramp } = useClock();
  if (t < FATIGUE.from - 0.05 || t > FATIGUE.to + 0.05) return null;
  const level = 1 - 0.7 * ramp(FATIGUE.from + 0.3, FATIGUE.from + 1.6, easeInOut);
  const low = level < 0.45;
  const blink = low ? 0.6 + 0.4 * Math.abs(Math.sin(t * 8)) : 1;
  return (
    <Tag from={FATIGUE.from} to={FATIGUE.to} top={1060}>
      <Glass style={{ padding: "20px 30px 18px", display: "flex", alignItems: "center", gap: 22 }}>
        <svg width={92} height={50} viewBox="0 0 92 50">
          <rect x={3} y={3} width={78} height={44} rx={8} fill="none" stroke={PAPER} strokeWidth={5} />
          <rect x={83} y={16} width={7} height={18} rx={2} fill={PAPER} />
          <rect x={10} y={10} width={64 * level} height={30} rx={4} fill={low ? RED : GREEN} opacity={blink} />
        </svg>
        <div style={{ ...display, fontSize: 44, whiteSpace: "normal" }}>
          La fatiga <span style={{ color: GREEN }}>puede</span> limitar el rendimiento
        </div>
      </Glass>
    </Tag>
  );
};

// ---------------------------------------------------------------------------
// E06 · «Si sigues sin progresar semana tras semana… yo revisaría»: semanas que
// pasan con la misma marca y una lupa que revisa la tendencia

const Trend: React.FC = () => {
  const { t, pop, ramp } = useClock();
  const st = useEnter(TREND.review, TREND.reviewTo);
  if (t < TREND.review - 0.05 || t > TREND.reviewTo + 0.05) return null;
  const weeks = [0, 1, 2, 3].map((i) => TREND.review + i * 0.32);
  const lens = ramp(TREND.look, TREND.look + 1.2, easeInOut);
  const tag = pop(TREND.look + 0.6, 11);
  const W = 760;
  const xs = [80, 280, 480, 680];
  return (
    <AbsoluteFill>
      <div style={{ position: "absolute", top: 990, left: 60, right: 60, display: "flex", flexDirection: "column", alignItems: "center", ...st }}>
        <Glass style={{ padding: "22px 30px 26px", width: W + 60 }}>
          <div style={{ position: "relative", height: 210 }}>
            {/* la misma marca, semana tras semana */}
            <div style={{ position: "absolute", left: xs[0], right: W - xs[3], top: 92, height: 4, background: "rgba(255,255,255,0.25)", transform: `scaleX(${ramp(weeks[0], weeks[3] + 0.3)})`, transformOrigin: "left" }} />
            {weeks.map((at, i) => {
              const p = pop(at, 10, 240);
              return (
                <div key={i} style={{ position: "absolute", left: xs[i] - 60, width: 120, top: 0, display: "flex", flexDirection: "column", alignItems: "center", opacity: Math.min(1, p * 2), transform: `translateY(${(1 - p) * -40}px)` }}>
                  <div style={{ ...display, fontSize: 52, color: PAPER }}>10</div>
                  <div style={{ width: 22, height: 22, borderRadius: 999, background: GREEN, marginTop: 14, boxShadow: "0 0 14px rgba(4,228,0,0.7)" }} />
                  <div style={{ ...label, fontSize: 18, letterSpacing: 2, color: "rgba(255,255,255,0.55)", marginTop: 16 }}>Semana {i + 1}</div>
                </div>
              );
            })}
            {/* lupa que recorre la tendencia */}
            <svg width={150} height={150} viewBox="0 0 150 150" style={{ position: "absolute", top: 8, left: xs[0] - 70 + (xs[3] - xs[0]) * lens, opacity: Math.min(1, lens * 6) * (lens < 1 ? 1 : 1), filter: GLOW }}>
              <circle cx={64} cy={64} r={46} fill="rgba(4,228,0,0.08)" stroke={GREEN} strokeWidth={8} />
              <path d="M 98 98 L 136 136" stroke={GREEN} strokeWidth={12} strokeLinecap="round" />
            </svg>
          </div>
        </Glass>
        <div
          style={{
            ...display,
            fontSize: 50,
            color: INK,
            background: GREEN,
            padding: "12px 26px 8px",
            borderRadius: 12,
            marginTop: -18,
            filter: GLOW,
            transform: `scale(${0.6 + 0.4 * tag}) rotate(-2deg)`,
            opacity: Math.min(1, tag * 2),
          }}
        >
          Revisar la tendencia
        </div>
      </div>
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------------------
// E07 · la idea que queda

const Idea: React.FC = () => (
  <Tag from={IDEA.from} to={IDEA.to} top={1040}>
    <TwoLine at={IDEA.from} top="Interpretar el rendimiento" bottom="≠ medir crecimiento" />
  </Tag>
);

// ---------------------------------------------------------------------------
// E08 · «¿cuándo mantengo… y cuándo cambio algo?»: un interruptor que pasa de
// «¿Mantener?» a «¿Cambiar?» y se queda ahí

const Choice: React.FC = () => {
  const { t, ramp, pop } = useClock();
  // entra con un pequeño salto y al acabar la escena se va desvaneciendo poco a poco
  const inP = pop(CHOICE.keep - 0.1, 13, 190);
  const fade = ramp(CHOICE.to - 0.7, CHOICE.to - 0.05, easeInOut);
  const st: React.CSSProperties = {
    opacity: Math.min(1, inP * 2) * (1 - fade),
    transform: `translateY(${(1 - inP) * 60}px) scale(${0.92 + 0.08 * inP})`,
  };
  if (t < CHOICE.keep - 0.15 || t > CHOICE.to + 0.05) return null;
  const toKeep = ramp(CHOICE.keep, CHOICE.keep + 0.3, Easing.bezier(0.3, 1.4, 0.4, 1));
  const toChange = ramp(CHOICE.change, CHOICE.change + 0.3, Easing.bezier(0.3, 1.4, 0.4, 1));
  // posición del botón: -1 = mantener, 1 = cambiar (se queda ahí)
  const pos = -1 * toKeep * (1 - toChange) + 1 * toChange;
  // interruptor en el centro, opciones a los lados: se ilumina la que toca
  const TW = 230;
  const K = 96;
  const x = (TW - K) / 2 + pos * ((TW - K) / 2 - 8);
  const opt = (txt: string, active: number) => (
    <div
      style={{
        ...display,
        fontSize: 50,
        color: active > 0.5 ? GREEN : "rgba(255,255,255,0.6)",
        filter: active > 0.5 ? GLOW : undefined,
        transform: `scale(${1 + 0.1 * active})`,
        ...stroke(6),
      }}
    >
      {txt}
    </div>
  );
  return (
    <AbsoluteFill>
      <div style={{ position: "absolute", top: 1120, left: 0, right: 0, display: "flex", justifyContent: "center", alignItems: "center", gap: 26, ...st }}>
        {opt("¿Mantener?", Math.max(0, -pos))}
        <div style={{ position: "relative", width: TW, height: K + 16, borderRadius: 999, background: "rgba(10,10,10,0.9)", border: "3px solid rgba(255,255,255,0.25)", flexShrink: 0 }}>
          <div
            style={{
              position: "absolute",
              top: 5,
              left: x,
              width: K,
              height: K,
              borderRadius: 999,
              background: GREEN,
              boxShadow: "0 0 26px rgba(4,228,0,0.65)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              ...display,
              fontSize: 64,
              color: INK,
            }}
          >
          </div>
        </div>
        {opt("¿Cambiar?", Math.max(0, pos))}
      </div>
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------------------
// E09 · CTA: masterclass gratuita y «Comenta SOBRECARGA» (bocadillo de siempre)

const Cta: React.FC = () => {
  const { t, pop } = useClock();
  if (t < CTA.master - 0.1) return null;
  const m = pop(CTA.master, 12);
  const c = pop(CTA.master + 0.5, 11);
  const key = pop(CTA.keyword, 9);
  const breathe = 1 + Math.sin(t * 5.5) * 0.012 * key;
  return (
    <AbsoluteFill>
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "linear-gradient(180deg, transparent 40%, rgba(0,0,0,0.5) 55%, rgba(0,0,0,0.8) 100%)",
          opacity: Math.min(1, m * 1.5),
        }}
      />
      <div style={{ position: "absolute", top: 860, left: 0, right: 0, display: "flex", flexDirection: "column", alignItems: "center" }}>
        <div
          style={{
            ...label,
            fontSize: 26,
            letterSpacing: 4,
            color: PAPER,
            background: "rgba(10,10,10,0.8)",
            border: "2px solid rgba(255,255,255,0.18)",
            padding: "12px 22px",
            borderRadius: 999,
            transform: `translateY(${(1 - m) * 30}px)`,
            opacity: Math.min(1, m * 2),
          }}
        >
          Masterclass gratuita · <span style={{ color: GREEN }}>Sobrecarga progresiva</span>
        </div>
        <div
          style={{
            ...display,
            ...stroke(8),
            fontSize: 92,
            marginTop: 30,
            transform: `translateY(${(1 - c) * 40}px) scale(${0.4 + 0.6 * c}) rotate(${(1 - c) * -8}deg)`,
            opacity: Math.min(1, c * 2.5),
          }}
        >
          Comenta
        </div>
        <div
          style={{
            position: "relative",
            marginTop: 14,
            width: 860,
            height: 250,
            transform: `scale(${(0.3 + 0.7 * Math.max(key, t >= CTA.master + 0.7 ? c : 0)) * breathe}) rotate(${-3 + 2 * c}deg)`,
            opacity: Math.min(1, c * 2.5),
            filter: "drop-shadow(0 0 18px rgba(4,228,0,0.45))",
          }}
        >
          <svg width={860} height={250} style={{ position: "absolute", inset: 0 }}>
            <path d="M 10 12 L 850 4 L 840 186 L 270 196 L 160 246 L 176 196 L 18 200 Z" fill={GREEN} />
          </svg>
          <div
            style={{
              ...display,
              position: "absolute",
              left: 0,
              right: 0,
              top: 8,
              height: 186,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 86,
              letterSpacing: 0,
              color: INK,
              transform: `translateX(-4px) scale(${1 + 0.08 * Math.sin(Math.min(1, key) * Math.PI)})`,
            }}
          >
            Sobrecarga
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};

export const Graphics: React.FC = () => (
  <AbsoluteFill>
    <Thought />
    <Saying />
    <Notes />
    <Repeat />
    <Fatigue />
    <Trend />
    <Idea />
    <Choice />
    <Cta />
  </AbsoluteFill>
);
