import React from "react";
import {
  AbsoluteFill,
  Easing,
  Img,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { FONT, GREEN, PAPER } from "./theme";
import {
  f,
  FOLLOW,
  MEASURE,
  NERVE,
  QUESTION,
  STUDY,
  SYNTH,
  toSrc,
  TWO,
} from "./timeline";

// Motion graphics de «Bucal e hipertrofia». Todas las capas leen el tiempo del
// ORIGINAL (toSrc) y animan con fotogramas del montaje (f).


const NEON = "#3BFF2E";
const RED = "#FF3B30";
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


const LOWER = 960; // tarjetas sobre Yago: por encima de los subtítulos (1360)

/** Contenedor de una tarjeta sobre Yago con entrada/salida estándar. */
const Lower: React.FC<{
  from: number;
  to: number;
  top?: number;
  children: React.ReactNode;
}> = ({ from, to, top = LOWER, children }) => {
  const { t } = useClock();
  const st = useEnter(from, to);
  if (t < from - 0.05 || t > to + 0.05) return null;
  return (
    <AbsoluteFill>
      <div style={{ position: "absolute", top, left: 60, right: 60, ...st }}>
        {children}
      </div>
    </AbsoluteFill>
  );
};

/** Fondo a pantalla completa para los planos negros del original: el mismo de
 *  «La rutina optimizada» (textura vintage con cuadrícula, grano, líneas de escaneo y
 *  el título gigante en contorno), con cortinilla diagonal de borde verde. */
const WIPE_IN = 0.42;
const WIPE_OUT = 0.36;
const Stage: React.FC<{
  from: number;
  to: number;
  title: string;
  children: React.ReactNode;
}> = ({ from, to, title, children }) => {
  const { t, frame, ramp } = useClock();
  if (t < from - WIPE_IN / 2 - 0.02 || t > to + 0.02) return null;
  const inQ = ramp(from - WIPE_IN / 2, from + WIPE_IN / 2, easeInOut);
  const outQ = ramp(to - WIPE_OUT, to, easeInOut);
  const a = inQ * 130;
  const b = outQ * 130;
  const clip = `polygon(${b}% 0, ${a}% 0, ${a - 30}% 100%, ${b - 30}% 100%)`;
  const seed = Math.floor(frame / 2) % 9;
  const flicker = 1 + Math.sin(frame * 1.7) * 0.015 + Math.sin(frame * 0.37) * 0.012;
  const scratch = (frame * 37) % 97 < 5;
  const scratchX = ((frame * 53) % 89) + 5;
  const drift = (t - from) * 26;
  const id = title.replace(/\W/g, "");
  return (
    <AbsoluteFill>
      <AbsoluteFill style={{ clipPath: clip }}>
        <AbsoluteFill style={{ background: "#121212", filter: `brightness(${flicker})` }}>
          <AbsoluteFill
            style={{
              background:
                "radial-gradient(ellipse 80% 45% at 50% 28%, rgba(255,255,255,0.06), transparent 70%)",
            }}
          />
          <AbsoluteFill
            style={{
              backgroundImage:
                "linear-gradient(rgba(255,255,255,0.035) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.035) 1px, transparent 1px)",
              backgroundSize: "60px 60px",
              backgroundPosition: `${-drift * 0.3}px ${-drift * 0.15}px`,
            }}
          />
          <svg width={4200} height={400} style={{ position: "absolute", top: 1470, left: 60 - drift, overflow: "visible" }}>
            <defs>
              <filter id={`outline-${id}`} x="-5%" y="-20%" width="110%" height="140%">
                <feMorphology in="SourceAlpha" operator="dilate" radius={2.5} result="grown" />
                <feComposite in="grown" in2="SourceAlpha" operator="out" result="ring" />
                <feFlood floodColor="#ffffff" floodOpacity={0.08} />
                <feComposite in2="ring" operator="in" />
              </filter>
            </defs>
            <text x={0} y={330} fill="#ffffff" filter={`url(#outline-${id})`} fontFamily={FONT} fontWeight={900} fontStyle="italic" fontSize={330}>
              {`${title} · ${title} · ${title}`.toUpperCase()}
            </text>
          </svg>
          <svg width="100%" height="100%" style={{ position: "absolute", opacity: 0.2, mixBlendMode: "screen" }}>
            <filter id={`bd-${id}-${seed}`}>
              <feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves={2} seed={seed} />
              <feColorMatrix type="saturate" values="0" />
            </filter>
            <rect width="100%" height="100%" filter={`url(#bd-${id}-${seed})`} />
          </svg>
          <AbsoluteFill
            style={{
              background:
                "repeating-linear-gradient(0deg, rgba(255,255,255,0.03) 0px, rgba(255,255,255,0.03) 1px, transparent 1px, transparent 4px)",
            }}
          />
          {scratch ? (
            <div style={{ position: "absolute", top: 0, bottom: 0, left: `${scratchX}%`, width: 1.5, background: "rgba(255,255,255,0.14)" }} />
          ) : null}
          <AbsoluteFill style={{ boxShadow: "inset 0 0 200px rgba(0,0,0,0.3)" }} />
          {children}
        </AbsoluteFill>
      </AbsoluteFill>
      {/* borde de la cortinilla */}
      {inQ < 1 || outQ > 0 ? (
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: GREEN,
            clipPath: `polygon(${(inQ < 1 ? a : b) - 1.2}% 0, ${inQ < 1 ? a : b}% 0, ${(inQ < 1 ? a : b) - 30}% 100%, ${(inQ < 1 ? a : b) - 31.2}% 100%)`,
            filter: GLOW,
          }}
        />
      ) : null}
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------------------
// Iconos de línea (mismo trazo en todo el vídeo)

const Tooth: React.FC<{ size?: number; color?: string }> = ({ size = 90, color = PAPER }) => (
  <svg width={size} height={size} viewBox="0 0 100 100">
    <path
      d="M 22 20 C 34 10, 44 18, 50 18 C 56 18, 66 10, 78 20 C 90 32, 82 52, 76 70 C 72 84, 66 92, 62 86 C 58 78, 58 64, 50 64 C 42 64, 42 78, 38 86 C 34 92, 28 84, 24 70 C 18 52, 10 32, 22 20 Z"
      fill="none"
      stroke={color}
      strokeWidth={6}
      strokeLinejoin="round"
    />
  </svg>
);

const Neuron: React.FC<{ size?: number; color?: string }> = ({ size = 90, color = PAPER }) => (
  <svg width={size} height={size} viewBox="0 0 100 100" fill="none" stroke={color} strokeWidth={6} strokeLinecap="round">
    <circle cx={50} cy={46} r={14} />
    <path d="M 50 32 L 50 12 M 38 38 L 22 24 M 62 38 L 78 24 M 36 50 L 16 54 M 50 60 L 50 76 L 62 90 M 50 76 L 38 90" />
  </svg>
);

const Arm: React.FC<{ size?: number; color?: string }> = ({ size = 90, color = PAPER }) => (
  <svg width={size} height={size} viewBox="0 0 100 100" fill="none" stroke={color} strokeWidth={6} strokeLinecap="round" strokeLinejoin="round">
    <path d="M 14 84 L 40 84 C 62 84, 80 74, 84 56 C 86 46, 80 40, 72 42 C 66 30, 56 22, 52 14 L 40 16 L 44 30 C 34 36, 30 48, 34 60 L 14 64 Z" />
    <path d="M 52 50 C 58 44, 66 42, 72 42" />
  </svg>
);

const Guard: React.FC<{ size?: number; color?: string; fill?: string }> = ({
  size = 90,
  color = PAPER,
  fill = "none",
}) => (
  <svg width={size} height={size * 0.8} viewBox="0 0 100 80">
    {/* protector dental visto desde arriba: herradura */}
    <path
      d="M 14 70 C 6 40, 18 8, 50 8 C 82 8, 94 40, 86 70 L 70 70 C 74 46, 66 26, 50 26 C 34 26, 26 46, 30 70 Z"
      fill={fill}
      stroke={color}
      strokeWidth={6}
      strokeLinejoin="round"
    />
  </svg>
);

// ---------------------------------------------------------------------------
// E02 · P1: apretar → sistema nervioso → otros músculos (esquema, sin datos)

const Nerve: React.FC = () => {
  const { t, pop, ramp } = useClock();
  const nodes = [
    { at: NERVE.jaw, icon: <Tooth size={96} />, name: "Mandíbula" },
    { at: NERVE.nerve, icon: <Neuron size={96} />, name: "Sistema nervioso" },
    { at: NERVE.muscles, icon: <Arm size={96} />, name: "Otros músculos" },
  ];
  const link1 = ramp(NERVE.jaw + 0.6, NERVE.nerve);
  const link2 = ramp(NERVE.nerve + 0.3, NERVE.muscles);
  const pulse = (k: number) => (((t - NERVE.jaw) * 0.9 + k) % 1 + 1) % 1;
  return (
    <Lower from={NERVE.from} to={NERVE.to}>
      <Glass style={{ padding: "30px 30px 26px" }}>
        <div style={{ position: "relative", display: "flex", justifyContent: "space-between" }}>
          {[link1, link2].map((l, i) => (
            <div
              key={i}
              style={{
                position: "absolute",
                top: 60,
                left: 170 + i * 310,
                width: 210 * l,
                height: 6,
                borderRadius: 3,
                background: `linear-gradient(90deg, rgba(4,228,0,0.25), ${NEON} ${pulse(i * 0.5) * 100}%, rgba(4,228,0,0.25))`,
                boxShadow: "0 0 14px rgba(4,228,0,0.7)",
              }}
            />
          ))}
          {nodes.map((n, i) => {
            const p = pop(n.at, 11);
            const lit = t >= n.at;
            return (
              <div
                key={n.name}
                style={{
                  width: 260,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 12,
                  opacity: Math.min(1, p * 2) * (i === 0 ? 1 : 1),
                  transform: `scale(${0.6 + 0.4 * p})`,
                }}
              >
                <div
                  style={{
                    width: 124,
                    height: 124,
                    borderRadius: 999,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    border: `3px solid ${lit ? GREEN : "rgba(255,255,255,0.2)"}`,
                    background: "rgba(10,10,10,0.9)",
                    boxShadow: lit ? "0 0 26px rgba(4,228,0,0.5)" : undefined,
                  }}
                >
                  {n.icon}
                </div>
                <div style={{ ...display, fontSize: 30, whiteSpace: "normal", textAlign: "center" }}>{n.name}</div>
              </div>
            );
          })}
        </div>
        <div style={{ marginTop: 18, display: "flex", justifyContent: "center" }}>
          <Cite>Boroojerdi et al. · 2000</Cite>
        </div>
      </Glass>
    </Lower>
  );
};

// ---------------------------------------------------------------------------
// La pregunta (plano negro): «¿Morder un bucal = más músculo?»

const Question: React.FC = () => {
  const { pop } = useClock();
  const g = pop(QUESTION.from + 0.1, 12);
  const a = pop(QUESTION.bite - 0.05, 11);
  const b = pop(QUESTION.muscle - 0.05, 9);
  const card = pop(QUESTION.card, 10);
  return (
    <Stage from={QUESTION.from} to={QUESTION.to} title="Bucal">
      <div
        style={{
          position: "absolute",
          top: 480,
          left: 0,
          right: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
        }}
      >
        <div style={{ transform: `scale(${g}) rotate(${(1 - g) * -20}deg)`, filter: GLOW }}>
          <Guard size={220} color={GREEN} fill="rgba(4,228,0,0.15)" />
        </div>
        <div style={{ ...display, fontSize: 86, marginTop: 50, opacity: Math.min(1, a * 2), transform: `translateY(${(1 - a) * 40}px)` }}>
          ¿Morder un bucal
        </div>
        <div
          style={{
            ...display,
            fontSize: 104,
            color: GREEN,
            filter: GLOW,
            marginTop: 18,
            opacity: Math.min(1, b * 2),
            transform: `scale(${0.7 + 0.3 * b})`,
          }}
        >
          = más músculo?
        </div>
        <div
          style={{
            marginTop: 80,
            transform: `scale(${1.6 - 0.6 * card}) rotate(-3deg)`,
            opacity: Math.min(1, card * 3),
          }}
        >
          <div
            style={{
              ...display,
              fontSize: 36,
              color: INK,
              background: PAPER,
              padding: "14px 26px 10px",
              borderRadius: 10,
            }}
          >
            Efectos agudos ≠ crecimiento demostrado
          </div>
        </div>
      </div>
    </Stage>
  );
};

// ---------------------------------------------------------------------------
// «Separar dos cosas»

const Two: React.FC = () => {
  const { pop } = useClock();
  const row = (n: string, icon: React.ReactNode, text: React.ReactNode, at: number) => {
    const p = pop(at, 12);
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 22,
          marginTop: 18,
          padding: "16px 26px",
          borderRadius: 20,
          background: "rgba(12,12,12,0.9)",
          border: "2px solid rgba(255,255,255,0.16)",
          transform: `translateX(${(1 - p) * -120}px)`,
          opacity: Math.min(1, p * 2),
        }}
      >
        <div style={{ ...display, fontSize: 56, color: GREEN, width: 50 }}>{n}</div>
        {icon}
        <div style={{ ...display, fontSize: 46, whiteSpace: "normal", lineHeight: 1 }}>{text}</div>
      </div>
    );
  };
  return (
    <Lower from={TWO.from} to={TWO.to} top={900}>
      {row("1", <Tooth size={70} />, "Apretar la mandíbula", TWO.clench)}
      {row("2", <Guard size={70} />, <>¿El bucal <span style={{ color: GREEN }}>suma algo</span>?</>, TWO.guard)}
    </Lower>
  );
};

// ---------------------------------------------------------------------------
// E05 · P2 (Miró et al., 2023): el estudio y su figura 4 (plano negro)

const FIG_W = 960;
const K = FIG_W / 2067; // escala del recorte de la figura (2067×910 px)
const BAR = {
  njaw: [235, 718],
  jaw: [840, 1325],
  mg: [1447, 1930],
};

const Study: React.FC = () => {
  const { t, pop, ramp } = useClock();
  const page = ramp(STUDY.figure - 0.25, STUDY.figure + 0.2, easeInOut);
  const paper = pop(STUDY.from + 0.05, 13);
  const n12 = pop(STUDY.athletes, 11);
  const tests = [
    { at: STUDY.grip, name: "Agarre" },
    { at: STUDY.press, name: "Press" },
    { at: STUDY.curl, name: "Curl" },
  ];
  const conds = [
    { at: STUDY.c1, icon: <Tooth size={58} color="rgba(255,255,255,0.5)" />, name: "Sin apretar" },
    { at: STUDY.c2, icon: <Tooth size={58} />, name: "Apretando sin bucal" },
    { at: STUDY.c3, icon: <Guard size={58} />, name: "Apretando con bucal" },
  ];
  const fig = pop(STUDY.figure, 13);
  const stars = ramp(STUDY.figure + 0.6, STUDY.figure + 1.2);
  const extra = ramp(STUDY.noExtra, STUDY.noExtra + 0.4);
  const extraP = pop(STUDY.noExtra + 0.15, 11);
  const blink = t > STUDY.figure + 0.6 && t < STUDY.noExtra ? 0.75 + 0.25 * Math.sin(t * 9) : 1;
  const figH = 910 * K;
  const box = (key: keyof typeof BAR) => {
    const [x0, x1] = BAR[key];
    return (
      <div
        key={key}
        style={{
          position: "absolute",
          left: x0 * K - 8,
          width: (x1 - x0) * K + 16,
          top: 330 * K,
          height: (795 - 330) * K + 8,
          border: `4px solid ${GREEN}`,
          borderRadius: 10,
          boxShadow: "0 0 24px rgba(4,228,0,0.6)",
          opacity: extra,
        }}
      />
    );
  };
  return (
    <Stage from={STUDY.from} to={STUDY.to} title="Miró 2023">
      {/* página A: quién, qué y cómo */}
      <AbsoluteFill style={{ opacity: 1 - page, transform: `translateY(${-page * 60}px)` }}>
        <div
          style={{
            position: "absolute",
            top: 190,
            left: 60,
            right: 60,
            transform: `translateY(${(1 - paper) * 80}px) rotate(${-1.5 + (1 - paper) * 4}deg)`,
            opacity: Math.min(1, paper * 2),
          }}
        >
          <div style={{ background: "white", borderRadius: 12, padding: 14, boxShadow: "0 30px 70px rgba(0,0,0,0.6)" }}>
            <Img src={staticFile("papers/title.png")} style={{ width: "100%", display: "block" }} />
          </div>
        </div>
        <div style={{ position: "absolute", top: 560, left: 0, right: 0, display: "flex", justifyContent: "center", alignItems: "baseline", gap: 22 }}>
          <div style={{ ...display, fontSize: 150, color: GREEN, filter: GLOW, transform: `scale(${n12})`, opacity: Math.min(1, n12 * 2) }}>12</div>
          <div style={{ ...display, fontSize: 56, opacity: Math.min(1, n12 * 2) }}>deportistas</div>
        </div>
        <div style={{ position: "absolute", top: 760, left: 0, right: 0, display: "flex", justifyContent: "center", gap: 18 }}>
          {tests.map((x) => {
            const p = pop(x.at, 11);
            return (
              <div
                key={x.name}
                style={{
                  ...display,
                  fontSize: 40,
                  padding: "12px 24px 8px",
                  borderRadius: 14,
                  border: "2px solid rgba(255,255,255,0.3)",
                  transform: `scale(${p})`,
                  opacity: Math.min(1, p * 2),
                }}
              >
                {x.name}
              </div>
            );
          })}
        </div>
        <div style={{ position: "absolute", top: 880, left: 0, right: 0, display: "flex", justifyContent: "center", ...label, fontSize: 22, opacity: ramp(STUDY.tests, STUDY.tests + 0.3) }}>
          Fuerza isométrica máxima
        </div>
        <div style={{ position: "absolute", top: 960, left: 110, right: 110 }}>
          {conds.map((c, i) => {
            const p = pop(c.at, 12);
            return (
              <div
                key={c.name}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 22,
                  marginBottom: 14,
                  padding: "12px 24px",
                  borderRadius: 18,
                  background: i === 0 ? "rgba(255,255,255,0.05)" : "rgba(4,228,0,0.1)",
                  border: `2px solid ${i === 0 ? "rgba(255,255,255,0.2)" : "rgba(4,228,0,0.6)"}`,
                  transform: `translateX(${(1 - p) * (i % 2 ? 120 : -120)}px)`,
                  opacity: Math.min(1, p * 2),
                }}
              >
                {c.icon}
                <div style={{ ...display, fontSize: 42 }}>{c.name}</div>
              </div>
            );
          })}
        </div>
      </AbsoluteFill>
      {/* página B: figura 4 original + traducción */}
      {t >= STUDY.figure - 0.3 ? (
        <AbsoluteFill style={{ opacity: page }}>
          <div style={{ position: "absolute", top: 250, left: 0, right: 0, display: "flex", justifyContent: "center" }}>
            <Cite>Miró et al. · 2023 · Figura 4</Cite>
          </div>
          <div
            style={{
              position: "absolute",
              top: 310,
              left: 60,
              width: FIG_W,
              transform: `translateY(${(1 - fig) * 60}px) scale(${0.94 + 0.06 * fig})`,
            }}
          >
            <div style={{ background: "white", borderRadius: 14, padding: "18px 0 10px", boxShadow: "0 30px 70px rgba(0,0,0,0.6)" }}>
              <div style={{ position: "relative", width: FIG_W, height: figH }}>
                <Img src={staticFile("papers/fig4.png")} style={{ width: FIG_W, display: "block" }} />
                {/* los asteriscos originales: ambas condiciones de apretar > control */}
                <div
                  style={{
                    position: "absolute",
                    left: 470 * K,
                    width: 1240 * K,
                    top: 140 * K,
                    height: 175 * K,
                    borderRadius: 12,
                    background: "rgba(4,228,0,0.18)",
                    border: `3px solid ${GREEN}`,
                    opacity: stars * (1 - extra) * blink,
                  }}
                />
                {box("jaw")}
                {box("mg")}
              </div>
              {/* franja de traducción, alineada con cada barra */}
              <div style={{ position: "relative", height: 60, borderTop: "2px solid #e6e6e6", marginTop: 4 }}>
                {(
                  [
                    ["njaw", "Sin apretar"],
                    ["jaw", "Apretar"],
                    ["mg", "Apretar + bucal"],
                  ] as const
                ).map(([k, txt]) => {
                  const [x0, x1] = BAR[k];
                  return (
                    <div
                      key={k}
                      style={{
                        position: "absolute",
                        left: x0 * K - 20,
                        width: (x1 - x0) * K + 40,
                        top: 14,
                        textAlign: "center",
                        fontFamily: FONT,
                        fontWeight: 800,
                        fontSize: 26,
                        color: k !== "njaw" && extra > 0.5 ? "#029a00" : INK,
                      }}
                    >
                      {txt}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
          <div style={{ position: "absolute", top: 360 + figH + 100, left: 60, right: 60, display: "flex", flexDirection: "column", alignItems: "center", gap: 22 }}>
            <div style={{ ...display, fontSize: 46, textAlign: "center", whiteSpace: "normal", opacity: stars * (1 - extra) }}>
              Apretar <span style={{ color: GREEN }}>{">"}</span> no apretar
            </div>
          </div>
          <div
            style={{
              position: "absolute",
              top: 360 + figH + 90,
              left: 60,
              right: 60,
              display: "flex",
              justifyContent: "center",
              transform: `scale(${0.7 + 0.3 * extraP})`,
              opacity: Math.min(1, extraP * 2),
            }}
          >
            <div style={{ ...display, fontSize: 46, color: INK, background: GREEN, padding: "14px 26px 10px", borderRadius: 12, filter: GLOW, whiteSpace: "normal", textAlign: "center" }}>
              Sin ventaja adicional detectada del bucal
            </div>
          </div>
        </AbsoluteFill>
      ) : null}
    </Stage>
  );
};

// ---------------------------------------------------------------------------
// «¿Cuánto músculo más ganaron?» → «eso no lo midieron»

const Measure: React.FC = () => {
  const { pop, t } = useClock();
  const q = pop(MEASURE.question, 11);
  const no = pop(MEASURE.no, 9);
  return (
    <Lower from={MEASURE.question} to={MEASURE.to} top={1000}>
      <Glass style={{ padding: "28px 36px", display: "flex", alignItems: "center", gap: 26, position: "relative" }}>
        <Arm size={110} color={GREEN} />
        <div>
          <div style={{ ...label, fontSize: 22, color: "rgba(255,255,255,0.6)" }}>Crecimiento muscular</div>
          <div style={{ ...display, fontSize: 64, marginTop: 6, transform: `scale(${q})`, transformOrigin: "left" }}>
            <span style={{ textDecoration: t >= MEASURE.no ? "line-through" : "none", textDecorationColor: RED, textDecorationThickness: 6, opacity: t >= MEASURE.no ? 0.5 : 1 }}>+ ¿? kg</span>
          </div>
        </div>
        <div
          style={{
            position: "absolute",
            right: 30,
            top: 40,
            transform: `scale(${1.8 - 0.8 * no}) rotate(-8deg)`,
            opacity: Math.min(1, no * 3),
          }}
        >
          <div style={{ ...display, fontSize: 44, color: RED, border: `5px solid ${RED}`, padding: "10px 18px 6px", borderRadius: 10, filter: "drop-shadow(0 0 10px rgba(255,59,48,0.6))" }}>
            No medido
          </div>
        </div>
      </Glass>
    </Lower>
  );
};

// ---------------------------------------------------------------------------
// E07 · síntesis y dentista

const Synth: React.FC = () => {
  const { pop } = useClock();
  const b = pop(SYNTH.from + 0.5, 11);
  return (
    <Lower from={SYNTH.from} to={SYNTH.to} top={1020}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14 }}>
        <div style={{ ...display, ...stroke(8), fontSize: 66 }}>Rendimiento agudo</div>
        <div
          style={{
            ...display,
            fontSize: 58,
            color: INK,
            background: GREEN,
            padding: "12px 24px 8px",
            borderRadius: 12,
            filter: GLOW,
            transform: `scale(${0.7 + 0.3 * b})`,
            opacity: Math.min(1, b * 2),
          }}
        >
          ≠ Hipertrofia demostrada
        </div>
      </div>
    </Lower>
  );
};

// ---------------------------------------------------------------------------
// E08 · «Sígueme · Entrena con criterio» (mismo concepto minimalista del quiz)

const Follow: React.FC = () => {
  const { t, ramp } = useClock();
  const at = FOLLOW.at;
  if (t < at - 0.1) return null;
  const line = ramp(at - 0.05, at + 0.35, easeInOut);
  const rise = ramp(at + 0.2, at + 0.75, Easing.bezier(0.2, 1.4, 0.35, 1));
  const arrow = ramp(at + 0.7, at + 1.05, Easing.bezier(0.2, 1.3, 0.4, 1));
  const sub = ramp(FOLLOW.criterio, FOLLOW.criterio + 0.4);
  const bob = Math.sin(Math.max(0, t - at - 1.0) * 5) * 8 * arrow;
  return (
    <AbsoluteFill>
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "linear-gradient(180deg, transparent 45%, rgba(0,0,0,0.55) 60%, rgba(0,0,0,0.8) 100%)",
          opacity: line,
        }}
      />
      <div style={{ position: "absolute", top: 1040, left: 0, right: 0, display: "flex", flexDirection: "column", alignItems: "center" }}>
        <svg
          width={120}
          height={70}
          viewBox="0 0 120 70"
          style={{ opacity: Math.min(1, arrow * 3), transform: `translateY(${(1 - arrow) * 190 - bob}px) scaleX(${0.4 + 0.6 * arrow})`, filter: GLOW }}
        >
          <path d="M 14 56 L 60 14 L 106 56" fill="none" stroke={GREEN} strokeWidth={8} strokeLinecap="round" strokeLinejoin="round" />
        </svg>
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
        <div style={{ width: 560 * line, height: 5, borderRadius: 3, background: GREEN, boxShadow: "0 0 18px rgba(4,228,0,0.8)", marginTop: 6 }} />
        <div style={{ ...label, fontSize: 30, letterSpacing: 8, marginTop: 22, opacity: sub, transform: `translateY(${(1 - sub) * 16}px)` }}>
          Entrena con criterio
        </div>
      </div>
    </AbsoluteFill>
  );
};

export const Graphics: React.FC = () => (
  <AbsoluteFill>
    <Nerve />
    <Question />
    <Two />
    <Study />
    <Measure />
    <Synth />
    <Follow />
  </AbsoluteFill>
);
