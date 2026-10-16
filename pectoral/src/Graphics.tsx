import React from "react";
import {
  AbsoluteFill,
  Easing,
  Img,
  Loop,
  OffthreadVideo,
  Sequence,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { CameraSpace } from "./Camera";
import { gradeFilter } from "./Grade";
import stick from "./stick.json";
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
      {text.split(" ").map((w, i, all) => {
        const q = squash(at + i * gap, 10, 240);
        return (
          <span
            key={i}
            style={{
              display: "inline-block",
              marginRight: i < all.length - 1 ? "0.22em" : 0,
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
          {typeof children === "string" ? <Words text={children} at={from + 0.12} gap={0.05} /> : children}
          {/* brillo que barre la pastilla tras entrar */}
          <div style={{ position: "absolute", top: -20, bottom: -20, width: 50, left: `${-20 + 140 * Math.min(1, Math.max(0, (t - from - 0.35) / 0.45))}%`, background: "rgba(255,255,255,0.5)", transform: "skewX(-20deg)", opacity: t - from > 0.35 && t - from < 0.8 ? 1 : 0 }} />
        </div>
      </div>
    </AbsoluteFill>
  );
};

// Hook: «PRESS vs APERTURAS» y, sin más animación, el color alrededor: rojo de esfuerzo
// con los 200 kilos (la cabeza que se hincha está en Body.tsx) y verde suave con los 10.
const Hook: React.FC = () => {
  const { t, frame, squash, ramp, idle } = useClock();
  if (t < HOOK.from - 0.05 || t > HOOK.to + 0.05) return null;
  const a = squash(HOOK.from, 9, 240);
  const vs = squash(HOOK.from + 0.25, 6, 320);
  const b = squash(HOOK.from + 0.45, 9, 240);
  const titleOut = ramp(HOOK.press - 0.2, HOOK.press + 0.1, easeInOut);
  const id = idle(0.4, 0.8);
  const light = t >= HOOK.light;
  const heavy = light ? 0 : ramp(HOOK.press - 0.1, HOOK.heavy + 0.3, easeInOut);
  const calm = light ? ramp(HOOK.light, HOOK.light + 0.35) * (1 - ramp(HOOK.to - 0.25, HOOK.to + 0.05, easeInOut)) : 0;
  return (
    <AbsoluteFill>
      {!light ? <AbsoluteFill style={{ background: "radial-gradient(ellipse 75% 60% at 50% 50%, transparent 40%, rgba(255,30,20,0.6) 100%)", opacity: heavy * (0.7 + 0.3 * Math.abs(Math.sin(frame * 0.45))) }} /> : null}
      {light ? <AbsoluteFill style={{ background: "radial-gradient(ellipse 75% 60% at 50% 50%, transparent 45%, rgba(4,228,0,0.35) 100%)", opacity: calm }} /> : null}
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
  const { t, frame, fps, ramp, squash } = useClock();
  const L = LEVER[kind];
  if (t < L.at - 0.02 || t >= L.to + (kind === "press" ? 0.2 : 0)) return null;
  const inQ = squash(L.at, 14, 150);
  // tiempo del montaje desde que se congela (sigue corriendo durante la pausa)
  const since = (frame - f(L.at)) / fps;
  const k = (a: number, b: number, e = easeOut) => interpolate(since, [a, b], [0, 1], { ...clamp, easing: e });
  // la apertura entra con un barrido lateral que empuja al press
  const swipe = kind === "fly" ? k(0, 0.2, easeInOut) : 1;
  const leave = kind === "press" ? ramp(L.to, L.to + 0.2, easeInOut) : 0;
  // entrada rápida para que todo quede expuesto el máximo tiempo
  const lv = k(0.03, 0.2);
  const grav = k(0.12, 0.35);
  const perp = k(0.3, 0.55);
  const word = spring({ frame: frame - f(L.at) - Math.round(0.5 * fps), fps, config: { damping: 9, stiffness: 260, mass: 0.6 } });
  const zoom = 1.1 - 0.08 * inQ.p + 0.025 * k(0, 2.4, (u) => u);
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
                {/* «corta» / «larga» sobre la propia línea de palanca */}
                {word > 0.01 ? (
                  <g transform={`translate(${Math.min(930, Math.max(150, (s.sh.x + s.db.x) / 2))} ${s.sh.y + 62}) scale(${word})`}>
                    <rect x={-78} y={-30} width={156} height={50} rx={10} fill={col} style={{ filter: `drop-shadow(0 0 10px ${col})` }} />
                    <text x={0} y={8} textAnchor="middle" fill={INK} fontFamily={FONT} fontWeight={900} fontStyle="italic" fontSize={34}>
                      {kind === "press" ? "CORTA" : "LARGA"}
                    </text>
                  </g>
                ) : null}
              </g>
            );
          })}
        </svg>
      </AbsoluteFill>
      {kind === "press" || swipe > 0 ? <AbsoluteFill style={{ background: "white", opacity: kind === "press" ? Math.max(0, 0.6 - lv * 1.6) : 0 }} /> : null}
    </AbsoluteFill>
  );
};

/** Diagrama claro del brazo (de lado): hombro, brazo, codo con su ángulo y mancuerna.
 *  Press: el codo se flexiona y se extiende. Aperturas: el codo queda fijo y todo el
 *  brazo gira desde el hombro como una sola pieza. `t` = segundos desde que aparece. */
const ArmDiagram: React.FC<{ t: number; bend?: boolean }> = ({ t, bend }) => {
  const cyc = 0.5 - 0.5 * Math.cos(Math.max(0, t - 0.5) * 3.6);
  const sh = { x: 80, y: 290 };
  const upper = 140;
  const fore = 130;
  // ángulos (grados, 0 = derecha, negativo = arriba)
  const upA = bend ? -45 * cyc : -60 + 55 * cyc;
  const elbow = bend ? 75 + 100 * cyc : 158; // ángulo interior del codo
  const a1 = (upA * Math.PI) / 180;
  const el = { x: sh.x + Math.cos(a1) * upper, y: sh.y + Math.sin(a1) * upper };
  const a2 = a1 + ((180 - elbow) * Math.PI) / 180 * -1;
  const hd = { x: el.x + Math.cos(a2) * fore, y: el.y + Math.sin(a2) * fore };
  // se dibuja por partes: brazo, antebrazo, mancuerna y arco (nada aparece de golpe)
  const draw = Math.min(1, Math.max(0, t / 0.18));
  const draw2 = Math.min(1, Math.max(0, (t - 0.15) / 0.18));
  const db = spring({ frame: Math.round((t - 0.3) * 25), fps: 25, config: { damping: 10, stiffness: 260, mass: 0.6 } });
  const arcP = Math.min(1, Math.max(0, (t - 0.35) / 0.2));
  const col = bend ? GREEN : "#FFB020";
  // arco del ángulo del codo (entre la dirección al hombro y a la mano)
  const toSh = Math.atan2(sh.y - el.y, sh.x - el.x);
  const toHd = Math.atan2(hd.y - el.y, hd.x - el.x);
  let d = toHd - toSh;
  while (d > Math.PI) d -= 2 * Math.PI;
  while (d < -Math.PI) d += 2 * Math.PI;
  const r = 44;
  const p0 = { x: el.x + Math.cos(toSh) * r, y: el.y + Math.sin(toSh) * r };
  const p1 = { x: el.x + Math.cos(toSh + d) * r, y: el.y + Math.sin(toSh + d) * r };
  const mid = toSh + d / 2;
  return (
    <div style={{ background: "rgba(10,10,10,0.82)", border: `3px solid ${col}`, borderRadius: 22, padding: "14px 18px 16px", boxShadow: `0 24px 60px rgba(0,0,0,0.6), 0 0 26px ${bend ? "rgba(4,228,0,0.35)" : "rgba(255,176,32,0.35)"}` }}>
      <svg width={460} height={330} viewBox="0 0 460 330" style={{ display: "block", overflow: "visible" }}>
        {/* torso */}
        <rect x={20} y={262} width={420} height={56} rx={24} fill="rgba(255,255,255,0.12)" />
        <line x1={sh.x} y1={sh.y} x2={sh.x + (el.x - sh.x) * draw} y2={sh.y + (el.y - sh.y) * draw} stroke={PAPER} strokeWidth={22} strokeLinecap="round" />
        {draw2 > 0 ? <line x1={el.x} y1={el.y} x2={el.x + (hd.x - el.x) * draw2} y2={el.y + (hd.y - el.y) * draw2} stroke={PAPER} strokeWidth={18} strokeLinecap="round" /> : null}
        {db > 0.01 ? (
          <g transform={`translate(${hd.x} ${hd.y}) rotate(${(a2 * 180) / Math.PI + 90}) scale(${db})`}>
            <rect x={-30} y={-6} width={60} height={12} rx={4} fill="#9a9a9a" />
            <rect x={-42} y={-20} width={16} height={40} rx={4} fill="#d8d8d8" />
            <rect x={26} y={-20} width={16} height={40} rx={4} fill="#d8d8d8" />
          </g>
        ) : null}
        {arcP > 0 ? <path d={`M ${p0.x} ${p0.y} A ${r} ${r} 0 0 ${d > 0 ? 1 : 0} ${p1.x} ${p1.y}`} pathLength={1} strokeDasharray={`${arcP} 1`} fill="none" stroke={col} strokeWidth={7} strokeLinecap="round" style={{ filter: `drop-shadow(0 0 6px ${col})` }} /> : null}
        <circle cx={sh.x} cy={sh.y} r={14} fill={INK} stroke={PAPER} strokeWidth={4} />
        <circle cx={el.x} cy={el.y} r={15} fill={col} stroke={INK} strokeWidth={4} style={{ filter: `drop-shadow(0 0 8px ${col})` }} />
        {arcP > 0 ? (
          <text opacity={arcP} x={el.x + Math.cos(mid) * (r + 34)} y={el.y + Math.sin(mid) * (r + 34) + 10} textAnchor="middle" fill={col} fontFamily={FONT} fontWeight={900} fontSize={30}>
            {Math.round(elbow)}°
          </text>
        ) : null}
        {!bend && arcP > 0 ? (
          // candado sobre el codo
          <g transform={`translate(${el.x + 34} ${el.y - 52}) scale(${arcP})`}>
            <rect x={-14} y={-2} width={28} height={22} rx={4} fill="#FFB020" />
            <path d="M -8 -2 V -10 A 8 8 0 0 1 8 -10 V -2" fill="none" stroke="#FFB020" strokeWidth={4} />
          </g>
        ) : null}
        <text x={sh.x - 4} y={sh.y + 44} textAnchor="middle" fill="rgba(255,255,255,0.7)" fontFamily={FONT} fontWeight={800} fontSize={16} letterSpacing={2}>
          HOMBRO
        </text>
      </svg>
      <div style={{ ...display, fontSize: 40, color: col, textAlign: "center", marginTop: 4 }}>{bend ? "El codo se mueve" : "Codo casi fijo"}</div>
      <div style={{ ...label, fontSize: 20, letterSpacing: 3, color: PAPER, textAlign: "center", marginTop: 6 }}>{bend ? "Flexión ↔ extensión" : "Gira solo el hombro"}</div>
    </div>
  );
};

/** Rótulo del ejercicio que se está viendo en el metraje (con subrayado que se dibuja). */
const ExTag: React.FC<{ from: number; to: number; text: string; green?: boolean; icon: "bend" | "fixed"; iconAt: number }> = ({ from, to, text, green, icon, iconAt }) => {
  const { t, squash, ramp, idle } = useClock();
  if (t < from - 0.05 || t > to + 0.05) return null;
  const q = squash(from, 9, 260);
  const out = ramp(to - 0.15, to, easeInOut);
  const ul = ramp(from + 0.1, from + 0.35);
  const ic = squash(iconAt, 9, 260);
  const id = idle(from, 0.7);
  return (
    <AbsoluteFill style={{ opacity: out > 0.85 ? (1 - out) / 0.15 : 1 }}>
      <Burst x={540} y={350} d={t - from - 0.05} r={130} n={12} color={green ? GREEN : PAPER} />
      <div style={{ position: "absolute", top: 290, left: 0, right: 0, display: "flex", flexDirection: "column", alignItems: "center", transform: `translateY(${id.y}px) rotate(${-2 + id.r * 0.5}deg) scale(${popOut(out)})` }}>
        <div style={{ position: "relative", transform: `scale(${q.p * q.sx}, ${q.p * q.sy})` }}>
          <Words text={text} at={from + 0.03} gap={0.05} style={{ ...display, ...stroke(10), fontSize: 110, color: green ? GREEN : PAPER }} />
          <div style={{ position: "absolute", left: 0, bottom: -10, height: 10, width: `${ul * 100}%`, background: green ? GREEN : PAPER, borderRadius: 6, filter: green ? GLOW : undefined }} />
        </div>
      </div>
      {ic.p > 0.01 ? (
        <div style={{ position: "absolute", left: 555, top: 560, width: 500, opacity: Math.min(1, ic.p * 2), transform: `translateX(${(1 - ic.p) * 300}px) scale(${0.95 * ic.sx}, ${0.95 * ic.sy}) rotate(${(1 - ic.p) * 6 + 1.5}deg)`, transformOrigin: "0% 50%" }}>
          <ArmDiagram t={t - iconAt} bend={icon === "bend"} />
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
      <ExTag from={SPLIT.from + 0.02} to={SPLIT.flyFrom - 0.01} text="Press" icon="bend" iconAt={20.02} />
      <ExTag from={SPLIT.flyFrom + 0.02} to={24.03} text="Aperturas" green icon="fixed" iconAt={22.54} />
      <Freeze kind="press" />
      <Freeze kind="fly" />
      {t >= SPLIT.lever ? (
        <div style={{ position: "absolute", left: 90, right: 90, top: 250, display: "flex", flexDirection: "column", alignItems: "center", opacity: Math.min(1, head * 2) }}>
          <div style={{ transform: `scale(${0.6 + 0.4 * head}) rotate(-2deg)`, display: "flex", flexDirection: "column", alignItems: "center" }}>
            <Words text="Misma aducción," at={SPLIT.lever + 0.1} gap={0.1} style={{ ...display, ...stroke(9), fontSize: 66 }} />
            <Words text="distinta palanca" at={SPLIT.lever + 0.35} gap={0.1} style={{ ...display, ...stroke(9), fontSize: 66, color: GREEN }} />
          </div>
        </div>
      ) : null}
    </AbsoluteFill>
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
// «Pizarra imaginaria» (53–59 s): la Figura 4 centrada detrás de Yago, que va delante
// (rotoscopiado con el palo, birefnet sobre el 4K) y las conclusiones centradas en grande.
const STICK = stick as { t0: number; fps: number; x: number; y: number; w: number; h: number; ext?: string; dir?: string; tips: ([number, number] | null)[] };
const BOARD = { left: 160, top: 330, w: 760 };
const Board: React.FC = () => {
  const { t, squash, ramp, idle } = useClock();
  const fig = squash(STUDY.fig, 12, 190);
  const wipe = ramp(STUDY.fig + 0.05, STUDY.fig + 0.6, easeInOut);
  const out = ramp(STUDY.to - 0.35, STUDY.to, easeInOut);
  const both = squash(STUDY.both, 8, 240);
  const none = squash(STUDY.none, 7, 280);
  const bid = idle(3.3, 0.5);
  const i = Math.round((t - STICK.t0) * STICK.fps);
  const n = String(Math.max(0, Math.min(STICK.tips.length - 1, i))).padStart(3, "0");
  return (
    <AbsoluteFill style={{ opacity: out > 0.85 ? (1 - out) / 0.15 : 1 }}>
      <div style={{ position: "absolute", left: BOARD.left, top: BOARD.top, width: BOARD.w, transformOrigin: "50% 100%", transform: `translateY(${(1 - fig.p) * 120 + bid.y}px) scale(${fig.p * fig.sx * popOut(out)}, ${fig.p * fig.sy * popOut(out)})` }}>
        <div style={{ position: "relative", background: "rgba(255,255,255,0.96)", borderRadius: 16, padding: "14px 14px 10px", boxShadow: "0 30px 70px rgba(0,0,0,0.6), 0 0 0 3px rgba(4,228,0,0.9), 0 0 30px rgba(4,228,0,0.35)", clipPath: `inset(-40px ${(1 - wipe) * 100}% -40px -40px round 16px)` }}>
          <div style={{ ...label, fontSize: 17, letterSpacing: 2, color: "rgba(0,0,0,0.65)", marginBottom: 4, textAlign: "center" }}>Figura 4 · grosor del pectoral</div>
          <div style={{ ...label, fontSize: 15, letterSpacing: 1.5, color: "rgba(0,0,0,0.5)", marginBottom: 6, textAlign: "center" }}>DBP = press · DFLY = aperturas</div>
          <Img src={staticFile("paper/fig4.png")} style={{ width: "100%", display: "block" }} />
          {wipe > 0 && wipe < 1 ? <div style={{ position: "absolute", top: 0, bottom: 0, left: `${wipe * 100}%`, width: 6, background: GREEN, boxShadow: "0 0 18px 6px rgba(4,228,0,0.7)" }} /> : null}
        </div>
      </div>
      {/* Yago delante de la pizarra */}
      <CameraSpace>
        <div style={{ position: "absolute", left: STICK.x, top: STICK.y, width: STICK.w, height: STICK.h, filter: gradeFilter(STICK.t0 + 0.1) }}>
          <Img src={staticFile(`roto/${STICK.dir ?? "stick"}/s_${n}.${STICK.ext ?? "png"}`)} style={{ width: "100%", height: "100%" }} />
        </div>
      </CameraSpace>
      {/* conclusiones, centradas y en grande */}
      <div style={{ position: "absolute", left: 0, right: 0, top: 620, display: "flex", flexDirection: "column", alignItems: "center", gap: 22 }}>
        <div style={{ position: "relative", ...display, fontSize: 84, color: INK, background: GREEN, padding: "16px 34px 8px", borderRadius: 18, filter: GLOW, opacity: Math.min(1, both.p * 2), transform: `translateY(${(1 - both.p) * 50}px) scale(${both.sx * popOut(out)}, ${both.sy * popOut(out)}) rotate(-2deg)` }}>
          Ambos crecieron
          <div style={{ position: "absolute", left: "50%", top: "50%" }}><Burst x={0} y={0} d={t - STUDY.both} r={200} n={14} /></div>
        </div>
        <div style={{ position: "relative", ...display, fontSize: 84, color: INK, background: PAPER, padding: "16px 34px 8px", borderRadius: 18, boxShadow: "0 24px 50px rgba(0,0,0,0.55)", opacity: Math.min(1, none.p * 2), transform: `translateY(${(1 - none.p) * 50}px) scale(${none.sx * popOut(out)}, ${none.sy * popOut(out)}) rotate(1.5deg)` }}>
          Sin ventaja clara
          <div style={{ position: "absolute", left: "50%", top: "50%" }}><Burst x={0} y={0} d={t - STUDY.none} r={200} n={14} color={PAPER} /></div>
        </div>
      </div>
    </AbsoluteFill>
  );
};

const Study: React.FC = () => {
  const { t, squash, ramp, idle } = useClock();
  if (t < STUDY_BG.from - 0.3 || t > STUDY.to + 0.1) return null;
  // parte 1 (fondo de escena): portada y datos del diseño
  const bg = ramp(STUDY.from - 0.05, STUDY.from + 0.2) * (1 - ramp(STUDY_BG.to - 0.45, STUDY_BG.to - 0.1, easeInOut));
  const card = squash(STUDY.from, 11, 200);
  const id = idle(9.1, 0.6);
  const chips: [string, number][] = [
    ["26 hombres", STUDY.n],
    ["10 semanas", STUDY.weeks],
    ["2 días/semana", STUDY.days],
  ];
  return (
    <AbsoluteFill>
      <Backdrop from={STUDY_BG.from} to={STUDY_BG.to} title="Estudio" id="study" />
      {t < STUDY_BG.to ? (
        <AbsoluteFill style={{ opacity: bg }}>
          <div style={{ position: "absolute", top: 330, left: 70, right: 70, transform: `translateY(${(1 - card.p) * 120 + id.y}px) scale(${card.sx}, ${card.sy}) rotate(${-1.5 + id.r * 0.5}deg)` }}>
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
        </AbsoluteFill>
      ) : null}
      {t < STUDY_BG.to ? <ExecTiles opacity={bg} /> : null}
      {t >= STUDY.fig - 0.05 ? <Board /> : null}
    </AbsoluteFill>
  );
};

// «haciendo press o aperturas»: la ejecución grabada en dos cuadrados pequeños
const EXEC = [
  { src: "split/press.mp4", name: "Press", at: 49.56, x: 160 },
  { src: "split/fly.mp4", name: "Aperturas", at: 50.2, x: 560 },
];
const ExecTiles: React.FC<{ opacity: number }> = ({ opacity }) => {
  const { squash, idle } = useClock();
  return (
    <>
      {EXEC.map((e, i) => {
        const q = squash(e.at, 10, 220);
        const id = idle(3.3 + i * 2.1, 0.6);
        return (
          <div key={e.src} style={{ position: "absolute", left: e.x, top: 945, width: 360, opacity: opacity * Math.min(1, q.p * 2), transform: `translateY(${(1 - q.p) * 140 + id.y}px) scale(${q.sx * (0.6 + 0.4 * q.p)}, ${q.sy * (0.6 + 0.4 * q.p)}) rotate(${(i ? 2 : -2) + id.r * 0.5}deg)` }}>
            <div style={{ width: 360, height: 360, borderRadius: 22, overflow: "hidden", border: `4px solid ${i ? PAPER : GREEN}`, boxShadow: "0 30px 70px rgba(0,0,0,0.6)", background: "#000" }}>
              <Sequence from={f(e.at)} layout="none">
                <Loop durationInFrames={70} layout="none">
                  <OffthreadVideo src={staticFile(e.src)} muted style={{ width: 360, height: 467, objectFit: "cover", marginTop: -40 }} />
                </Loop>
              </Sequence>
            </div>
            <div style={{ position: "absolute", left: "50%", bottom: -26, transform: "translateX(-50%)", ...display, fontSize: 40, color: INK, background: i ? PAPER : GREEN, padding: "8px 18px 4px", borderRadius: 10 }}>{e.name}</div>
          </div>
        );
      })}
    </>
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
      <div style={{ position: "absolute", top: 210, left: 40, right: 40, display: "flex", flexDirection: "column", gap: 22, alignItems: "center", transform: `scale(${popOut(out)})`, opacity: out > 0.85 ? (1 - out) / 0.15 : 1 }}>
        {rows.map(([a, b, at], i) => {
          const q = squash(at, 9, 230);
          const id = idle(i * 2.3, 0.6);
          return (
            // cada fila centrada: la etiqueta arriba y su efecto debajo, en una sola línea
            <div key={i} style={{ position: "relative", display: "flex", flexDirection: "column", alignItems: "center", gap: 8, opacity: Math.min(1, q.p * 2), transform: `translate(${(1 - q.p) * (i ? 300 : -300)}px, ${id.y}px) scale(${q.sx}, ${q.sy}) rotate(${id.r * 0.5 + (i ? 1 : -1)}deg)` }}>
              <div style={{ ...display, fontSize: 46, color: INK, background: i ? GREEN : PAPER, padding: "10px 22px 5px", borderRadius: 12, filter: i ? GLOW : undefined }}>{a}</div>
              <div style={{ ...display, fontSize: 38, ...stroke(7), textAlign: "center" }}>{b}</div>
              <div style={{ position: "absolute", left: "50%", top: 0 }}><Burst x={0} y={30} d={t - at} r={60} /></div>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

// CTA: «COMENTA PECTORAL» (bocadillo) + «Asesoramiento personalizado»
const Cta: React.FC = () => {
  const { t, pop, squash, idle, ramp } = useClock();
  if (t < CTA.from - 0.1) return null;
  const c = squash(CTA.from, 10, 220);
  const key = squash(CTA.key, 7, 280);
  const sub = pop(CTA.key + 0.5, 11, 220);
  const id = idle(7.7, 0.8);
  const breathe = 1 + Math.sin(t * 5.5) * 0.012 * key.p;
  return (
    <AbsoluteFill>
      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, transparent 40%, rgba(0,0,0,0.5) 58%, rgba(0,0,0,0.8) 100%)", opacity: ramp(CTA.from - 0.2, CTA.from + 1.0, easeInOut) }} />
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
      <Pill from={INTEREST.at} to={INTEREST.to} top={200}>
        Crecer igual ≠ usarlos igual
      </Pill>
      <Pill from={ELBOW.press} to={ELBOW.fly - 0.1} top={290} size={44} rot={-1.5}>
        Press: también extensión de codo
      </Pill>
      <Pill from={ELBOW.fly} to={ELBOW.to} top={290} green size={48} rot={-1.5}>
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
