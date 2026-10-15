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
/** Contorno solo por fuera: anillo de sombras duras, sin trazo dentro de las letras. */
const outline = (w: number): React.CSSProperties => ({
  textShadow: Array.from({ length: 16 }, (_, i) => {
    const a = (i / 16) * Math.PI * 2;
    return `${(Math.cos(a) * w).toFixed(2)}px ${(Math.sin(a) * w).toFixed(2)}px 0 rgba(0,0,0,0.88)`;
  }).join(", "),
});
// equivalente visual al antiguo trazo de `w` px (la mitad quedaba por fuera)
const stroke = (w: number) => outline(w / 2);
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
  /** Muelle con squash & stretch: se estira al moverse rápido y se aplasta al frenar. */
  const squash = (at: number, damping = 11, stiffness = 210) => {
    const cfg = { damping, stiffness, mass: 0.6 };
    const p = spring({ frame: frame - f(at), fps, config: cfg });
    const p0 = spring({ frame: frame - f(at) - 1, fps, config: cfg });
    const v = Math.max(-0.35, Math.min(0.35, (p - p0) * 2.4));
    return { p, sx: 1 - v * 0.45, sy: 1 + v * 0.55 };
  };
  /** Vida en reposo: flotación y balanceo suaves y continuos. */
  const idle = (seed: number, amp = 1) => {
    const s = frame / fps;
    return {
      y: Math.sin(s * 2.1 + seed) * 5 * amp,
      r: Math.sin(s * 1.6 + seed * 1.7) * 1.3 * amp,
      s: 1 + Math.sin(s * 2.6 + seed * 0.7) * 0.012 * amp,
    };
  };
  return { t, frame, fps, pop, ramp, squash, idle };
};

/** Texto que entra palabra a palabra con muelle, giro y squash (estilo Lottie). */
const Words: React.FC<{ text: string; at: number; gap?: number; style?: React.CSSProperties; color?: (i: number) => string | undefined }> = ({
  text,
  at,
  gap = 0.07,
  style,
  color,
}) => {
  const { squash } = useClock();
  return (
    <div style={style}>
      {text.split(" ").map((w, i) => {
        const q = squash(at + i * gap, 10, 240);
        return (
          <span
            key={i}
            style={{
              display: "inline-block",
              marginRight: "0.22em",
              color: color?.(i),
              opacity: Math.min(1, q.p * 3),
              transform: `translateY(${(1 - q.p) * 50}px) rotate(${(1 - q.p) * -14}deg) scale(${q.sx}, ${q.sy})`,
              transformOrigin: "50% 100%",
            }}
          >
            {w}
          </span>
        );
      })}
    </div>
  );
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
  const { squash, idle } = useClock();
  const q = squash(at + 0.35, 9, 220);
  const b = q.p;
  const id = idle(2.3, 0.8);
  return (
    <>
      <Words text={top} at={at} style={{ ...display, ...stroke(8), fontSize: 62, marginRight: "-0.22em" }} />
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
          transform: `translateY(${id.y}px) rotate(${-2 + id.r}deg) scale(${(0.7 + 0.3 * b) * q.sx}, ${(0.7 + 0.3 * b) * q.sy})`,
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
  const { t, squash, idle } = useClock();
  const box = squash(SAYING.from, 9, 220);
  const qL = squash(SAYING.from + 0.12, 8, 260);
  const qR = squash(SAYING.from + 0.22, 8, 260);
  const id = idle(0.6);
  if (t < SAYING.from - 0.05 || t > SAYING.to + 0.05) return null;
  const Q = 92; // caja de cada comilla: misma medida a los dos lados  // la de cierre es la de apertura girada 180°
  const quote = (q: { p: number; sx: number; sy: number }, right: boolean, seed: number) => {
    const wob = Math.sin((t + seed) * 6) * 4 * q.p;
    return (
      <div style={{ width: Q, height: Q, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", opacity: Math.min(1, q.p * 3), transform: `scale(${q.p * q.sx}, ${q.p * q.sy}) rotate(${(right ? 180 : 0) + (1 - q.p) * (right ? 40 : -40) + wob}deg)` }}>
        <div style={{ ...display, fontStyle: "normal", fontSize: 150, color: GREEN, lineHeight: 1, height: 150, marginTop: 70, filter: GLOW }}>“</div>
      </div>
    );
  };
  return (
    <Tag from={SAYING.from} to={SAYING.to} top={250}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, transform: `translateY(${id.y}px) rotate(${-4 + id.r + (1 - box.p) * 10}deg)` }}>
        <div style={{ alignSelf: "flex-start", marginTop: -34 }}>{quote(qL, false, 0)}</div>
        <div
          style={{
            ...display,
            fontSize: 64,
            color: INK,
            background: PAPER,
            padding: "14px 26px 8px",
            borderRadius: 8,
            transform: `scale(${box.sx * id.s}, ${box.sy * id.s})`,
          }}
        >
          <Words text="Lo que dicen" at={SAYING.from + 0.08} gap={0.06} style={{ marginRight: "-0.22em" }} />
        </div>
        <div style={{ alignSelf: "flex-start", marginTop: -34 }}>{quote(qR, true, 1.3)}</div>
      </div>
    </Tag>
  );
};

// ---------------------------------------------------------------------------
// E02 · libreta de ejemplo: 10 / 10 / 10 y la undécima que no sale

const Notes: React.FC = () => {
  const { t, frame, pop, ramp, squash, idle } = useClock();
  if (t < NOTES.from - 0.05 || t > NOTES.to + 0.05) return null;
  const cardQ = squash(NOTES.from, 11, 180);
  const card = cardQ.p;
  const id = idle(1.1, 0.7);
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
    // el número da un saltito cada vez que cambia
    const step = (10 * fill) % 1;
    const bump = n > 0 && n < 10 && !last ? Math.sin(step * Math.PI) * 0.12 : 0;
    const q11 = last ? squash(NOTES.eleven + 0.35, 7, 280) : null;
    const qFail = last ? squash(NOTES.fail, 6, 300) : null;
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
          <span
            style={{
              position: "relative",
              display: "inline-block",
              transformOrigin: "50% 80%",
              transform: q11 && qFail
                ? `scale(${(0.6 + 0.4 * q11.p) * q11.sx * qFail.sy}, ${(0.6 + 0.4 * q11.p) * q11.sy * qFail.sx}) rotate(${(1 - qFail.p) * -12}deg)`
                : `scale(${1 + bump}, ${1 + bump * 1.4})`,
            }}
          >
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
      <div style={{ position: "absolute", top: 830, left: 70, right: 70, transform: `translateY(${(1 - card) * 120 + id.y}px) rotate(${id.r * 0.5}deg) scale(${(0.94 + 0.06 * card) * cardQ.sx}, ${(0.94 + 0.06 * card) * cardQ.sy})`, opacity: Math.min(1, card * 2) }}>
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
  const { t, pop, ramp, squash, idle } = useClock();
  if (t < CALM.in - 0.02 || t > CALM.labelTo + 0.05) return null;
  const out = ramp(CALM.labelTo - 0.3, CALM.labelTo, easeInOut);
  const a = pop(CALM.in, 12, 230);
  const bq = squash(CALM.no, 8, 260);
  const b = bq.p;
  const id = idle(3.1);
  const grow = ramp(CALM.grow + 0.2, CALM.grow + 0.6);
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
      <div style={{ position: "absolute", top: 1040, left: 0, right: 0, display: "flex", flexDirection: "column", alignItems: "center", transform: `translateY(${-out * 40 + id.y}px) rotate(${id.r * 0.6}deg)` }}>
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
            transform: `scale(${(1.6 - 0.6 * b) * bq.sx * id.s}, ${(1.6 - 0.6 * b) * bq.sy * id.s}) rotate(${-3 + (1 - b) * 10 - id.r}deg)`,
            opacity: Math.min(1, b * 3),
          }}
        >
          No significa
        </div>
        <div style={{ ...display, ...stroke(8), fontSize: 54, marginTop: 18, opacity: Math.min(1, c * 3), transform: `translateX(${(1 - c) * 500}px) skewX(${(1 - c) * 20}deg)`, filter: blur(c) }}>
          que hayas dejado de{" "}
          <span style={{ color: GREEN, position: "relative", display: "inline-block", transform: `translateY(${-Math.sin(grow * Math.PI) * 10}px) scale(${1 + Math.sin(grow * Math.PI) * 0.12})` }}>
            crecer
            <svg width="100%" height={24} viewBox="0 0 100 24" preserveAspectRatio="none" style={{ position: "absolute", left: 0, bottom: -18, overflow: "visible" }}>
              <path d="M 2 14 Q 30 4, 55 12 T 98 8" fill="none" stroke={GREEN} strokeWidth={5} strokeLinecap="round" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - grow} style={{ filter: GLOW }} />
            </svg>
          </span>
        </div>
      </div>
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------------------
// E05 · «La fatiga puede limitar…»: batería que se vacía

const Fatigue: React.FC = () => {
  const { t, frame, ramp, squash } = useClock();
  if (t < FATIGUE.from - 0.05 || t > FATIGUE.to + 0.05) return null;
  const level = 1 - 0.7 * ramp(FATIGUE.from + 0.3, FATIGUE.from + 1.6, easeInOut);
  const low = level < 0.45;
  const blink = low ? 0.6 + 0.4 * Math.abs(Math.sin(t * 8)) : 1;
  const bat = squash(FATIGUE.from + 0.05, 8, 240);
  const shiver = low ? Math.sin(frame * 2.3) * 1.6 : 0;
  const sag = (1 - level) * 6; // se va «cansando»: cae y se inclina un poco
  return (
    <Tag from={FATIGUE.from} to={FATIGUE.to} top={1060}>
      <Glass style={{ padding: "20px 30px 18px", display: "flex", alignItems: "center", gap: 22 }}>
        <svg width={92} height={50} viewBox="0 0 92 50" style={{ overflow: "visible", transform: `translate(${shiver}px, ${sag * 0.6}px) rotate(${-sag}deg) scale(${bat.p * bat.sx}, ${bat.p * bat.sy})` }}>
          <rect x={3} y={3} width={78} height={44} rx={8} fill="none" stroke={PAPER} strokeWidth={5} />
          <rect x={83} y={16} width={7} height={18} rx={2} fill={PAPER} />
          <rect x={10} y={10} width={64 * level} height={30} rx={4} fill={low ? RED : GREEN} opacity={blink} />
        </svg>
        <Words
          text="La fatiga puede limitar el rendimiento"
          at={FATIGUE.from + 0.1}
          gap={0.06}
          color={(i) => (i === 2 ? GREEN : undefined)}
          style={{ ...display, fontSize: 44, whiteSpace: "normal" }}
        />
      </Glass>
    </Tag>
  );
};

// ---------------------------------------------------------------------------
// E06 · «Si sigues sin progresar semana tras semana… yo revisaría»: semanas que
// pasan con la misma marca y una lupa que revisa la tendencia

const Trend: React.FC = () => {
  const { t, pop, ramp, squash, idle } = useClock();
  const st = useEnter(TREND.review, TREND.reviewTo);
  if (t < TREND.review - 0.05 || t > TREND.reviewTo + 0.05) return null;
  const weeks = [0, 1, 2, 3].map((i) => TREND.review + i * 0.32);
  const xs = [80, 280, 480, 680];
  // la línea pasa justo por el centro de los puntos
  const NUM_H = 56;
  const DOT_GAP = 14;
  const DOT_Y = NUM_H + DOT_GAP + 11;
  // lupa: cae con un rebote sobre la semana 1 y salta de punto en punto (muelle),
  // se inclina en cada salto y «lee» cada marca con un pequeño latido
  const HOP = 0.32;
  const hops = [0, 1, 2, 3].map((i) => TREND.look + 0.15 + i * HOP);
  const drop = pop(TREND.look, 9, 200);
  let lx = xs[0];
  let tilt = 0;
  let beat = 0;
  let onDot = -1;
  for (let i = 1; i < 4; i++) {
    const h = pop(hops[i], 12, 260); // muelle: se pasa un poco y vuelve
    lx += (xs[i] - xs[i - 1]) * h;
    const v = Math.max(0, Math.min(1, (t - hops[i]) / 0.25));
    tilt += Math.sin(v * Math.PI) * 14 * (1 - v * 0.4);
  }
  for (let i = 0; i < 4; i++) {
    const d = t - (hops[i] + 0.12);
    if (d >= 0 && d < HOP) {
      onDot = i;
      beat = Math.sin(Math.min(1, d / 0.18) * Math.PI) * 0.12;
    }
  }
  if (t >= hops[3] + 0.12) onDot = 3;
  const lensScale = (0.3 + 0.7 * drop) * (1 + beat);
  const tagQ = squash(TREND.look + 0.6, 9, 230);
  const tag = tagQ.p;
  const tid = idle(4.2, 0.8);
  const W = 760;
  return (
    <AbsoluteFill>
      <div style={{ position: "absolute", top: 990, left: 60, right: 60, display: "flex", flexDirection: "column", alignItems: "center", ...st }}>
        <Glass style={{ padding: "22px 30px 26px", width: W + 60 }}>
          <div style={{ position: "relative", height: 210 }}>
            {/* la misma marca, semana tras semana */}
            <div style={{ position: "absolute", left: xs[0], right: W - xs[3], top: DOT_Y - 2, height: 4, background: "rgba(255,255,255,0.25)", transform: `scaleX(${ramp(weeks[0], weeks[3] + 0.3)})`, transformOrigin: "left" }} />
            {weeks.map((at, i) => {
              const p = pop(at, 10, 240);
              return (
                <div key={i} style={{ position: "absolute", left: xs[i] - 60, width: 120, top: 0, display: "flex", flexDirection: "column", alignItems: "center", opacity: Math.min(1, p * 2), transform: `translateY(${(1 - p) * -40}px)` }}>
                  <div style={{ ...display, fontSize: 52, color: PAPER, height: NUM_H, lineHeight: `${NUM_H}px` }}>10</div>
                  <div style={{ width: 22, height: 22, borderRadius: 999, background: GREEN, marginTop: DOT_GAP, boxShadow: onDot === i ? "0 0 26px rgba(4,228,0,1)" : "0 0 14px rgba(4,228,0,0.7)", transform: `scale(${onDot === i ? 1.35 : 1})` }} />
                  <div style={{ ...label, fontSize: 18, letterSpacing: 2, color: "rgba(255,255,255,0.55)", marginTop: 16 }}>Semana {i + 1}</div>
                </div>
              );
            })}
            {/* lupa que recorre la tendencia */}
            <svg
              width={150}
              height={150}
              viewBox="0 0 150 150"
              style={{
                position: "absolute",
                top: DOT_Y - 64 - (1 - drop) * 120,
                left: lx - 64,
                opacity: t < TREND.look ? 0 : Math.min(1, drop * 3),
                transform: `scale(${lensScale}) rotate(${tilt - (1 - drop) * 30}deg)`,
                transformOrigin: "64px 64px",
                filter: GLOW,
                overflow: "visible",
              }}
            >
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
            transform: `translateY(${tid.y}px) scale(${(0.6 + 0.4 * tag) * tagQ.sx}, ${(0.6 + 0.4 * tag) * tagQ.sy}) rotate(${-2 + tid.r}deg)`,
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
  const { t, ramp, pop, squash, idle, frame } = useClock();
  const id = idle(5.5, 0.8);
  // entra con un pequeño salto y al acabar la escena se va desvaneciendo poco a poco
  const inP = pop(CHOICE.keep - 0.1, 13, 190);
  const fade = ramp(CHOICE.to - 0.7, CHOICE.to - 0.05, easeInOut);
  const st: React.CSSProperties = {
    opacity: Math.min(1, inP * 2) * (1 - fade),
    transform: `translateY(${(1 - inP) * 60 + id.y}px) rotate(${id.r * 0.5}deg) scale(${0.92 + 0.08 * inP})`,
  };
  const ease = Easing.bezier(0.3, 1.4, 0.4, 1);
  const posAt = (fr: number) => {
    const r = (a: number, b: number) => interpolate(fr, [f(a), Math.max(f(a) + 1, f(b))], [0, 1], { ...clamp, easing: ease });
    const k = r(CHOICE.keep, CHOICE.keep + 0.3);
    const c = r(CHOICE.change, CHOICE.change + 0.3);
    return -1 * k * (1 - c) + c;
  };
  const vel = Math.max(-1, Math.min(1, (posAt(frame) - posAt(frame - 1)) * 4));
  const qKeep = squash(CHOICE.keep + 0.05, 8, 260);
  const qChange = squash(CHOICE.change + 0.05, 8, 260);
  if (t < CHOICE.keep - 0.15 || t > CHOICE.to + 0.05) return null;
  const toKeep = ramp(CHOICE.keep, CHOICE.keep + 0.3, Easing.bezier(0.3, 1.4, 0.4, 1));
  const toChange = ramp(CHOICE.change, CHOICE.change + 0.3, Easing.bezier(0.3, 1.4, 0.4, 1));
  // posición del botón: -1 = mantener, 1 = cambiar (se queda ahí)
  const pos = -1 * toKeep * (1 - toChange) + 1 * toChange;
  // interruptor en el centro, opciones a los lados: se ilumina la que toca
  const TW = 230;
  const K = 96;
  const x = (TW - K) / 2 + pos * ((TW - K) / 2 - 8);
  const opt = (txt: string, active: number, q: { sx: number; sy: number }, origin: string) => (
    <div
      style={{
        ...display,
        fontSize: 46,
        color: active > 0.5 ? GREEN : "#A6A6A6",
        filter: active > 0.5 ? GLOW : undefined,
        transform: `translateY(${-6 * active}px) scale(${(1 + 0.1 * active) * (active > 0.5 ? q.sx : 1)}, ${(1 + 0.1 * active) * (active > 0.5 ? q.sy : 1)}) rotate(${active > 0.5 ? -2 : 0}deg)`,
        transformOrigin: origin, // crece hacia fuera, nunca encima del interruptor
        ...outline(3),
      }}
    >
      {txt}
    </div>
  );
  return (
    <AbsoluteFill>
      <div style={{ position: "absolute", top: 1120, left: 0, right: 0, display: "flex", justifyContent: "center", alignItems: "center", gap: 22, ...st }}>
        {opt("¿Mantener?", Math.max(0, -pos), qKeep, "100% 100%")}
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
              // se estira en la dirección del movimiento y se aplasta al frenar
              transform: `scale(${1 + Math.abs(vel) * 0.35}, ${1 - Math.abs(vel) * 0.22})`,
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
        {opt("¿Cambiar?", Math.max(0, pos), qChange, "0% 100%")}
      </div>
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------------------
// E09 · CTA: masterclass gratuita y «Comenta SOBRECARGA» (bocadillo de siempre)

const Cta: React.FC = () => {
  const { t, pop, idle } = useClock();
  const id = idle(6.7, 0.9);
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
            transform: `translateY(${id.y}px) scale(${(0.3 + 0.7 * Math.max(key, t >= CTA.master + 0.7 ? c : 0)) * breathe}) rotate(${-3 + 2 * c + id.r}deg)`,
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
