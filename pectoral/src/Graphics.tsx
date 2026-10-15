import React from "react";
import {
  AbsoluteFill,
  Easing,
  Img,
  OffthreadVideo,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { gradeFilter } from "./Grade";
import { FONT, GREEN, PAPER } from "./theme";
import { CTA, DECIDE, ELBOW, f, HOOK, INTEREST, KG, SIMILAR, SPLIT, STUDY, toSrc } from "./timeline";

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
        </div>
      </div>
    </AbsoluteFill>
  );
};

// Hook: «PRESS vs. APERTURAS»
const Hook: React.FC = () => {
  const { t, squash, ramp, idle } = useClock();
  if (t < HOOK.from - 0.05 || t > HOOK.to + 0.05) return null;
  const a = squash(HOOK.from, 9, 240);
  const vs = squash(HOOK.from + 0.25, 6, 320);
  const b = squash(HOOK.from + 0.45, 9, 240);
  const out = ramp(HOOK.to - 0.3, HOOK.to, easeInOut);
  const id = idle(0.4, 0.8);
  return (
    <AbsoluteFill>
      <div style={{ position: "absolute", top: 260, left: 0, right: 0, display: "flex", flexDirection: "column", alignItems: "center", transform: `translateY(${id.y}px) rotate(${-3 + id.r}deg) scale(${popOut(out)})`, opacity: out > 0.85 ? (1 - out) / 0.15 : 1 }}>
        <div style={{ ...display, ...stroke(10), fontSize: 120, transform: `translateX(${(1 - a.p) * -400}px) scale(${a.sx}, ${a.sy})`, opacity: Math.min(1, a.p * 3) }}>Press</div>
        <div style={{ position: "relative", ...display, fontStyle: "normal", fontSize: 64, color: INK, background: GREEN, borderRadius: 999, width: 104, height: 104, display: "flex", alignItems: "center", justifyContent: "center", margin: "6px 0", filter: GLOW, transform: `scale(${vs.p * vs.sx}, ${vs.p * vs.sy}) rotate(${(1 - vs.p) * 180}deg)` }}>
          vs
          <Burst x={52} y={52} d={t - HOOK.from - 0.3} r={70} n={12} />
        </div>
        <div style={{ ...display, ...stroke(10), fontSize: 120, color: GREEN, transform: `translateX(${(1 - b.p) * 400}px) scale(${b.sx}, ${b.sy})`, opacity: Math.min(1, b.p * 3) }}>Aperturas</div>
      </div>
    </AbsoluteFill>
  );
};

// Pantalla dividida: press a la izquierda, aperturas a la derecha (mismo banco y
// cámara, sin espejar). En «palanca» se congela la zona baja de ambos y se dibuja el
// esquema cualitativo: hombro, gravedad desde la mancuerna y la perpendicular.
type Pt = { x: number; y: number };
const LOW: Record<"press" | "fly", { sh: Pt; db: Pt }[]> = {
  // coordenadas del panel (540×700), lado izquierdo y derecho del cuerpo
  press: [
    { sh: { x: 188, y: 372 }, db: { x: 142, y: 318 } },
    { sh: { x: 362, y: 374 }, db: { x: 418, y: 322 } },
  ],
  fly: [
    { sh: { x: 172, y: 372 }, db: { x: 48, y: 356 } },
    { sh: { x: 378, y: 376 }, db: { x: 508, y: 390 } },
  ],
};
const PANEL = { w: 520, h: 674, top: 520, gap: 12 };
const Split: React.FC = () => {
  const { t, frame, fps, squash, ramp, pop } = useClock();
  if (t < SPLIT.from - 0.05 || t >= SPLIT.to) return null;
  const inP = squash(SPLIT.from, 12, 200);
  const out = ramp(SPLIT.to - 0.25, SPLIT.to, easeInOut);
  const lever = t >= SPLIT.lever;
  const lv = ramp(SPLIT.lever, SPLIT.lever + 0.35);
  const grav = ramp(SPLIT.lever + 0.3, SPLIT.lever + 0.8);
  const perp = ramp(SPLIT.lever + 0.8, SPLIT.lever + 1.3);
  const elbowP = pop(SPLIT.elbow, 9, 240);
  const fixedP = pop(SPLIT.fixed, 9, 240);
  const g = gradeFilter(67.6);
  const loopFrame = Math.max(0, frame - f(SPLIT.from)) % 70;
  const panel = (kind: "press" | "fly", i: number) => {
    const x = i ? 540 + PANEL.gap / 2 : 540 - PANEL.gap / 2 - PANEL.w;
    const enter = i ? (1 - inP.p) * 600 : (1 - inP.p) * -600;
    const k = PANEL.w / 540;
    const lw = LOW[kind];
    return (
      <div key={kind} style={{ position: "absolute", left: x, top: PANEL.top, width: PANEL.w, height: PANEL.h, borderRadius: 22, overflow: "hidden", border: `3px solid ${i ? GREEN : PAPER}`, boxShadow: "0 30px 70px rgba(0,0,0,0.6)", transform: `translateX(${enter}px)` }}>
        <div style={{ position: "absolute", inset: 0, filter: g }}>
          {lever ? (
            <Img src={staticFile(`split/${kind}_low.png`)} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          ) : (
            <OffthreadVideo src={staticFile(`split/${kind}.mp4`)} startFrom={loopFrame} muted style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          )}
        </div>
        {/* destello al congelar */}
        {lever ? <div style={{ position: "absolute", inset: 0, background: "white", opacity: Math.max(0, 0.5 - lv) }} /> : null}
        {lever ? (
          <svg width={PANEL.w} height={PANEL.h} viewBox="0 0 540 700" style={{ position: "absolute", inset: 0, overflow: "visible" }}>
            {lw.map((s, j) => {
              const footY = s.sh.y;
              return (
                <g key={j}>
                  {/* gravedad: de la mancuerna hacia el suelo */}
                  <line x1={s.db.x} y1={s.db.y} x2={s.db.x} y2={s.db.y + 190 * grav} stroke={RED} strokeWidth={6} strokeLinecap="round" style={{ filter: "drop-shadow(0 0 6px rgba(255,59,48,0.8))" }} />
                  {grav > 0.6 ? <path d={`M ${s.db.x - 13} ${s.db.y + 168} L ${s.db.x} ${s.db.y + 192} L ${s.db.x + 13} ${s.db.y + 168} Z`} fill={RED} opacity={(grav - 0.6) / 0.4} /> : null}
                  {/* perpendicular del hombro a esa línea = brazo de palanca */}
                  <line x1={s.sh.x} y1={footY} x2={s.sh.x + (s.db.x - s.sh.x) * perp} y2={footY} stroke={GREEN} strokeWidth={8} strokeLinecap="round" style={{ filter: NEON }} />
                  <circle cx={s.sh.x} cy={s.sh.y} r={11 * lv} fill={PAPER} stroke={GREEN} strokeWidth={5} />
                  <circle cx={s.db.x} cy={s.db.y} r={10 * lv} fill={RED} />
                </g>
              );
            })}
          </svg>
        ) : null}
        <div style={{ position: "absolute", left: 0, right: 0, bottom: 18, display: "flex", justifyContent: "center", opacity: lever ? perp : 0 }}>
          <div style={{ ...display, fontSize: 30, color: INK, background: GREEN, padding: "6px 14px 3px", borderRadius: 8 }}>{kind === "press" ? "Palanca corta" : "Palanca larga"}</div>
        </div>
        {/* el codo: cambia de ángulo (press) / casi fijo (aperturas) */}
        {!lever && kind === "press" && elbowP > 0.01 ? (
          <div style={{ position: "absolute", left: 0, right: 0, bottom: 18, display: "flex", justifyContent: "center", transform: `scale(${elbowP})` }}>
            <ElbowIcon t={t} bend />
          </div>
        ) : null}
        {!lever && kind === "fly" && fixedP > 0.01 ? (
          <div style={{ position: "absolute", left: 0, right: 0, bottom: 18, display: "flex", justifyContent: "center", transform: `scale(${fixedP})` }}>
            <ElbowIcon t={t} />
          </div>
        ) : null}
        <div style={{ position: "absolute", left: 0, top: 0, width: k, height: 0 }} />
      </div>
    );
  };
  const labelQ = (i: number) => squash(SPLIT.from + 0.15 + i * 0.1, 9, 240);
  return (
    <AbsoluteFill style={{ opacity: 1 - out }}>
      <AbsoluteFill style={{ background: "radial-gradient(ellipse at 50% 45%, #1b1b1b 0%, #070707 75%)", opacity: Math.min(1, inP.p * 1.5) }} />
      {(["press", "fly"] as const).map((k, i) => panel(k, i))}
      {(["Press con mancuernas", "Aperturas con mancuernas"] as const).map((txt, i) => {
        const q = labelQ(i);
        return (
          <div key={i} style={{ position: "absolute", top: PANEL.top - 92, left: i ? 540 + PANEL.gap / 2 : 540 - PANEL.gap / 2 - PANEL.w, width: PANEL.w, display: "flex", justifyContent: "center", opacity: Math.min(1, q.p * 2) }}>
            <div style={{ ...display, fontSize: 34, color: i ? INK : INK, background: i ? GREEN : PAPER, padding: "8px 16px 5px", borderRadius: 10, transform: `translateY(${(1 - q.p) * -30}px) scale(${q.sx}, ${q.sy})` }}>{txt}</div>
          </div>
        );
      })}
      <div style={{ position: "absolute", left: 0, right: 0, top: PANEL.top + PANEL.h + 30, display: "flex", justifyContent: "center", gap: 18, opacity: Math.min(1, elbowP * 2) * (lever ? 0 : 1) }}>
        <div style={{ ...label, fontSize: 24, letterSpacing: 3, color: PAPER }}>Codo: {t < SPLIT.fixed ? "flexión ↔ extensión" : "casi fijo en aperturas"}</div>
      </div>
      <div style={{ position: "absolute", left: 0, right: 0, top: PANEL.top + PANEL.h + 26, display: "flex", justifyContent: "center", opacity: lever ? lv : 0 }}>
        <div style={{ display: "flex", gap: 22, ...label, fontSize: 22, letterSpacing: 2, color: PAPER }}>
          <span style={{ color: RED }}>● Gravedad</span>
          <span style={{ color: GREEN }}>━ Palanca sobre el hombro</span>
        </div>
      </div>
      {t >= SPLIT.lever - 0.05 ? <div style={{ position: "absolute", left: 0, right: 0, top: 300, display: "flex", justifyContent: "center", opacity: lv }}><div style={{ ...display, ...stroke(8), fontSize: 60, transform: `scale(${0.7 + 0.3 * pop(SPLIT.lever, 9, 240)})` }}>Misma aducción, <span style={{ color: GREEN }}>otra palanca</span></div></div> : null}
      {/* ritmo de vídeo en el fps del montaje */}
      <div style={{ display: "none" }}>{fps}</div>
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

// Estudio (pantalla completa sobre el plano en negro y el siguiente): portada del paper,
// datos del diseño y la Figura 4 con su leyenda
const Study: React.FC = () => {
  const { t, squash, ramp, pop, idle } = useClock();
  if (t < STUDY.from - 0.1 || t > STUDY.to + 0.05) return null;
  const bg = ramp(STUDY.from - 0.1, STUDY.from + 0.2) * (1 - ramp(STUDY.to - 0.3, STUDY.to, easeInOut));
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
    <AbsoluteFill style={{ opacity: bg }}>
      <AbsoluteFill style={{ background: "radial-gradient(ellipse at 50% 40%, #1e1e1e 0%, #080808 80%)" }} />
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
  );
};

// Programación: press → pectoral + tríceps; aperturas → pectoral sin sumar tríceps
const Decide: React.FC = () => {
  const { t, squash, ramp, idle } = useClock();
  if (t < DECIDE.press - 0.05 || t > DECIDE.needs - 0.1) return null;
  const out = ramp(DECIDE.needs - 0.4, DECIDE.needs - 0.1, easeInOut);
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
