import React from "react";
import {
  AbsoluteFill,
  Easing,
  Img,
  interpolate,
  OffthreadVideo,
  Sequence,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import faceTrack from "./faceTrack.json";
import hand from "./hand.json";
import palm from "./palm.json";
import { CameraSpace } from "./Camera";
import { gradeFilter } from "./Grade";
import { FONT, GREEN, PAPER } from "./theme";
import { ABD, ANAT, APORTE, CAT, COMBO, CRIT, CTA, f, MAYOR, PHONE, POS, REACT, STARTP, STUDY, toSrc } from "./timeline";

// Rótulos de «Glúteos: extensión y abducción». Los gráficos pegados al cuerpo están
// en Body.tsx. Todas las capas leen el tiempo del ORIGINAL (toSrc).

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



// ---------------------------------------------------------------------------------
// Ventana con Yago (el propio vídeo): la cara centrada en la ventana con el tracking.
const FT = faceTrack as { fps: number; points: [number, number][] };
const faceMed = (t: number) => {
  const i = Math.round(t * FT.fps);
  const w = FT.points.slice(Math.max(0, i - 12), i + 13);
  const m = (k: 0 | 1) => w.map((p) => p[k]).sort((a, b) => a - b)[Math.floor(w.length / 2)];
  return { x: m(0), y: m(1) };
};
const YagoWindow: React.FC<{ from: number; to: number; top: number; height: number; scale?: number; faceY?: number; width?: number; focus?: { x: number; y: number } }> = ({ from, to, top, height, scale = 1.15, faceY = 0.36, width = 1080, focus }) => {
  const { t } = useClock();
  const fc = focus ?? faceMed(Math.min(Math.max(t, from), to));
  const left = Math.max(width - 1080 * scale, Math.min(0, width / 2 - scale * fc.x));
  const vt = Math.max(height - 1920 * scale, Math.min(0, height * faceY - scale * fc.y));
  return (
    <div style={{ position: "absolute", left: 0, top, width, height, overflow: "hidden", background: "#000" }}>
      <Sequence from={f(from)} durationInFrames={Math.max(1, f(to) - f(from))} layout="none">
        <div style={{ position: "absolute", left, top: vt, width: 1080 * scale, height: 1920 * scale, filter: gradeFilter(t) }}>
          <OffthreadVideo src={staticFile("video.mp4")} startFrom={Math.round(from * 25)} muted style={{ width: "100%", height: "100%" }} />
        </div>
      </Sequence>
    </div>
  );
};

// E01 (hook): desde el primer fotograma Yago ya reacciona. Detrás, el vídeo original
// ocupa la parte de arriba y se funde con su fondo real; Yago va rotoscopiado delante.
const HOOK_ROTO = { x: 0, y: 450, w: 1080, h: 1470, t0: 1.72, n: 131 };
const HookReact: React.FC = () => {
  const { t, ramp } = useClock();
  if (t > REACT.cut + 0.02) return null;
  const fadeIn = ramp(REACT.hook, REACT.hook + 0.3);
  const fadeOut = ramp(REACT.cut - 0.4, REACT.cut, easeInOut);
  const i = Math.max(0, Math.min(HOOK_ROTO.n - 1, Math.round((t - HOOK_ROTO.t0) * 25)));
  const n = String(i + 1).padStart(3, "0");
  const mask = "linear-gradient(180deg, #000 0%, #000 50%, rgba(0,0,0,0.55) 58%, transparent 66%)";
  return (
    <AbsoluteFill>
      <AbsoluteFill style={{ opacity: fadeIn * (1 - fadeOut), maskImage: mask, WebkitMaskImage: mask }}>
        <Sequence from={f(REACT.hook)} durationInFrames={f(REACT.cut) - f(REACT.hook) + 2} layout="none">
          <OffthreadVideo src={staticFile("broll/reaccion_loop.mp4")} muted style={{ position: "absolute", left: -90, top: -570, width: 1200, height: 2133 }} />
        </Sequence>
              </AbsoluteFill>
      <CameraSpace>
        <div style={{ position: "absolute", left: HOOK_ROTO.x, top: HOOK_ROTO.y, width: HOOK_ROTO.w, height: HOOK_ROTO.h, filter: gradeFilter(3), opacity: 1 - fadeOut }}>
          <Img src={staticFile(`roto/hook/h_${n}.webp`)} style={{ width: "100%", height: "100%" }} />
        </div>
      </CameraSpace>
    </AbsoluteFill>
  );
};

// E01–E02 (0:05): «mapa del tesoro» del glúteo. «Acortamiento → arriba» y
// «estiramiento → abajo» se clavan como chinchetas; en «no funciona… un mapa» el mapa
// se rasga y cae el sello «Mapa simplista».
const MAP = { from: 6.95, top: 8.12, bot: 10.52, no: 11.76, stamp: 14.1, to: 14.78 };
const GluteMapScene: React.FC = () => {
  const { t, frame, squash, ramp, idle } = useClock();
  if (t < MAP.from - 0.05 || t > MAP.to + 0.05) return null;
  const c = squash(MAP.from, 12, 170);
  const draw = ramp(MAP.from + 0.1, MAP.from + 0.9);
  const pTop = squash(MAP.top, 8, 260);
  const pBot = squash(MAP.bot, 8, 260);
  const tear = ramp(MAP.no, MAP.no + 0.5, easeInOut);
  const st = squash(MAP.stamp - 0.9, 7, 300);
  const out = ramp(MAP.to - 0.3, MAP.to, easeInOut);
  const id = idle(2.7, 0.6);
  const route = draw * 1;
  const L = "M 210 70 C 130 60 50 110 44 230 C 38 340 110 420 206 404 C 214 310 214 170 210 70 Z";
  const R = "M 230 70 C 310 60 390 110 396 230 C 402 340 330 420 234 404 C 226 310 226 170 230 70 Z";
  const pin = (q: { p: number; sx: number; sy: number }, x: number, y: number, col: string, txt: string, sub: string, dy: number) =>
    q.p > 0.01 ? (
      <g transform={`translate(${x} ${y - (1 - q.p) * 120}) scale(${q.sx} ${q.sy})`} opacity={Math.min(1, q.p * 2)}>
        <ellipse cx={0} cy={8} rx={14 * q.p} ry={5 * q.p} fill="rgba(0,0,0,0.35)" />
        <path d="M 0 6 L -12 -22 A 15 15 0 1 1 12 -22 Z" fill={col} stroke="#3a2a14" strokeWidth={3} />
        <circle cx={0} cy={-28} r={6} fill="#fff8e8" />
        <g transform={`translate(${x > 220 ? 26 : -26} ${dy})`}>
          <rect x={x > 220 ? 0 : -210} y={-26} width={210} height={58} rx={10} fill="#3a2a14" />
          <text x={x > 220 ? 105 : -105} y={-2} textAnchor="middle" fill="#fff3d6" fontFamily={FONT} fontWeight={900} fontStyle="italic" fontSize={22}>{txt}</text>
          <text x={x > 220 ? 105 : -105} y={22} textAnchor="middle" fill={col} fontFamily={FONT} fontWeight={800} fontSize={16} letterSpacing={2}>{sub}</text>
        </g>
      </g>
    ) : null;
  return (
    <AbsoluteFill style={{ opacity: out > 0.85 ? (1 - out) / 0.15 : 1 }}>
      <div style={{ position: "absolute", left: 90, top: 110, width: 900, height: 640, transformOrigin: "50% 0%", transform: `translateY(${(1 - c.p) * -200 + id.y}px) rotate(${-2 + id.r * 0.4 + (1 - c.p) * -10}deg) scale(${0.74 * c.sx * popOut(out)}, ${0.74 * c.sy * popOut(out)})`, opacity: Math.min(1, c.p * 2) }}>
        <svg width={900} height={640} viewBox="0 0 900 640" style={{ overflow: "visible", filter: "drop-shadow(0 30px 40px rgba(0,0,0,0.6))" }}>
          <defs>
            <linearGradient id="parch" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#f3e2bd" />
              <stop offset="1" stopColor="#d9bf8a" />
            </linearGradient>
            <clipPath id="tearL"><path d={`M 0 0 L ${450 - tear * 10} 0 L ${430 - tear * 30} 160 L ${468 - tear * 30} 300 L ${428 - tear * 30} 460 L ${452 - tear * 30} 640 L 0 640 Z`} /></clipPath>
            <clipPath id="tearR"><path d={`M ${450 + tear * 10} 0 L 900 0 L 900 640 L ${452 + tear * 30} 640 L ${428 + tear * 30} 460 L ${468 + tear * 30} 300 L ${430 + tear * 30} 160 Z`} /></clipPath>
          </defs>
          {[0, 1].map((side) => (
            <g key={side} clipPath={`url(#${side ? "tearR" : "tearL"})`} transform={`translate(${(side ? 1 : -1) * tear * 60} ${tear * 30}) rotate(${(side ? 1 : -1) * tear * 5} 450 320)`}>
              <path d="M 20 30 Q 230 0 450 24 T 880 26 L 872 600 Q 650 630 450 612 T 26 618 Z" fill="url(#parch)" stroke="#8a6a3a" strokeWidth={4} />
              {/* rosa de los vientos */}
              <g transform="translate(790 120)" opacity={0.7}>
                <path d="M 0 -50 L 10 0 L 0 50 L -10 0 Z" fill="#8a6a3a" />
                <path d="M -50 0 L 0 10 L 50 0 L 0 -10 Z" fill="#b08b52" />
                <text x={0} y={-58} textAnchor="middle" fill="#5a4320" fontFamily={FONT} fontWeight={900} fontSize={20}>N</text>
              </g>
              <text x={60} y={84} fill="#5a4320" fontFamily={FONT} fontWeight={900} fontStyle="italic" fontSize={34}>EL «MAPA» DEL GLÚTEO</text>
              <g transform="translate(230 120)">
                <path d={L} fill="none" stroke="#5a4320" strokeWidth={5} pathLength={1} strokeDasharray={`${route} 1`} />
                <path d={R} fill="none" stroke="#5a4320" strokeWidth={5} pathLength={1} strokeDasharray={`${route} 1`} />
                {/* frontera arriba / abajo */}
                <line x1={30} y1={235} x2={410} y2={235} stroke="#8a2a14" strokeWidth={4} strokeDasharray="14 10" opacity={draw} />
                <path d={`M 60 360 C 140 300 260 330 330 190 C 360 130 300 90 250 120`} fill="none" stroke="#8a2a14" strokeWidth={4} strokeDasharray="4 12" opacity={draw * 0.8} />
                {pin(pTop, 300, 150, "#2e8b2e", "Acortamiento", "→ PARTE ALTA", -10)}
                {pin(pBot, 140, 330, "#b5651d", "Estiramiento", "→ PARTE BAJA", 10)}
              </g>
            </g>
          ))}
        </svg>
        {t >= MAP.stamp - 0.95 ? (
          <div style={{ position: "absolute", left: 0, right: 0, top: 250, display: "flex", justifyContent: "center", opacity: Math.min(1, st.p * 2) }}>
            <div style={{ position: "relative", ...display, fontStyle: "normal", fontSize: 92, color: RED, border: `9px solid ${RED}`, borderRadius: 18, padding: "10px 30px 4px", background: "rgba(10,10,10,0.6)", transform: `rotate(-9deg) scale(${(2.2 - 1.2 * st.p) * st.sx}, ${(2.2 - 1.2 * st.p) * st.sy})`, filter: "drop-shadow(0 0 18px rgba(255,59,48,0.6))" }}>
              Mapa simplista
              <Burst x={300} y={60} d={t - (MAP.stamp - 0.75)} r={260} color={RED} n={16} />
            </div>
          </div>
        ) : null}
      </div>
      <div style={{ display: "none" }}>{frame}</div>
    </AbsoluteFill>
  );
};

// E02 (0:14): «Una cosa es AISLAR una región…» — la figura de Takahashi flota como un
// holograma sobre la palma de su mano; en «FAVORECER» sale al centro con «≠».
const PALM = palm as { t0: number; fps: number; pts: number[][] };
const Anat: React.FC = () => {
  const { t, frame, squash, ramp } = useClock();
  if (t < ANAT.from - 0.05 || t > ANAT.to + 0.05) return null;
  const i = Math.max(0, Math.min(PALM.pts.length - 1, Math.round((t - PALM.t0) * PALM.fps)));
  const [px, py] = PALM.pts[i];
  const appear = squash(15.7, 11, 190);
  const lift = squash(ANAT.fav, 12, 170);
  const iso = squash(ANAT.iso, 8, 260);
  const fav = squash(ANAT.fav + 0.15, 7, 300);
  const out = ramp(ANAT.to - 0.3, ANAT.to, easeInOut);
  const W = 560;
  const H = W * (725 / 1570) + 40;
  const pulse = 0.55 + 0.45 * Math.sin(t * 5);
  // sobre la palma → arriba al centro
  const hx = px - W / 2;
  const hy = py - H - 120;
  const x = hx + (260 - hx) * lift.p;
  const y = hy + (190 - hy) * lift.p;
  const sc = (0.55 + 0.45 * lift.p) * appear.p;
  const flick = 0.9 + 0.06 * Math.sin(frame * 1.7);
  return (
    <AbsoluteFill style={{ opacity: out > 0.85 ? (1 - out) / 0.15 : 1 }}>
      {/* haz desde la palma mientras la sostiene */}
      {lift.p < 0.95 && appear.p > 0.02 ? (
        <svg width={1080} height={1920} style={{ position: "absolute", inset: 0, mixBlendMode: "screen", opacity: (1 - lift.p) * appear.p }}>
          <defs>
            <linearGradient id="palmbeam" x1="0" y1="1" x2="0" y2="0">
              <stop offset="0" stopColor="rgba(120,255,140,0.6)" />
              <stop offset="1" stopColor="rgba(120,255,140,0.05)" />
            </linearGradient>
          </defs>
          <polygon points={`${px - 20},${py - 20} ${px + 20},${py - 20} ${x + W * sc * 0.5 + (W / 2) * sc},${y + H * sc} ${x + W * sc * 0.5 - (W / 2) * sc},${y + H * sc}`} fill="url(#palmbeam)" style={{ filter: "blur(4px)" }} />
          <ellipse cx={px} cy={py - 18} rx={34 + 4 * Math.sin(frame * 0.6)} ry={10} fill="rgba(160,255,170,0.8)" style={{ filter: "blur(4px)" }} />
        </svg>
      ) : null}
      <div style={{ position: "absolute", left: x, top: y, width: W, transformOrigin: "0% 0%", transform: `scale(${sc}) rotate(${(1 - lift.p) * -4}deg)`, opacity: lift.p > 0.5 ? 1 : flick }}>
        <div style={{ position: "relative", background: lift.p > 0.5 ? "white" : "rgba(235,255,238,0.9)", borderRadius: 18, padding: "12px 12px 8px", boxShadow: lift.p > 0.5 ? "0 30px 70px rgba(0,0,0,0.6)" : "0 0 40px rgba(4,228,0,0.6)", border: "2px solid rgba(120,255,140,0.8)" }}>
          <Img src={staticFile("paper/p2_fig3a.png")} style={{ width: "100%", display: "block" }} />
          <svg viewBox="0 0 1570 725" style={{ position: "absolute", left: 12, top: 12, width: "calc(100% - 24px)", overflow: "visible" }}>
            <ellipse cx={330} cy={250} rx={95} ry={70} fill="none" stroke={GREEN} strokeWidth={8} opacity={pulse} style={{ filter: NEON }} />
            <ellipse cx={370} cy={470} rx={95} ry={75} fill="none" stroke={GREEN} strokeWidth={8} opacity={1.5 - pulse} style={{ filter: NEON }} />
          </svg>
          <div style={{ ...label, fontSize: 16, letterSpacing: 2, color: "rgba(0,0,0,0.6)", textAlign: "center", marginTop: 2 }}>Arquitectura del glúteo mayor · Takahashi et al., 2025</div>
        </div>
      </div>
      {/* «Aislar» junto a la mano; luego «≠ Favorecer» */}
      <div style={{ position: "absolute", left: 0, right: 0, top: lift.p > 0.01 ? 560 + (1 - lift.p) * 300 : 860, display: "flex", justifyContent: "center", alignItems: "center", gap: 16 }}>
        <div style={{ ...display, fontSize: 72, color: INK, background: PAPER, padding: "12px 24px 6px", borderRadius: 14, opacity: Math.min(1, iso.p * 2), transform: `translateY(${(1 - iso.p) * 40}px) scale(${iso.sx}, ${iso.sy}) rotate(-2deg)` }}>Aislar</div>
        {fav.p > 0.01 ? (
          <>
            <div style={{ position: "relative", ...display, fontStyle: "normal", fontSize: 90, color: RED, ...stroke(6), transform: `scale(${fav.p * fav.sx}, ${fav.p * fav.sy})` }}>
              ≠
              <Burst x={30} y={55} d={t - ANAT.fav - 0.15} r={70} color={RED} />
            </div>
            <div style={{ ...display, fontSize: 72, color: INK, background: GREEN, padding: "12px 24px 6px", borderRadius: 14, filter: GLOW, opacity: Math.min(1, fav.p * 2), transform: `translateX(${(1 - fav.p) * 80}px) scale(${fav.sx}, ${fav.sy}) rotate(2deg)` }}>Favorecer</div>
          </>
        ) : null}
      </div>
    </AbsoluteFill>
  );
};

// E04: fondo de escena de siempre y cada ejercicio, uno a uno, a pantalla; los
// anteriores se apilan detrás. En «la misma sesión» se abanican todos juntos.
const Catalog: React.FC = () => {
  const { t, squash, ramp } = useClock();
  if (t < CAT.bgFrom - 0.3 || t > CAT.bgTo + 0.05) return null;
  const head = squash(CAT.bgFrom + 0.15, 10, 220);
  const fan = squash(CAT.session, 11, 180);
  const st = squash(CAT.session + 0.1, 7, 300);
  const fanOut = ramp(CAT.bgTo - 0.45, CAT.bgTo - 0.1, easeInOut);
  const items = CAT.items;
  return (
    <AbsoluteFill>
      <Backdrop from={CAT.bgFrom} to={CAT.bgTo} title="Catálogo" id="cat" />
      <AbsoluteFill style={{ opacity: 1 - fanOut }}>
        <div style={{ position: "absolute", top: 210, left: 0, right: 0, display: "flex", justifyContent: "center", opacity: Math.min(1, head.p * 2) * (1 - fan.p) }}>
          <div style={{ transform: `scale(${head.sx}, ${head.sy}) rotate(-2deg)` }}>
            <Words text="Lo que no necesito meter…" at={CAT.bgFrom + 0.15} gap={0.06} style={{ ...display, ...stroke(8), fontSize: 56 }} />
          </div>
        </div>
        {items.map(([at, file, name], i) => {
          const q = squash(at, 10, 210);
          if (q.p < 0.01) return null;
          // profundidad continua: cuántas tarjetas han entrado después de esta
          const d = items.slice(i + 1).reduce((acc, [a2]) => acc + squash(a2, 12, 200).p, 0);
          const side = i % 2 ? 1 : -1;
          const W = 560;
          const H = 700;
          // pila (detrás) → abanico en «la misma sesión»
          const pileX = 260 + side * (90 + 40 * d) * Math.min(1, d);
          const pileY = 380 - 26 * d;
          const pileS = 1 - 0.13 * d;
          const pileR = side * (5 + 3 * d) * Math.min(1, d);
          const col = i % 3;
          const row = Math.floor(i / 3);
          const fanX = 40 + col * 340;
          const fanY = 330 + row * 470;
          const fanS = 0.56;
          const x = pileX + (fanX - pileX) * fan.p;
          const y = pileY + (fanY - pileY) * fan.p;
          const sc = pileS + (fanS - pileS) * fan.p;
          const rot = pileR * (1 - fan.p) + (col - 1) * 3 * fan.p;
          const dim = 1 - Math.min(0.45, 0.25 * d) * (1 - fan.p);
          return (
            <div key={i} style={{ position: "absolute", left: x, top: y, width: W, height: H, zIndex: 10 + i, transformOrigin: "0% 0%", transform: `translateY(${(1 - q.p) * 700}px) scale(${sc * q.sx}, ${sc * q.sy}) rotate(${rot + (1 - q.p) * 12}deg)`, filter: `brightness(${dim})` }}>
              <div style={{ position: "absolute", inset: 0, borderRadius: 26, overflow: "hidden", border: `5px solid ${PAPER}`, boxShadow: "0 30px 60px rgba(0,0,0,0.65)", background: "#111" }}>
                <Sequence from={f(at)} durationInFrames={Math.max(1, f(CAT.bgTo) - f(at))} layout="none">
                  <OffthreadVideo src={staticFile(`broll/${file}.mp4`)} muted startFrom={file === "reaccion" ? 30 : 0} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                </Sequence>
              </div>
              <div style={{ position: "absolute", left: 0, right: 0, bottom: -26, display: "flex", justifyContent: "center" }}>
                <div style={{ ...display, fontSize: 52, color: INK, background: GREEN, padding: "8px 20px 4px", borderRadius: 12, filter: GLOW }}>{name}</div>
              </div>
            </div>
          );
        })}
        {t >= CAT.session ? (
          <div style={{ position: "absolute", left: 0, right: 0, top: 210, display: "flex", justifyContent: "center", zIndex: 50, opacity: Math.min(1, st.p * 2) }}>
            <div style={{ ...display, fontStyle: "normal", fontSize: 66, color: RED, border: `7px solid ${RED}`, borderRadius: 14, padding: "8px 22px 2px", background: "rgba(10,10,10,0.8)", transform: `rotate(-4deg) scale(${(2 - st.p) * st.sx}, ${(2 - st.p) * st.sy})` }}>¿Todo en la misma sesión?</div>
          </div>
        ) : null}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// E05: abducción = separar la pierna (la flecha sobre la pierna está en Body.tsx)
const AbdTitle: React.FC = () => {
  const { t, squash, ramp } = useClock();
  if (t < ABD.word - 0.05 || t > ABD.to + 0.05) return null;
  const q = squash(ABD.word, 9, 230);
  const s = squash(ABD.sep, 9, 230);
  const out = ramp(ABD.to - 0.3, ABD.to, easeInOut);
  return (
    <AbsoluteFill style={{ opacity: out > 0.85 ? (1 - out) / 0.15 : 1 }}>
      <div style={{ position: "absolute", top: 250, left: 0, right: 0, display: "flex", flexDirection: "column", alignItems: "center", gap: 10, transform: `scale(${popOut(out)})` }}>
        <div style={{ position: "relative", transform: `scale(${q.p * q.sx}, ${q.p * q.sy}) rotate(-2deg)` }}>
          <Words text="Abducción" at={ABD.word} gap={0.05} style={{ ...display, ...stroke(10), fontSize: 120, color: GREEN }} />
          <Burst x={330} y={60} d={t - ABD.word} r={200} n={14} />
        </div>
        <div style={{ ...display, fontSize: 52, color: INK, background: PAPER, padding: "10px 22px 5px", borderRadius: 12, opacity: Math.min(1, s.p * 2), transform: `translateY(${(1 - s.p) * 30}px) scale(${s.sx}, ${s.sy}) rotate(1.5deg)` }}>= separar la pierna</div>
      </div>
    </AbsoluteFill>
  );
};

// E06: P1, figura 3A — a la izquierda la figura real; a la derecha un «mapa» del glúteo
// mayor con las tres alturas que se llenan según la media de cada región (aprox. de la
// figura). Primero extensión y luego abducción; la demo de cada una en su ventana.
const FIG = { left: 30, top: 330, w: 500 };
const FIG_H = FIG.w * (684 / 659);
const VALS = { ext: [5.5, 8.5, 13.5], abd: [10, 4, 1.5] }; // PROX, MID, DIST (Δ% aprox.)
/** Barras claras: cuánto creció cada zona del glúteo mayor con el ejercicio actual. */
const RegionBars: React.FC<{ vals: number[]; prog: number; col: string; t: number }> = ({ vals, prog, col, t }) => {
  const names = ["Parte superior", "Parte media", "Parte inferior"];
  const max = Math.max(...vals);
  const W = 260;
  return (
    <div style={{ width: 460, display: "flex", flexDirection: "column", gap: 16, padding: "18px 20px", borderRadius: 18, background: "rgba(10,10,10,0.75)", border: "2px solid rgba(255,255,255,0.15)" }}>
      {names.map((n, i) => {
        const v = vals[i] * prog;
        const top = vals[i] === max;
        return (
          <div key={n}>
            <div style={{ display: "flex", justifyContent: "space-between", ...label, fontSize: 18, letterSpacing: 2, color: top ? col : PAPER }}>
              <span>{n}</span>
              <span style={{ ...display, fontSize: 30, color: top ? col : PAPER }}>+{v.toFixed(0)}%</span>
            </div>
            <div style={{ marginTop: 6, height: 26, width: W + 120, borderRadius: 13, background: "rgba(255,255,255,0.1)", overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${(v / 14) * 100}%`, borderRadius: 13, background: col, opacity: top ? 1 : 0.55, boxShadow: top ? `0 0 ${14 + 6 * Math.sin(t * 7)}px ${col}` : undefined }} />
            </div>
          </div>
        );
      })}
      <div style={{ ...label, fontSize: 13, letterSpacing: 1, color: "rgba(255,255,255,0.6)", textTransform: "none" }}>Crecimiento medio aproximado de cada zona (figura 3A)</div>
    </div>
  );
};
const Study: React.FC = () => {
  const { t, squash, ramp, idle } = useClock();
  if (t < STUDY.bgFrom - 0.3 || t > STUDY.bgTo + 0.05) return null;
  const card = squash(STUDY.from, 11, 200);
  const toFig = ramp(STUDY.fig - 0.15, STUDY.fig + 0.3, easeInOut);
  const fig = squash(STUDY.fig, 12, 190);
  const abdOn = t >= STUDY.abd;
  const hExt = ramp(STUDY.ext, STUDY.ext + 0.4);
  const hAbd = ramp(STUDY.abd, STUDY.abd + 0.4);
  const progExt = ramp(STUDY.ext + 0.3, STUDY.ext + 1.8);
  const progAbd = ramp(STUDY.abd + 0.2, STUDY.abd + 1.7);
  const swap = squash(STUDY.abd, 10, 220);
  const lExt = squash(STUDY.extLab, 9, 240);
  const lAbd = squash(STUDY.abdLab, 9, 240);
  const map = squash(STUDY.fig + 0.25, 11, 200);
  const out = ramp(STUDY.to - 0.3, STUDY.to, easeInOut);
  const id = idle(5.5, 0.4);
  const chips = ["17 personas", "10 semanas", "Sin fuerza reciente", "Resonancia"];
  const col = abdOn ? "#FFB020" : GREEN;
  const box = (x0: number, x1: number, on: number, c: string) => (
    <div style={{ position: "absolute", left: FIG.left + 12 + x0 * FIG.w, top: FIG.top + 12 + 0.08 * FIG_H, width: (x1 - x0) * FIG.w, height: 0.86 * FIG_H, border: `5px solid ${c}`, borderRadius: 14, opacity: on, boxShadow: `0 0 ${18 + 8 * Math.sin(t * 8)}px ${c}`, transform: `scale(${0.9 + 0.1 * on})` }} />
  );
  return (
    <AbsoluteFill>
      <Backdrop from={STUDY.bgFrom} to={STUDY.bgTo} title="Estudio" id="p1" />
      <AbsoluteFill style={{ opacity: (1 - out) * ramp(STUDY.from - 0.05, STUDY.from + 0.2) }}>
        {toFig < 1 ? (
          <div style={{ position: "absolute", top: 380, left: 60, right: 60, opacity: 1 - toFig, transform: `translateY(${(1 - card.p) * 100 - toFig * 80 + id.y}px) scale(${card.sx}, ${card.sy})` }}>
            <div style={{ background: "white", borderRadius: 18, padding: "22px 22px 18px", boxShadow: "0 40px 90px rgba(0,0,0,0.6)" }}>
              <div style={{ ...label, fontSize: 18, letterSpacing: 3, color: "rgba(0,0,0,0.5)", marginBottom: 10 }}>Attarieh et al., 2026 · J Strength Cond Res</div>
              <Img src={staticFile("paper/p1_title.png")} style={{ width: "100%", display: "block" }} />
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 14, marginTop: 36 }}>
              {chips.map((c, i) => {
                const q = squash(STUDY.from + 0.3 + i * 0.2, 9, 240);
                return (
                  <div key={i} style={{ ...display, fontSize: 44, color: i === 0 ? INK : PAPER, background: i === 0 ? GREEN : "rgba(255,255,255,0.08)", border: i === 0 ? "none" : "2px solid rgba(255,255,255,0.3)", padding: "10px 20px 5px", borderRadius: 12, opacity: Math.min(1, q.p * 2), transform: `translateY(${(1 - q.p) * 40}px) scale(${q.sx}, ${q.sy})` }}>{c}</div>
                );
              })}
            </div>
          </div>
        ) : null}
        {t >= STUDY.fig - 0.15 ? (
          <>
            <div style={{ position: "absolute", left: 0, right: 0, top: 210, display: "flex", justifyContent: "center", opacity: Math.min(1, fig.p * 2) }}>
              <div style={{ ...label, fontSize: 24, letterSpacing: 3, color: PAPER, background: "rgba(10,10,10,0.7)", padding: "8px 16px", borderRadius: 10 }}>Crecimiento del glúteo mayor por zonas</div>
            </div>
            {/* figura real */}
            <div style={{ position: "absolute", left: FIG.left, top: FIG.top, width: FIG.w + 24, opacity: Math.min(1, fig.p * 2), transform: `translateX(${(1 - fig.p) * -300}px) rotate(${(1 - fig.p) * -8 - 1}deg)`, transformOrigin: "50% 0%" }}>
              <div style={{ background: "white", borderRadius: 16, padding: 12, boxShadow: "0 30px 70px rgba(0,0,0,0.6)" }}>
                <Img src={staticFile("paper/p1_fig3a.png")} style={{ width: "100%", display: "block" }} />
              </div>
              <div style={{ ...label, fontSize: 15, letterSpacing: 1, color: "rgba(255,255,255,0.75)", textTransform: "none", marginTop: 8 }}>PROX = superior · MID = media · DIST = inferior</div>
            </div>
            {box(0.27, 0.58, hExt * (abdOn ? 0.3 : 1), GREEN)}
            {box(0.6, 0.93, hAbd, "#FFB020")}
            {/* mapa del glúteo con el ejercicio actual */}
            <div style={{ position: "absolute", left: 560, top: FIG.top - 10, width: 500, display: "flex", flexDirection: "column", alignItems: "center", opacity: Math.min(1, map.p * 2), transform: `translateX(${(1 - map.p) * 300}px) scale(${map.sx}, ${map.sy})` }}>
              <div style={{ ...display, fontSize: 36, color: INK, background: col, padding: "8px 16px 4px", borderRadius: 10, transform: `scale(${abdOn ? 0.8 + 0.2 * swap.p : 1})`, filter: abdOn ? undefined : GLOW }}>{abdOn ? "Abducción en polea" : "Extensión en polea"}</div>
              <div style={{ marginTop: 18, transform: `scale(${abdOn ? 0.85 + 0.15 * swap.p : 1})` }}>
                <RegionBars vals={abdOn ? VALS.abd : VALS.ext} prog={abdOn ? progAbd : progExt} col={col} t={t} />
              </div>
              {/* demo del ejercicio */}
              <div style={{ position: "relative", marginTop: 14, width: 300, height: 300, borderRadius: 18, overflow: "hidden", border: `4px solid ${col}`, boxShadow: "0 20px 40px rgba(0,0,0,0.6)" }}>
                <YagoWindow from={STUDY.fig} to={STUDY.to} top={0} height={300} width={300} scale={0.55} faceY={0.5} focus={{ x: 715, y: 1500 }} />
              </div>
            </div>
            <div style={{ position: "absolute", left: 30, right: 30, top: 1170, display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
              {[
                [lExt, "Extensión: más crecimiento abajo que arriba", GREEN],
                [lAbd, "Abducción: más crecimiento arriba que abajo", "#FFB020"],
              ].map(([q, s, c], i) => {
                const qq = q as { p: number; sx: number; sy: number };
                if (qq.p < 0.01) return null;
                return (
                  <div key={i} style={{ ...display, fontSize: 32, color: INK, background: c as string, padding: "10px 18px 5px", borderRadius: 12, opacity: Math.min(1, qq.p * 2), transform: `translateY(${(1 - qq.p) * 30}px) scale(${qq.sx}, ${qq.sy}) rotate(${i ? 1 : -1}deg)` }}>{s as string}</div>
                );
              })}
            </div>
            <div style={{ position: "absolute", left: 0, right: 0, top: 1300, display: "flex", justifyContent: "center", opacity: Math.min(1, fig.p * 2) }}>
              <div style={{ ...label, fontSize: 16, letterSpacing: 1.2, color: "rgba(255,255,255,0.7)", textTransform: "none" }}>Cambio de área transversal · medias e IC95% · 17 personas, una condición por pierna</div>
            </div>
          </>
        ) : null}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// E07: del móvil sale una proyección holográfica (haz de luz + pantalla flotante
// girada hacia él) que va pasando vídeos con sus propios swipes
const FEED = ["sentadilla", "bulgaras", "reaccion", "stepups", "hipthrust", "peso", "sentadilla", "bulgaras", "stepups", "reaccion"];
const PH = { x: 620, y: 300, w: 380, h: 676 };
const HAND = hand as { t0: number; fps: number; pts: number[][] };
const PhoneFeed: React.FC = () => {
  const { t, frame, squash, ramp } = useClock();
  if (t < PHONE.in - 0.05 || t > PHONE.out + 0.4) return null;
  const inQ = squash(PHONE.in, 13, 160);
  const back = ramp(PHONE.out, PHONE.out + 0.35, easeInOut);
  const k = inQ.p * (1 - back);
  const hi = Math.max(0, Math.min(HAND.pts.length - 1, Math.round((t - HAND.t0) * HAND.fps)));
  const [hx, hy] = HAND.pts[hi];
  const done = PHONE.swipes.filter((s) => t >= s).length;
  const last = PHONE.swipes[done - 1] ?? -10;
  const slide = Math.min(1, Math.max(0, (t - last) / 0.2));
  const ease = 1 - Math.pow(1 - slide, 3);
  const flick = 0.92 + 0.05 * Math.sin(frame * 1.9) + 0.03 * Math.sin(frame * 0.7);
  const reel = (idx: number, offset: number) => {
    const at = idx === 0 ? PHONE.in : PHONE.swipes[idx - 1];
    return (
      <div key={idx} style={{ position: "absolute", left: 0, top: offset, width: PH.w, height: PH.h }}>
        <Sequence from={f(at) - 6} durationInFrames={Math.max(1, f(PHONE.out + 0.5) - f(at) + 6)} layout="none">
          <OffthreadVideo src={staticFile(`broll/${FEED[idx % FEED.length]}.mp4`)} muted style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        </Sequence>
      </div>
    );
  };
  // la pantalla crece desde la mano hasta su sitio
  const cx = hx + (PH.x + PH.w / 2 - hx) * k;
  const cy = hy + (PH.y + PH.h / 2 - hy) * k;
  const sc = 0.08 + 0.92 * k;
  return (
    <AbsoluteFill style={{ opacity: Math.min(1, k * 2.5) }}>
      {/* pantalla holográfica, girada hacia él */}
      <div style={{ position: "absolute", left: cx - PH.w / 2, top: cy - PH.h / 2, width: PH.w, height: PH.h, transform: `perspective(1200px) rotateY(24deg) scale(${sc * inQ.sx}, ${sc * inQ.sy})`, opacity: flick }}>
        <div style={{ position: "absolute", inset: 0, borderRadius: 26, overflow: "hidden", boxShadow: "0 0 30px rgba(4,228,0,0.6), 0 0 80px rgba(4,228,0,0.25)", border: "2px solid rgba(160,255,170,0.85)", filter: "saturate(0.85) brightness(1.1)", opacity: 0.88 }}>
          {done > 0 && slide < 1 ? reel(done - 1, -PH.h * ease) : null}
          {reel(done, PH.h * (1 - ease))}
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(160deg, rgba(4,228,0,0.18), transparent 45%, rgba(4,228,0,0.12))" }} />
          <div style={{ position: "absolute", inset: 0, background: "repeating-linear-gradient(0deg, rgba(0,0,0,0.18) 0px, rgba(0,0,0,0.18) 1px, transparent 1px, transparent 4px)", backgroundPosition: `0 ${frame * 2}px` }} />
        </div>
      </div>
    </AbsoluteFill>
  );
};

// E07: «Mi punto de partida» — centrado y con aire a los lados
const Start: React.FC = () => {
  const { t, squash, ramp, idle } = useClock();
  if (t < STARTP.card - 0.05 || t > STARTP.to + 0.05) return null;
  const head = squash(STARTP.card - 0.05, 9, 230);
  const a = squash(STARTP.card, 9, 230);
  const b = squash(STARTP.abd, 8, 260);
  const out = ramp(STARTP.to - 0.3, STARTP.to, easeInOut);
  const id = idle(7.7, 0.6);
  return (
    <AbsoluteFill style={{ opacity: out > 0.85 ? (1 - out) / 0.15 : 1 }}>
      <div style={{ position: "absolute", top: 210, left: 90, right: 90, display: "flex", flexDirection: "column", alignItems: "center", gap: 12, transform: `translateY(${id.y}px) scale(${popOut(out)})` }}>
        <div style={{ ...label, fontSize: 24, letterSpacing: 5, color: PAPER, background: "rgba(10,10,10,0.7)", padding: "8px 16px", borderRadius: 10, opacity: Math.min(1, head.p * 2), transform: `scale(${head.sx}, ${head.sy})` }}>Mi punto de partida</div>
        <div style={{ ...display, fontSize: 54, color: INK, background: GREEN, padding: "12px 22px 6px", borderRadius: 14, filter: GLOW, opacity: Math.min(1, a.p * 2), transform: `translateY(${(1 - a.p) * 40}px) scale(${a.sx}, ${a.sy}) rotate(-2deg)` }}>1–2 de extensión</div>
        <div style={{ ...display, fontStyle: "normal", fontSize: 56, color: PAPER, ...stroke(6), opacity: Math.min(1, b.p * 2), transform: `scale(${b.p}) rotate(${(1 - b.p) * 90}deg)`, lineHeight: 0.8 }}>+</div>
        <div style={{ position: "relative", ...display, fontSize: 54, color: INK, background: "#FFB020", padding: "12px 22px 6px", borderRadius: 14, opacity: Math.min(1, b.p * 2), transform: `translateY(${(1 - b.p) * 40}px) scale(${b.sx}, ${b.sy}) rotate(2deg)` }}>
          1 abducción
          <Burst x={150} y={40} d={t - STARTP.abd} r={120} color="#FFB020" />
        </div>
      </div>
    </AbsoluteFill>
  );
};

// E08: dos posiciones de abducción con un maniquí que hace el ejercicio de verdad:
// de pie (cadera extendida, la pierna se separa hacia el lado) y sentado en máquina
// (cadera flexionada, las rodillas se abren). Zona marcada: el lateral de la cadera.
const Limb: React.FC<{ x1: number; y1: number; x2: number; y2: number; w1: number; w2: number }> = ({ x1, y1, x2, y2, w1, w2 }) => {
  const a = Math.atan2(y2 - y1, x2 - x1) + Math.PI / 2;
  const c = Math.cos(a);
  const s2 = Math.sin(a);
  const pts = `${x1 + c * w1},${y1 + s2 * w1} ${x2 + c * w2},${y2 + s2 * w2} ${x2 - c * w2},${y2 - s2 * w2} ${x1 - c * w1},${y1 - s2 * w1}`;
  return (
    <g fill="url(#mq)">
      <polygon points={pts} />
      <circle cx={x1} cy={y1} r={w1} />
      <circle cx={x2} cy={y2} r={w2} />
    </g>
  );
};
const Mannequin: React.FC<{ seated?: boolean; k: number; col: string; pulse: number }> = ({ seated, k, col, pulse }) => {
  const hipY = seated ? 250 : 232;
  const hl = { x: 128, y: hipY };
  const hr = { x: 172, y: hipY };
  const torso = `M 108 ${hipY - 132} C 96 ${hipY - 128} 92 ${hipY - 112} 96 ${hipY - 92} C 102 ${hipY - 66} 112 ${hipY - 40} 112 ${hipY - 18} C 110 ${hipY - 6} 112 ${hipY + 6} 120 ${hipY + 12} L 180 ${hipY + 12} C 188 ${hipY + 6} 190 ${hipY - 6} 188 ${hipY - 18} C 188 ${hipY - 40} 198 ${hipY - 66} 204 ${hipY - 92} C 208 ${hipY - 112} 204 ${hipY - 128} 192 ${hipY - 132} Z`;
  let legs: React.ReactNode;
  if (!seated) {
    const ang = (k * 38 * Math.PI) / 180;
    const kr = { x: hr.x + Math.sin(ang) * 96, y: hr.y + Math.cos(ang) * 96 };
    const ar = { x: hr.x + Math.sin(ang) * 192, y: hr.y + Math.cos(ang) * 192 };
    legs = (
      <>
        <Limb x1={hl.x} y1={hl.y} x2={124} y2={hl.y + 96} w1={17} w2={11} />
        <Limb x1={124} y1={hl.y + 96} x2={122} y2={hl.y + 190} w1={11} w2={8} />
        <ellipse cx={116} cy={hl.y + 198} rx={16} ry={7} fill="url(#mq)" />
        <Limb x1={hr.x} y1={hr.y} x2={kr.x} y2={kr.y} w1={17} w2={11} />
        <Limb x1={kr.x} y1={kr.y} x2={ar.x} y2={ar.y} w1={11} w2={8} />
        {/* tobillera y cable de la polea */}
        <rect x={ar.x - 10} y={ar.y - 18} width={20} height={10} rx={3} fill={col} />
        <line x1={ar.x} y1={ar.y - 13} x2={20} y2={hl.y + 186} stroke="rgba(255,255,255,0.6)" strokeWidth={3} />
        {/* brazo apoyado en la máquina */}
        <line x1={12} y1={hipY - 210} x2={12} y2={hipY + 200} stroke="rgba(255,255,255,0.35)" strokeWidth={8} strokeLinecap="round" />
      </>
    );
  } else {
    const spread = k * 30;
    // muslos hacia la cámara (escorzo): cortos y anchos, con la rodilla como un casquete
    const kl = { x: 112 - spread, y: hipY + 34 };
    const kr = { x: 188 + spread, y: hipY + 34 };
    legs = (
      <>
        {/* respaldo y asiento de la máquina */}
        <rect x={96} y={hipY - 150} width={108} height={170} rx={14} fill="rgba(255,255,255,0.12)" stroke="rgba(255,255,255,0.25)" strokeWidth={2} />
        <rect x={74} y={hipY + 4} width={152} height={26} rx={9} fill="rgba(255,255,255,0.22)" />
        <rect x={140} y={hipY + 30} width={20} height={160} fill="rgba(255,255,255,0.15)" />
        <Limb x1={hl.x} y1={hl.y + 6} x2={kl.x} y2={kl.y} w1={21} w2={19} />
        <Limb x1={hr.x} y1={hr.y + 6} x2={kr.x} y2={kr.y} w1={21} w2={19} />
        <circle cx={kl.x} cy={kl.y} r={17} fill="#f4f6f8" />
        <circle cx={kr.x} cy={kr.y} r={17} fill="#f4f6f8" />
        <Limb x1={kl.x} y1={kl.y + 10} x2={kl.x - 6} y2={kl.y + 130} w1={12} w2={8} />
        <Limb x1={kr.x} y1={kr.y + 10} x2={kr.x + 6} y2={kr.y + 130} w1={12} w2={8} />
        <ellipse cx={kl.x - 12} cy={kl.y + 138} rx={16} ry={7} fill="url(#mq)" />
        <ellipse cx={kr.x + 12} cy={kr.y + 138} rx={16} ry={7} fill="url(#mq)" />
        {/* almohadillas por fuera de las rodillas: se abren con ellas */}
        <rect x={kl.x - 42} y={kl.y - 26} width={16} height={52} rx={7} fill={col} opacity={0.95} />
        <rect x={kr.x + 26} y={kr.y - 26} width={16} height={52} rx={7} fill={col} opacity={0.95} />
        <path d={`M ${kl.x - 50} ${kl.y} l -22 0 m 8 -9 l -8 9 l 8 9`} stroke={col} strokeWidth={4} fill="none" strokeLinecap="round" opacity={k} />
        <path d={`M ${kr.x + 50} ${kr.y} l 22 0 m -8 -9 l 8 9 l -8 9`} stroke={col} strokeWidth={4} fill="none" strokeLinecap="round" opacity={k} />
      </>
    );
  }
  return (
    <svg width={300} height={470} viewBox="0 0 300 470" style={{ overflow: "visible", filter: "drop-shadow(0 0 1.5px rgba(255,255,255,0.9)) drop-shadow(0 8px 14px rgba(0,0,0,0.5))" }}>
      <defs>
        <linearGradient id="mq" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#8f949a" />
          <stop offset="0.45" stopColor="#e9ecef" />
          <stop offset="1" stopColor="#7c8187" />
        </linearGradient>
      </defs>
      {legs}
      <path d={torso} fill="url(#mq)" />
      {/* brazos */}
      <Limb x1={100} y1={hipY - 120} x2={84} y2={hipY - 40} w1={11} w2={9} />
      <Limb x1={84} y1={hipY - 40} x2={seated ? 96 : 50} y2={seated ? hipY + 10 : hipY - 70} w1={9} w2={7} />
      <Limb x1={200} y1={hipY - 120} x2={216} y2={hipY - 40} w1={11} w2={9} />
      <Limb x1={216} y1={hipY - 40} x2={seated ? 204 : 222} y2={seated ? hipY + 10 : hipY + 30} w1={9} w2={7} />
      <rect x={140} y={hipY - 152} width={20} height={24} rx={8} fill="url(#mq)" />
      <ellipse cx={150} cy={hipY - 176} rx={24} ry={29} fill="url(#mq)" />
      {/* zona trabajada: lateral de la cadera (glúteo medio y parte alta del mayor) */}
      {(seated ? [hl, hr] : [hr]).map((h, i) => (
        <ellipse key={i} cx={h.x + (h.x > 150 ? 14 : -14)} cy={h.y - 6} rx={20 + 4 * pulse} ry={26 + 4 * pulse} fill={col} opacity={0.4 + 0.35 * pulse} style={{ filter: "blur(5px)" }} />
      ))}
    </svg>
  );
};
const ArtCard: React.FC<{ seated?: boolean; at: number; title: string; sub: string; col: string; i: number }> = ({ seated, at, title, sub, col, i }) => {
  const { t, squash } = useClock();
  const q = squash(at, 10, 210);
  if (q.p < 0.01) return null;
  const k = 0.5 - 0.5 * Math.cos(Math.max(0, t - at - 0.3) * 4.2);
  const pulse = 0.5 + 0.5 * Math.sin((t - at) * 6);
  return (
    <div style={{ width: 470, height: 600, borderRadius: 24, background: "rgba(10,10,10,0.82)", border: `3px solid ${col}`, boxShadow: `0 0 30px ${col}44, 0 30px 60px rgba(0,0,0,0.5)`, display: "flex", flexDirection: "column", alignItems: "center", paddingTop: 18, opacity: Math.min(1, q.p * 2), transform: `translateY(${(1 - q.p) * 120}px) scale(${q.sx}, ${q.sy}) rotate(${i ? 1.5 : -1.5}deg)` }}>
      <Mannequin seated={seated} k={k} col={col} pulse={pulse} />
      <div style={{ ...display, fontSize: 38, color: col, marginTop: 4 }}>{title}</div>
      <div style={{ ...label, fontSize: 20, letterSpacing: 3, color: PAPER, marginTop: 4 }}>{sub}</div>
    </div>
  );
};
const Positions: React.FC = () => {
  const { t, ramp } = useClock();
  if (t < POS.ext - 0.05 || t > POS.to + 0.02) return null;
  const out = ramp(POS.to - 0.25, POS.to, easeInOut);
  return (
    <AbsoluteFill style={{ opacity: 1 - out }}>
      <div style={{ position: "absolute", top: 160, left: 0, right: 0, display: "flex", justifyContent: "center", gap: 30 }}>
        <ArtCard at={POS.ext} title="Cadera extendida" sub="De pie" col={GREEN} i={0} />
        {t >= POS.flex - 0.02 ? <ArtCard seated at={POS.flex} title="Más flexionada" sub="Sentado" col="#FFB020" i={1} /> : <div style={{ width: 470 }} />}
      </div>
    </AbsoluteFill>
  );
};

// E09: CTA «SÍGUEME · @heracles_fit» (degradado gradual)
const Cta: React.FC = () => {
  const { t, squash, ramp, idle } = useClock();
  if (t < CTA.from - 0.2) return null;
  const k = squash(CTA.follow, 7, 280);
  const id = idle(7.7, 0.8);
  const breathe = 1 + Math.sin(t * 5.5) * 0.012 * k.p;
  return (
    <AbsoluteFill>
      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, transparent 40%, rgba(0,0,0,0.5) 58%, rgba(0,0,0,0.8) 100%)", opacity: ramp(CTA.from - 0.2, CTA.from + 1.0, easeInOut) }} />
      {t >= CTA.follow - 0.05 ? (
        <div style={{ position: "absolute", top: 1030, left: 0, right: 0, display: "flex", flexDirection: "column", alignItems: "center", transform: `translateY(${id.y}px)` }}>
          <div style={{ position: "relative", ...display, fontSize: 110, color: INK, background: GREEN, padding: "16px 40px 8px", borderRadius: 20, filter: "drop-shadow(0 0 18px rgba(4,228,0,0.45))", opacity: Math.min(1, k.p * 2.5), transform: `scale(${(0.3 + 0.7 * k.p) * breathe * k.sx}, ${(0.3 + 0.7 * k.p) * breathe * k.sy}) rotate(${-3 + id.r}deg)` }}>
            Sígueme
            <Burst x={260} y={70} d={t - CTA.follow} r={260} n={14} />
          </div>
          <div style={{ ...display, ...stroke(8), fontSize: 54, marginTop: 18, opacity: Math.min(1, k.p * 2), transform: `translateY(${(1 - k.p) * 30}px)` }}>@heracles_fit</div>
        </div>
      ) : null}
    </AbsoluteFill>
  );
};

export const Graphics: React.FC = () => {
  const { t } = useClock();
  return (
    <AbsoluteFill>
      <HookReact />
      <GluteMapScene />
      <Anat />
      <Catalog />
      <Pill from={CAT.ext} to={CAT.to} top={250} green size={38}>
        Todos incluyen extensión de cadera
      </Pill>
      <AbdTitle />
      <Pill from={MAYOR.medio} to={MAYOR.mayor - 0.1} top={250} size={48}>
        No es solo glúteo medio
      </Pill>
      <Pill from={MAYOR.mayor} to={MAYOR.to} top={250} green size={46}>
        Parte superior del glúteo mayor
      </Pill>
      <Study />
      <Pill from={COMBO.at} to={COMBO.to} top={130} size={42}>
        Combinar, no acumular
      </Pill>
      <PhoneFeed />
      <Start />
      <Positions />
      <Pill from={CRIT.at} to={CRIT.to} top={250} size={40}>
        Criterio: una de cada en la rutina
      </Pill>
      <Pill from={APORTE.at} to={APORTE.to} top={250} green size={50}>
        Que cada ejercicio aporte
      </Pill>
      <Cta />
      <div style={{ display: "none" }}>{t}</div>
    </AbsoluteFill>
  );
};
