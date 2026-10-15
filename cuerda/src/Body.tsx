import React from "react";
import { Easing, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import arms from "./arms.json";
import { GREEN, PAPER } from "./theme";
import { f, FRONT, HOOK, ISO, OBJ1, OBJ2, RANGE, toSrc } from "./timeline";

// Gráficos pegados al cuerpo. Van dentro de la cámara virtual, en coordenadas del
// vídeo (1080×1920), y siguen hombros, codos y muñecas (MediaPipe Pose, suavizado
// por plano). Explican lo que Yago cuenta con la cuerda: el cable no va en línea
// con el hombro y tira del brazo hacia dentro; el hombro aguanta en isométrico; el
// giro final es del antebrazo y la demanda sobre el codo va de más a menos.

const RED = "#FF3B30";
const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const easeOut = Easing.bezier(0.16, 1, 0.3, 1);
const NEON = "drop-shadow(0 0 8px rgba(4,228,0,0.9)) drop-shadow(0 0 22px rgba(4,228,0,0.45))";
const RED_GLOW = "drop-shadow(0 0 8px rgba(255,59,48,0.9)) drop-shadow(0 0 20px rgba(255,59,48,0.4))";

type P = { x: number; y: number };
type Pose = { nose: P; sh: [P, P]; el: [P, P]; wr: [P, P] }; // [izquierda de la imagen, derecha]

const DATA = arms as { fps: number; shots: { t0: number; t1: number; frames: number[][][] }[] };

/** Pose en el segundo `t` del original (o null fuera de los planos con cuerda). */
const poseAt = (t: number): Pose | null => {
  const s = DATA.shots.find((x) => t >= x.t0 && t < x.t1);
  if (!s) return null;
  const k = Math.max(0, Math.min(s.frames.length - 1.001, (t - s.t0) * DATA.fps));
  const i = Math.floor(k);
  const a = s.frames[i];
  const b = s.frames[Math.min(s.frames.length - 1, i + 1)];
  const u = k - i;
  const g = (j: number): P => ({ x: a[j][0] + (b[j][0] - a[j][0]) * u, y: a[j][1] + (b[j][1] - a[j][1]) * u });
  // ids: 0 nariz, 1/2 hombro izq/der (de la persona), 3/4 codo, 5/6 muñeca
  const L = (j: number, r: number) => (g(j).x < g(r).x ? [g(j), g(r)] : [g(r), g(j)]) as [P, P];
  return { nose: g(0), sh: L(1, 2), el: L(3, 4), wr: L(5, 6) };
};

const useClock = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = toSrc(frame / fps);
  const pop = (at: number, damping = 12, stiffness = 200) =>
    spring({ frame: frame - f(at), fps, config: { damping, stiffness, mass: 0.6 } });
  const ramp = (a: number, b: number, ease = easeOut) =>
    interpolate(frame, [f(a), Math.max(f(a) + 1, f(b))], [0, 1], { ...clamp, easing: ease });
  return { t, frame, fps, pop, ramp };
};

const lerp = (a: P, b: P, u: number): P => ({ x: a.x + (b.x - a.x) * u, y: a.y + (b.y - a.y) * u });

/** Línea que se dibuja de a → b. */
const Draw: React.FC<{ a: P; b: P; p: number; color?: string; w?: number; dash?: string; glow?: string; opacity?: number }> = ({
  a,
  b,
  p,
  color = GREEN,
  w = 6,
  dash,
  glow = NEON,
  opacity = 1,
}) => {
  const e = lerp(a, b, Math.max(0, Math.min(1, p)));
  if (p <= 0.001) return null;
  return (
    <line x1={a.x} y1={a.y} x2={e.x} y2={e.y} stroke={color} strokeWidth={w} strokeLinecap="round" strokeDasharray={dash} style={{ filter: glow }} opacity={opacity} />
  );
};

/** Flecha de a → b que crece con `p` (punta incluida). */
const Arrow: React.FC<{ a: P; b: P; p: number; color?: string; w?: number; glow?: string }> = ({ a, b, p, color = GREEN, w = 9, glow = NEON }) => {
  if (p <= 0.01) return null;
  const e = lerp(a, b, p);
  const ang = Math.atan2(b.y - a.y, b.x - a.x);
  const hs = 30 * Math.min(1, p * 1.5);
  const h1 = { x: e.x - Math.cos(ang - 0.5) * hs, y: e.y - Math.sin(ang - 0.5) * hs };
  const h2 = { x: e.x - Math.cos(ang + 0.5) * hs, y: e.y - Math.sin(ang + 0.5) * hs };
  return (
    <g style={{ filter: glow }}>
      <line x1={a.x} y1={a.y} x2={e.x - Math.cos(ang) * 8} y2={e.y - Math.sin(ang) * 8} stroke={color} strokeWidth={w} strokeLinecap="round" />
      <path d={`M ${h1.x} ${h1.y} L ${e.x} ${e.y} L ${h2.x} ${h2.y} Z`} fill={color} stroke={color} strokeWidth={4} strokeLinejoin="round" />
    </g>
  );
};

/** Anillo de articulación con latido. */
const Joint: React.FC<{ c: P; p: number; t: number; color?: string; r?: number }> = ({ c, p, t, color = GREEN, r = 22 }) => {
  if (p <= 0.01) return null;
  const beat = 1 + Math.sin(t * 7) * 0.08;
  const ring = (t * 1.4) % 1;
  return (
    <g style={{ filter: color === RED ? RED_GLOW : NEON }}>
      <circle cx={c.x} cy={c.y} r={r * p * beat} fill="none" stroke={color} strokeWidth={5} />
      <circle cx={c.x} cy={c.y} r={7 * p} fill={color} />
      <circle cx={c.x} cy={c.y} r={r * (1 + ring * 1.4) * p} fill="none" stroke={color} strokeWidth={2.5} opacity={(1 - ring) * 0.7} />
    </g>
  );
};

/** Pastilla de texto anclada a un punto del cuerpo. */
const Chip: React.FC<{ at: P; p: number; children: React.ReactNode; color?: string; ink?: string; size?: number; dx?: number; dy?: number }> = ({
  at,
  p,
  children,
  color = GREEN,
  ink = "#0A0A0A",
  size = 38,
  dx = 0,
  dy = 0,
}) => {
  if (p <= 0.01) return null;
  return (
    <div
      style={{
        position: "absolute",
        left: at.x + dx,
        top: at.y + dy,
        transform: `translate(-50%, -50%) scale(${p}) rotate(${(1 - p) * -10}deg)`,
        opacity: Math.min(1, p * 2),
        background: color,
        color: ink,
        fontFamily: "Montserrat",
        fontWeight: 900,
        fontStyle: "italic",
        textTransform: "uppercase",
        fontSize: size,
        letterSpacing: -0.5,
        padding: "8px 16px 4px",
        borderRadius: 10,
        whiteSpace: "nowrap",
        boxShadow: color === RED ? "0 0 26px rgba(255,59,48,0.55)" : "0 0 26px rgba(4,228,0,0.55)",
      }}
    >
      {children}
    </div>
  );
};

/** Arco con flecha alrededor del brazo (rotación). `dir` 1 = horario. */
const SpinArc: React.FC<{ c: P; rx: number; ry: number; p: number; t: number; dir: 1 | -1; color?: string }> = ({ c, rx, ry, p, t, dir, color = GREEN }) => {
  if (p <= 0.01) return null;
  const sweep = Math.PI * 1.35 * p;
  const phase = Math.sin(t * 5) * 0.25;
  const a0 = Math.PI * 0.15 + phase;
  const pts: P[] = [];
  for (let i = 0; i <= 30; i++) {
    const a = a0 + dir * sweep * (i / 30);
    pts.push({ x: c.x + Math.cos(a) * rx, y: c.y + Math.sin(a) * ry });
  }
  const end = pts[pts.length - 1];
  const prev = pts[pts.length - 3];
  const ang = Math.atan2(end.y - prev.y, end.x - prev.x);
  const hs = 22;
  return (
    <g style={{ filter: NEON }}>
      <polyline points={pts.map((q) => `${q.x},${q.y}`).join(" ")} fill="none" stroke={color} strokeWidth={6} strokeLinecap="round" />
      <path
        d={`M ${end.x - Math.cos(ang - 0.55) * hs} ${end.y - Math.sin(ang - 0.55) * hs} L ${end.x + Math.cos(ang) * 6} ${end.y + Math.sin(ang) * 6} L ${end.x - Math.cos(ang + 0.55) * hs} ${end.y - Math.sin(ang + 0.55) * hs} Z`}
        fill={color}
      />
    </g>
  );
};

// ---------------------------------------------------------------------------------
// Hook (voz en off): señala el tríceps
const HookTriceps: React.FC<{ pose: Pose; t: number }> = ({ pose, t }) => {
  const { pop, ramp } = useClock();
  const p = pop(0.35, 11);
  const out = ramp(HOOK.from - 0.25, HOOK.from);
  // brazo señalado: el de la izquierda de la imagen (hombro → codo)
  const c = lerp(pose.sh[0], pose.el[0], 0.5);
  const q = p * (1 - out);
  return (
    <>
      <svg width={1080} height={1920} style={{ position: "absolute", inset: 0, overflow: "visible" }}>
        <Joint c={{ x: c.x - 30, y: c.y }} p={q} t={t} r={70} />
        <Draw a={{ x: c.x - 30, y: c.y }} b={{ x: c.x + 170, y: c.y - 150 }} p={ramp(0.5, 0.8) * (1 - out)} w={4} />
      </svg>
      <Chip at={{ x: c.x + 260, y: c.y - 170 }} p={pop(0.75, 11) * (1 - out)}>
        Tríceps
      </Chip>
    </>
  );
};

// 1 · «El cable no va pegado al hombro y como va por dentro, le genera demandas»
// Plano frontal: eje del cable (verde) frente a la línea de cada hombro (blanca), la
// distancia entre ambos y el tirón hacia dentro sobre el codo.
const CABLE_FRONT = (y: number) => 465 + y * 0.052; // x del cable a la altura y (medido en el plano)
const ObjCable: React.FC<{ pose: Pose; t: number }> = ({ pose, t }) => {
  const { ramp, pop } = useClock();
  const out = ramp(16.4, 16.66);
  const cable = ramp(OBJ1.cable, OBJ1.cable + 0.7) * (1 - out);
  const lines = ramp(OBJ1.cable + 0.5, OBJ1.cable + 1.0) * (1 - out);
  const gap = ramp(OBJ1.inside, OBJ1.inside + 0.4) * (1 - out);
  const pull = ramp(OBJ1.inside + 0.3, OBJ1.inside + 0.8) * (1 - out);
  const dem = pop(OBJ1.demand, 9) * (1 - out);
  const yEnd = Math.min(pose.wr[0].y, pose.wr[1].y) - 330;
  const top = { x: CABLE_FRONT(0), y: 0 };
  const bot = { x: CABLE_FRONT(yEnd), y: yEnd };
  const yGap = pose.sh[0].y + 230;
  return (
    <>
      <svg width={1080} height={1920} style={{ position: "absolute", inset: 0, overflow: "visible" }}>
        {/* línea de cada hombro */}
        {pose.sh.map((s, i) => (
          <Draw key={i} a={s} b={{ x: s.x, y: s.y + 620 }} p={lines} color={PAPER} w={4} dash="14 12" glow="drop-shadow(0 0 6px rgba(0,0,0,0.8))" />
        ))}
        {/* eje del cable */}
        <Draw a={top} b={bot} p={cable} w={7} />
        {/* distancia hombro → cable a ambos lados */}
        {pose.sh.map((s, i) => (
          <g key={i} opacity={gap}>
            <Arrow a={{ x: s.x, y: yGap }} b={{ x: CABLE_FRONT(yGap) + (i ? 14 : -14), y: yGap }} p={gap} color={PAPER} w={5} glow="drop-shadow(0 0 6px rgba(0,0,0,0.9))" />
          </g>
        ))}
        {/* el cable tira del codo hacia dentro */}
        {pose.el.map((e, i) => (
          <Arrow key={i} a={{ x: e.x + (i ? 40 : -40), y: e.y }} b={{ x: e.x + (i ? -120 : 120), y: e.y }} p={pull} color={RED} glow={RED_GLOW} />
        ))}
        {pose.sh.map((s, i) => (
          <Joint key={i} c={s} p={dem} t={t} color={RED} r={34} />
        ))}
      </svg>
      <Chip at={{ x: CABLE_FRONT(300), y: 300 }} p={pop(OBJ1.cable + 0.4, 11) * (1 - out)} size={32}>
        Cable
      </Chip>
      <Chip at={{ x: (pose.sh[0].x + CABLE_FRONT(yGap)) / 2, y: yGap - 52 }} p={gap} color={PAPER} size={34}>
        Por dentro
      </Chip>
    </>
  );
};

// 2 · «Al abrir la cuerda cuando llegamos abajo…»: plano cercano, los extremos de la
// cuerda se separan
const HANDS_CLOSE: [P, P] = [
  { x: 225, y: 1120 },
  { x: 700, y: 1290 },
];
const ObjOpen: React.FC = () => {
  const pose = { wr: HANDS_CLOSE };
  const { ramp, pop } = useClock();
  const p = ramp(OBJ2.open, OBJ2.open + 0.5);
  const out = ramp(19.6, 19.84);
  const q = p * (1 - out);
  return (
    <>
      <svg width={1080} height={1920} style={{ position: "absolute", inset: 0, overflow: "visible" }}>
        {pose.wr.map((w, i) => (
          <Arrow key={i} a={{ x: w.x + (i ? 60 : -50), y: w.y + 90 }} b={{ x: w.x + (i ? 250 : -200), y: w.y + 170 }} p={q} />
        ))}
      </svg>
      <Chip at={{ x: (pose.wr[0].x + pose.wr[1].x) / 2, y: Math.min(pose.wr[0].y, pose.wr[1].y) - 120 }} p={pop(OBJ2.open + 0.3, 11) * (1 - out)}>
        Se abre
      </Chip>
    </>
  );
};

// 2 · «…generamos una rotación interna del hombro»: arcos alrededor del brazo
const ObjRot: React.FC<{ pose: Pose; t: number }> = ({ pose, t }) => {
  const { ramp, pop } = useClock();
  const p = ramp(OBJ2.rot - 0.05, OBJ2.rot + 0.5);
  const out = ramp(OBJ2.to - 0.25, OBJ2.to);
  const q = p * (1 - out);
  return (
    <>
      <svg width={1080} height={1920} style={{ position: "absolute", inset: 0, overflow: "visible" }}>
        {pose.sh.map((s, i) => {
          const c = lerp(s, pose.el[i], 0.45);
          return <SpinArc key={i} c={c} rx={95} ry={34} p={q} t={t} dir={i ? -1 : 1} />;
        })}
      </svg>
      <Chip at={{ x: 540, y: Math.min(pose.sh[0].y, pose.sh[1].y) - 120 }} p={pop(OBJ2.rot + 0.3, 11) * (1 - out)} size={34}>
        Rotación interna
      </Chip>
    </>
  );
};

// «Para que los brazos no se vayan hacia dentro, los hombros mantienen una fuerza
// isométrica»: el cable tira del codo hacia dentro (rojo) y el hombro lo sujeta (verde)
// el cable baja algo inclinado desde la polea (fuera de plano, arriba a la derecha)
const CABLE_ISO = (y: number) => 873 - 0.167 * y;
const IsoHold: React.FC<{ pose: Pose; t: number }> = ({ pose, t }) => {
  const { ramp, pop } = useClock();
  const cable = ramp(ISO.from, ISO.from + 0.7);
  const pull = ramp(ISO.inward - 0.1, ISO.inward + 0.4);
  const hold = pop(ISO.hold - 0.15, 9);
  const out = ramp(ISO.to - 0.25, ISO.to);
  const shake = hold > 0.5 ? Math.sin(t * 40) * 1.6 : 0;
  return (
    <svg width={1080} height={1920} style={{ position: "absolute", inset: 0, overflow: "visible", opacity: 1 - out }}>
      {(() => {
        const yc = (pose.wr[0].y + pose.wr[1].y) / 2 - 400;
        return <Draw a={{ x: CABLE_ISO(0), y: 0 }} b={{ x: CABLE_ISO(yc), y: yc }} p={cable} w={7} />;
      })()}
      {pose.el.map((e, i) => {
        const inward = i ? -1 : 1; // hacia el centro del cuerpo
        return (
          <g key={i}>
            <Arrow a={{ x: e.x - inward * 30, y: e.y + 10 }} b={{ x: e.x + inward * 110, y: e.y + 10 }} p={pull} color={RED} glow={RED_GLOW} />
            <Arrow a={{ x: e.x - inward * 40 + shake, y: e.y - 36 }} b={{ x: e.x - inward * 160 + shake, y: e.y - 36 }} p={hold} />
          </g>
        );
      })}
      {pose.sh.map((s, i) => (
        <Joint key={i} c={s} p={hold} t={t} r={30} />
      ))}
    </svg>
  );
};

// Recorrido de perfil: cable, antebrazo y la distancia del codo a la línea del cable
// (lo que «pesa» la carga sobre el codo), que se va acortando al extender.
const PULLEY_SIDE = { x: 334, y: 600 };
export const demandAt = (pose: Pose) => {
  // brazo que se ve (el más cercano a cámara): el de la derecha de la imagen
  const e = pose.el[1];
  const w = pose.wr[1];
  const dx = w.x - PULLEY_SIDE.x;
  const dy = w.y - PULLEY_SIDE.y;
  const l = Math.hypot(dx, dy);
  // distancia perpendicular del codo a la recta polea → mano
  return Math.abs((e.x - PULLEY_SIDE.x) * dy - (e.y - PULLEY_SIDE.y) * dx) / l;
};
const SideRange: React.FC<{ pose: Pose; t: number }> = ({ pose, t }) => {
  const { ramp } = useClock();
  const p = ramp(RANGE.from, RANGE.from + 0.6);
  const out = ramp(RANGE.frames - 0.25, RANGE.frames);
  const q = p * (1 - out);
  const e = pose.el[1];
  const w = pose.wr[1];
  const dx = w.x - PULLEY_SIDE.x;
  const dy = w.y - PULLEY_SIDE.y;
  const l = Math.hypot(dx, dy);
  const u = ((e.x - PULLEY_SIDE.x) * dx + (e.y - PULLEY_SIDE.y) * dy) / (l * l);
  const foot = { x: PULLEY_SIDE.x + dx * u, y: PULLEY_SIDE.y + dy * u };
  return (
    <svg width={1080} height={1920} style={{ position: "absolute", inset: 0, overflow: "visible", opacity: q }}>
      <Draw a={PULLEY_SIDE} b={w} p={p} w={6} />
      <Draw a={e} b={w} p={p} color={PAPER} w={9} glow="drop-shadow(0 0 8px rgba(0,0,0,0.8))" />
      <Draw a={e} b={foot} p={ramp(RANGE.from + 0.4, RANGE.from + 0.9)} color={RED} w={6} dash="10 9" glow={RED_GLOW} />
      <Joint c={e} p={p} t={t} r={26} />
    </svg>
  );
};

// Frontal final: el cable y la cuerda hasta las dos manos
const FrontCables: React.FC<{ pose: Pose }> = ({ pose }) => {
  const { ramp } = useClock();
  const p = ramp(FRONT.from + 0.2, FRONT.from + 0.9);
  const out = ramp(FRONT.to - 0.25, FRONT.to);
  const top = { x: 600, y: 120 };
  const yJ = Math.min(pose.wr[0].y, pose.wr[1].y) - 300;
  const j = { x: 588, y: yJ };
  return (
    <svg width={1080} height={1920} style={{ position: "absolute", inset: 0, overflow: "visible", opacity: 1 - out }}>
      <Draw a={top} b={j} p={p} w={7} />
      {pose.wr.map((w, i) => (
        <Draw key={i} a={j} b={w} p={ramp(FRONT.from + 0.7, FRONT.from + 1.1)} w={5} />
      ))}
    </svg>
  );
};

export const BodyLayer: React.FC = () => {
  const { t } = useClock();
  const pose = poseAt(t);
  if (!pose) return null;
  return (
    <div style={{ position: "absolute", inset: 0 }}>
      {t < HOOK.from ? <HookTriceps pose={pose} t={t} /> : null}
      {t >= OBJ1.from && t < 16.68 ? <ObjCable pose={pose} t={t} /> : null}
      {t >= 16.68 && t < 19.84 ? <ObjOpen /> : null}
      {t >= 19.84 && t < OBJ2.to ? <ObjRot pose={pose} t={t} /> : null}
      {t >= ISO.from && t < ISO.to ? <IsoHold pose={pose} t={t} /> : null}
      {t >= RANGE.from && t < RANGE.frames ? <SideRange pose={pose} t={t} /> : null}
      {t >= FRONT.from && t < FRONT.to ? <FrontCables pose={pose} /> : null}
    </div>
  );
};

export { poseAt };
export type { Pose };
