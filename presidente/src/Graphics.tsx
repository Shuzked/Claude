import React from "react";
import { AbsoluteFill, Easing, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { FONT, GREEN, INK } from "./theme";
import { CLOSE, f, QUESTIONS, toSrc } from "./timeline";

// Rótulos con animación de estilo Lottie: muelles con squash & stretch, trazos que se
// dibujan, ráfagas de partículas y vida en reposo. Todo sincronizado con la voz.

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const easeOut = Easing.bezier(0.16, 1, 0.3, 1);
const RED = "#FF4D4D";

const useClock = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = toSrc(frame / fps);
  const ramp = (a: number, b: number, ease = easeOut) =>
    interpolate(frame, [f(a), Math.max(f(a) + 1, f(b))], [0, 1], { ...clamp, easing: ease });
  /** Muelle con squash & stretch: se estira al moverse rápido y se aplasta al frenar. */
  const squash = (at: number, damping = 11, stiffness = 210) => {
    const cfg = { damping, stiffness, mass: 0.6 };
    const p = spring({ frame: frame - f(at), fps, config: cfg });
    const p0 = spring({ frame: frame - f(at) - 1, fps, config: cfg });
    const v = Math.max(-0.35, Math.min(0.35, (p - p0) * 2.4));
    return { p, sx: 1 - v * 0.45, sy: 1 + v * 0.55 };
  };
  /** Vida en reposo: flotación y balanceo suaves. */
  const idle = (seed: number, amp = 1) => {
    const s = frame / fps;
    return { y: Math.sin(s * 1.7 + seed) * 4 * amp, r: Math.sin(s * 1.3 + seed * 2) * 0.6 * amp };
  };
  return { t, frame, fps, ramp, squash, idle };
};

const label: React.CSSProperties = { fontFamily: FONT, fontWeight: 800, textTransform: "uppercase", letterSpacing: 4, whiteSpace: "nowrap" };

/** Ráfaga Lottie: rayos que salen del centro y se desvanecen. */
const Burst: React.FC<{ d: number; r?: number; n?: number; color?: string; x?: number; y?: number }> = ({ d, r = 90, n = 10, color = GREEN, x = 0, y = 0 }) => {
  if (d < 0 || d > 0.6) return null;
  const p = easeOut(Math.min(1, d / 0.45));
  return (
    <svg width={r * 3} height={r * 3} viewBox={`${-r * 1.5} ${-r * 1.5} ${r * 3} ${r * 3}`} style={{ position: "absolute", left: x - r * 1.5, top: y - r * 1.5, overflow: "visible", pointerEvents: "none" }}>
      {Array.from({ length: n }).map((_, i) => {
        const a = (i / n) * Math.PI * 2 + 0.3;
        const r0 = r * (0.35 + 0.65 * p), r1 = r * (0.55 + 0.75 * p);
        return <line key={i} x1={Math.cos(a) * r0} y1={Math.sin(a) * r0} x2={Math.cos(a) * r1} y2={Math.sin(a) * r1} stroke={color} strokeWidth={6 * (1 - p) + 1} strokeLinecap="round" opacity={1 - p} />;
      })}
      <circle r={r * 0.9 * p} fill="none" stroke={color} strokeWidth={3 * (1 - p)} opacity={0.7 * (1 - p)} />
    </svg>
  );
};

/** Destellos (estrellitas) alrededor de un rótulo. */
const Sparkles: React.FC<{ d: number; w: number; h: number }> = ({ d, w, h }) => {
  if (d < 0.05 || d > 1.1) return null;
  const pts = [[-0.04, 0.1, 1], [1.03, 0.2, 0.8], [0.9, -0.25, 0.7], [0.08, 1.15, 0.6]];
  return (
    <>
      {pts.map(([px, py, s], i) => {
        const k = Math.max(0, Math.min(1, (d - 0.05 - i * 0.08) / 0.5));
        const sc = Math.sin(k * Math.PI) * (s as number);
        return (
          <svg key={i} width={30} height={30} viewBox="-15 -15 30 30" style={{ position: "absolute", left: (px as number) * w - 15, top: (py as number) * h - 15, transform: `scale(${sc}) rotate(${k * 90}deg)`, overflow: "visible" }}>
            <path d="M0 -14 L3 -3 L14 0 L3 3 L0 14 L-3 3 L-14 0 L-3 -3 Z" fill="white" />
          </svg>
        );
      })}
    </>
  );
};

// --- Contador: chip n/8 con número que rueda, tema que se destapa y pips de progreso ---
const Counter: React.FC = () => {
  const { t, frame, ramp, squash, idle } = useClock();
  const qi = QUESTIONS.findIndex((x) => t >= x.q - 0.15 && t < x.to);
  if (qi < 0) return null;
  const q = QUESTIONS[qi];
  const s = squash(q.q - 0.15, 10, 240);
  const out = ramp(q.to - 0.3, q.to);
  const wipe = ramp(q.q - 0.05, q.q + 0.45);
  const roll = ramp(q.q - 0.1, q.q + 0.3);
  const prevN = qi > 0 ? QUESTIONS[qi - 1].n : 0;
  const id = idle(qi, 0.6);
  return (
    <AbsoluteFill style={{ alignItems: "center", top: 120 }}>
      <div style={{ position: "relative", display: "flex", flexDirection: "column", alignItems: "center", gap: 14, opacity: Math.min(1, s.p * 2) * (1 - out), transform: `translateY(${(1 - s.p) * -60 + id.y - out * 30}px) scale(${s.sx}, ${s.sy})` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{ position: "relative", background: GREEN, borderRadius: 14, padding: "8px 16px 4px", boxShadow: "0 0 30px rgba(4,228,0,0.5)", overflow: "hidden", display: "flex", ...label, fontSize: 40, letterSpacing: 0, fontStyle: "italic", fontWeight: 900, color: INK }}>
            <div style={{ position: "relative", height: 46, width: 30, overflow: "hidden" }}>
              <div style={{ position: "absolute", left: 0, top: -roll * 46 }}>{prevN || ""}</div>
              <div style={{ position: "absolute", left: 0, top: 46 - roll * 46 }}>{q.n}</div>
            </div>
            <span>/8</span>
          </div>
          <div style={{ ...label, fontSize: 30, letterSpacing: 2, color: "white", clipPath: `inset(0 ${(1 - wipe) * 100}% 0 0)`, textShadow: "0 3px 14px rgba(0,0,0,0.7)" }}>{q.topic}</div>
          <Burst d={(frame - f(q.q - 0.15)) / 25} r={70} n={9} x={30} y={26} />
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          {[1, 2, 3, 4, 5, 6, 7, 8].map((k) => {
            const cur = k === q.n, done = k < q.n;
            const pulse = cur ? 1 + 0.25 * Math.max(0, Math.sin((frame / 25) * 6)) : 1;
            return <div key={k} style={{ width: cur ? 28 : 12, height: 12, borderRadius: 6, background: cur ? GREEN : done ? "rgba(4,228,0,0.55)" : "rgba(255,255,255,0.25)", transform: `scale(${pulse})`, transition: "none" }} />;
          })}
        </div>
      </div>
    </AbsoluteFill>
  );
};

// --- Tarjeta de la pregunta: sólo el texto, palabra a palabra al ritmo de la voz ---
const QuestionCard: React.FC<{ q: number; file: number; dur: number; a: number; text: string; env: number[]; final?: boolean }> = ({ q, file, dur, a, text, env, final }) => {
  const { t, frame, fps, ramp, squash } = useClock();
  if (t < q - 0.35 || t > a + 0.15) return null;
  const s = squash(q - 0.35, 12, 230);
  const out = ramp(a - 0.05, a + 0.15, Easing.in(Easing.cubic));
  const accent = final ? RED : GREEN;
  // palabras al ritmo de la voz (proporcional a las letras de cada palabra)
  const words = text.split(" ");
  const tot = words.reduce((x, w) => x + w.length + 1, 0);
  let acc = 0;
  const times = words.map((w) => {
    const st = q + (acc / tot) * dur * 0.96;
    acc += w.length + 1;
    return st;
  });
  // temblor de enfado en la pregunta final
  const shake = final && t > q && t < q + 1.2 ? Math.sin(frame * 2.3) * 3 * (1 - (t - q) / 1.2) : 0;
  return (
    <AbsoluteFill style={{ alignItems: "center", top: 1370 }}>
      <div style={{ width: 920, transformOrigin: "8% 0%", opacity: Math.min(1, s.p * 2.5) * (1 - out), transform: `translate(${shake}px, ${(1 - s.p) * 70 + out * 40}px) scale(${(0.6 + 0.4 * s.p) * s.sx * (1 - out * 0.15)}, ${(0.6 + 0.4 * s.p) * s.sy * (1 - out * 0.15)})` }}>
        <div style={{ position: "relative", background: final ? "rgba(70,8,8,0.86)" : "rgba(8,10,16,0.84)", border: `2px solid ${final ? "rgba(255,90,90,0.55)" : "rgba(255,255,255,0.14)"}`, borderRadius: 24, padding: "24px 30px 22px", boxShadow: "0 24px 60px rgba(0,0,0,0.55)", overflow: "hidden" }}>
          <div style={{ display: "flex", flexWrap: "wrap", columnGap: 12, rowGap: 2, fontFamily: FONT, fontWeight: 800, fontSize: 48, lineHeight: 1.16, color: "white", letterSpacing: -0.5 }}>
            {words.map((w, k) => {
              const st = times[k];
              const p = spring({ frame: frame - f(st), fps, config: { damping: 14, stiffness: 300, mass: 0.5 } });
              const speaking = t >= st && t < (times[k + 1] ?? q + dur);
              return (
                <span key={k} style={{ display: "inline-block", opacity: t < st - 0.02 ? 0.18 : 0.18 + 0.82 * Math.min(1, p * 1.4), transform: `translateY(${(1 - p) * 14}px)`, color: speaking ? accent : "white" }}>{w}</span>
              );
            })}
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};

// --- Iconos de apoyo animados ---
const Icon: React.FC<{ kind: "clock" | "calendar"; p: number; d: number }> = ({ kind, p, d }) =>
  kind === "clock" ? (
    <svg width={70} height={70} viewBox="0 0 64 64" style={{ transform: `scale(${p}) rotate(${(1 - p) * -90}deg)` }}>
      <circle cx={32} cy={32} r={27} stroke={GREEN} strokeWidth={5} fill="rgba(8,10,16,0.8)" pathLength={1} strokeDasharray={`${Math.min(1, d * 2)} 1`} />
      <line x1={32} y1={32} x2={32} y2={14} stroke={GREEN} strokeWidth={5} strokeLinecap="round" transform={`rotate(${d * 540} 32 32)`} />
      <line x1={32} y1={32} x2={44} y2={32} stroke={GREEN} strokeWidth={5} strokeLinecap="round" transform={`rotate(${d * 45} 32 32)`} />
    </svg>
  ) : (
    <svg width={118} height={70} viewBox="0 0 110 64" style={{ transform: `scale(${p})` }}>
      {[0, 56].map((x, i) => {
        const k = Math.max(0, Math.min(1, d * 3 - i * 0.6));
        return (
          <g key={x} transform={`translate(${x} 6)`} style={{ transformOrigin: `${x + 26}px 6px` }}>
            <rect x={2} y={2} width={48} height={52} rx={8} stroke={GREEN} strokeWidth={4} fill="rgba(8,10,16,0.8)" />
            <line x1={2} y1={18} x2={50} y2={18} stroke={GREEN} strokeWidth={4} />
            <text x={26} y={46} textAnchor="middle" fontFamily={FONT} fontWeight={900} fontSize={22} fill="white" opacity={k}>{i ? "M" : "L"}</text>
          </g>
        );
      })}
    </svg>
  );

// --- Rótulos de la respuesta: contorno que se dibuja, relleno en barrido, ráfaga y destellos ---
const KeyChips: React.FC = () => {
  const { t, frame, fps, ramp, squash, idle } = useClock();
  const q = QUESTIONS.find((x) => t >= x.a && t < x.to);
  if (!q) return null;
  const out = ramp(q.to - 0.3, q.to);
  return (
    <AbsoluteFill style={{ alignItems: "center", top: 262 }}>
      {q.key.map((k, i) => {
        if (t < k.at - 0.1) return null;
        const s = squash(k.at - 0.05, 10, 230);
        const d = (frame - f(k.at)) / fps;
        const draw = Math.max(0, Math.min(1, d / 0.3));
        const fill = ramp(k.at + 0.12, k.at + 0.42);
        const id = idle(i + 3, 0.5);
        const fs = Math.min(50, 820 / (k.text.length * 0.66));
        const w = Math.min(940, 64 + k.text.length * fs * 0.66);
        return (
          <div key={i} style={{ position: "relative", display: "flex", alignItems: "center", gap: 18, marginBottom: 18, opacity: Math.min(1, s.p * 2) * (1 - out), transform: `translateY(${(1 - s.p) * 40 + id.y - out * 20}px) scale(${s.sx}, ${s.sy}) rotate(${(i ? 1.4 : -1.4) + id.r}deg)` }}>
            {i === 0 && q.icon ? <Icon kind={q.icon} p={s.p} d={d} /> : null}
            <div style={{ position: "relative" }}>
              <svg width={w} height={76} style={{ position: "absolute", left: 0, top: 0, overflow: "visible" }}>
                <rect x={2} y={2} width={w - 4} height={72} rx={16} fill="none" stroke={GREEN} strokeWidth={4} pathLength={1} strokeDasharray={`${draw} 1`} />
              </svg>
              <div style={{ width: w, height: 76, borderRadius: 16, background: i === 0 ? GREEN : "rgba(8,10,16,0.86)", clipPath: `inset(0 ${(1 - fill) * 100}% 0 0 round 16px)`, boxShadow: i === 0 ? "0 0 44px rgba(4,228,0,0.5)" : undefined }} />
              <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: FONT, fontWeight: 900, fontStyle: "italic", textTransform: "uppercase", fontSize: fs, letterSpacing: -0.5, color: i === 0 ? (fill > 0.55 ? INK : "white") : "white", paddingTop: 6, whiteSpace: "nowrap", textShadow: i === 0 && fill > 0.55 ? "none" : "0 3px 12px rgba(0,0,0,0.6)" }}>
                {k.text}
              </div>
              <Sparkles d={d} w={w} h={76} />
              <Burst d={d - 0.05} r={80} n={10} x={w - 10} y={10} color={i === 0 ? GREEN : "white"} />
            </div>
          </div>
        );
      })}
    </AbsoluteFill>
  );
};

// --- CTA: aparece con rebote, anillos y el usuario se escribe ---
const Cta: React.FC = () => {
  const { t, frame, fps, squash, ramp, idle } = useClock();
  if (t < CLOSE.cta - 0.1) return null;
  const s = squash(CLOSE.cta - 0.05, 9, 200);
  const d = (frame - f(CLOSE.cta)) / fps;
  const handle = "@heracles_fit";
  const typed = Math.round(ramp(CLOSE.cta + 0.25, CLOSE.cta + 0.95, Easing.linear) * handle.length);
  const id = idle(9, 0.8);
  return (
    <AbsoluteFill style={{ alignItems: "center", top: 260 }}>
      <div style={{ position: "relative", display: "flex", flexDirection: "column", alignItems: "center", gap: 12, transform: `translateY(${id.y}px) scale(${(0.5 + 0.5 * s.p) * s.sx}, ${(0.5 + 0.5 * s.p) * s.sy})`, opacity: Math.min(1, s.p * 2) }}>
        <div style={{ position: "relative", fontFamily: FONT, fontWeight: 900, fontStyle: "italic", fontSize: 96, color: INK, background: GREEN, borderRadius: 20, padding: "14px 36px 4px", boxShadow: "0 0 70px rgba(4,228,0,0.6)" }}>
          SÍGUEME
          <Burst d={d} r={160} n={14} x={190} y={60} />
          <Sparkles d={d} w={380} h={120} />
        </div>
        <div style={{ ...label, fontSize: 42, letterSpacing: 2, color: "white", textShadow: "0 4px 18px rgba(0,0,0,0.85)", minHeight: 50 }}>
          {handle.slice(0, typed)}
          <span style={{ opacity: Math.floor(frame / 8) % 2 ? 1 : 0, color: GREEN }}>|</span>
        </div>
      </div>
    </AbsoluteFill>
  );
};

export const Graphics: React.FC = () => (
  <AbsoluteFill>
    <Counter />
    {QUESTIONS.map((q) => (
      <QuestionCard key={q.n} q={q.q} file={q.file} dur={q.dur} a={q.a} text={q.text} env={q.env} />
    ))}
    <QuestionCard q={CLOSE.q} file={CLOSE.file} dur={CLOSE.dur} a={CLOSE.a} text={CLOSE.text} env={CLOSE.env} final />
    <KeyChips />
    <Cta />
  </AbsoluteFill>
);
