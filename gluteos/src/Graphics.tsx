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
import { gradeFilter } from "./Grade";
import { FONT, GREEN, PAPER } from "./theme";
import { ABD, ANAT, APORTE, CAT, COMBO, CRIT, CTA, f, MAYOR, POS, REACT, STARTP, STUDY, toSrc } from "./timeline";

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
// Ventana con Yago (el propio vídeo) para las pantallas divididas: la cara queda
// centrada en la ventana siguiendo el tracking del rostro.
const FT = faceTrack as { fps: number; points: [number, number][] };
const faceMed = (t: number) => {
  const i = Math.round(t * FT.fps);
  const w = FT.points.slice(Math.max(0, i - 12), i + 13);
  const m = (k: 0 | 1) => w.map((p) => p[k]).sort((a, b) => a - b)[Math.floor(w.length / 2)];
  return { x: m(0), y: m(1) };
};
const YagoWindow: React.FC<{ from: number; to: number; top: number; height: number; scale?: number; faceY?: number; width?: number }> = ({ from, to, top, height, scale = 1.15, faceY = 0.36, width = 1080 }) => {
  const { t } = useClock();
  const fc = faceMed(Math.min(Math.max(t, from), to));
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

/** Chip pequeño de etiqueta (capas de la pantalla dividida). */
const Chip: React.FC<{ children: React.ReactNode; green?: boolean; style?: React.CSSProperties; q?: number }> = ({ children, green, style, q = 1 }) => (
  <div style={{ position: "absolute", ...label, fontSize: 24, letterSpacing: 3, color: green ? INK : PAPER, background: green ? GREEN : "rgba(10,10,10,0.82)", border: green ? "none" : "2px solid rgba(255,255,255,0.5)", padding: "8px 14px 6px", borderRadius: 10, opacity: Math.min(1, q * 2), transform: `translateY(${(1 - q) * -20}px) scale(${0.8 + 0.2 * q})`, transformOrigin: "0% 50%", ...style }}>
    {children}
  </div>
);

/** Pantalla dividida: arriba un contenido, abajo Yago. Entra y sale deslizando. */
const SplitWrap: React.FC<{ from: number; to: number; split?: number; children: React.ReactNode; botLabel?: string; topLabel?: React.ReactNode }> = ({ from, to, split = 960, children, botLabel, topLabel }) => {
  const { t, squash, ramp } = useClock();
  if (t < from - 0.05 || t > to + 0.05) return null;
  const inQ = squash(from, 14, 170);
  const out = ramp(to - 0.3, to, easeInOut);
  const y = -split * (1 - inQ.p) - split * out;
  const lb = squash(from + 0.25, 10, 220);
  return (
    <AbsoluteFill>
      <YagoWindow from={from - 0.1} to={to + 0.1} top={Math.max(0, split + y)} height={1920 - Math.max(0, split + y)} />
      <div style={{ position: "absolute", left: 0, top: y, width: 1080, height: split, overflow: "hidden", background: "#0b0b0b" }}>{children}</div>
      <div style={{ position: "absolute", left: 0, right: 0, top: split + y - 3, height: 6, background: GREEN, filter: GLOW }} />
      {topLabel ? <Chip q={lb.p * (1 - out)} style={{ left: 30, top: Math.max(30, split + y - 70) }}>{topLabel}</Chip> : null}
      {botLabel ? <Chip q={lb.p * (1 - out)} green style={{ left: 30, top: split + y + 26 }}>{botLabel}</Chip> : null}
    </AbsoluteFill>
  );
};

// E01–E02: «Con cosas absurdas como esta» → el vídeo original arriba y Yago abajo
const React01: React.FC = () => {
  const { t, squash, ramp } = useClock();
  if (t < REACT.in - 0.05 || t > REACT.out + 0.05) return null;
  const st = squash(REACT.map, 7, 300);
  const out = ramp(REACT.out - 0.3, REACT.out, easeInOut);
  return (
    <SplitWrap from={REACT.in} to={REACT.out} topLabel="Vídeo original · @ayalaalmeida0" botLabel="Mi explicación">
      <Sequence from={f(REACT.in)} durationInFrames={f(REACT.out) - f(REACT.in) + 10} layout="none">
        {/* fondo: el mismo clip ampliado y desenfocado; delante, el clip entero (se ven los iconos) */}
        <OffthreadVideo src={staticFile("broll/reaccion.mp4")} muted startFrom={12} style={{ position: "absolute", left: 0, top: -480, width: 1080, height: 1920, filter: "blur(28px) brightness(0.5)" }} />
        <div style={{ position: "absolute", left: 270, top: 0, width: 540, height: 960, boxShadow: "0 0 60px rgba(0,0,0,0.8)" }}>
          <OffthreadVideo src={staticFile("broll/reaccion.mp4")} muted startFrom={12} style={{ width: "100%", height: "100%" }} />
        </div>
      </Sequence>
      {/* «mapa simplista»: sello sobre el reparto del vídeo original */}
      {t >= REACT.map - 0.05 ? (
        <div style={{ position: "absolute", left: 0, right: 0, top: 420, display: "flex", justifyContent: "center", opacity: Math.min(1, st.p * 2) * (1 - out) }}>
          <div style={{ position: "relative", ...display, fontStyle: "normal", fontSize: 76, color: RED, border: `8px solid ${RED}`, borderRadius: 16, padding: "10px 26px 4px", background: "rgba(10,10,10,0.55)", transform: `rotate(-8deg) scale(${(2 - st.p) * st.sx}, ${(2 - st.p) * st.sy})`, filter: "drop-shadow(0 0 16px rgba(255,59,48,0.6))" }}>
            Mapa simplista
            <Burst x={260} y={50} d={t - REACT.map} r={170} color={RED} n={14} />
          </div>
        </div>
      ) : null}
    </SplitWrap>
  );
};

// E02: «Una cosa es AISLAR una región y otra FAVORECER su crecimiento» (P2, fig. 3A)
const Anat: React.FC = () => {
  const { t, squash, ramp, idle } = useClock();
  if (t < ANAT.from - 0.05 || t > ANAT.to + 0.05) return null;
  const c = squash(ANAT.from + 0.05, 12, 190);
  const hl = ramp(ANAT.from + 0.5, ANAT.from + 1.1);
  const iso = squash(ANAT.iso, 8, 260);
  const fav = squash(ANAT.fav, 7, 300);
  const id = idle(4.4, 0.5);
  const pulse = 0.55 + 0.45 * Math.sin(t * 5);
  return (
    <SplitWrap from={ANAT.from} to={ANAT.to} split={1000} botLabel="Mi explicación">
      <AbsoluteFill style={{ background: "radial-gradient(ellipse at 50% 40%, #1e1e1e 0%, #080808 80%)" }} />
      <div style={{ position: "absolute", left: 50, right: 50, top: 150, opacity: Math.min(1, c.p * 2), transform: `translateY(${(1 - c.p) * 80 + id.y}px) scale(${c.sx}, ${c.sy}) rotate(${-1 + id.r * 0.4}deg)` }}>
        <div style={{ position: "relative", background: "white", borderRadius: 18, padding: "14px 14px 10px", boxShadow: "0 30px 70px rgba(0,0,0,0.6)" }}>
          <Img src={staticFile("paper/p2_fig3a.png")} style={{ width: "100%", display: "block" }} />
          {/* zonas del mismo músculo, resaltadas con suavidad (sin apagar el resto) */}
          <svg viewBox="0 0 1570 725" style={{ position: "absolute", left: 14, top: 14, width: "calc(100% - 28px)", overflow: "visible", opacity: hl }}>
            <ellipse cx={330} cy={250} rx={95} ry={70} fill="none" stroke={GREEN} strokeWidth={7} opacity={pulse} style={{ filter: NEON }} />
            <ellipse cx={370} cy={470} rx={95} ry={75} fill="none" stroke={GREEN} strokeWidth={7} opacity={1.5 - pulse} style={{ filter: NEON }} />
          </svg>
          <div style={{ ...label, fontSize: 18, letterSpacing: 2, color: "rgba(0,0,0,0.6)", textAlign: "center", marginTop: 4 }}>Arquitectura del glúteo mayor · Takahashi et al., 2025</div>
        </div>
      </div>
      <div style={{ position: "absolute", left: 0, right: 0, top: 690, display: "flex", justifyContent: "center", alignItems: "center", gap: 18 }}>
        <div style={{ ...display, fontSize: 80, color: INK, background: PAPER, padding: "12px 26px 6px", borderRadius: 14, opacity: Math.min(1, iso.p * 2), transform: `translateY(${(1 - iso.p) * 40}px) scale(${iso.sx}, ${iso.sy}) rotate(-2deg)` }}>Aislar</div>
        <div style={{ position: "relative", ...display, fontStyle: "normal", fontSize: 96, color: RED, ...stroke(6), opacity: Math.min(1, fav.p * 2), transform: `scale(${fav.p * fav.sx}, ${fav.p * fav.sy})` }}>
          ≠
          <Burst x={30} y={55} d={t - ANAT.fav} r={70} color={RED} />
        </div>
        <div style={{ ...display, fontSize: 80, color: INK, background: GREEN, padding: "12px 26px 6px", borderRadius: 14, filter: GLOW, opacity: Math.min(1, fav.p * 2), transform: `translateX(${(1 - fav.p) * 80}px) scale(${fav.sx}, ${fav.sy}) rotate(2deg)` }}>Favorecer</div>
      </div>
    </SplitWrap>
  );
};

// E04: el catálogo se acumula (clips propios del cliente) y en «no son idénticos» se va
const CARD = { w: 270, h: 338 };
const SLOTS = [
  [60, 110, -4],
  [405, 95, 3],
  [750, 120, -2],
  [75, 500, 2],
  [415, 485, -3],
  [755, 510, 4],
];
const Catalog: React.FC = () => {
  const { t, frame, squash, ramp } = useClock();
  if (t < CAT.from - 0.05 || t > CAT.clear + 0.6) return null;
  const sess = t >= CAT.session ? Math.sin((t - CAT.session) * 30) * Math.exp(-(t - CAT.session) * 3) : 0;
  const clear = ramp(CAT.clear, CAT.clear + 0.45, easeInOut);
  const st = squash(CAT.session, 7, 300);
  return (
    <SplitWrap from={CAT.from} to={CAT.clear + 0.5} split={900} botLabel="Todo en la misma sesión">
      <AbsoluteFill style={{ background: "radial-gradient(ellipse at 50% 40%, #1e1e1e 0%, #080808 80%)" }} />
      {CAT.items.map(([at, file, name], i) => {
        const q = squash(at, 9, 240);
        if (q.p < 0.01) return null;
        const [x, y, r] = SLOTS[i];
        const fly = clear * (i % 2 ? 1 : -1) * 900;
        return (
          <div key={i} style={{ position: "absolute", left: x, top: y, width: CARD.w, height: CARD.h, transform: `translate(${fly}px, ${(1 - q.p) * 300 - clear * 200}px) rotate(${r + sess * 6 * (i % 2 ? 1 : -1) + clear * 40 * (i % 2 ? 1 : -1)}deg) scale(${q.sx}, ${q.sy})`, opacity: 1 - clear }}>
            <div style={{ position: "absolute", inset: 0, borderRadius: 18, overflow: "hidden", border: `4px solid ${PAPER}`, boxShadow: "0 20px 40px rgba(0,0,0,0.6)", background: "#111" }}>
              <Sequence from={f(at)} durationInFrames={Math.max(1, f(CAT.clear + 0.6) - f(at))} layout="none">
                <OffthreadVideo src={staticFile(`broll/${file}.mp4`)} muted startFrom={file === "reaccion" ? 30 : 0} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              </Sequence>
            </div>
            <div style={{ position: "absolute", left: 0, right: 0, bottom: -18, display: "flex", justifyContent: "center" }}>
              <div style={{ ...display, fontSize: 32, color: INK, background: GREEN, padding: "6px 14px 3px", borderRadius: 8 }}>{name}</div>
            </div>
          </div>
        );
      })}
      {t >= CAT.session ? (
        <div style={{ position: "absolute", left: 0, right: 0, top: 380, display: "flex", justifyContent: "center", opacity: Math.min(1, st.p * 2) * (1 - clear) }}>
          <div style={{ ...display, fontStyle: "normal", fontSize: 64, color: RED, border: `7px solid ${RED}`, borderRadius: 14, padding: "8px 22px 2px", background: "rgba(10,10,10,0.75)", transform: `rotate(-6deg) scale(${(2 - st.p) * st.sx}, ${(2 - st.p) * st.sy})` }}>¿Todo junto?</div>
        </div>
      ) : null}
      <div style={{ display: "none" }}>{frame}</div>
    </SplitWrap>
  );
};

// E05: abducción = separar la pierna (flecha sobre el gesto real, en coordenadas del
// vídeo, en BodyLayer) y rótulo
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

// E06: P1, figura 3A (Backdrop de escena + demo de cada ejercicio en ventana)
const FIG = { left: 40, top: 360, w: 640 };
const FIG_H = FIG.w * (684 / 659);
const Study: React.FC = () => {
  const { t, squash, ramp, idle } = useClock();
  if (t < STUDY.from - 0.3 || t > STUDY.to + 0.05) return null;
  const card = squash(STUDY.from, 11, 200);
  const toFig = ramp(STUDY.fig - 0.15, STUDY.fig + 0.3, easeInOut);
  const fig = squash(STUDY.fig, 12, 190);
  const hExt = ramp(STUDY.ext, STUDY.ext + 0.4);
  const hAbd = ramp(STUDY.abd, STUDY.abd + 0.4);
  const lExt = squash(STUDY.extLab, 9, 240);
  const lAbd = squash(STUDY.abdLab, 9, 240);
  const pip = squash(STUDY.fig + 0.3, 11, 200);
  const out = ramp(STUDY.to - 0.35, STUDY.to - 0.05, easeInOut);
  const id = idle(5.5, 0.4);
  const chips = ["17 personas", "10 semanas", "Sin fuerza reciente", "Resonancia"];
  const abdOn = t >= STUDY.abd;
  const box = (x0: number, x1: number, on: number, col: string) => (
    <div style={{ position: "absolute", left: FIG.left + 14 + x0 * FIG.w, top: FIG.top + 14 + 0.08 * FIG_H, width: (x1 - x0) * FIG.w, height: 0.86 * FIG_H, border: `5px solid ${col}`, borderRadius: 14, opacity: on, boxShadow: `0 0 ${18 + 8 * Math.sin(t * 8)}px ${col}`, transform: `scale(${0.9 + 0.1 * on})` }} />
  );
  return (
    <AbsoluteFill>
      <Backdrop from={STUDY.from} to={STUDY.to} title="Estudio" id="p1" />
      <AbsoluteFill style={{ opacity: (1 - out) * ramp(STUDY.from - 0.05, STUDY.from + 0.2) }}>
        {/* portada + diseño */}
        {toFig < 1 ? (
          <div style={{ position: "absolute", top: 380, left: 60, right: 60, opacity: 1 - toFig, transform: `translateY(${(1 - card.p) * 100 - toFig * 80 + id.y}px) scale(${card.sx}, ${card.sy})` }}>
            <div style={{ background: "white", borderRadius: 18, padding: "22px 22px 18px", boxShadow: "0 40px 90px rgba(0,0,0,0.6)" }}>
              <div style={{ ...label, fontSize: 18, letterSpacing: 3, color: "rgba(0,0,0,0.5)", marginBottom: 10 }}>Attarieh et al., 2026 · J Strength Cond Res</div>
              <Img src={staticFile("paper/p1_title.png")} style={{ width: "100%", display: "block" }} />
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 14, marginTop: 36 }}>
              {chips.map((c, i) => {
                const q = squash(STUDY.from + 0.35 + i * 0.22, 9, 240);
                return (
                  <div key={i} style={{ ...display, fontSize: 44, color: i === 0 ? INK : PAPER, background: i === 0 ? GREEN : "rgba(255,255,255,0.08)", border: i === 0 ? "none" : "2px solid rgba(255,255,255,0.3)", padding: "10px 20px 5px", borderRadius: 12, opacity: Math.min(1, q.p * 2), transform: `translateY(${(1 - q.p) * 40}px) scale(${q.sx}, ${q.sy})` }}>{c}</div>
                );
              })}
            </div>
          </div>
        ) : null}
        {/* figura 3A */}
        {t >= STUDY.fig - 0.15 ? (
          <>
            <div style={{ position: "absolute", left: 0, right: 0, top: 210, display: "flex", justifyContent: "center", opacity: Math.min(1, fig.p * 2) }}>
              <div style={{ ...label, fontSize: 24, letterSpacing: 3, color: PAPER, background: "rgba(10,10,10,0.7)", padding: "8px 16px", borderRadius: 10 }}>Cambio de área transversal del glúteo mayor</div>
            </div>
            <div style={{ position: "absolute", left: FIG.left, top: FIG.top, width: FIG.w + 28, opacity: Math.min(1, fig.p * 2), transform: `translateY(${(1 - fig.p) * 140}px) scale(${0.92 + 0.08 * fig.p})`, transformOrigin: "50% 0%" }}>
              <div style={{ background: "white", borderRadius: 16, padding: 14, boxShadow: "0 30px 70px rgba(0,0,0,0.6)" }}>
                <Img src={staticFile("paper/p1_fig3a.png")} style={{ width: "100%", display: "block" }} />
              </div>
            </div>
            {box(0.27, 0.58, hExt * (abdOn ? 0.35 : 1), GREEN)}
            {box(0.6, 0.93, hAbd, "#FFB020")}
            {/* traducción de las etiquetas */}
            <div style={{ position: "absolute", left: FIG.left, width: FIG.w + 28, top: FIG.top + FIG_H + 40, display: "flex", justifyContent: "center", gap: 10, flexWrap: "wrap", opacity: Math.min(1, fig.p * 2) }}>
              {["PROX = superior", "MID = media", "DIST = inferior"].map((s, i) => (
                <div key={i} style={{ ...label, fontSize: 19, letterSpacing: 1.5, color: PAPER, background: "rgba(10,10,10,0.75)", border: "1px solid rgba(255,255,255,0.3)", padding: "6px 10px", borderRadius: 8 }}>{s}</div>
              ))}
            </div>
            {/* demo del ejercicio en ventana (el propio plano) */}
            <div style={{ position: "absolute", left: 720, top: FIG.top + 20, width: 320, height: 440, borderRadius: 20, overflow: "hidden", border: `4px solid ${abdOn ? "#FFB020" : GREEN}`, boxShadow: "0 24px 50px rgba(0,0,0,0.6)", opacity: Math.min(1, pip.p * 2), transform: `translateX(${(1 - pip.p) * 300}px) scale(${pip.sx}, ${pip.sy})` }}>
              <YagoWindow from={STUDY.fig} to={STUDY.to} top={0} height={440} width={320} scale={0.42} faceY={0.18} />
              <div style={{ position: "absolute", left: 0, right: 0, bottom: 12, display: "flex", justifyContent: "center" }}>
                <div style={{ ...display, fontSize: 30, color: INK, background: abdOn ? "#FFB020" : GREEN, padding: "5px 12px 2px", borderRadius: 8 }}>{abdOn ? "HAbd = abducción" : "HExt = extensión"}</div>
              </div>
            </div>
            <div style={{ position: "absolute", left: 720, width: 320, top: FIG.top + 490, ...label, fontSize: 17, letterSpacing: 1, color: "rgba(255,255,255,0.75)", textTransform: "none", lineHeight: 1.35 }}>
              * cambio pre–post · # diferencia entre ejercicios · † superior vs inferior dentro del mismo ejercicio
            </div>
            {/* conclusiones sucesivas */}
            <div style={{ position: "absolute", left: 40, right: 40, top: 1150, display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
              {[
                [lExt, "Extensión: más crecimiento abajo que arriba", GREEN],
                [lAbd, "Abducción: más crecimiento arriba que abajo", "#FFB020"],
              ].map(([q, s, col], i) => {
                const qq = q as { p: number; sx: number; sy: number };
                if (qq.p < 0.01) return null;
                return (
                  <div key={i} style={{ ...display, fontSize: 32, color: INK, background: col as string, padding: "10px 18px 5px", borderRadius: 12, opacity: Math.min(1, qq.p * 2), transform: `translateY(${(1 - qq.p) * 30}px) scale(${qq.sx}, ${qq.sy}) rotate(${i ? 1 : -1}deg)` }}>{s as string}</div>
                );
              })}
            </div>
            <div style={{ position: "absolute", left: 0, right: 0, top: 1300, display: "flex", justifyContent: "center", opacity: Math.min(1, fig.p * 2) }}>
              <div style={{ ...label, fontSize: 18, letterSpacing: 1.5, color: "rgba(255,255,255,0.7)", textTransform: "none" }}>Medias e IC95% · 17 personas, una condición por pierna · Attarieh et al., 2026</div>
            </div>
          </>
        ) : null}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// E07: «1–2 variantes de extensión + una abducción» — Mi punto de partida
const Start: React.FC = () => {
  const { t, squash, ramp, idle } = useClock();
  if (t < STARTP.card - 0.05 || t > STARTP.to + 0.05) return null;
  const head = squash(STARTP.at, 9, 230);
  const a = squash(STARTP.card, 9, 230);
  const b = squash(STARTP.abd, 8, 260);
  const out = ramp(STARTP.to - 0.3, STARTP.to, easeInOut);
  const id = idle(7.7, 0.6);
  return (
    <AbsoluteFill style={{ opacity: out > 0.85 ? (1 - out) / 0.15 : 1 }}>
      <div style={{ position: "absolute", top: 230, left: 0, right: 0, display: "flex", flexDirection: "column", alignItems: "center", gap: 14, transform: `translateY(${id.y}px) scale(${popOut(out)})` }}>
        <div style={{ ...label, fontSize: 26, letterSpacing: 5, color: PAPER, background: "rgba(10,10,10,0.7)", padding: "8px 16px", borderRadius: 10, opacity: Math.min(1, head.p * 2) }}>Mi punto de partida</div>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ ...display, fontSize: 56, color: INK, background: GREEN, padding: "12px 22px 6px", borderRadius: 14, filter: GLOW, opacity: Math.min(1, a.p * 2), transform: `translateX(${(1 - a.p) * -200}px) scale(${a.sx}, ${a.sy}) rotate(-2deg)` }}>1–2 de extensión</div>
          <div style={{ ...display, fontStyle: "normal", fontSize: 70, color: PAPER, ...stroke(6), opacity: Math.min(1, b.p * 2), transform: `scale(${b.p})` }}>+</div>
          <div style={{ position: "relative", ...display, fontSize: 56, color: INK, background: "#FFB020", padding: "12px 22px 6px", borderRadius: 14, opacity: Math.min(1, b.p * 2), transform: `translateX(${(1 - b.p) * 200}px) scale(${b.sx}, ${b.sy}) rotate(2deg)` }}>
            1 abducción
            <Burst x={150} y={40} d={t - STARTP.abd} r={120} color="#FFB020" />
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};

// E08: las dos posiciones de abducción (de pie = cadera extendida; sentado = flexionada)
const Figure: React.FC<{ seated?: boolean; t: number; col: string }> = ({ seated, t, col }) => {
  const k = 0.5 - 0.5 * Math.cos(t * 4);
  const leg = 10 + 28 * k;
  return (
    <svg width={220} height={260} viewBox="0 0 220 260">
      <circle cx={110} cy={36} r={22} fill={PAPER} />
      {seated ? (
        <>
          <line x1={110} y1={62} x2={110} y2={150} stroke={PAPER} strokeWidth={18} strokeLinecap="round" />
          <rect x={60} y={156} width={110} height={14} rx={6} fill="rgba(255,255,255,0.35)" />
          {/* muslos hacia delante: la abducción abre las rodillas */}
          <g transform={`translate(110 150) rotate(${-leg})`}><line x1={0} y1={0} x2={-70} y2={10} stroke={col} strokeWidth={16} strokeLinecap="round" /></g>
          <g transform={`translate(110 150) rotate(${leg})`}><line x1={0} y1={0} x2={70} y2={10} stroke={col} strokeWidth={16} strokeLinecap="round" /></g>
          <path d="M 70 210 A 60 60 0 0 0 150 210" fill="none" stroke={PAPER} strokeWidth={4} strokeDasharray="6 8" />
          <text x={110} y={248} textAnchor="middle" fill={PAPER} fontFamily={FONT} fontWeight={800} fontSize={18}>CADERA ~90°</text>
        </>
      ) : (
        <>
          <line x1={110} y1={62} x2={110} y2={150} stroke={PAPER} strokeWidth={18} strokeLinecap="round" />
          <line x1={110} y1={150} x2={95} y2={240} stroke={PAPER} strokeWidth={16} strokeLinecap="round" />
          <g transform={`translate(112 150) rotate(${-leg})`}><line x1={0} y1={0} x2={0} y2={92} stroke={col} strokeWidth={16} strokeLinecap="round" /></g>
          <text x={110} y={258} textAnchor="middle" fill={PAPER} fontFamily={FONT} fontWeight={800} fontSize={18}>CADERA ~0°</text>
        </>
      )}
    </svg>
  );
};
const Positions: React.FC = () => {
  const { t, squash, ramp } = useClock();
  if (t < POS.ext - 0.05 || t > POS.to + 0.05) return null;
  const a = squash(POS.ext, 9, 230);
  const b = squash(POS.flex, 9, 230);
  const out = ramp(POS.to - 0.3, POS.to, easeInOut);
  const card = (q: { p: number; sx: number; sy: number }, seated: boolean, title: string, sub: string, col: string, i: number) => (
    <div style={{ width: 440, padding: "18px 10px 16px", borderRadius: 22, background: "rgba(10,10,10,0.82)", border: `3px solid ${col}`, display: "flex", flexDirection: "column", alignItems: "center", opacity: Math.min(1, q.p * 2), transform: `translateY(${(1 - q.p) * 80}px) scale(${q.sx}, ${q.sy}) rotate(${i ? 1.5 : -1.5}deg)`, boxShadow: `0 0 24px ${col}55` }}>
      <Figure seated={seated} t={t} col={col} />
      <div style={{ ...display, fontSize: 40, color: col, marginTop: 6 }}>{title}</div>
      <div style={{ ...label, fontSize: 20, letterSpacing: 3, color: PAPER, marginTop: 6 }}>{sub}</div>
    </div>
  );
  return (
    <AbsoluteFill style={{ opacity: out > 0.85 ? (1 - out) / 0.15 : 1 }}>
      <div style={{ position: "absolute", top: 220, left: 0, right: 0, display: "flex", justifyContent: "center", gap: 24, transform: `scale(${popOut(out)})` }}>
        {card(a, false, "Cadera extendida", "De pie", GREEN, 0)}
        {b.p > 0.01 ? card(b, true, "Más flexionada", "Sentado", "#FFB020", 1) : <div style={{ width: 440 }} />}
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
      <React01 />
      <Anat />
      <Catalog />
      <Pill from={CAT.ext} to={CAT.to} top={250} green size={38}>
        Todos incluyen extensión de cadera
      </Pill>
      <AbdTitle />
      <Pill from={MAYOR.medio} to={MAYOR.mayor - 0.1} top={250} size={48}>
        No es solo glúteo medio
      </Pill>
      <Pill from={MAYOR.mayor} to={MAYOR.to} top={250} green size={50}>
        Parte superior del glúteo mayor
      </Pill>
      <Study />
      <Pill from={COMBO.at} to={COMBO.to} top={250} size={46}>
        Combinar, no acumular
      </Pill>
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
