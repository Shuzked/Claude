import React from "react";
import { Easing, Img, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import arms from "./arms.json";
import head from "./head.json";
import { gradeFilter } from "./Grade";
import { GREEN, PAPER } from "./theme";
import { ADD, COMBINE, f, HOOK, HUMERUS, toSrc } from "./timeline";

// Gráficos pegados al cuerpo (dentro de la cámara virtual, coordenadas 1080×1920):
// el húmero (hombro → codo) resaltado y la aducción horizontal del hombro.

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const easeOut = Easing.bezier(0.16, 1, 0.3, 1);
const easeInOut = Easing.bezier(0.65, 0, 0.35, 1);
const NEON = "drop-shadow(0 0 8px rgba(4,228,0,0.9)) drop-shadow(0 0 22px rgba(4,228,0,0.45))";

type P = { x: number; y: number };
const DATA = arms as { fps: number; shots: { t0: number; t1: number; frames: number[][][] }[] };

/** Hombro y codo del brazo izquierdo de la imagen (el que señala Yago). */
const humerusAt = (t: number): { sh: P; el: P } | null => {
  const s = DATA.shots.find((x) => t >= x.t0 && t < x.t1);
  if (!s) return null;
  const i = Math.max(0, Math.min(s.frames.length - 1, Math.round((t - s.t0) * DATA.fps)));
  const fr = s.frames[i];
  // ids: 1/2 hombros, 3/4 codos → el de menor x
  const pick = (a: number, b: number): P => (fr[a][0] < fr[b][0] ? { x: fr[a][0], y: fr[a][1] } : { x: fr[b][0], y: fr[b][1] });
  return { sh: pick(1, 2), el: pick(3, 4) };
};

const useClock = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = toSrc(frame / fps);
  const pop = (at: number, damping = 12, stiffness = 200) => spring({ frame: frame - f(at), fps, config: { damping, stiffness, mass: 0.6 } });
  const ramp = (a: number, b: number, ease = easeOut) => interpolate(frame, [f(a), Math.max(f(a) + 1, f(b))], [0, 1], { ...clamp, easing: ease });
  return { t, frame, fps, pop, ramp };
};

const Svg: React.FC<{ children: React.ReactNode; opacity?: number }> = ({ children, opacity = 1 }) => (
  <svg width={1080} height={1920} style={{ position: "absolute", inset: 0, overflow: "visible", opacity }}>
    {children}
  </svg>
);

// «…el segmento de mi brazo desde el codo hasta el hombro»: el resto se atenúa y el
// húmero queda marcado con una línea que se dibuja con cabeza luminosa
const Humerus: React.FC<{ t: number }> = ({ t }) => {
  const { ramp, pop } = useClock();
  // antes de 7,0 s la pose se confunde con la otra mano: se usa la de 7,0 s
  const h = humerusAt(Math.min(Math.max(t, 7.0), HUMERUS.to));
  if (!h) return null;
  // el foco se apaga poco a poco y termina antes de que abra los brazos (nada cruza el cambio)
  const out = ramp(HUMERUS.to - 0.55, HUMERUS.to, easeInOut);
  const dim = ramp(HUMERUS.from, HUMERUS.from + 0.45) * (1 - out);
  const p = ramp(HUMERUS.line, HUMERUS.line + 0.55);
  const e = { x: h.sh.x + (h.el.x - h.sh.x) * p, y: h.sh.y + (h.el.y - h.sh.y) * p };
  const d1 = pop(HUMERUS.line - 0.05, 8, 260);
  const d2 = pop(HUMERUS.line + 0.5, 8, 260);
  const mid = { x: (h.sh.x + h.el.x) / 2, y: (h.sh.y + h.el.y) / 2 };
  // máscara: todo oscuro salvo una cápsula alrededor del húmero
  const ang = (Math.atan2(h.el.y - h.sh.y, h.el.x - h.sh.x) * 180) / Math.PI;
  const len = Math.hypot(h.el.x - h.sh.x, h.el.y - h.sh.y);
  return (
    <>
      <svg width={1080} height={1920} style={{ position: "absolute", inset: 0, opacity: dim * 0.6 }}>
        <defs>
          <mask id="hum-mask">
            <rect width={1080} height={1920} fill="white" />
            <g transform={`translate(${mid.x} ${mid.y}) rotate(${ang})`}>
              <rect x={-len / 2 - 70} y={-75} width={len + 140} height={150} rx={75} fill="black" style={{ filter: "blur(18px)" }} />
            </g>
          </mask>
        </defs>
        <rect width={1080} height={1920} fill="black" mask="url(#hum-mask)" />
      </svg>
      <Svg opacity={1 - out}>
        {p > 0.01 ? <line x1={h.sh.x} y1={h.sh.y} x2={e.x} y2={e.y} stroke={GREEN} strokeWidth={9} strokeLinecap="round" style={{ filter: NEON }} /> : null}
        {p > 0.02 && p < 0.98 ? <circle cx={e.x} cy={e.y} r={12} fill="#EFFFF0" style={{ filter: NEON }} /> : null}
        {[
          [h.sh, d1, "Hombro"],
          [h.el, d2, "Codo"],
        ].map(([c, q, label], i) => {
          const pt = c as P;
          const k = q as number;
          if (k < 0.01) return null;
          return (
            <g key={i}>
              <circle cx={pt.x} cy={pt.y} r={16 * k} fill={PAPER} stroke={GREEN} strokeWidth={6} style={{ filter: NEON }} />
              <text x={pt.x + 30} y={pt.y + 12} fill={PAPER} fontFamily="Montserrat" fontWeight={900} fontStyle="italic" fontSize={38} opacity={Math.min(1, k)} style={{ textTransform: "uppercase", filter: "drop-shadow(0 2px 8px rgba(0,0,0,0.9))" }}>
                {label as string}
              </text>
            </g>
          );
        })}
      </Svg>
    </>
  );
};

// «…aducción horizontal del hombro»: dos flechas curvas que llevan cada brazo de fuera
// hacia el centro del cuerpo, a la altura de los hombros
const AddArrows: React.FC<{ t: number }> = ({ t }) => {
  const { ramp } = useClock();
  const p = ramp(ADD.from, ADD.from + 0.7);
  const out = ramp(ADD.to - 0.35, ADD.to, easeInOut);
  if (p <= 0.01) return null;
  const y = 1010;
  const arc = (x0: number, x1: number, key: number) => {
    const pts: P[] = [];
    for (let i = 0; i <= 24; i++) {
      const u = (i / 24) * p;
      pts.push({ x: x0 + (x1 - x0) * u, y: y - Math.sin(u * Math.PI) * 70 });
    }
    const e = pts[pts.length - 1];
    const q = pts[pts.length - 3];
    const an = Math.atan2(e.y - q.y, e.x - q.x);
    const hs = 32;
    return (
      <g key={key}>
        <polyline points={pts.map((v) => `${v.x},${v.y}`).join(" ")} fill="none" stroke={GREEN} strokeWidth={10} strokeLinecap="round" />
        <path d={`M ${e.x - Math.cos(an - 0.55) * hs} ${e.y - Math.sin(an - 0.55) * hs} L ${e.x + Math.cos(an) * 8} ${e.y + Math.sin(an) * 8} L ${e.x - Math.cos(an + 0.55) * hs} ${e.y - Math.sin(an + 0.55) * hs} Z`} fill={GREEN} />
      </g>
    );
  };
  const wob = Math.sin(t * 6) * 4;
  return (
    <Svg opacity={1 - out}>
      <g style={{ filter: NEON }} transform={`translate(0 ${wob})`}>
        {arc(70, 430, 0)}
        {arc(1010, 650, 1)}
      </g>
    </Svg>
  );
};

/** Mano de cada lado de la imagen (punto medio muñeca–índice), suavizada por la pose. */
const handsAt = (t: number): [P, P] | null => {
  const s = DATA.shots.find((x) => t >= x.t0 && t < x.t1);
  if (!s) return null;
  const i = Math.max(0, Math.min(s.frames.length - 1, Math.round((t - s.t0) * DATA.fps)));
  const fr = s.frames[i];
  // ids: 5/6 muñecas, 7/8 índices
  const a = { x: (fr[5][0] + fr[7][0]) / 2, y: (fr[5][1] + fr[7][1]) / 2 };
  const b = { x: (fr[6][0] + fr[8][0]) / 2, y: (fr[6][1] + fr[8][1]) / 2 };
  return a.x < b.x ? [a, b] : [b, a];
};

const ease = (u: number) => 1 - Math.pow(1 - Math.max(0, Math.min(1, u)), 3);

/** Mancuerna mini (icono) para las fichas. */
const Dumbbell: React.FC<{ color: string; x: number; y: number; s?: number; rot?: number }> = ({ color, x, y, s = 1, rot = 0 }) => (
  <g transform={`translate(${x} ${y}) rotate(${rot}) scale(${s})`}>
    <rect x={-20} y={-3.5} width={40} height={7} rx={3} fill={color} />
    <rect x={-27} y={-12} width={9} height={24} rx={3} fill={color} />
    <rect x={18} y={-12} width={9} height={24} rx={3} fill={color} />
  </g>
);

// «y también puedo combinarlos»: una ficha en cada mano (PRESS / APERTURAS) que
// vuelan una hacia la otra con estela y se funden en COMBINACIÓN
const Combine: React.FC<{ t: number }> = ({ t }) => {
  const { frame, fps, ramp } = useClock();
  const hands = handsAt(Math.min(t, COMBINE.merge));
  if (!hands) return null;
  const sq = (at: number, d = 9, k = 240) => {
    const cfg = { damping: d, stiffness: k, mass: 0.6 };
    const p = spring({ frame: frame - f(at), fps, config: cfg });
    const p0 = spring({ frame: frame - f(at) - 1, fps, config: cfg });
    const v = Math.max(-0.35, Math.min(0.35, (p - p0) * 2.4));
    return { p, sx: 1 - v * 0.45, sy: 1 + v * 0.55 };
  };
  const FLY = 0.3; // viaje hasta el centro
  const m = ease((t - COMBINE.merge) / FLY);
  const C = { x: (hands[0].x + hands[1].x) / 2, y: Math.min(hands[0].y, hands[1].y) + 10 };
  const out = ramp(COMBINE.to - 0.3, COMBINE.to, easeInOut);
  const hit = COMBINE.merge + FLY;
  const big = sq(hit - 0.02, 7, 260);
  const s = t - hit;
  const chips: [string, number, P, number][] = [
    ["Press", COMBINE.press, hands[0], -1],
    ["Aperturas", COMBINE.fly, hands[1], 1],
  ];
  // posición de una ficha en el instante u del viaje (arco que sube y converge)
  const posAt = (h: P, side: number, u: number) => {
    const home = { x: h.x - side * 135, y: h.y - 95 + Math.sin(t * 5 + side) * 6 };
    const e = ease(u);
    return { x: home.x + (C.x - home.x) * e, y: home.y + (C.y - home.y) * e - Math.sin(e * Math.PI) * 120, r: side * -18 * Math.sin(e * Math.PI) };
  };
  const popOutB = (o: number) => (o < 0.3 ? 1 + 0.08 * (o / 0.3) : 1.08 * (1 - (o - 0.3) / 0.7));
  return (
  <>
    <Svg>
      {/* hilo de energía entre las manos justo antes de juntarlas */}
      {t < hit ? (
        <path
          d={`M ${hands[0].x} ${hands[0].y - 60} Q ${C.x} ${C.y - 140} ${hands[1].x} ${hands[1].y - 60}`}
          fill="none"
          stroke={GREEN}
          strokeWidth={5}
          strokeDasharray="4 18"
          strokeDashoffset={-frame * 6}
          strokeLinecap="round"
          opacity={ramp(COMBINE.merge - 0.35, COMBINE.merge) * (1 - m) * 0.9}
          style={{ filter: NEON }}
        />
      ) : null}
      {t < hit + 0.04
        ? chips.map(([, at, h], i) => {
            const q = sq(at);
            if (q.p < 0.01) return null;
            return <circle key={i} cx={h.x} cy={h.y - 20} r={20 + 70 * q.p} fill="none" stroke={i ? GREEN : PAPER} strokeWidth={4 * (1 - q.p) + 0.5} opacity={1 - q.p} />;
          })
        : null}
      {/* fusión: anillo expansivo y rayos */}
      {s > -0.02 && s < 0.5 ? (
        <g>
          <circle cx={C.x} cy={C.y} r={40 + 380 * ease(s / 0.45)} fill="none" stroke={GREEN} strokeWidth={14 * Math.max(0, 1 - s / 0.45)} opacity={Math.max(0, 1 - s / 0.45)} style={{ filter: NEON }} />
          {Array.from({ length: 14 }, (_, k) => {
            const a = (k / 14) * Math.PI * 2;
            const u = ease(s / 0.4);
            if (s > 0.4) return null;
            return <line key={k} x1={C.x + Math.cos(a) * (60 + 140 * u)} y1={C.y + Math.sin(a) * (60 + 140 * u)} x2={C.x + Math.cos(a) * (90 + 260 * u)} y2={C.y + Math.sin(a) * (90 + 260 * u)} stroke={k % 2 ? PAPER : GREEN} strokeWidth={7 * (1 - u) + 1} strokeLinecap="round" />;
          })}
        </g>
      ) : null}
    </Svg>
    {/* fichas en HTML: el texto define el ancho de la pastilla (nada se desborda) */}
    {t < hit + 0.04
      ? chips.map(([txt, at, h, side], i) => {
          const q = sq(at);
          if (q.p < 0.01) return null;
          const ghosts = m > 0 && m < 1 ? [0.18, 0.12, 0.06] : [];
          const chip = (u: number, alpha: number, key: string) => {
            const pp = posAt(h, side, u);
            const sc = q.p * (1 - 0.25 * ease(u));
            return (
              <div key={key} style={{ position: "absolute", left: pp.x, top: pp.y, opacity: alpha, transform: `translate(-50%, -50%) rotate(${pp.r + side * 4 * (1 - q.p)}deg) scale(${sc * q.sx}, ${sc * q.sy})` }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, whiteSpace: "nowrap", background: i ? GREEN : PAPER, borderRadius: 14, padding: "10px 20px 8px 14px", fontFamily: "Montserrat", fontWeight: 900, fontStyle: "italic", fontSize: 36, lineHeight: 1, textTransform: "uppercase", color: "#0A0A0A", filter: i ? NEON : "drop-shadow(0 10px 20px rgba(0,0,0,0.6))" }}>
                  <svg width={58} height={30} viewBox="-29 -15 58 30" style={{ overflow: "visible" }}>
                    <Dumbbell color="#0A0A0A" x={0} y={0} s={0.85} rot={i ? 0 : -25 + Math.sin(t * 9) * 25} />
                  </svg>
                  {txt}
                </div>
              </div>
            );
          };
          return (
            <React.Fragment key={i}>
              {ghosts.map((g, j) => chip(Math.max(0, m - g), 0.25 - j * 0.07, `g${j}`))}
              {chip(m, 1, "c")}
            </React.Fragment>
          );
        })
      : null}
    {s > -0.02 ? (
      <div style={{ position: "absolute", left: C.x, top: C.y + Math.sin(t * 4) * 6, opacity: 1 - out, transform: `translate(-50%, -50%) rotate(${-3 + Math.sin(t * 3) * 1.2}deg) scale(${big.p * big.sx * popOutB(out)}, ${big.p * big.sy * popOutB(out)})` }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
          <div style={{ position: "relative", overflow: "hidden", whiteSpace: "nowrap", background: GREEN, borderRadius: 20, padding: "16px 34px 12px", fontFamily: "Montserrat", fontWeight: 900, fontStyle: "italic", fontSize: 64, lineHeight: 1, color: "#0A0A0A", filter: NEON }}>
            COMBINACIÓN
            <div style={{ position: "absolute", top: -20, bottom: -20, width: 60, left: `${-20 + 140 * ease((s - 0.25) / 0.5)}%`, background: "rgba(255,255,255,0.45)", transform: "skewX(-20deg)" }} />
          </div>
          <div style={{ whiteSpace: "nowrap", background: "rgba(10,10,10,0.85)", border: `2px solid ${PAPER}`, borderRadius: 12, padding: "10px 20px 8px", fontFamily: "Montserrat", fontWeight: 800, fontSize: 28, lineHeight: 1, letterSpacing: 2, color: PAPER, opacity: Math.min(1, Math.max(0, (s - 0.15) * 4)) }}>
            PRESS + APERTURAS
          </div>
        </div>
      </div>
    ) : null}
  </>
  );
};

// Hook, «200 kilos»: la cabeza (rotoscopiada) se va hinchando, se pone roja del
// esfuerzo (sin gotas, solo la cabeza: el corte va bajo la mandíbula). Recortes RGBA de 220 px (coordenadas de vídeo) en public/roto/head.
const HEAD = head as { t0: number; fps: number; size: number; tl: number[][]; center: number[][] };
const HeadInflate: React.FC<{ t: number }> = ({ t }) => {
  const i = Math.round((t - HEAD.t0) * HEAD.fps);
  if (i < 0 || i >= HEAD.tl.length - 1) return null;
  const k = interpolate(t, [HOOK.press, HOOK.light - 0.06], [0, 1], { ...clamp, easing: Easing.in(Easing.quad) });
  const appear = interpolate(t, [HOOK.press - 0.05, HOOK.press + 0.05], [0, 1], clamp);
  const wob = Math.sin(t * 16) * 0.025 * k;
  const sx = 1 + 0.55 * k + wob;
  const sy = 1 + 0.55 * k - wob;
  const [tx, ty] = HEAD.tl[i];
  const [cx, cy] = HEAD.center[i];
  const n = String(i).padStart(3, "0");
  const red = `sepia(${0.35 * k}) saturate(${1 + 1.8 * k}) hue-rotate(${-14 * k}deg) brightness(${1 - 0.06 * k}) contrast(${1 + 0.1 * k})`;
  const R = 95 * sx; // radio aprox. de la cabeza hinchada
  return (
    <>
      <div style={{ position: "absolute", left: tx, top: ty, width: HEAD.size, height: HEAD.size, opacity: appear, transformOrigin: `${cx - tx}px ${cy - ty}px`, transform: `scale(${sx}, ${sy})`, filter: "drop-shadow(0 6px 10px rgba(0,0,0,0.45))" }}>
        <div style={{ position: "absolute", inset: 0, filter: gradeFilter(1) }}>
          <Img src={staticFile(`roto/head/h_${n}.png`)} style={{ width: "100%", height: "100%", filter: red }} />
        </div>
      </div>
      <Svg>
        {/* rayitas de agobio alrededor de la cabeza */}
        {k > 0.3
          ? [-2.6, -2.0, -0.7].map((a, j) => {
              const p = 0.5 + 0.5 * Math.sin(t * 12 + j * 2);
              const r0 = R * 1.12 + p * 6;
              return <path key={j} d={`M ${cx + Math.cos(a) * r0} ${cy + Math.sin(a) * r0} q ${Math.cos(a + 0.6) * 14} ${Math.sin(a + 0.6) * 14} ${Math.cos(a) * 26} ${Math.sin(a) * 26}`} fill="none" stroke="rgba(200,235,255,0.95)" strokeWidth={4} strokeLinecap="round" opacity={Math.min(1, (k - 0.3) * 3)} />;
            })
          : null}
      </Svg>
    </>
  );
};

export const BodyLayer: React.FC = () => {
  const { t } = useClock();
  return (
    <div style={{ position: "absolute", inset: 0 }}>
      {t >= HOOK.press - 0.1 && t < HOOK.light ? <HeadInflate t={t} /> : null}
      {t >= HUMERUS.from - 0.05 && t < HUMERUS.to + 0.05 ? <Humerus t={t} /> : null}
      {t >= ADD.from - 0.05 && t < ADD.to + 0.05 ? <AddArrows t={t} /> : null}
      {t >= COMBINE.press - 0.05 && t < COMBINE.to + 0.05 ? <Combine t={t} /> : null}
    </div>
  );
};
