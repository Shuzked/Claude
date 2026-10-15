import React from "react";
import { Easing, Img, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import arms from "./arms.json";
import cables from "./cables.json";
import faceTrack from "./faceTrack.json";
import { FONT, GREEN, PAPER } from "./theme";
import { CTA, f, FORE, FRONT, HOOK, ISO, OBJ1, OBJ2, RANGE, toSrc, TOOLS, TRI } from "./timeline";

// Gráficos pegados al cuerpo. Van dentro de la cámara virtual, en coordenadas del
// vídeo (1080×1920): rotoscopias (public/roto/<trabajo>/r_NNNNN.png, por fotograma
// del original), cable detectado fotograma a fotograma (cables.json) y pose de
// hombros, codos y muñecas (arms.json). Explican lo que Yago cuenta con la cuerda:
// el cable no va en línea con el hombro y tira del brazo hacia dentro; el hombro
// aguanta en isométrico; el giro final es del antebrazo; la demanda sobre el codo
// va de más a menos.

const RED = "#FF3B30";
const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const easeOut = Easing.bezier(0.16, 1, 0.3, 1);
const easeInOut = Easing.bezier(0.65, 0, 0.35, 1);
const NEON = "drop-shadow(0 0 8px rgba(4,228,0,0.9)) drop-shadow(0 0 22px rgba(4,228,0,0.45))";
const RED_GLOW = "drop-shadow(0 0 8px rgba(255,59,48,0.9)) drop-shadow(0 0 20px rgba(255,59,48,0.4))";
const DARK = "drop-shadow(0 0 6px rgba(0,0,0,0.85))";

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
  const L = (j: number, r: number) => (g(j).x < g(r).x ? [g(j), g(r)] : [g(r), g(j)]) as [P, P];
  return { nose: g(0), sh: L(1, 2), el: L(3, 4), wr: L(5, 6) };
};

/** Cable detectado: x = a + b·y, termina en y = end (la unión con la cuerda). */
const CAB = cables as Record<string, { t0: number; frames: number[][] }>;
const cableAt = (name: string, t: number) => {
  const c = CAB[name];
  const i = Math.max(0, Math.min(c.frames.length - 1, Math.round((t - c.t0) * 25)));
  const [a, b, end] = c.frames[i];
  return { x: (y: number) => a + b * y, end };
};

/** Cara (seguimiento por plano, suavizado ±0,4 s). */
const FT = faceTrack as { fps: number; points: [number, number][] };
const faceAt = (t: number): P => {
  const i = Math.round(t * FT.fps);
  let sx = 0;
  let sy = 0;
  let n = 0;
  for (let j = Math.max(0, i - 10); j <= Math.min(FT.points.length - 1, i + 10); j++) {
    sx += FT.points[j][0];
    sy += FT.points[j][1];
    n++;
  }
  return { x: sx / n, y: sy / n };
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
const Svg: React.FC<{ children: React.ReactNode; opacity?: number }> = ({ children, opacity = 1 }) => (
  <svg width={1080} height={1920} style={{ position: "absolute", inset: 0, overflow: "visible", opacity }}>
    {children}
  </svg>
);

/** Fotograma de una rotoscopia (o nada fuera de su tramo). */
const Roto: React.FC<{ job: string; t: number; range: [number, number]; style?: React.CSSProperties }> = ({ job, t, range, style }) => {
  const fi = Math.round(t * 25);
  if (fi < Math.round(range[0] * 25) || fi >= Math.round(range[1] * 25)) return null;
  return (
    <Img
      src={staticFile(`roto/${job}/r_${String(fi).padStart(5, "0")}.png`)}
      style={{ position: "absolute", inset: 0, width: 1080, height: 1920, ...style }}
    />
  );
};

/** Encendido de neón: titila un par de veces y queda vibrando un poco. */
const neonOn = (d: number) => {
  if (d < 0) return 0;
  if ((d > 0.06 && d < 0.1) || (d > 0.17 && d < 0.2)) return 0.25;
  return Math.min(1, d / 0.05) * (0.9 + 0.1 * Math.sin(d * 31) * Math.sin(d * 11));
};

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
  if (p <= 0.001) return null;
  const e = lerp(a, b, Math.max(0, Math.min(1, p)));
  return <line x1={a.x} y1={a.y} x2={e.x} y2={e.y} stroke={color} strokeWidth={w} strokeLinecap="round" strokeDasharray={dash} style={{ filter: glow }} opacity={opacity} />;
};

/** Flecha de a → b que crece con `p`; la punta rebota un poco al llegar. */
const Arrow: React.FC<{ a: P; b: P; p: number; color?: string; w?: number; glow?: string }> = ({ a, b, p, color = GREEN, w = 9, glow = NEON }) => {
  if (p <= 0.01) return null;
  const e = lerp(a, b, p);
  const ang = Math.atan2(b.y - a.y, b.x - a.x);
  const hs = 30 * Math.min(1.15, p * 1.4);
  const h1 = { x: e.x - Math.cos(ang - 0.5) * hs, y: e.y - Math.sin(ang - 0.5) * hs };
  const h2 = { x: e.x - Math.cos(ang + 0.5) * hs, y: e.y - Math.sin(ang + 0.5) * hs };
  return (
    <g style={{ filter: glow }}>
      <line x1={a.x} y1={a.y} x2={e.x - Math.cos(ang) * 8} y2={e.y - Math.sin(ang) * 8} stroke={color} strokeWidth={w} strokeLinecap="round" />
      <path d={`M ${h1.x} ${h1.y} L ${e.x} ${e.y} L ${h2.x} ${h2.y} Z`} fill={color} stroke={color} strokeWidth={4} strokeLinejoin="round" />
    </g>
  );
};

/** Pastilla con línea guía hacia un punto (la línea se dibuja y la pastilla rebota). */
const Callout: React.FC<{ to: P; from: P; p: number; q: number; children: React.ReactNode; size?: number }> = ({ to, from, p, q, children, size = 36 }) => (
  <>
    <Svg>
      <Draw a={to} b={from} p={p} w={4} />
      {p > 0.02 ? <circle cx={to.x} cy={to.y} r={8 * Math.min(1, p * 2)} fill={GREEN} style={{ filter: NEON }} /> : null}
    </Svg>
    {q > 0.01 ? (
      <div
        style={{
          position: "absolute",
          left: from.x,
          top: from.y,
          transform: `translate(-50%, -50%) scale(${q}) rotate(${(1 - q) * -12 - 3}deg)`,
          opacity: Math.min(1, q * 2),
          background: GREEN,
          color: "#0A0A0A",
          fontFamily: FONT,
          fontWeight: 900,
          fontStyle: "italic",
          textTransform: "uppercase",
          fontSize: size,
          padding: "8px 18px 4px",
          borderRadius: 10,
          whiteSpace: "nowrap",
          boxShadow: "0 0 26px rgba(4,228,0,0.55)",
        }}
      >
        {children}
      </div>
    ) : null}
  </>
);

// ---------------------------------------------------------------------------------
// Hook: el tríceps se enciende en verde (rotoscopia), se mantiene y se apaga
const TricepsOn: React.FC<{ t: number }> = ({ t }) => {
  const { ramp } = useClock();
  const on = neonOn(t - TRI.on) * (1 - ramp(TRI.off, HOOK.from - 0.02, easeInOut));
  if (on <= 0.01) return null;
  const pulse = 0.85 + 0.15 * Math.sin(t * 6);
  return <Roto job="tri" t={t} range={[0, 1.8]} style={{ opacity: on, filter: `drop-shadow(0 0 ${10 + 14 * pulse}px rgba(4,228,0,${0.8 * pulse})) drop-shadow(0 0 40px rgba(4,228,0,0.4))` }} />;
};

// Hook: señal de prohibido sobre la cuerda colgada (rojo)
const ROPE_HOOK = { x: 410, y: 850 };
const RopeNo: React.FC<{ t: number }> = ({ t }) => {
  const { pop, ramp } = useClock();
  const p = pop(HOOK.no, 8, 240);
  const slash = ramp(HOOK.no + 0.12, HOOK.no + 0.32);
  const out = ramp(HOOK.to - 0.25, HOOK.to, easeInOut);
  const r = 175;
  const wob = Math.sin(t * 9) * 2.5 * p;
  if (p < 0.01) return null;
  return (
    <Svg opacity={1 - out}>
      <g transform={`translate(${ROPE_HOOK.x} ${ROPE_HOOK.y}) scale(${p}) rotate(${wob})`} style={{ filter: RED_GLOW }}>
        <circle r={r} fill="rgba(255,59,48,0.12)" stroke={RED} strokeWidth={18} />
        <line x1={-r * 0.7} y1={-r * 0.7} x2={-r * 0.7 + r * 1.4 * slash} y2={-r * 0.7 + r * 1.4 * slash} stroke={RED} strokeWidth={18} strokeLinecap="round" />
      </g>
    </Svg>
  );
};

// 1 · «El cable no va pegado al hombro y como va por dentro, le genera demandas»
const ObjCable: React.FC<{ pose: Pose; t: number }> = ({ pose, t }) => {
  const { ramp, pop } = useClock();
  const out = ramp(16.42, 16.66);
  const cab = cableAt("obj", t);
  const cable = ramp(OBJ1.cable - 0.1, OBJ1.cable + 0.35) * (1 - out);
  const lines = ramp(14.44, 14.75) * (1 - out); // «al hombro»
  const gap = ramp(OBJ1.inside, OBJ1.inside + 0.25) * (1 - out); // «por dentro»
  const pull = pop(OBJ1.inside + 0.1, 10, 300) * (1 - out);
  const red = neonOn(t - OBJ1.demand + 0.25) * (1 - out); // «le genera demandas»
  const yEnd = cab.end;
  const top = { x: cab.x(0), y: 0 };
  const bot = { x: cab.x(yEnd), y: yEnd };
  const yGap = pose.sh[0].y + 230;
  const labelAt = { x: cab.x(560), y: 560 };
  return (
    <>
      <Roto job="shr" t={t} range={[13.12, 16.68]} style={{ opacity: red * (0.85 + 0.15 * Math.sin(t * 8)), filter: "drop-shadow(0 0 16px rgba(255,59,48,0.75))" }} />
      <Svg>
        {pose.sh.map((s, i) => (
          <Draw key={i} a={s} b={{ x: s.x, y: s.y + 600 }} p={lines} color={PAPER} w={4} dash="14 12" glow={DARK} />
        ))}
        <Draw a={top} b={bot} p={cable} w={6} />
        {pose.sh.map((s, i) => (
          <Arrow key={i} a={{ x: s.x, y: yGap }} b={{ x: cab.x(yGap) + (i ? 12 : -12), y: yGap }} p={gap} color={PAPER} w={5} glow={DARK} />
        ))}
        {pose.el.map((e, i) => (
          <Arrow key={i} a={{ x: e.x + (i ? 30 : -30), y: e.y }} b={{ x: e.x + (i ? -120 : 120), y: e.y }} p={pull} color={RED} glow={RED_GLOW} />
        ))}
      </Svg>
      <Callout to={labelAt} from={{ x: labelAt.x + 230, y: labelAt.y - 70 }} p={ramp(OBJ1.cable + 0.15, OBJ1.cable + 0.45) * (1 - out)} q={pop(OBJ1.cable + 0.35, 10) * (1 - out)}>
        Cable
      </Callout>
    </>
  );
};

// 2 · «Al abrir la cuerda cuando llegamos abajo…»: los extremos se separan
const HANDS_CLOSE: [P, P] = [
  { x: 225, y: 1120 },
  { x: 700, y: 1290 },
];
const ObjOpen: React.FC = () => {
  const { pop, ramp } = useClock();
  const out = ramp(19.6, 19.84);
  return (
    <Svg>
      {HANDS_CLOSE.map((w, i) => (
        <Arrow key={i} a={{ x: w.x + (i ? 60 : -50), y: w.y + 90 }} b={{ x: w.x + (i ? 250 : -200), y: w.y + 170 }} p={pop(OBJ2.open + i * 0.08, 10, 260) * (1 - out)} />
      ))}
    </Svg>
  );
};

// 2 · «…rotación interna del hombro»: anillos alrededor del brazo que pasan por
// detrás y por delante (3D falso con el recorte del brazo en medio)
const ringPts = (c: P, axis: P, rx: number, ry: number, a0: number, a1: number) => {
  const ang = Math.atan2(axis.y, axis.x) + Math.PI / 2; // el anillo es perpendicular al brazo
  const ca = Math.cos(ang);
  const sa = Math.sin(ang);
  const pts: P[] = [];
  for (let i = 0; i <= 24; i++) {
    const a = a0 + (a1 - a0) * (i / 24);
    const lx = Math.cos(a) * rx;
    const ly = Math.sin(a) * ry;
    pts.push({ x: c.x + lx * ca - ly * sa, y: c.y + lx * sa + ly * ca });
  }
  return pts;
};
const Ring: React.FC<{ pose: Pose; t: number; i: number; layer: "back" | "front" }> = ({ pose, t, i, layer }) => {
  const { ramp } = useClock();
  const p = ramp(OBJ2.rot - 0.08, OBJ2.rot + 0.4) * (1 - ramp(OBJ2.to - 0.25, OBJ2.to, easeInOut));
  if (p <= 0.01) return null;
  const sh = pose.sh[i];
  const el = pose.el[i];
  const c = lerp(sh, el, 0.42);
  const axis = { x: el.x - sh.x, y: el.y - sh.y };
  const rx = 112 * (0.6 + 0.4 * p);
  const ry = 40 * (0.6 + 0.4 * p);
  // giro hacia dentro: el cometa recorre el anillo (mitad delantera = abajo)
  const dir = i ? -1 : 1;
  const head = (t - OBJ2.rot) * 5.2 * dir;
  const [a0, a1] = layer === "front" ? [0, Math.PI] : [Math.PI, Math.PI * 2];
  const pts = ringPts(c, axis, rx, ry, a0, a1);
  const segs: React.ReactNode[] = [];
  for (let k = 0; k < pts.length - 1; k++) {
    const a = a0 + (a1 - a0) * (k / 24);
    // brillo del cometa: máximo en la cabeza y decae por detrás de ella
    let d = ((((head - a) * dir) % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
    d = 1 - Math.min(1, d / 2.2);
    const op = (layer === "back" ? 0.55 : 1) * (0.28 + 0.72 * d) * p;
    segs.push(<line key={k} x1={pts[k].x} y1={pts[k].y} x2={pts[k + 1].x} y2={pts[k + 1].y} stroke={GREEN} strokeWidth={layer === "back" ? 8 : 11} strokeLinecap="round" opacity={op} />);
  }
  // punta de flecha en la cabeza del cometa (en la capa que toque)
  const ha = ((head % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
  const inFront = ha < Math.PI;
  let tip: React.ReactNode = null;
  if ((layer === "front") === inFront) {
    const q0 = ringPts(c, axis, rx, ry, ha - 0.25 * dir, ha - 0.25 * dir)[0];
    const q1 = ringPts(c, axis, rx, ry, ha, ha)[0];
    const an = Math.atan2(q1.y - q0.y, q1.x - q0.x);
    const hs = 30;
    tip = (
      <path
        d={`M ${q1.x - Math.cos(an - 0.55) * hs} ${q1.y - Math.sin(an - 0.55) * hs} L ${q1.x + Math.cos(an) * 6} ${q1.y + Math.sin(an) * 6} L ${q1.x - Math.cos(an + 0.55) * hs} ${q1.y - Math.sin(an + 0.55) * hs} Z`}
        fill={GREEN}
        opacity={p * (layer === "back" ? 0.6 : 1)}
      />
    );
  }
  return (
    <g style={{ filter: NEON }}>
      {segs}
      {tip}
    </g>
  );
};
const ObjRot: React.FC<{ pose: Pose; t: number }> = ({ pose, t }) => (
  <>
    <Svg>
      <Ring pose={pose} t={t} i={0} layer="back" />
      <Ring pose={pose} t={t} i={1} layer="back" />
    </Svg>
    <Roto job="arm" t={t} range={[19.84, 22.16]} />
    <Svg>
      <Ring pose={pose} t={t} i={0} layer="front" />
      <Ring pose={pose} t={t} i={1} layer="front" />
    </Svg>
  </>
);

// «…los hombros deben mantener una fuerza isométrica»: el cable tira del codo hacia
// dentro (codos en rojo) y el hombro lo sujeta (hombros en verde)
const IsoHold: React.FC<{ pose: Pose; t: number }> = ({ pose, t }) => {
  const { ramp, pop } = useClock();
  const cab = cableAt("iso", t);
  const cable = ramp(ISO.from, ISO.from + 0.45);
  const pull = pop(ISO.inward - 0.1, 10, 300);
  const elbows = neonOn(t - ISO.inward + 0.1);
  const hold = pop(ISO.hold - 0.15, 9, 260);
  const shoulders = neonOn(t - ISO.hold + 0.15);
  const out = ramp(ISO.to - 0.25, ISO.to);
  const shake = hold > 0.5 ? Math.sin(t * 40) * 1.6 : 0;
  return (
    <div style={{ position: "absolute", inset: 0, opacity: 1 - out }}>
      <Roto job="iel" t={t} range={[24.4, 30.52]} style={{ opacity: elbows, filter: "drop-shadow(0 0 14px rgba(255,59,48,0.75))" }} />
      <Roto job="ish" t={t} range={[24.4, 30.52]} style={{ opacity: shoulders, filter: "drop-shadow(0 0 14px rgba(4,228,0,0.75))" }} />
      <Svg>
        <Draw a={{ x: cab.x(0), y: 0 }} b={{ x: cab.x(cab.end), y: cab.end }} p={cable} w={6} />
        {pose.el.map((e, i) => {
          const inward = i ? -1 : 1;
          return (
            <g key={i}>
              <Arrow a={{ x: e.x - inward * 30, y: e.y + 10 }} b={{ x: e.x + inward * 110, y: e.y + 10 }} p={pull} color={RED} glow={RED_GLOW} />
              <Arrow a={{ x: e.x - inward * 40 + shake, y: e.y - 36 }} b={{ x: e.x - inward * 160 + shake, y: e.y - 36 }} p={hold} />
            </g>
          );
        })}
      </Svg>
    </div>
  );
};

// «la rotación… del antebrazo»: los dos antebrazos se encienden en verde
const ForeOn: React.FC<{ t: number }> = ({ t }) => {
  const { ramp } = useClock();
  const on = neonOn(t - FORE.from + 0.1) * (1 - ramp(FORE.to - 0.3, FORE.to, easeInOut));
  if (on <= 0.01) return null;
  return <Roto job="fore" t={t} range={[57.0, 60.16]} style={{ opacity: on * 0.95, filter: "drop-shadow(0 0 14px rgba(4,228,0,0.8)) drop-shadow(0 0 34px rgba(4,228,0,0.35))" }} />;
};

// Recorrido de perfil: cable, antebrazo y la distancia del codo a la línea del cable
// (lo que «pesa» la carga sobre el codo), que se acorta al extender.
const PULLEY_SIDE = { x: 334, y: 600 };
const SideRange: React.FC<{ pose: Pose }> = ({ pose }) => {
  const { ramp } = useClock();
  const p = ramp(RANGE.from, RANGE.from + 0.5);
  const out = ramp(76.0, 76.2);
  const e = pose.el[1];
  const w = pose.wr[1];
  const dx = w.x - PULLEY_SIDE.x;
  const dy = w.y - PULLEY_SIDE.y;
  const l = Math.hypot(dx, dy);
  const u = ((e.x - PULLEY_SIDE.x) * dx + (e.y - PULLEY_SIDE.y) * dy) / (l * l);
  const foot = { x: PULLEY_SIDE.x + dx * u, y: PULLEY_SIDE.y + dy * u };
  const arm = Math.hypot(e.x - foot.x, e.y - foot.y);
  const hot = arm > 165; // demanda alta: rojo
  return (
    <Svg opacity={p * (1 - out)}>
      <Draw a={PULLEY_SIDE} b={w} p={p} w={6} />
      <Draw a={e} b={w} p={p} color={PAPER} w={9} glow={DARK} />
      <Draw a={e} b={foot} p={ramp(RANGE.from + 0.3, RANGE.from + 0.7)} color={hot ? RED : GREEN} w={7} dash="10 9" glow={hot ? RED_GLOW : NEON} />
      <circle cx={e.x} cy={e.y} r={hot ? 18 : 12} fill={hot ? RED : GREEN} style={{ filter: hot ? RED_GLOW : NEON }} />
    </Svg>
  );
};

// Frontal: cable y la prolongación imaginaria de cada antebrazo (codo → muñeca), que
// se cruzan
const FrontCross: React.FC<{ pose: Pose; t: number }> = ({ pose, t }) => {
  const { ramp, pop } = useClock();
  const cab = cableAt("front", t);
  const p = ramp(FRONT.from + 0.1, FRONT.from + 0.5);
  const ext = ramp(FRONT.from + 0.4, FRONT.from + 1.0);
  const out = ramp(FRONT.to - 0.25, FRONT.to);
  const [eL, eR] = pose.el;
  const [wL, wR] = pose.wr;
  const d1 = { x: wL.x - eL.x, y: wL.y - eL.y };
  const d2 = { x: wR.x - eR.x, y: wR.y - eR.y };
  const den = d1.x * d2.y - d1.y * d2.x;
  let X: P | null = null;
  if (Math.abs(den) > 1e-3) {
    const s = ((eR.x - eL.x) * d2.y - (eR.y - eL.y) * d2.x) / den;
    X = { x: eL.x + d1.x * s, y: eL.y + d1.y * s };
    if (s < 0.8 || X.y < 150 || X.y > 1850 || X.x < 60 || X.x > 1020) X = null;
  }
  const hit = pop(FRONT.from + 0.9, 8, 260);
  const ring = (t * 1.5) % 1;
  return (
    <Svg opacity={1 - out}>
      <Draw a={{ x: cab.x(0), y: 0 }} b={{ x: cab.x(cab.end), y: cab.end }} p={p} w={6} />
      {X ? <Draw a={eL} b={X} p={ext} color={PAPER} w={5} dash="16 12" glow={DARK} /> : null}
      {X ? <Draw a={eR} b={X} p={ext} color={PAPER} w={5} dash="16 12" glow={DARK} /> : null}
      {X && hit > 0.02 ? (
        <g transform={`translate(${X.x} ${X.y}) scale(${hit})`} style={{ filter: NEON }}>
          <circle r={16} fill={GREEN} />
          <circle r={16 + ring * 40} fill="none" stroke={GREEN} strokeWidth={3} opacity={1 - ring} />
        </g>
      ) : null}
    </Svg>
  );
};

// Conclusión: saca la barra y la cuerda; brillan al salir y se apagan poco a poco
const ToolsGlow: React.FC<{ t: number }> = ({ t }) => {
  const { ramp } = useClock();
  const on = neonOn(t - TOOLS.bar) * (1 - ramp(TOOLS.fade, TOOLS.to, easeInOut));
  if (on <= 0.01) return null;
  const pulse = 0.8 + 0.2 * Math.sin(t * 7);
  return (
    <Roto
      job="tool"
      t={t}
      range={[84.6, 88.6]}
      style={{
        opacity: on,
        filter: `brightness(${1.6 + 1.2 * pulse}) sepia(1) hue-rotate(60deg) saturate(${4 * pulse}) drop-shadow(0 0 12px rgba(4,228,0,0.95)) drop-shadow(0 0 32px rgba(4,228,0,0.5))`,
      }}
    />
  );
};

// CTA: «@heracles_fit» encima de la cabeza, siguiendo la cara
const Handle: React.FC<{ t: number }> = ({ t }) => {
  const { pop } = useClock();
  const q = pop(CTA.follow + 0.15, 10, 220);
  if (q < 0.01) return null;
  const face = faceAt(t);
  const bob = Math.sin(t * 3.2) * 6;
  return (
    <div
      style={{
        position: "absolute",
        left: face.x,
        top: face.y - 200 + bob,
        transform: `translate(-50%, -50%) scale(${q}) rotate(${(1 - q) * 10 - 2}deg)`,
        opacity: Math.min(1, q * 2),
        background: "rgba(10,10,10,0.85)",
        border: `3px solid ${GREEN}`,
        borderRadius: 999,
        padding: "10px 22px 8px",
        boxShadow: "0 0 26px rgba(4,228,0,0.45)",
        fontFamily: FONT,
        fontWeight: 900,
        fontStyle: "italic",
        fontSize: 40,
        color: GREEN,
        whiteSpace: "nowrap",
      }}
    >
      @heracles_fit
    </div>
  );
};

export const BodyLayer: React.FC = () => {
  const { t } = useClock();
  const pose = poseAt(t);
  return (
    <div style={{ position: "absolute", inset: 0 }}>
      {t < 1.8 ? <TricepsOn t={t} /> : null}
      {t >= HOOK.no - 0.05 && t < HOOK.to + 0.05 ? <RopeNo t={t} /> : null}
      {pose && t >= OBJ1.from && t < 16.68 ? <ObjCable pose={pose} t={t} /> : null}
      {t >= 16.68 && t < 19.84 ? <ObjOpen /> : null}
      {pose && t >= 19.84 && t < OBJ2.to ? <ObjRot pose={pose} t={t} /> : null}
      {pose && t >= ISO.from && t < ISO.to ? <IsoHold pose={pose} t={t} /> : null}
      {t >= 57.0 && t < 60.16 ? <ForeOn t={t} /> : null}
      {pose && t >= RANGE.from && t < 76.2 ? <SideRange pose={pose} /> : null}
      {pose && t >= FRONT.from && t < FRONT.to ? <FrontCross pose={pose} t={t} /> : null}
      {t >= 84.6 && t < 88.6 ? <ToolsGlow t={t} /> : null}
      {t >= CTA.follow ? <Handle t={t} /> : null}
    </div>
  );
};
