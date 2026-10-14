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

/** Pastilla oscura de una línea. */
const Pill: React.FC<{ children: React.ReactNode; icon?: React.ReactNode }> = ({ children, icon }) => (
  <Glass style={{ padding: "18px 30px 14px", display: "flex", alignItems: "center", gap: 16 }}>
    {icon}
    <div style={{ ...display, fontSize: 46, whiteSpace: "normal", textAlign: "center" }}>{children}</div>
  </Glass>
);

const NotebookIcon: React.FC<{ size?: number }> = ({ size = 54 }) => (
  <svg width={size} height={size} viewBox="0 0 60 60" fill="none" stroke={GREEN} strokeWidth={4} strokeLinejoin="round">
    <rect x={12} y={6} width={38} height={48} rx={4} />
    <path d="M 20 18 L 42 18 M 20 28 L 42 28 M 20 38 L 34 38" strokeLinecap="round" />
    <path d="M 8 14 L 16 14 M 8 26 L 16 26 M 8 38 L 16 38" strokeLinecap="round" />
  </svg>
);

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
  const { t, pop, ramp } = useClock();
  if (t < NOTES.from - 0.05 || t > NOTES.to + 0.05) return null;
  const card = pop(NOTES.from, 12, 170);
  const out = ramp(NOTES.to - 0.3, NOTES.to, easeInOut);
  const rows = ["A", "B", "C"].map((s, i) => ({ s, at: NOTES.rows[i], v: "10" }));
  const eleven = pop(NOTES.eleven, 11);
  const fail = ramp(NOTES.fail, NOTES.fail + 0.25);
  const row = (label: string, v: React.ReactNode, p: number, key: string) => (
    <div
      key={key}
      style={{
        display: "flex",
        alignItems: "baseline",
        gap: 14,
        height: 74,
        borderBottom: "2px solid rgba(30,60,120,0.18)",
        opacity: Math.min(1, p * 2),
        transform: `translateX(${(1 - p) * -30}px)`,
      }}
    >
      <div style={{ fontFamily: FONT, fontWeight: 700, fontSize: 38, color: "#1d1d1d", width: 210 }}>Sesión {label}</div>
      <div style={{ flex: 1, borderBottom: "3px dotted rgba(0,0,0,0.25)", transform: "translateY(-10px)" }} />
      <div style={{ fontFamily: FONT, fontWeight: 900, fontStyle: "italic", fontSize: 56, color: "#11307a", width: 110, textAlign: "right", whiteSpace: "nowrap" }}>
        {v}
      </div>
    </div>
  );
  return (
    <AbsoluteFill style={{ opacity: 1 - out }}>
      <div
        style={{
          position: "absolute",
          top: 820,
          left: 120,
          width: 840,
          transform: `translateY(${(1 - card) * 300}px) rotate(${-2 + (1 - card) * 6}deg)`,
        }}
      >
        <div
          style={{
            background: "#F6F3EA",
            borderRadius: 14,
            padding: "26px 40px 28px 70px",
            boxShadow: "0 30px 70px rgba(0,0,0,0.6)",
            position: "relative",
            backgroundImage: "linear-gradient(90deg, transparent 46px, rgba(220,60,60,0.35) 46px, rgba(220,60,60,0.35) 49px, transparent 49px)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
            <div style={{ fontFamily: FONT, fontWeight: 800, fontSize: 30, color: "#1d1d1d" }}>Curl · misma carga</div>
            <div style={{ ...label, fontSize: 20, letterSpacing: 3, color: "rgba(0,0,0,0.45)" }}>Ejemplo</div>
          </div>
          {rows.map((r) => row(r.s, r.v, pop(r.at, 12), r.s))}
          {t >= NOTES.eleven - 0.05
            ? row(
                "D",
                <span style={{ position: "relative", display: "inline-block", color: fail > 0 ? RED : "#11307a" }}>
                  11
                  {/* tachón de rotulador por encima: el 11 se sigue leyendo */}
                  <svg width={120} height={70} viewBox="0 0 120 70" style={{ position: "absolute", left: -18, top: 4, opacity: 0.8 }}>
                    <path d="M 8 52 C 40 40, 80 22, 112 10" stroke={RED} strokeWidth={7} fill="none" strokeLinecap="round" strokeDasharray={120} strokeDashoffset={120 * (1 - fail)} />
                  </svg>
                </span>,
                eleven,
                "D",
              )
            : null}
        </div>
      </div>
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------------------
// E03 · pensamiento de Yago 1: viñeta suave (la voz lleva una reverb leve)

const Thought: React.FC = () => {
  const { t, ramp } = useClock();
  if (t < THOUGHT.from - 0.2 || t > THOUGHT.to + 0.1) return null;
  const o = ramp(THOUGHT.from - 0.15, THOUGHT.from + 0.25) * (1 - ramp(THOUGHT.to - 0.1, THOUGHT.to + 0.05));
  return (
    <AbsoluteFill
      style={{
        opacity: o,
        background: "radial-gradient(ellipse 70% 55% at 50% 40%, transparent 45%, rgba(0,12,4,0.55) 80%, rgba(0,0,0,0.8) 100%)",
        backdropFilter: "saturate(0.6)",
      }}
    />
  );
};

// ---------------------------------------------------------------------------
// E04–E08 · rótulos

const Labels: React.FC = () => (
  <>
    <Tag from={CALM.label} to={CALM.labelTo}>
      <TwoLine at={CALM.label} top="Repetir marca" bottom="≠ demostrar que no creces" />
    </Tag>
    <Tag from={CALM.record} to={CALM.recordTo}>
      <Pill icon={<NotebookIcon />}>Registro de rendimiento</Pill>
    </Tag>
    <Tag from={FATIGUE.from} to={FATIGUE.to}>
      <Pill>
        La fatiga <span style={{ color: GREEN }}>puede</span> limitar el rendimiento
      </Pill>
    </Tag>
    <Tag from={FATIGUE.pace} to={FATIGUE.paceTo}>
      <Pill>No todo progresa al mismo ritmo</Pill>
    </Tag>
    <Tag from={TREND.session} to={TREND.sessionTo}>
      <Pill>Una sesión sin récord</Pill>
    </Tag>
    <Tag from={TREND.review} to={TREND.reviewTo}>
      <Pill
        icon={
          <svg width={54} height={54} viewBox="0 0 60 60" fill="none" stroke={GREEN} strokeWidth={5} strokeLinecap="round" strokeLinejoin="round">
            <circle cx={26} cy={26} r={16} />
            <path d="M 38 38 L 52 52" />
          </svg>
        }
      >
        Revisar la tendencia
      </Pill>
    </Tag>
    <Tag from={IDEA.from} to={IDEA.to} top={1040}>
      <TwoLine at={IDEA.from} top="Interpretar el rendimiento" bottom="≠ medir crecimiento" />
    </Tag>
  </>
);

/** «¿Mantener?» / «¿Cambiar?»: dos opciones abiertas (sin marcar ninguna). */
const Choice: React.FC = () => {
  const { t, pop } = useClock();
  const st = useEnter(CHOICE.keep, CHOICE.to);
  if (t < CHOICE.keep - 0.05 || t > CHOICE.to + 0.05) return null;
  const opt = (txt: string, at: number) => {
    const p = pop(at, 11);
    return (
      <div
        style={{
          ...display,
          fontSize: 56,
          padding: "18px 30px 12px",
          borderRadius: 18,
          border: "3px solid rgba(255,255,255,0.7)",
          background: "rgba(10,10,10,0.8)",
          transform: `scale(${0.6 + 0.4 * p}) rotate(${(1 - p) * 8}deg)`,
          opacity: Math.min(1, p * 2),
        }}
      >
        {txt}
      </div>
    );
  };
  return (
    <AbsoluteFill>
      <div style={{ position: "absolute", top: 1120, left: 0, right: 0, display: "flex", justifyContent: "center", gap: 40, ...st }}>
        {opt("¿Mantener?", CHOICE.keep)}
        {opt("¿Cambiar?", CHOICE.change)}
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
            width: 760,
            height: 250,
            transform: `scale(${(0.3 + 0.7 * Math.max(key, t >= CTA.master + 0.7 ? c : 0)) * breathe}) rotate(${-3 + 2 * c}deg)`,
            opacity: Math.min(1, c * 2.5),
            filter: "drop-shadow(0 0 18px rgba(4,228,0,0.45))",
          }}
        >
          <svg width={760} height={250} style={{ position: "absolute", inset: 0 }}>
            <path d="M 10 12 L 750 4 L 740 186 L 240 196 L 140 246 L 154 196 L 18 200 Z" fill={GREEN} />
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
              fontSize: 98,
              color: INK,
              transform: `translateX(-8px) scale(${1 + 0.08 * Math.sin(Math.min(1, key) * Math.PI)})`,
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
    <Labels />
    <Choice />
    <Cta />
  </AbsoluteFill>
);
