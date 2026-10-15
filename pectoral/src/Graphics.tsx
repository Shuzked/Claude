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
import { gradeFilter } from "./Grade";
import { FONT, GREEN, PAPER } from "./theme";
import { CTA, DECIDE, ELBOW, f, HOOK, INTEREST, KG, SIMILAR, SPLIT, STUDY, STUDY_BG, toSrc } from "./timeline";

// Rótulos de «Press vs. aperturas con mancuernas». Los gráficos pegados al cuerpo
// están en Body.tsx. Todas las capas leen el tiempo del ORIGINAL (toSrc).

const INK = "#0A0A0A";
const RED = "#FF3B30";
const NEON = "drop-shadow(0 0 8px rgba(4,228,0,0.9)) drop-shadow(0 0 22px rgba(4,228,0,0.45))";
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

/** Salida estilo Lottie: se infla un poco (anticipación) y se encoge hasta desaparecer. */
const popOut = (o: number) => (o < 0.3 ? 1 + 0.08 * (o / 0.3) : 1.08 * (1 - (o - 0.3) / 0.7));

/** Estallido de rayitas alrededor de un punto de la pantalla (d = segundos desde el golpe). */
const Burst: React.FC<{ x: number; y: number; d: number; r?: number; color?: string; n?: number }> = ({ x, y, d, r = 60, color = GREEN, n = 10 }) => {
  if (d < 0 || d > 0.5) return null;
  const k = d / 0.5;
  const e = 1 - Math.pow(1 - k, 3);
  return (
    <svg width={4 * r} height={4 * r} viewBox={`${-2 * r} ${-2 * r} ${4 * r} ${4 * r}`} style={{ position: "absolute", left: x - 2 * r, top: y - 2 * r, overflow: "visible", opacity: 1 - k, filter: `drop-shadow(0 0 8px ${color})`, pointerEvents: "none" }}>
      {Array.from({ length: n }, (_, i) => {
        const a = (i / n) * Math.PI * 2 + 0.2;
        const r0 = r * (0.6 + 0.6 * e);
        const r1 = r * (0.75 + 1.0 * e);
        return <line key={i} x1={Math.cos(a) * r0} y1={Math.sin(a) * r0} x2={Math.cos(a) * r1} y2={Math.sin(a) * r1} stroke={color} strokeWidth={6 * (1 - k) + 1.5} strokeLinecap="round" />;
      })}
    </svg>
  );
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


/** Pastilla de texto genérica con entrada en muelle y salida pop-out. */
const Pill: React.FC<{ from: number; to: number; top: number; children: React.ReactNode; green?: boolean; size?: number; rot?: number }> = ({
  from,
  to,
  top,
  children,
  green,
  size = 52,
  rot = -2,
}) => {
  const { t, squash, ramp, idle } = useClock();
  if (t < from - 0.05 || t > to + 0.05) return null;
  const q = squash(from, 9, 230);
  const out = ramp(to - 0.3, to, easeInOut);
  const id = idle(from, 0.7);
  return (
    <AbsoluteFill>
      <Burst x={540} y={top + 40} d={t - from - 0.08} r={110} n={12} />
      <div style={{ position: "absolute", top, left: 0, right: 0, display: "flex", justifyContent: "center", opacity: out > 0.85 ? (1 - out) / 0.15 : 1 }}>
        <div
          style={{
            position: "relative",
            overflow: "hidden",
            ...display,
            fontSize: size,
            color: INK,
            background: green ? GREEN : PAPER,
            padding: "12px 26px 8px",
            borderRadius: 12,
            filter: green ? GLOW : undefined,
            boxShadow: green ? undefined : "0 18px 40px rgba(0,0,0,0.45)",
            transformOrigin: "50% 50%",
            transform: `translateY(${(1 - q.p) * 40 + id.y}px) scale(${q.p * q.sx * popOut(out)}, ${q.p * q.sy * popOut(out)}) rotate(${rot + id.r * 0.6}deg)`,
            clipPath: `inset(-20px ${Math.max(0, 1 - q.p * 1.15) * 50}% -20px ${Math.max(0, 1 - q.p * 1.15) * 50}% round 12px)`,
          }}
        >
          {typeof children === "string" ? <Words text={children} at={from + 0.12} gap={0.05} style={{ marginRight: "-0.22em" }} /> : children}
          {/* brillo que barre la pastilla tras entrar */}
          <div style={{ position: "absolute", top: -20, bottom: -20, width: 50, left: `${-20 + 140 * Math.min(1, Math.max(0, (t - from - 0.35) / 0.45))}%`, background: "rgba(255,255,255,0.5)", transform: "skewX(-20deg)", opacity: t - from > 0.35 && t - from < 0.8 ? 1 : 0 }} />
        </div>
      </div>
    </AbsoluteFill>
  );
};

// Hook exagerado: «PRESS vs APERTURAS» y, en «200 kilos», un disco enorme que cae a
// plomo (la cámara tiembla, viñeta roja y medidor de esfuerzo al máximo); en «con
// diez», un disquito de 10 kg que baja flotando como una pluma y el medidor se vacía.
const Plate: React.FC<{ kg: string; size: number; color: string; text: string; rim?: string }> = ({ kg, size, color, text, rim = "rgba(255,255,255,0.18)" }) => (
  <svg width={size} height={size} viewBox="-100 -100 200 200" style={{ overflow: "visible", display: "block" }}>
    <circle r={98} fill={color} stroke={rim} strokeWidth={4} />
    <circle r={80} fill="none" stroke={rim} strokeWidth={2.5} />
    <circle r={58} fill="none" stroke="rgba(0,0,0,0.35)" strokeWidth={10} />
    <circle r={16} fill="#050505" stroke={rim} strokeWidth={3} />
    {/* brillo especular */}
    <path d="M -70 -55 A 90 90 0 0 1 20 -92" fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth={6} strokeLinecap="round" />
    <text x={0} y={-24} textAnchor="middle" fill={text} fontFamily={FONT} fontWeight={900} fontStyle="italic" fontSize={kg.length > 2 ? 44 : 50}>
      {kg}
    </text>
    <text x={0} y={52} textAnchor="middle" fill={text} fontFamily={FONT} fontWeight={800} fontSize={22} letterSpacing={4}>
      KG
    </text>
  </svg>
);

const Meter: React.FC<{ level: number; heavy: number; frame: number; inP: number; outP: number }> = ({ level, heavy, frame, inP, outP }) => {
  const H = 520;
  const jitter = heavy * (Math.sin(frame * 3.1) * 0.03 + Math.sin(frame * 7.3) * 0.02);
  const lv = Math.max(0, Math.min(1, level + jitter));
  const col = heavy > 0.5 ? RED : GREEN;
  return (
    <div style={{ position: "absolute", right: 46, top: 560, width: 70, height: H + 90, opacity: inP * (1 - outP), transform: `translateX(${(1 - inP) * 160}px) scale(${popOut(outP)})` }}>
      <div style={{ ...label, fontSize: 18, letterSpacing: 3, color: PAPER, textAlign: "center", marginLeft: -30, width: 130, marginBottom: 10 }}>Esfuerzo</div>
      <div style={{ position: "relative", width: 52, height: H, margin: "0 auto", borderRadius: 26, background: "rgba(10,10,10,0.75)", border: "3px solid rgba(255,255,255,0.7)", overflow: "hidden", boxShadow: "0 18px 40px rgba(0,0,0,0.5)" }}>
        <div style={{ position: "absolute", left: 4, right: 4, bottom: 4, height: (H - 8) * lv, borderRadius: 22, background: heavy > 0.5 ? `linear-gradient(0deg, #FFB020, ${RED})` : GREEN, filter: `drop-shadow(0 0 12px ${col})` }} />
        {[0.25, 0.5, 0.75].map((k) => (
          <div key={k} style={{ position: "absolute", left: 0, right: 0, bottom: H * k, height: 2, background: "rgba(255,255,255,0.25)" }} />
        ))}
      </div>
      <div style={{ ...display, fontSize: 30, textAlign: "center", marginTop: 10, marginLeft: -40, width: 150, color: col, opacity: heavy > 0.5 ? 0.6 + 0.4 * Math.abs(Math.sin(frame * 0.5)) : 1, ...stroke(5) }}>{heavy > 0.5 ? "Máx" : "Fácil"}</div>
    </div>
  );
};

const Hook: React.FC = () => {
  const { t, frame, fps, squash, ramp, idle } = useClock();
  if (t < HOOK.from - 0.05 || t > HOOK.to + 0.05) return null;
  const a = squash(HOOK.from, 9, 240);
  const vs = squash(HOOK.from + 0.25, 6, 320);
  const b = squash(HOOK.from + 0.45, 9, 240);
  const titleOut = ramp(HOOK.press - 0.2, HOOK.press + 0.1, easeInOut);
  const id = idle(0.4, 0.8);
  const heavy = t < HOOK.light ? ramp(HOOK.press, HOOK.heavy) : 0;
  const light = t >= HOOK.light;
  // caída del disco de 200: aceleración de gravedad y aterrizaje justo en «200»
  const fallU = interpolate(t, [HOOK.heavy - 0.32, HOOK.heavy], [0, 1], { ...clamp, easing: Easing.in(Easing.quad) });
  const sinceHit = t - HOOK.heavy;
  const land = sinceHit > 0 ? Math.exp(-sinceHit * 9) : 0;
  const plateY = -620 + (560 + 620) * fallU;
  const plateSq = sinceHit > 0 ? { sx: 1 + 0.32 * land * Math.cos(sinceHit * 40), sy: 1 - 0.3 * land * Math.cos(sinceHit * 40) } : { sx: 0.92, sy: 1.12 };
  const tremble = sinceHit > 0 ? Math.sin(frame * 4.1) * 3 + Math.sin(frame * 7.7) * 2 : 0;
  const heavyOut = ramp(HOOK.light - 0.18, HOOK.light, easeInOut);
  // 10 kg: baja balanceándose como una pluma y se posa en «diez»
  const fU = interpolate(t, [HOOK.light, HOOK.ten], [0, 1], { ...clamp, easing: Easing.out(Easing.quad) });
  const featherX = Math.sin(fU * Math.PI * 3) * 140 * (1 - fU);
  const featherR = Math.sin(fU * Math.PI * 3 + 0.6) * 28 * (1 - fU) + Math.sin(t * 3) * 4;
  const featherY = -260 + (330 + 260) * fU + Math.sin(t * 4) * 8;
  const ten = squash(HOOK.ten, 8, 260);
  const end = ramp(HOOK.to - 0.25, HOOK.to + 0.05, easeInOut);
  const level = light ? interpolate(t, [HOOK.light, HOOK.light + 0.5], [1, 0.12], { ...clamp, easing: easeOut }) : heavy;
  const meterIn = ramp(HOOK.press, HOOK.press + 0.3);
  return (
    <AbsoluteFill>
      {/* viñeta roja que late con el esfuerzo */}
      {!light ? <AbsoluteFill style={{ background: "radial-gradient(ellipse 75% 60% at 50% 50%, transparent 45%, rgba(255,30,20,0.55) 100%)", opacity: heavy * (0.65 + 0.35 * Math.abs(Math.sin(frame * 0.45))) * (1 - heavyOut) }} /> : null}
      {sinceHit > 0 && sinceHit < 0.12 && !light ? <AbsoluteFill style={{ background: "white", opacity: 0.35 * (1 - sinceHit / 0.12) }} /> : null}
      {/* título */}
      {titleOut < 1 ? (
        <div style={{ position: "absolute", top: 260, left: 0, right: 0, display: "flex", flexDirection: "column", alignItems: "center", transform: `translateY(${id.y}px) rotate(${-3 + id.r}deg) scale(${popOut(titleOut)})`, opacity: titleOut > 0.85 ? (1 - titleOut) / 0.15 : 1 }}>
          <div style={{ ...display, ...stroke(10), fontSize: 120, transform: `translateX(${(1 - a.p) * -400}px) scale(${a.sx}, ${a.sy})`, opacity: Math.min(1, a.p * 3) }}>Press</div>
          <div style={{ position: "relative", ...display, fontStyle: "normal", fontSize: 64, color: INK, background: GREEN, borderRadius: 999, width: 104, height: 104, display: "flex", alignItems: "center", justifyContent: "center", margin: "6px 0", filter: GLOW, transform: `scale(${vs.p * vs.sx}, ${vs.p * vs.sy}) rotate(${(1 - vs.p) * 180}deg)` }}>
            vs
            <Burst x={52} y={52} d={t - HOOK.from - 0.3} r={70} n={12} />
          </div>
          <div style={{ ...display, ...stroke(10), fontSize: 120, color: GREEN, transform: `translateX(${(1 - b.p) * 400}px) scale(${b.sx}, ${b.sy})`, opacity: Math.min(1, b.p * 3) }}>Aperturas</div>
        </div>
      ) : null}
      {/* 200 kg */}
      {!light && t > HOOK.heavy - 0.34 ? (
        <div style={{ position: "absolute", left: 0, right: 0, top: plateY - 170, display: "flex", flexDirection: "column", alignItems: "center", opacity: 1 - heavyOut, transform: `scale(${popOut(heavyOut)})` }}>
          <div style={{ transform: `translateX(${tremble}px) rotate(${-8 + tremble * 0.6}deg) scale(${plateSq.sx}, ${plateSq.sy})`, transformOrigin: "50% 100%", filter: "drop-shadow(0 30px 40px rgba(0,0,0,0.75))" }}>
            <Plate kg="200" size={340} color="#161616" text={PAPER} />
          </div>
          {/* polvo / grietas del aterrizaje */}
          <Burst x={540} y={340} d={sinceHit} r={210} n={16} color={RED} />
          <div style={{ ...display, ...stroke(9), fontSize: 92, color: RED, marginTop: 14, transform: `translateX(${tremble * 1.5}px) scale(${1 + land * 0.25})`, opacity: sinceHit > 0 ? 1 : 0, filter: "drop-shadow(0 0 16px rgba(255,59,48,0.7))" }}>¡200 kilos!</div>
        </div>
      ) : null}
      {/* 10 kg */}
      {light ? (
        <div style={{ position: "absolute", left: 0, right: 0, top: featherY - 110, display: "flex", flexDirection: "column", alignItems: "center", opacity: 1 - end, transform: `scale(${popOut(end)})` }}>
          <div style={{ transform: `translateX(${featherX}px) rotate(${featherR}deg) scale(${1 + 0.12 * ten.p * (ten.sx - 1) * 4})`, filter: `drop-shadow(0 0 22px rgba(4,228,0,0.55))` }}>
            <Plate kg="10" size={190} color={GREEN} text={INK} rim="rgba(0,0,0,0.25)" />
          </div>
          <div style={{ ...display, ...stroke(8), fontSize: 76, color: GREEN, marginTop: 12, opacity: Math.min(1, ten.p * 2), transform: `translateY(${(1 - ten.p) * 30}px) scale(${ten.sx}, ${ten.sy})` }}>Solo 10 kg</div>
          <Burst x={540} y={110} d={t - HOOK.ten} r={130} n={12} />
        </div>
      ) : null}
      {t >= HOOK.press ? <Meter level={level} heavy={light ? 0 : 1} frame={frame} inP={meterIn} outP={end} /> : null}
      <div style={{ display: "none" }}>{fps}</div>
    </AbsoluteFill>
  );
};

// Press y aperturas SIN pantalla dividida: el metraje va en su orden (press → aperturas)
// con su rótulo y el icono del codo; en «palanca» se congela primero el press y luego
// la apertura y se dibuja la gravedad y el brazo de palanca sobre el propio fotograma.
type Pt = { x: number; y: number };
const LEVER: Record<"press" | "fly", { img: string; at: number; to: number; sides: { sh: Pt; db: Pt }[]; label: string; grade: number }> = {
  press: {
    img: "freeze/press.jpg",
    at: SPLIT.lever,
    to: SPLIT.leverFly,
    grade: 24.8,
    label: "Palanca corta",
    sides: [
      { sh: { x: 300, y: 1112 }, db: { x: 281, y: 734 } },
      { sh: { x: 800, y: 1120 }, db: { x: 821, y: 778 } },
    ],
  },
  fly: {
    img: "freeze/fly.jpg",
    at: SPLIT.leverFly,
    to: SPLIT.to,
    grade: 27.2,
    label: "Palanca larga",
    sides: [
      { sh: { x: 322, y: 1120 }, db: { x: 92, y: 742 } },
      { sh: { x: 838, y: 1120 }, db: { x: 1038, y: 760 } },
    ],
  },
};

const Freeze: React.FC<{ kind: "press" | "fly" }> = ({ kind }) => {
  const { t, ramp, squash } = useClock();
  const L = LEVER[kind];
  if (t < L.at - 0.02 || t >= L.to + (kind === "press" ? 0.2 : 0)) return null;
  const inQ = squash(L.at, 14, 170);
  // la apertura entra con un barrido lateral que empuja al press
  const swipe = kind === "fly" ? ramp(L.at, L.at + 0.22, easeInOut) : 1;
  const leave = kind === "press" ? ramp(L.to, L.to + 0.2, easeInOut) : 0;
  const lv = ramp(L.at + 0.05, L.at + 0.35);
  const grav = ramp(L.at + 0.25, L.at + 0.6);
  const perp = ramp(L.at + 0.55, L.at + 0.95);
  const lab = squash(L.at + 0.85, 8, 260);
  const zoom = 1.1 - 0.08 * inQ.p + 0.03 * ramp(L.at, L.to, (u) => u);
  const blur = kind === "fly" ? 18 * (1 - swipe) * swipe * 4 : leave * 14;
  const dx = kind === "fly" ? (1 - swipe) * 1080 : -leave * 1080;
  const col = kind === "press" ? GREEN : "#FFB020";
  return (
    <AbsoluteFill style={{ transform: `translateX(${dx}px)`, filter: blur > 0.5 ? `blur(${blur}px)` : undefined }}>
      <AbsoluteFill style={{ transform: `scale(${zoom})`, transformOrigin: "50% 50%" }}>
        <AbsoluteFill style={{ filter: gradeFilter(L.grade) }}>
          <Img src={staticFile(L.img)} style={{ width: "100%", height: "100%" }} />
        </AbsoluteFill>
        <AbsoluteFill style={{ background: "radial-gradient(ellipse 80% 65% at 50% 55%, transparent 50%, rgba(0,0,0,0.55) 100%)" }} />
        <svg width={1080} height={1920} style={{ position: "absolute", inset: 0, overflow: "visible" }}>
          {L.sides.map((s, j) => {
            const gy = s.db.y + (s.sh.y + 90 - s.db.y) * grav;
            const px = s.sh.x + (s.db.x - s.sh.x) * perp;
            const sgn = Math.sign(s.db.x - s.sh.x) || 1;
            return (
              <g key={j}>
                {/* gravedad: de la mancuerna hacia el suelo */}
                <line x1={s.db.x} y1={s.db.y} x2={s.db.x} y2={gy} stroke={RED} strokeWidth={7} strokeLinecap="round" strokeDasharray="2 16" style={{ filter: "drop-shadow(0 0 6px rgba(255,59,48,0.9))" }} />
                {grav > 0.6 ? <path d={`M ${s.db.x - 15} ${gy - 26} L ${s.db.x} ${gy + 2} L ${s.db.x + 15} ${gy - 26} Z`} fill={RED} opacity={(grav - 0.6) / 0.4} /> : null}
                {/* brazo de palanca: del hombro, perpendicular a la gravedad */}
                <line x1={s.sh.x} y1={s.sh.y} x2={px} y2={s.sh.y} stroke={col} strokeWidth={11} strokeLinecap="round" style={{ filter: `drop-shadow(0 0 8px ${col}) drop-shadow(0 0 20px ${col})` }} />
                {perp > 0.02 && perp < 0.98 ? <circle cx={px} cy={s.sh.y} r={13} fill="#FFFFF0" style={{ filter: NEON }} /> : null}
                {perp > 0.95 && Math.abs(s.db.x - s.sh.x) > 60 ? <path d={`M ${s.db.x - sgn * 26} ${s.sh.y} L ${s.db.x - sgn * 26} ${s.sh.y - 26} L ${s.db.x} ${s.sh.y - 26}`} fill="none" stroke={PAPER} strokeWidth={4} opacity={(perp - 0.95) / 0.05} /> : null}
                <circle cx={s.sh.x} cy={s.sh.y} r={16 * lv} fill={PAPER} stroke={col} strokeWidth={6} />
                <circle cx={s.db.x} cy={s.db.y} r={14 * lv} fill={RED} stroke={PAPER} strokeWidth={3} />
              </g>
            );
          })}
        </svg>
      </AbsoluteFill>
      {kind === "press" || swipe > 0 ? <AbsoluteFill style={{ background: "white", opacity: kind === "press" ? Math.max(0, 0.6 - lv * 1.6) : 0 }} /> : null}
      {/* rótulo de cada palanca */}
      <div style={{ position: "absolute", left: 0, right: 0, top: 470, display: "flex", justifyContent: "center", opacity: Math.min(1, lab.p * 2) }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14, transform: `translateY(${(1 - lab.p) * 40}px) scale(${lab.sx}, ${lab.sy}) rotate(${kind === "press" ? -2 : 2}deg)` }}>
          <div style={{ ...display, fontSize: 44, color: INK, background: kind === "press" ? PAPER : GREEN, padding: "8px 18px 4px", borderRadius: 10 }}>{kind === "press" ? "Press" : "Aperturas"}</div>
          <div style={{ ...display, ...stroke(8), fontSize: 58, color: col }}>{L.label}</div>
        </div>
      </div>
    </AbsoluteFill>
  );
};

/** Rótulo del ejercicio que se está viendo en el metraje (con subrayado que se dibuja). */
const ExTag: React.FC<{ from: number; to: number; text: string; green?: boolean; icon: "bend" | "fixed"; iconAt: number }> = ({ from, to, text, green, icon, iconAt }) => {
  const { t, squash, ramp, idle } = useClock();
  if (t < from - 0.05 || t > to + 0.05) return null;
  const q = squash(from, 9, 230);
  const out = ramp(to - 0.25, to, easeInOut);
  const ul = ramp(from + 0.15, from + 0.5);
  const ic = squash(iconAt, 8, 240);
  const id = idle(from, 0.7);
  return (
    <AbsoluteFill style={{ opacity: out > 0.85 ? (1 - out) / 0.15 : 1 }}>
      <Burst x={540} y={350} d={t - from - 0.05} r={130} n={12} color={green ? GREEN : PAPER} />
      <div style={{ position: "absolute", top: 290, left: 0, right: 0, display: "flex", flexDirection: "column", alignItems: "center", transform: `translateY(${id.y}px) rotate(${-2 + id.r * 0.5}deg) scale(${popOut(out)})` }}>
        <div style={{ ...label, fontSize: 24, letterSpacing: 6, color: PAPER, opacity: ul, marginBottom: 6 }}>Así es el</div>
        <div style={{ position: "relative", transform: `scale(${q.p * q.sx}, ${q.p * q.sy})` }}>
          <Words text={text} at={from + 0.05} gap={0.06} style={{ ...display, ...stroke(10), fontSize: 110, color: green ? GREEN : PAPER, marginRight: "-0.22em" }} />
          <div style={{ position: "absolute", left: 0, bottom: -10, height: 10, width: `${ul * 100}%`, background: green ? GREEN : PAPER, borderRadius: 6, filter: green ? GLOW : undefined }} />
        </div>
      </div>
      {ic.p > 0.01 ? (
        <div style={{ position: "absolute", left: 0, right: 0, top: 1160, display: "flex", justifyContent: "center", opacity: Math.min(1, ic.p * 2) }}>
          <div style={{ transform: `translateY(${(1 - ic.p) * 60}px) scale(${ic.p * ic.sx * 1.3}, ${ic.p * ic.sy * 1.3})` }}>
            <ElbowIcon t={t} bend={icon === "bend"} />
          </div>
        </div>
      ) : null}
    </AbsoluteFill>
  );
};

const Split: React.FC = () => {
  const { t, pop } = useClock();
  if (t < SPLIT.from - 0.05 || t >= SPLIT.to + 0.1) return null;
  const head = pop(SPLIT.lever + 0.1, 9, 240);
  return (
    <AbsoluteFill>
      <ExTag from={SPLIT.from + 0.02} to={SPLIT.flyFrom - 0.05} text="Press" icon="bend" iconAt={SPLIT.elbow} />
      <ExTag from={SPLIT.flyFrom + 0.02} to={24.0} text="Aperturas" green icon="fixed" iconAt={SPLIT.fixed} />
      <Freeze kind="press" />
      <Freeze kind="fly" />
      {t >= SPLIT.lever ? (
        <div style={{ position: "absolute", left: 0, right: 0, top: 300, display: "flex", justifyContent: "center", opacity: Math.min(1, head * 2) }}>
          <div style={{ transform: `scale(${0.6 + 0.4 * head}) rotate(-2deg)` }}>
            <Words text="Misma aducción, otra palanca" at={SPLIT.lever + 0.1} gap={0.06} style={{ ...display, ...stroke(8), fontSize: 58 }} color={(i) => (i >= 2 ? GREEN : undefined)} />
          </div>
        </div>
      ) : null}
      {t >= SPLIT.lever ? (
        <div style={{ position: "absolute", left: 0, right: 0, top: 1240, display: "flex", justifyContent: "center", opacity: Math.min(1, head * 2) }}>
          <div style={{ display: "flex", gap: 22, ...label, fontSize: 22, letterSpacing: 2, color: PAPER, background: "rgba(10,10,10,0.7)", padding: "8px 16px", borderRadius: 10 }}>
            <span style={{ color: RED }}>┆ Gravedad</span>
            <span style={{ color: GREEN }}>━ Palanca sobre el hombro</span>
          </div>
        </div>
      ) : null}
    </AbsoluteFill>
  );
};

/** Mini brazo animado: codo que se dobla (press) o candado de codo fijo (aperturas). */
const ElbowIcon: React.FC<{ t: number; bend?: boolean }> = ({ t, bend }) => {
  const ang = bend ? 40 + 50 * (0.5 + 0.5 * Math.sin(t * 4.5)) : 8;
  const a = (ang * Math.PI) / 180;
  const ex = 50;
  const ey = 30;
  const hx = ex + Math.cos(-a) * 40;
  const hy = ey + Math.sin(-a) * 40;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, background: "rgba(10,10,10,0.85)", border: `2px solid ${GREEN}`, borderRadius: 12, padding: "6px 14px" }}>
      <svg width={100} height={50} viewBox="0 0 100 50" style={{ overflow: "visible" }}>
        <line x1={8} y1={30} x2={ex} y2={ey} stroke={PAPER} strokeWidth={8} strokeLinecap="round" />
        <line x1={ex} y1={ey} x2={hx} y2={hy} stroke={GREEN} strokeWidth={8} strokeLinecap="round" />
        <circle cx={ex} cy={ey} r={7} fill={bend ? GREEN : "#FFB020"} />
      </svg>
      <div style={{ ...display, fontSize: 26, color: bend ? GREEN : PAPER }}>{bend ? "Codo se mueve" : "Codo casi fijo"}</div>
    </div>
  );
};

// «mover más peso en el press no lo convierte… en mejor opción»: báscula que se inclina
// hacia el press… y una tachadura «≠ más pectoral»
const Kg: React.FC = () => {
  const { t, squash, ramp, idle } = useClock();
  if (t < KG.from - 0.05 || t > KG.to + 0.05) return null;
  const q = squash(KG.from, 9, 220);
  const neq = squash(KG.from + 1.9, 7, 300);
  const out = ramp(KG.to - 0.3, KG.to, easeInOut);
  const id = idle(2.2, 0.8);
  return (
    <AbsoluteFill>
      <div style={{ position: "absolute", top: 280, left: 0, right: 0, display: "flex", justifyContent: "center", opacity: out > 0.85 ? (1 - out) / 0.15 : 1, transform: `translateY(${id.y}px) scale(${popOut(out)})` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 18, transform: `scale(${q.p * q.sx}, ${q.p * q.sy}) rotate(${-2 + id.r}deg)` }}>
          <div style={{ ...display, fontSize: 72, color: INK, background: PAPER, padding: "10px 22px 4px", borderRadius: 12 }}>+ Kilos</div>
          <div style={{ position: "relative", ...display, fontStyle: "normal", fontSize: 90, color: RED, transform: `scale(${neq.p * neq.sx}, ${neq.p * neq.sy})`, filter: "drop-shadow(0 0 14px rgba(255,59,48,0.7))", ...stroke(6) }}>
            ≠
            <Burst x={30} y={50} d={t - KG.from - 1.9} r={60} color={RED} />
          </div>
          <div style={{ ...display, fontSize: 72, color: INK, background: GREEN, padding: "10px 22px 4px", borderRadius: 12, filter: GLOW, opacity: Math.min(1, neq.p * 2), transform: `translateX(${(1 - neq.p) * 60}px)` }}>+ Pectoral</div>
        </div>
      </div>
    </AbsoluteFill>
  );
};

// Fondo de escena de siempre (como en Parciales): cortinilla diagonal con filo verde,
// cuadrícula técnica que se desplaza, título gigante en contorno, grano y escaneo.
const Backdrop: React.FC<{ from: number; to: number; title: string; id: string }> = ({ from, to, title, id }) => {
  const { t, frame, ramp } = useClock();
  if (t < from - 0.3 || t > to + 0.05) return null;
  const inQ = ramp(from - 0.25, from + 0.12, easeInOut);
  const outQ = ramp(to - 0.4, to, easeInOut);
  const a = inQ * 130;
  const b = outQ * 130;
  const clip = `polygon(${b}% 0, ${a}% 0, ${a - 30}% 100%, ${b - 30}% 100%)`;
  const seed = Math.floor(frame / 2) % 9;
  const flicker = 1 + Math.sin(frame * 1.7) * 0.015 + Math.sin(frame * 0.37) * 0.012;
  const scratch = (frame * 37) % 97 < 5;
  const scratchX = ((frame * 53) % 89) + 5;
  const drift = (t - from) * 26;
  const edge = (p: number) => `polygon(${p - 1.2}% 0, ${p}% 0, ${p - 30}% 100%, ${p - 31.2}% 100%)`;
  return (
    <AbsoluteFill>
      <AbsoluteFill style={{ clipPath: clip }}>
        <AbsoluteFill style={{ background: "#0d0d0d", filter: `brightness(${flicker})` }}>
          <AbsoluteFill style={{ background: "radial-gradient(ellipse 80% 45% at 50% 28%, rgba(255,255,255,0.07), transparent 70%)" }} />
          <AbsoluteFill style={{ backgroundImage: "linear-gradient(rgba(255,255,255,0.035) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.035) 1px, transparent 1px)", backgroundSize: "60px 60px", backgroundPosition: `${-drift * 0.3}px ${-drift * 0.15}px` }} />
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
              {`${title} · ${title}`.toUpperCase()}
            </text>
          </svg>
          <svg width="100%" height="100%" style={{ position: "absolute", opacity: 0.2, mixBlendMode: "screen" }}>
            <filter id={`bd-${id}-${seed}`}>
              <feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves={2} seed={seed} />
              <feColorMatrix type="saturate" values="0" />
            </filter>
            <rect width="100%" height="100%" filter={`url(#bd-${id}-${seed})`} />
          </svg>
          <AbsoluteFill style={{ background: "repeating-linear-gradient(0deg, rgba(255,255,255,0.03) 0px, rgba(255,255,255,0.03) 1px, transparent 1px, transparent 4px)" }} />
          {scratch ? <div style={{ position: "absolute", top: 0, bottom: 0, left: `${scratchX}%`, width: 1.5, background: "rgba(255,255,255,0.14)" }} /> : null}
          <AbsoluteFill style={{ boxShadow: "inset 0 0 200px rgba(0,0,0,0.3)" }} />
        </AbsoluteFill>
      </AbsoluteFill>
      {inQ > 0 && inQ < 1 ? <AbsoluteFill style={{ background: GREEN, clipPath: edge(a), filter: GLOW }} /> : null}
      {outQ > 0 && outQ < 1 ? <AbsoluteFill style={{ background: GREEN, clipPath: edge(b), filter: GLOW }} /> : null}
    </AbsoluteFill>
  );
};

// Estudio (pantalla completa sobre el plano en negro y el siguiente): portada del paper,
// datos del diseño y la Figura 4 con su leyenda
const Study: React.FC = () => {
  const { t, squash, ramp, pop, idle } = useClock();
  if (t < STUDY_BG.from - 0.3 || t > STUDY_BG.to + 0.05) return null;
  const bg = ramp(STUDY.from - 0.05, STUDY.from + 0.2) * (1 - ramp(STUDY.to - 0.35, STUDY.to - 0.05, easeInOut));
  const card = squash(STUDY.from, 11, 200);
  const toFig = ramp(STUDY.fig - 0.1, STUDY.fig + 0.4, easeInOut);
  const fig = squash(STUDY.fig, 12, 190);
  const id = idle(9.1, 0.6);
  const chips: [string, number][] = [
    ["26 completadores", STUDY.n],
    ["10 semanas", STUDY.weeks],
    ["2 días/semana", STUDY.days],
  ];
  const both = pop(STUDY.both, 9, 230);
  const none = squash(STUDY.none, 7, 280);
  return (
    <AbsoluteFill>
      <Backdrop from={STUDY_BG.from} to={STUDY_BG.to} title="Estudio" id="study" />
      <AbsoluteFill style={{ opacity: bg }}>
      {/* portada + datos del diseño */}
      <div style={{ position: "absolute", top: 330, left: 70, right: 70, opacity: 1 - toFig, transform: `translateY(${(1 - card.p) * 120 - toFig * 80 + id.y}px) scale(${card.sx * (1 - toFig * 0.1)}, ${card.sy * (1 - toFig * 0.1)}) rotate(${-1.5 + id.r * 0.5}deg)` }}>
        <div style={{ background: "white", borderRadius: 18, padding: "26px 26px 22px", boxShadow: "0 40px 90px rgba(0,0,0,0.6)" }}>
          <div style={{ ...label, fontSize: 20, letterSpacing: 3, color: "rgba(0,0,0,0.5)", marginBottom: 12 }}>Estudio · Dell&apos;Avanzi, Enes et al. (2026)</div>
          <Img src={staticFile("paper/title.png")} style={{ width: "100%", display: "block" }} />
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 18, marginTop: 50 }}>
          {chips.map(([txt, at], i) => {
            const q = squash(at, 9, 240);
            return (
              <div key={i} style={{ position: "relative", ...display, fontSize: 62, color: i === 0 ? INK : PAPER, background: i === 0 ? GREEN : "rgba(255,255,255,0.08)", border: i === 0 ? "none" : "2px solid rgba(255,255,255,0.25)", padding: "12px 28px 6px", borderRadius: 14, filter: i === 0 ? GLOW : undefined, opacity: Math.min(1, q.p * 2), transform: `translateX(${(1 - q.p) * (i % 2 ? 200 : -200)}px) scale(${q.sx}, ${q.sy}) rotate(${(i - 1) * 1.5}deg)` }}>
                {txt}
                <Burst x={40} y={40} d={t - at} r={50} />
              </div>
            );
          })}
        </div>
      </div>
      {/* Figura 4 del PDF (p. 13) con su leyenda */}
      {t >= STUDY.fig - 0.15 ? (
        <div style={{ position: "absolute", top: 250, left: 40, right: 40, opacity: Math.min(1, fig.p * 2), transform: `translateY(${(1 - fig.p) * 160}px) scale(${0.9 + 0.1 * fig.p})` }}>
          <div style={{ background: "white", borderRadius: 18, padding: "18px 18px 12px", boxShadow: "0 40px 90px rgba(0,0,0,0.6)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", ...label, fontSize: 18, letterSpacing: 2, color: "rgba(0,0,0,0.6)", marginBottom: 6 }}>
              <span>Figura 4 · grosor muscular del pectoral (cm)</span>
              <span>DBP = press · DFLY = aperturas</span>
            </div>
            <Img src={staticFile("paper/fig4.png")} style={{ width: "100%", display: "block" }} />
            <div style={{ ...label, fontSize: 16, letterSpacing: 1.5, color: "rgba(0,0,0,0.55)", marginTop: 6, textTransform: "none" }}>
              A medial · B intermedio · C lateral · D suma. * = cambio respecto al inicio. Dell&apos;Avanzi, Enes et al. (2026), manuscrito.
            </div>
          </div>
          <div style={{ display: "flex", justifyContent: "center", gap: 14, marginTop: 26, flexWrap: "wrap" }}>
            <div style={{ ...display, fontSize: 50, color: INK, background: GREEN, padding: "10px 22px 5px", borderRadius: 12, filter: GLOW, opacity: Math.min(1, both * 2), transform: `scale(${both}) rotate(-2deg)` }}>Ambos crecieron</div>
            <div style={{ ...display, fontSize: 50, color: INK, background: PAPER, padding: "10px 22px 5px", borderRadius: 12, opacity: Math.min(1, none.p * 2), transform: `scale(${none.p * none.sx}, ${none.p * none.sy}) rotate(1.5deg)` }}>Sin ventaja clara detectada</div>
          </div>
        </div>
      ) : null}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// Programación: press → pectoral + tríceps; aperturas → pectoral sin sumar tríceps
const Decide: React.FC = () => {
  const { t, squash, ramp, idle } = useClock();
  // se va antes de la combinación en las manos (88.6)
  if (t < DECIDE.press - 0.05 || t > 88.5) return null;
  const out = ramp(88.2, 88.5, easeInOut);
  const rows: [string, string, number][] = [
    ["Press", "Pectoral + tríceps", DECIDE.press],
    ["Aperturas", "Más pectoral, sin sumar tríceps", DECIDE.fly],
  ];
  return (
    <AbsoluteFill>
      <div style={{ position: "absolute", top: 280, left: 60, right: 60, display: "flex", flexDirection: "column", gap: 16, alignItems: "center", transform: `scale(${popOut(out)})`, opacity: out > 0.85 ? (1 - out) / 0.15 : 1 }}>
        {rows.map(([a, b, at], i) => {
          const q = squash(at, 9, 230);
          const id = idle(i * 2.3, 0.6);
          return (
            <div key={i} style={{ position: "relative", display: "flex", alignItems: "center", gap: 14, opacity: Math.min(1, q.p * 2), transform: `translate(${(1 - q.p) * (i ? 300 : -300)}px, ${id.y}px) scale(${q.sx}, ${q.sy}) rotate(${id.r * 0.5 + (i ? 1.5 : -1.5)}deg)` }}>
              <div style={{ ...display, fontSize: 46, color: INK, background: i ? GREEN : PAPER, padding: "10px 20px 5px", borderRadius: 12, filter: i ? GLOW : undefined }}>{a}</div>
              <div style={{ ...display, fontSize: 40, color: GREEN, ...stroke(6) }}>→</div>
              <div style={{ ...display, fontSize: 40, ...stroke(7), whiteSpace: "normal", maxWidth: 560 }}>{b}</div>
              <Burst x={60} y={34} d={t - at} r={50} />
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

// CTA: «COMENTA PECTORAL» (bocadillo) + «Asesoramiento personalizado»
const Cta: React.FC = () => {
  const { t, pop, squash, idle } = useClock();
  if (t < CTA.from - 0.1) return null;
  const c = squash(CTA.from, 10, 220);
  const key = squash(CTA.key, 7, 280);
  const sub = pop(CTA.key + 0.5, 11, 220);
  const id = idle(7.7, 0.8);
  const breathe = 1 + Math.sin(t * 5.5) * 0.012 * key.p;
  return (
    <AbsoluteFill>
      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, transparent 40%, rgba(0,0,0,0.5) 58%, rgba(0,0,0,0.8) 100%)", opacity: Math.min(1, c.p * 1.5) }} />
      <div style={{ position: "absolute", top: 1010, left: 0, right: 0, display: "flex", flexDirection: "column", alignItems: "center", transform: `translateY(${id.y}px)` }}>
        <div style={{ ...display, ...stroke(8), fontSize: 84, transform: `translateY(${(1 - c.p) * 40}px) scale(${0.4 + 0.6 * c.p}) rotate(${(1 - c.p) * -8}deg)`, opacity: Math.min(1, c.p * 2.5) }}>Comenta</div>
        <div style={{ position: "relative", marginTop: 12, width: 800, height: 220, transform: `scale(${(0.3 + 0.7 * key.p) * breathe * key.sx}, ${(0.3 + 0.7 * key.p) * breathe * key.sy}) rotate(${-3 + id.r}deg)`, opacity: Math.min(1, key.p * 2.5), filter: "drop-shadow(0 0 18px rgba(4,228,0,0.45))" }}>
          <svg width={800} height={220} style={{ position: "absolute", inset: 0 }}>
            <path d="M 10 12 L 790 4 L 780 166 L 250 176 L 150 216 L 166 176 L 18 180 Z" fill={GREEN} />
          </svg>
          <div style={{ ...display, position: "absolute", left: 0, right: 0, top: 6, height: 166, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 96, letterSpacing: 0, color: INK }}>Pectoral</div>
          <Burst x={400} y={90} d={t - CTA.key} r={260} n={14} />
        </div>
        <div style={{ ...label, fontSize: 30, letterSpacing: 5, color: PAPER, marginTop: 14, opacity: Math.min(1, sub * 2), transform: `translateY(${(1 - sub) * 20}px)` }}>Asesoramiento personalizado</div>
      </div>
    </AbsoluteFill>
  );
};

export const Graphics: React.FC = () => {
  const { t } = useClock();
  return (
    <AbsoluteFill>
      <Hook />
      <Split />
      <Kg />
      <Pill from={SIMILAR.word} to={SIMILAR.to} top={290} green>
        ≈ Crecimiento similar
      </Pill>
      <Study />
      <Pill from={INTEREST.at} to={INTEREST.to} top={290}>
        Crecer igual ≠ usarlos igual
      </Pill>
      <Pill from={ELBOW.press} to={ELBOW.fly - 0.1} top={290}>
        Press: también extensión de codo
      </Pill>
      <Pill from={ELBOW.fly} to={ELBOW.to} top={290} green>
        Aperturas: codo casi fijo
      </Pill>
      <Decide />
      <Pill from={DECIDE.needs} to={DECIDE.needsTo} top={290} green>
        Según tus necesidades
      </Pill>
      <Cta />
      <div style={{ display: "none" }}>{t}</div>
    </AbsoluteFill>
  );
};
