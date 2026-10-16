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

// E01 (hook): desde el primer fotograma Yago ya reacciona. Detrás, el vídeo original
// ocupa la parte de arriba y se funde con su fondo real; Yago va rotoscopiado delante.
const HOOK_ROTO = { x: 0, y: 450, w: 780, h: 1470, t0: 1.72, n: 131 };
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
          <OffthreadVideo src={staticFile("broll/reaccion.mp4")} muted startFrom={25} playbackRate={0.78} style={{ position: "absolute", left: -90, top: -570, width: 1200, height: 2133 }} />
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

// E01–E02: tras el corte, Yago entero; el vídeo original se encoge a una tarjeta a su
// lado y se desmonta el reparto «acortamiento arriba / estiramiento abajo»
const CARD_R = { x: 668, y: 250, w: 370, h: 658 };
const CardReact: React.FC = () => {
  const { t, squash, ramp, idle } = useClock();
  if (t < REACT.cut - 0.02 || t > REACT.out + 0.05) return null;
  const shrink = squash(REACT.cut, 15, 150);
  const out = ramp(REACT.out - 0.35, REACT.out, easeInOut);
  const id = idle(1.3, 0.6);
  const k = shrink.p;
  const x = CARD_R.x * k;
  const y = CARD_R.y * k - 60 * (1 - k);
  const w = 1080 + (CARD_R.w - 1080) * k;
  const h = 1920 + (CARD_R.h - 1920) * k;
  const a = squash(8.12, 9, 240);
  const b = squash(10.52, 9, 240);
  const st = squash(11.76, 7, 300);
  const chip = (q: { p: number; sx: number; sy: number }, txt: React.ReactNode, top: number, i: number) => (
    <div style={{ position: "absolute", left: 36, top, opacity: Math.min(1, q.p * 2) * (1 - out), transform: `translateX(${(1 - q.p) * -260}px) scale(${q.sx}, ${q.sy}) rotate(${i ? 2 : -2}deg)`, transformOrigin: "0% 50%" }}>
      <div style={{ ...display, fontSize: 34, color: INK, background: PAPER, padding: "9px 16px 4px", borderRadius: 12, boxShadow: "0 14px 30px rgba(0,0,0,0.5)" }}>{txt}</div>
    </div>
  );
  return (
    <AbsoluteFill>
      <div style={{ position: "absolute", left: x, top: y, width: w, height: h, borderRadius: 28 * k, overflow: "hidden", border: k > 0.5 ? `4px solid ${PAPER}` : undefined, boxShadow: "0 30px 70px rgba(0,0,0,0.65)", opacity: 1 - out, transform: `translateY(${id.y * k}px) rotate(${3 * k + id.r * 0.4 * k}deg) scale(${popOut(out)})`, transformOrigin: "50% 50%" }}>
        <Sequence from={f(REACT.cut)} durationInFrames={f(REACT.out) - f(REACT.cut) + 10} layout="none">
          <OffthreadVideo src={staticFile("broll/reaccion.mp4")} muted startFrom={8 * 25} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        </Sequence>
        {/* «mapa simplista»: sello sobre el reparto */}
        {t >= 11.7 ? (
          <div style={{ position: "absolute", left: 0, right: 0, top: 260, display: "flex", justifyContent: "center", opacity: Math.min(1, st.p * 2) }}>
            <div style={{ position: "relative", ...display, fontStyle: "normal", fontSize: 36, color: RED, border: `5px solid ${RED}`, borderRadius: 12, padding: "7px 12px 2px", background: "rgba(10,10,10,0.55)", transform: `rotate(-10deg) scale(${(2 - st.p) * st.sx}, ${(2 - st.p) * st.sy})`, filter: "drop-shadow(0 0 14px rgba(255,59,48,0.6))", whiteSpace: "nowrap" }}>
              Mapa simplista
            </div>
          </div>
        ) : null}
      </div>
      {chip(a, <>«Acortamiento <span style={{ color: "#0a7a00" }}>→ arriba</span>»</>, 300, 0)}
      {chip(b, <>«Estiramiento <span style={{ color: "#0a7a00" }}>→ abajo</span>»</>, 385, 1)}
      {t >= 11.7 ? <Burst x={850} y={580} d={t - 11.76} r={220} color={RED} n={14} /> : null}
    </AbsoluteFill>
  );
};

// E02: «Una cosa es AISLAR una región y otra FAVORECER su crecimiento» (P2, fig. 3A)
const Anat: React.FC = () => {
  const { t, squash, ramp, idle } = useClock();
  if (t < ANAT.from - 0.05 || t > ANAT.to + 0.05) return null;
  const c = squash(ANAT.from + 0.02, 12, 190);
  const hl = ramp(ANAT.from + 0.5, ANAT.from + 1.1);
  const iso = squash(ANAT.iso, 8, 260);
  const fav = squash(ANAT.fav, 7, 300);
  const out = ramp(ANAT.to - 0.3, ANAT.to, easeInOut);
  const id = idle(4.4, 0.5);
  const pulse = 0.55 + 0.45 * Math.sin(t * 5);
  return (
    <AbsoluteFill style={{ opacity: out > 0.85 ? (1 - out) / 0.15 : 1 }}>
      <div style={{ position: "absolute", left: 90, right: 90, top: 150, opacity: Math.min(1, c.p * 2), transform: `translateY(${(1 - c.p) * -120 + id.y}px) scale(${c.sx * popOut(out)}, ${c.sy * popOut(out)}) rotate(${-1 + id.r * 0.4}deg)` }}>
        <div style={{ position: "relative", background: "white", borderRadius: 18, padding: "12px 12px 8px", boxShadow: "0 30px 70px rgba(0,0,0,0.6)" }}>
          <Img src={staticFile("paper/p2_fig3a.png")} style={{ width: "100%", display: "block" }} />
          <svg viewBox="0 0 1570 725" style={{ position: "absolute", left: 12, top: 12, width: "calc(100% - 24px)", overflow: "visible", opacity: hl }}>
            <ellipse cx={330} cy={250} rx={95} ry={70} fill="none" stroke={GREEN} strokeWidth={7} opacity={pulse} style={{ filter: NEON }} />
            <ellipse cx={370} cy={470} rx={95} ry={75} fill="none" stroke={GREEN} strokeWidth={7} opacity={1.5 - pulse} style={{ filter: NEON }} />
          </svg>
          <div style={{ ...label, fontSize: 17, letterSpacing: 2, color: "rgba(0,0,0,0.6)", textAlign: "center", marginTop: 2 }}>Arquitectura del glúteo mayor · Takahashi et al., 2025</div>
        </div>
      </div>
      <div style={{ position: "absolute", left: 0, right: 0, top: 1540, display: "flex", justifyContent: "center", alignItems: "center", gap: 18, transform: `scale(${popOut(out)})` }}>
        <div style={{ ...display, fontSize: 76, color: INK, background: PAPER, padding: "12px 24px 6px", borderRadius: 14, opacity: Math.min(1, iso.p * 2), transform: `translateY(${(1 - iso.p) * 40}px) scale(${iso.sx}, ${iso.sy}) rotate(-2deg)` }}>Aislar</div>
        <div style={{ position: "relative", ...display, fontStyle: "normal", fontSize: 92, color: RED, ...stroke(6), opacity: Math.min(1, fav.p * 2), transform: `scale(${fav.p * fav.sx}, ${fav.p * fav.sy})` }}>
          ≠
          <Burst x={30} y={55} d={t - ANAT.fav} r={70} color={RED} />
        </div>
        <div style={{ ...display, fontSize: 76, color: INK, background: GREEN, padding: "12px 24px 6px", borderRadius: 14, filter: GLOW, opacity: Math.min(1, fav.p * 2), transform: `translateX(${(1 - fav.p) * 80}px) scale(${fav.sx}, ${fav.sy}) rotate(2deg)` }}>Favorecer</div>
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
const LOBE_L = "M 200 30 C 120 18 34 62 26 168 C 18 270 92 346 196 334 C 204 252 204 120 200 30 Z";
const LOBE_R = "M 210 30 C 290 18 376 62 384 168 C 392 270 318 346 214 334 C 206 252 206 120 210 30 Z";
const GluteMap: React.FC<{ vals: number[]; prog: number; col: string; t: number }> = ({ vals, prog, col, t }) => {
  const bands = [
    [30, 132, "Superior"],
    [132, 234, "Media"],
    [234, 340, "Inferior"],
  ] as [number, number, string][];
  const max = Math.max(...vals);
  return (
    <svg width={450} height={400} viewBox="-30 0 470 360" style={{ overflow: "visible" }}>
      <defs>
        <clipPath id="glute-clip">
          <path d={LOBE_L} />
          <path d={LOBE_R} />
        </clipPath>
      </defs>
      <g clipPath="url(#glute-clip)">
        <rect x={0} y={0} width={420} height={360} fill="rgba(255,255,255,0.06)" />
        {bands.map(([y0, y1], i) => {
          const v = vals[i] * prog;
          const a = Math.min(1, v / 14);
          const top = vals[i] === max;
          return <rect key={i} x={0} y={y0} width={420} height={y1 - y0} fill={col} opacity={0.12 + 0.75 * a * (top ? 0.85 + 0.15 * Math.sin(t * 7) : 1)} />;
        })}
        {[132, 234].map((y) => (
          <line key={y} x1={0} y1={y} x2={420} y2={y} stroke="rgba(10,10,10,0.6)" strokeWidth={3} strokeDasharray="8 8" />
        ))}
      </g>
      <path d={LOBE_L} fill="none" stroke={PAPER} strokeWidth={5} />
      <path d={LOBE_R} fill="none" stroke={PAPER} strokeWidth={5} />
      {bands.map(([y0, y1, name], i) => (
        <g key={name}>
          <text x={-24} y={(y0 + y1) / 2 + 6} textAnchor="end" fill={PAPER} fontFamily={FONT} fontWeight={800} fontSize={17} letterSpacing={1}>
            {name.toUpperCase()}
          </text>
          <text x={438} y={(y0 + y1) / 2 + 10} textAnchor="start" fill={col} fontFamily={FONT} fontWeight={900} fontStyle="italic" fontSize={30}>
            +{(vals[i] * prog).toFixed(0)}%
          </text>
        </g>
      ))}
    </svg>
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
  const progExt = ramp(STUDY.ext + 0.2, STUDY.ext + 1.4);
  const progAbd = ramp(STUDY.abd + 0.1, STUDY.abd + 1.2);
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
              <div style={{ marginTop: 18, transform: `scaleX(${abdOn ? 0.6 + 0.4 * swap.p : 1})` }}>
                <GluteMap vals={abdOn ? VALS.abd : VALS.ext} prog={abdOn ? progAbd : progExt} col={col} t={t} />
              </div>
              <div style={{ ...label, fontSize: 14, letterSpacing: 1, color: "rgba(255,255,255,0.6)", textTransform: "none", marginTop: 4 }}>Medias aproximadas de la figura 3A</div>
              {/* demo del ejercicio */}
              <div style={{ position: "relative", marginTop: 14, width: 300, height: 300, borderRadius: 18, overflow: "hidden", border: `4px solid ${col}`, boxShadow: "0 20px 40px rgba(0,0,0,0.6)" }}>
                <YagoWindow from={STUDY.fig} to={STUDY.to} top={0} height={300} width={300} scale={0.5} faceY={0.12} />
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

// E07: del móvil sale un feed de vídeos de glúteo que pasa con sus propios swipes
const FEED = ["sentadilla", "bulgaras", "reaccion", "stepups", "hipthrust", "peso"];
const PH = { ax: 650, ay: 1010, x: 640, y: 230, w: 390, h: 694 };
const PhoneFeed: React.FC = () => {
  const { t, frame, squash, ramp } = useClock();
  if (t < PHONE.in - 0.05 || t > PHONE.out + 0.4) return null;
  const inQ = squash(PHONE.in, 13, 170);
  const back = ramp(PHONE.out, PHONE.out + 0.35, easeInOut);
  const k = inQ.p * (1 - back);
  const cx = PH.ax + (PH.x + PH.w / 2 - PH.ax) * k;
  const cy = PH.ay + (PH.y + PH.h / 2 - PH.ay) * k;
  const sc = 0.12 + 0.88 * k;
  // reel actual y avance del desplazamiento tras cada swipe
  const done = PHONE.swipes.filter((s) => t >= s).length;
  const last = PHONE.swipes[done - 1] ?? -10;
  const slide = Math.min(1, Math.max(0, (t - last) / 0.28));
  const ease = 1 - Math.pow(1 - slide, 3);
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
  return (
    <AbsoluteFill>
      {/* estela desde el móvil */}
      {k > 0.02 && k < 0.98 ? <div style={{ position: "absolute", left: PH.ax - 6, top: PH.ay - 6, width: 12, height: 12, borderRadius: 6, background: GREEN, boxShadow: `0 0 40px 18px rgba(4,228,0,${0.6 * (1 - k)})` }} /> : null}
      <div style={{ position: "absolute", left: cx - PH.w / 2, top: cy - PH.h / 2, width: PH.w, height: PH.h, transform: `scale(${sc * inQ.sx}, ${sc * inQ.sy}) rotate(${4 * k}deg)`, opacity: Math.min(1, k * 3) }}>
        <div style={{ position: "absolute", inset: -10, borderRadius: 46, background: "#0b0b0b", border: "3px solid rgba(255,255,255,0.35)", boxShadow: "0 40px 80px rgba(0,0,0,0.7)" }} />
        <div style={{ position: "absolute", inset: 0, borderRadius: 38, overflow: "hidden", background: "#000" }}>
          {done > 0 && slide < 1 ? reel(done - 1, -PH.h * ease) : null}
          {reel(done, PH.h * (1 - ease))}
          {/* interfaz genérica de un feed vertical */}
          <div style={{ position: "absolute", left: 18, top: 18, ...display, fontStyle: "normal", fontSize: 26, letterSpacing: 0, textTransform: "none", ...stroke(3) }}>Reels</div>
          <div style={{ position: "absolute", right: 14, bottom: 120, display: "flex", flexDirection: "column", gap: 18, alignItems: "center" }}>
            {["♥", "💬", "➤"].map((ic, i) => (
              <div key={i} style={{ fontSize: 30, color: "white", textShadow: "0 2px 6px rgba(0,0,0,0.8)", transform: i === 0 && t - last < 0.5 && done > 0 ? `scale(${1 + 0.4 * Math.sin(((t - last) / 0.5) * Math.PI)})` : undefined }}>{ic === "💬" ? "✎" : ic}</div>
            ))}
          </div>
          <div style={{ position: "absolute", left: 16, right: 70, bottom: 18 }}>
            <div style={{ ...label, fontSize: 16, letterSpacing: 1, color: "white", textTransform: "none", textShadow: "0 2px 6px rgba(0,0,0,0.9)" }}>@gluteos.top · Seguir</div>
            <div style={{ ...label, fontSize: 14, letterSpacing: 0.5, color: "rgba(255,255,255,0.9)", textTransform: "none", marginTop: 4, textShadow: "0 2px 6px rgba(0,0,0,0.9)" }}>{`Ejercicio nº ${done + 1} que NO puede faltar`}</div>
          </div>
          {/* toque del dedo en cada swipe */}
          {done > 0 && t - last < 0.35 ? <div style={{ position: "absolute", left: PH.w / 2 - 30, top: PH.h * 0.62 - (t - last) * 500, width: 60, height: 60, borderRadius: 30, border: "4px solid rgba(255,255,255,0.8)", opacity: 1 - (t - last) / 0.35 }} /> : null}
        </div>
      </div>
      <div style={{ display: "none" }}>{frame}</div>
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

// E08: dos posiciones de abducción con el contorno real de Yago (sacado del metraje):
// de pie (cadera extendida) y sentado (cadera flexionada), con la zona y el movimiento
const ART = {
  depie: { w: 596, h: 1048, zones: [[0.71, 0.55]], arrows: [[0.86, 0.95, 1]] },
  sentado: { w: 802, h: 1337, zones: [[0.3, 0.5], [0.72, 0.5]], arrows: [[0.2, 0.6, -1], [0.84, 0.6, 1]] },
} as const;
const ArtCard: React.FC<{ kind: "depie" | "sentado"; at: number; title: string; sub: string; col: string; i: number }> = ({ kind, at, title, sub, col, i }) => {
  const { t, squash } = useClock();
  const q = squash(at, 10, 210);
  if (q.p < 0.01) return null;
  const A = ART[kind];
  const H = 400;
  const W = (A.w / A.h) * H;
  const draw = Math.min(1, Math.max(0, (t - at) / 0.55));
  const pulse = 0.5 + 0.5 * Math.sin((t - at) * 6);
  const mov = Math.sin((t - at) * 4.5);
  return (
    <div style={{ width: 470, height: 540, borderRadius: 24, background: "rgba(10,10,10,0.8)", border: `3px solid ${col}`, boxShadow: `0 0 30px ${col}44, 0 30px 60px rgba(0,0,0,0.5)`, display: "flex", flexDirection: "column", alignItems: "center", paddingTop: 14, opacity: Math.min(1, q.p * 2), transform: `translateY(${(1 - q.p) * 120}px) scale(${q.sx}, ${q.sy}) rotate(${i ? 1.5 : -1.5}deg)` }}>
      <div style={{ position: "relative", width: W, height: H }}>
        {/* contorno que se dibuja de arriba abajo */}
        <Img src={staticFile(`art/${kind}.png`)} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", clipPath: `inset(0 0 ${(1 - draw) * 100}% 0)`, filter: "drop-shadow(0 0 6px rgba(255,255,255,0.45))" }} />
        {draw < 1 ? <div style={{ position: "absolute", left: -10, right: -10, top: `${draw * 100}%`, height: 4, background: col, boxShadow: `0 0 16px 4px ${col}` }} /> : null}
        <svg width={W} height={H} style={{ position: "absolute", inset: 0, overflow: "visible", opacity: draw >= 1 ? 1 : 0 }}>
          {A.zones.map(([zx, zy], j) => (
            <ellipse key={j} cx={zx * W} cy={zy * H} rx={30 + 6 * pulse} ry={24 + 5 * pulse} fill={col} opacity={0.35 + 0.35 * pulse} style={{ filter: `blur(6px)` }} />
          ))}
          {A.arrows.map(([ax, ay, dir], j) => {
            const x = ax * W + dir * (6 + 10 * mov);
            const y = ay * H;
            return (
              <g key={j} transform={`translate(${x} ${y})`}>
                <line x1={0} y1={0} x2={dir * 46} y2={0} stroke={col} strokeWidth={8} strokeLinecap="round" />
                <path d={`M ${dir * 46} -14 L ${dir * 66} 0 L ${dir * 46} 14 Z`} fill={col} />
              </g>
            );
          })}
        </svg>
      </div>
      <div style={{ ...display, fontSize: 38, color: col, marginTop: 14 }}>{title}</div>
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
      <div style={{ position: "absolute", top: 170, left: 0, right: 0, display: "flex", justifyContent: "center", gap: 30 }}>
        <ArtCard kind="depie" at={POS.ext} title="Cadera extendida" sub="De pie" col={GREEN} i={0} />
        {t >= POS.flex - 0.02 ? <ArtCard kind="sentado" at={POS.flex} title="Más flexionada" sub="Sentado" col="#FFB020" i={1} /> : <div style={{ width: 470 }} />}
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
      <CardReact />
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
      <Pill from={COMBO.at} to={COMBO.to} top={250} size={46}>
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
