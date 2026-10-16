import React from "react";
import { AbsoluteFill, Easing, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { FONT, GREEN, INK, PAPER } from "./theme";
import { CLOSE, f, HOOK, QUESTIONS, toSrc } from "./timeline";

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const easeOut = Easing.bezier(0.16, 1, 0.3, 1);

const useClock = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = toSrc(frame / fps);
  const pop = (at: number, damping = 12, stiffness = 220) =>
    spring({ frame: frame - f(at), fps, config: { damping, stiffness, mass: 0.6 } });
  const ramp = (a: number, b: number, ease = easeOut) =>
    interpolate(frame, [f(a), Math.max(f(a) + 1, f(b))], [0, 1], { ...clamp, easing: ease });
  return { t, pop, ramp, frame, fps };
};

const label: React.CSSProperties = {
  fontFamily: FONT,
  fontWeight: 800,
  textTransform: "uppercase",
  letterSpacing: 4,
  whiteSpace: "nowrap",
};

// Cabecera fija: rueda de prensa ficticia + aviso de sátira discreto.
const Header: React.FC = () => {
  const { ramp } = useClock();
  const p = ramp(HOOK.from, HOOK.from + 0.6);
  return (
    <AbsoluteFill style={{ alignItems: "center", top: 70, opacity: p }}>
      <div style={{ display: "flex", alignItems: "center", gap: 14, background: "rgba(8,10,16,0.72)", border: "1.5px solid rgba(255,255,255,0.16)", borderRadius: 999, padding: "12px 26px 10px", transform: `translateY(${(1 - p) * -30}px)` }}>
        <div style={{ width: 14, height: 14, borderRadius: 7, background: "#FF3B30", boxShadow: "0 0 12px #FF3B30" }} />
        <div style={{ ...label, fontSize: 24, color: PAPER }}>Rueda de prensa del gimnasio</div>
      </div>
      <div style={{ ...label, fontSize: 15, letterSpacing: 3, color: "rgba(255,255,255,0.5)", marginTop: 10, fontWeight: 700 }}>Sátira · escenario IA</div>
    </AbsoluteFill>
  );
};

// Contador «n/8 · tema» que acompaña a cada pregunta y su respuesta.
const Counter: React.FC = () => {
  const { t, pop, ramp } = useClock();
  const q = QUESTIONS.find((x) => t >= x.q - 0.05 && t < x.to);
  if (!q) return null;
  const s = pop(q.q, 13, 260);
  const out = ramp(q.to - 0.25, q.to);
  return (
    <AbsoluteFill style={{ alignItems: "center", top: 196 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 14, opacity: Math.min(1, s * 2) * (1 - out), transform: `scale(${0.7 + 0.3 * s})` }}>
        <div style={{ ...label, fontSize: 34, letterSpacing: 1, color: INK, background: GREEN, borderRadius: 12, padding: "8px 16px 4px", fontStyle: "italic", fontWeight: 900 }}>{q.n}/8</div>
        <div style={{ ...label, fontSize: 26, letterSpacing: 2, color: "white" }}>{q.topic}</div>
      </div>
    </AbsoluteFill>
  );
};

// Tarjeta de la pregunta del periodista: aparece mientras Yago escucha.
const QuestionCard: React.FC<{ from: number; to: number; text: string; final?: boolean }> = ({ from, to, text, final }) => {
  const { t, pop, ramp } = useClock();
  if (t < from - 0.05 || t > to + 0.1) return null;
  const s = pop(from, 14, 240);
  const out = ramp(to - 0.3, to);
  return (
    <AbsoluteFill style={{ alignItems: "center", top: 1360 }}>
      <div style={{ width: 900, opacity: Math.min(1, s * 2) * (1 - out), transform: `translateY(${(1 - s) * 40 + out * -20}px)` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
          <svg width={30} height={30} viewBox="0 0 24 24"><rect x={8} y={2} width={8} height={13} rx={4} fill={PAPER} /><path d="M5 11a7 7 0 0 0 14 0M12 18v4M8 22h8" stroke={PAPER} strokeWidth={2} fill="none" strokeLinecap="round" /></svg>
          <div style={{ ...label, fontSize: 22, letterSpacing: 4, color: "rgba(255,255,255,0.75)" }}>Periodista</div>
        </div>
        <div style={{ background: final ? "rgba(120,10,10,0.82)" : "rgba(8,10,16,0.82)", border: `2px solid ${final ? "rgba(255,90,90,0.6)" : "rgba(255,255,255,0.14)"}`, borderRadius: 22, padding: "24px 30px 22px", boxShadow: "0 24px 60px rgba(0,0,0,0.5)" }}>
          <div style={{ fontFamily: FONT, fontWeight: 800, fontSize: 46, lineHeight: 1.14, color: "white", letterSpacing: -0.5 }}>{text}</div>
        </div>
      </div>
    </AbsoluteFill>
  );
};

// Icono sencillo de apoyo (reloj o dos casillas de calendario).
const Icon: React.FC<{ kind: "clock" | "calendar"; p: number; frame: number }> = ({ kind, p, frame }) =>
  kind === "clock" ? (
    <svg width={64} height={64} viewBox="0 0 64 64" style={{ opacity: p }}>
      <circle cx={32} cy={32} r={27} stroke={GREEN} strokeWidth={5} fill="none" />
      <line x1={32} y1={32} x2={32} y2={14} stroke={GREEN} strokeWidth={5} strokeLinecap="round" transform={`rotate(${frame * 6} 32 32)`} />
      <line x1={32} y1={32} x2={44} y2={32} stroke={GREEN} strokeWidth={5} strokeLinecap="round" />
    </svg>
  ) : (
    <svg width={110} height={64} viewBox="0 0 110 64" style={{ opacity: p }}>
      {[0, 56].map((x) => (
        <g key={x} transform={`translate(${x} 6)`}>
          <rect x={2} y={2} width={48} height={52} rx={8} stroke={GREEN} strokeWidth={4} fill="none" />
          <line x1={2} y1={18} x2={50} y2={18} stroke={GREEN} strokeWidth={4} />
        </g>
      ))}
    </svg>
  );

// Rótulo de la respuesta: la idea clave en verde, en la zona alta (no tapa manos).
const KeyChips: React.FC = () => {
  const { t, pop, ramp, frame } = useClock();
  const q = QUESTIONS.find((x) => t >= x.a && t < x.to);
  if (!q) return null;
  const out = ramp(q.to - 0.3, q.to);
  return (
    <AbsoluteFill style={{ alignItems: "center", top: 270 }}>
      {q.key.map((k, i) => {
        if (t < k.at - 0.05) return null;
        const s = pop(k.at, 11, 230);
        return (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 18, marginBottom: 16, opacity: Math.min(1, s * 2) * (1 - out), transform: `translateY(${(1 - s) * 30}px) scale(${0.85 + 0.15 * s}) rotate(${i ? 1.2 : -1.2}deg)` }}>
            {i === 0 && q.icon ? <Icon kind={q.icon} p={s} frame={frame} /> : null}
            <div style={{ fontFamily: FONT, fontWeight: 900, fontStyle: "italic", textTransform: "uppercase", fontSize: 52, color: i === 0 ? INK : "white", background: i === 0 ? GREEN : "rgba(8,10,16,0.82)", border: i === 0 ? "none" : `3px solid ${GREEN}`, borderRadius: 14, padding: "12px 24px 6px", boxShadow: i === 0 ? "0 0 40px rgba(4,228,0,0.45)" : undefined, whiteSpace: "nowrap" }}>
              {k.text}
            </div>
          </div>
        );
      })}
    </AbsoluteFill>
  );
};

// CTA único al final: «SÍGUEME · @heracles_fit».
const Cta: React.FC = () => {
  const { t, pop } = useClock();
  if (t < CLOSE.cta - 0.05) return null;
  const s = pop(CLOSE.cta, 10, 200);
  return (
    <AbsoluteFill style={{ alignItems: "center", top: 290 }}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10, transform: `scale(${0.6 + 0.4 * s})`, opacity: Math.min(1, s * 2) }}>
        <div style={{ fontFamily: FONT, fontWeight: 900, fontStyle: "italic", fontSize: 92, color: INK, background: GREEN, borderRadius: 18, padding: "14px 34px 4px", boxShadow: "0 0 60px rgba(4,228,0,0.55)" }}>SÍGUEME</div>
        <div style={{ ...label, fontSize: 40, letterSpacing: 2, color: "white", textShadow: "0 4px 18px rgba(0,0,0,0.8)" }}>@heracles_fit</div>
      </div>
    </AbsoluteFill>
  );
};

export const Graphics: React.FC = () => (
  <AbsoluteFill>
    <Header />
    <Counter />
    {QUESTIONS.map((q) => (
      <QuestionCard key={q.n} from={q.q} to={q.a} text={q.text} />
    ))}
    <QuestionCard from={CLOSE.q} to={CLOSE.a} text={CLOSE.text} final />
    <KeyChips />
    <Cta />
  </AbsoluteFill>
);
