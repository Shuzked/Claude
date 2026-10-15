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
import { FONT, GREEN, PAPER } from "./theme";
import { CTA, f, FORE, HOOK, ISO, NEITHER, OBJ1, OBJ2, RANGE, TIPS, toSrc, TWO } from "./timeline";

// Rótulos de «Utiliza la cuerda para hacer tríceps» (pantalla). Los gráficos pegados
// al cuerpo están en Body.tsx. Todas las capas leen el tiempo del ORIGINAL (toSrc).

const INK = "#0A0A0A";
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

/** Tarjeta oscura de cristal, base de todos los recursos. */
const Glass: React.FC<{
  style?: React.CSSProperties;
  children: React.ReactNode;
}> = ({ style, children }) => (
  <div
    style={{
      background:
        "linear-gradient(180deg, rgba(28,28,28,0.94) 0%, rgba(14,14,14,0.96) 100%)",
      border: "2px solid rgba(255,255,255,0.14)",
      borderRadius: 26,
      boxShadow: "0 24px 60px rgba(0,0,0,0.55)",
      ...style,
    }}
  >
    {children}
  </div>
);



const RED = "#FF3B30";



/** Rótulo de arriba: número en círculo + texto, entra con muelle y squash. */
const Point: React.FC<{ from: number; to: number; n?: string; text: string; top?: number }> = ({ from, to, n, text, top = 290 }) => {
  const { t, squash, ramp, idle } = useClock();
  if (t < from - 0.05 || t > to + 0.05) return null;
  const q = squash(from, 10, 220);
  const out = ramp(to - 0.25, to, easeInOut);
  const id = idle(from, 0.7);
  const num = squash(from + 0.08, 8, 260);
  return (
    <AbsoluteFill>
      <div
        style={{
          position: "absolute",
          top,
          left: 0,
          right: 0,
          display: "flex",
          justifyContent: "center",
          opacity: Math.min(1, q.p * 2) * (1 - out),
          transform: `translateY(${(1 - q.p) * -60 + id.y - out * 30}px) rotate(${-2 + id.r * 0.6}deg)`,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 14, transform: `scale(${q.sx}, ${q.sy})` }}>
          {n ? (
            <div
              style={{
                ...display,
                fontStyle: "normal",
                width: 78,
                height: 78,
                borderRadius: 999,
                background: GREEN,
                color: INK,
                fontSize: 50,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                filter: GLOW,
                transform: `scale(${num.p * num.sx}, ${num.p * num.sy}) rotate(${(1 - num.p) * -90}deg)`,
              }}
            >
              {n}
            </div>
          ) : null}
          <div style={{ ...display, fontSize: 50, color: INK, background: PAPER, padding: "12px 22px 7px", borderRadius: 10 }}>
            <Words text={text} at={from + 0.06} gap={0.05} style={{ marginRight: "-0.22em" }} />
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};

// Hook: «ni se te ocurra utilizar la cuerda» → ¿NO USAR CUERDA?
const Hook: React.FC = () => {
  const { t, squash, ramp, idle } = useClock();
  if (t < HOOK.from - 0.05 || t > HOOK.to + 0.05) return null;
  const q = squash(HOOK.from, 10, 220);
  const no = squash(HOOK.no, 7, 300);
  const cross = ramp(HOOK.no, HOOK.no + 0.22);
  const out = ramp(HOOK.to - 0.25, HOOK.to, easeInOut);
  const id = idle(1.2);
  return (
    <AbsoluteFill>
      <div
        style={{
          position: "absolute",
          top: 300,
          left: 0,
          right: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          opacity: Math.min(1, q.p * 2) * (1 - out),
          transform: `translateY(${id.y}px) rotate(${-3 + id.r}deg)`,
        }}
      >
        <Words text="¿No usar" at={HOOK.from} gap={0.07} style={{ ...display, ...stroke(8), fontSize: 86, marginRight: "-0.22em" }} />
        <div
          style={{
            position: "relative",
            ...display,
            fontSize: 112,
            color: INK,
            background: GREEN,
            padding: "8px 30px 2px",
            marginTop: 10,
            filter: GLOW,
            transform: `scale(${(0.5 + 0.5 * q.p) * no.sx}, ${(0.5 + 0.5 * q.p) * no.sy}) rotate(${(1 - no.p) * 6}deg)`,
          }}
        >
          Cuerda?
          {/* tachón rojo que se dibuja en «ni se te ocurra» */}
          <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none" style={{ position: "absolute", inset: 0, overflow: "visible" }}>
            <path d="M -4 70 L 104 34" stroke={RED} strokeWidth={9} vectorEffect="non-scaling-stroke" strokeLinecap="round" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - cross} style={{ filter: "drop-shadow(0 0 8px rgba(255,59,48,0.8))" }} />
          </svg>
        </div>
      </div>
    </AbsoluteFill>
  );
};

// «estas dos cosas»
const Two: React.FC = () => {
  const { t, squash, ramp } = useClock();
  if (t < TWO.at - 0.05 || t > TWO.to + 0.05) return null;
  const q = squash(TWO.at, 7, 280);
  const out = ramp(TWO.to - 0.2, TWO.to, easeInOut);
  return (
    <AbsoluteFill>
      <div style={{ position: "absolute", top: 300, left: 0, right: 0, display: "flex", justifyContent: "center", opacity: Math.min(1, q.p * 2) * (1 - out) }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 18, transform: `scale(${q.p * q.sx}, ${q.p * q.sy}) rotate(${(1 - q.p) * -12 - 3}deg)` }}>
          <div style={{ ...display, fontStyle: "normal", fontSize: 150, color: GREEN, filter: GLOW, ...stroke(6) }}>2</div>
          <div style={{ ...display, ...stroke(8), fontSize: 76 }}>cosas</div>
        </div>
      </div>
    </AbsoluteFill>
  );
};

// «Fuerza isométrica»: candado que se cierra
const Iso: React.FC = () => {
  const { t, squash, ramp, idle } = useClock();
  if (t < ISO.hold - 0.2 || t > ISO.to + 0.05) return null;
  const q = squash(ISO.hold - 0.15, 9, 230);
  const lock = ramp(ISO.hold + 0.15, ISO.hold + 0.35);
  const out = ramp(ISO.to - 0.25, ISO.to, easeInOut);
  const id = idle(4.4, 0.8);
  return (
    <AbsoluteFill>
      <div style={{ position: "absolute", top: 300, left: 0, right: 0, display: "flex", justifyContent: "center", opacity: Math.min(1, q.p * 2) * (1 - out) }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16, background: GREEN, padding: "10px 24px 8px 16px", borderRadius: 12, filter: GLOW, transform: `translateY(${id.y}px) scale(${q.p * q.sx}, ${q.p * q.sy}) rotate(${-2 + id.r}deg)` }}>
          <svg width={52} height={60} viewBox="0 0 52 60">
            <path d={`M 12 ${28 - 10 * (1 - lock)} V 18 a 14 14 0 0 1 28 0 V 28`} fill="none" stroke={INK} strokeWidth={7} strokeLinecap="round" transform={`translate(${(1 - lock) * 8} ${-(1 - lock) * 6})`} />
            <rect x={4} y={26} width={44} height={32} rx={7} fill={INK} />
          </svg>
          <div style={{ ...display, fontSize: 52, color: INK }}>Fuerza isométrica</div>
        </div>
      </div>
    </AbsoluteFill>
  );
};

// «rotación del antebrazo»: antebrazo esquemático que gira (pronación ↔ supinación)
const Fore: React.FC = () => {
  const { t, squash, ramp, idle, frame, fps } = useClock();
  if (t < FORE.from - 0.05 || t > FORE.to + 0.05) return null;
  const q = squash(FORE.from, 9, 230);
  const out = ramp(FORE.to - 0.3, FORE.to, easeInOut);
  const id = idle(5.1, 0.8);
  const spin = Math.sin((frame / fps) * 4.2) * 70; // grados de giro de la mano
  return (
    <AbsoluteFill>
      <div style={{ position: "absolute", top: 1060, left: 0, right: 0, display: "flex", justifyContent: "center", opacity: Math.min(1, q.p * 2) * (1 - out) }}>
        <Glass style={{ display: "flex", alignItems: "center", gap: 20, padding: "16px 28px 16px 20px", transform: `translateY(${id.y}px) scale(${q.p * q.sx}, ${q.p * q.sy}) rotate(${-2 + id.r}deg)` }}>
          <svg width={150} height={90} viewBox="0 0 150 90" style={{ overflow: "visible" }}>
            {/* antebrazo */}
            <rect x={6} y={34} width={92} height={22} rx={11} fill={PAPER} />
            {/* mano que gira sobre el eje del antebrazo */}
            <g transform={`translate(112 45) scale(1 ${Math.cos((spin * Math.PI) / 180)})`}>
              <rect x={-14} y={-26} width={28} height={52} rx={12} fill={GREEN} style={{ filter: GLOW }} />
              <rect x={-14} y={-26} width={10} height={52} rx={5} fill="rgba(0,0,0,0.25)" />
            </g>
            {/* flecha de giro */}
            <path d="M 96 10 A 30 30 0 0 1 140 30" fill="none" stroke={GREEN} strokeWidth={5} strokeLinecap="round" />
            <path d="M 136 18 L 142 32 L 128 30 Z" fill={GREEN} />
          </svg>
          <div style={{ ...display, fontSize: 48, lineHeight: 1 }}>
            Rotación del
            <br />
            <span style={{ color: GREEN }}>antebrazo</span>
          </div>
        </Glass>
      </div>
    </AbsoluteFill>
  );
};

// «ni la musculatura del tríceps, ni del hombro pinchan ni cortan»
const Neither: React.FC = () => {
  const { t, squash, ramp } = useClock();
  if (t < NEITHER.triceps - 0.05 || t > NEITHER.to + 0.05) return null;
  const out = ramp(NEITHER.to - 0.3, NEITHER.to, easeInOut);
  const chip = (txt: string, at: number) => {
    const q = squash(at, 9, 240);
    const x = ramp(NEITHER.cut, NEITHER.cut + 0.25);
    const shake = t > NEITHER.cut && t < NEITHER.cut + 0.35 ? Math.sin(t * 70) * 6 * (1 - (t - NEITHER.cut) / 0.35) : 0;
    return (
      <div
        style={{
          position: "relative",
          ...display,
          fontSize: 52,
          color: INK,
          background: PAPER,
          padding: "10px 22px 6px",
          borderRadius: 10,
          opacity: Math.min(1, q.p * 2),
          transform: `translate(${shake}px, ${(1 - q.p) * 40}px) scale(${q.sx}, ${q.sy}) rotate(${(1 - q.p) * 10 - 2}deg)`,
        }}
      >
        {txt}
        <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none" style={{ position: "absolute", inset: 0, overflow: "visible" }}>
          <path d="M -3 50 L 103 50" stroke={RED} strokeWidth={8} vectorEffect="non-scaling-stroke" strokeLinecap="round" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - x} />
        </svg>
      </div>
    );
  };
  return (
    <AbsoluteFill>
      <div style={{ position: "absolute", top: 1060, left: 0, right: 0, display: "flex", justifyContent: "center", gap: 22, opacity: 1 - out }}>
        {chip("Tríceps", NEITHER.triceps)}
        {chip("Hombro", NEITHER.shoulder)}
      </div>
    </AbsoluteFill>
  );
};

// Recorrido: tres fotogramas sucesivos de la misma repetición (sin espejar)
const Frames: React.FC = () => {
  const { t, squash, ramp } = useClock();
  if (t < RANGE.frames - 0.05 || t > RANGE.to + 0.05) return null;
  const out = ramp(RANGE.to - 0.3, RANGE.to, easeInOut);
  const items = [
    { src: "frames/inicio.jpg", label: "Inicio", lvl: 1, at: RANGE.frames },
    { src: "frames/medio.jpg", label: "Medio", lvl: 0.6, at: RANGE.frames + 0.35 },
    { src: "frames/final.jpg", label: "Final", lvl: 0.25, at: RANGE.frames + 0.7 },
  ];
  return (
    <AbsoluteFill style={{ background: `rgba(6,6,6,${0.82 * Math.min(1, ramp(RANGE.frames - 0.1, RANGE.frames + 0.2))})`, opacity: 1 - out }}>
      <div style={{ position: "absolute", top: 470, left: 0, right: 0, display: "flex", justifyContent: "center", gap: 18 }}>
        {items.map((it, i) => {
          const q = squash(it.at, 10, 230);
          const bar = ramp(it.at + 0.15, it.at + 0.5);
          return (
            <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", opacity: Math.min(1, q.p * 2), transform: `translateY(${(1 - q.p) * 80}px) rotate(${(i - 1) * 2 + (1 - q.p) * 8}deg) scale(${q.sx}, ${q.sy})` }}>
              <div style={{ width: 330, height: 495, borderRadius: 16, overflow: "hidden", border: "5px solid rgba(255,255,255,0.92)", boxShadow: "0 30px 60px rgba(0,0,0,0.6)" }}>
                <Img src={staticFile(it.src)} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
              </div>
              <div style={{ ...display, fontSize: 46, marginTop: 18, color: GREEN, filter: GLOW, ...stroke(6) }}>{it.label}</div>
              {/* demanda sobre el codo: de más a menos */}
              <div style={{ ...label, fontSize: 18, letterSpacing: 3, color: "rgba(255,255,255,0.65)", marginTop: 12 }}>Demanda codo</div>
              <div style={{ width: 200, height: 18, borderRadius: 9, background: "rgba(255,255,255,0.12)", marginTop: 8, overflow: "hidden" }}>
                <div style={{ width: `${it.lvl * 100 * bar}%`, height: "100%", borderRadius: 9, background: it.lvl > 0.8 ? RED : it.lvl > 0.5 ? "#FFB020" : GREEN }} />
              </div>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

// Conclusión: Comodidad · Acercarte al fallo · Progresar
const Tips: React.FC = () => {
  const { t, squash, ramp, idle } = useClock();
  if (t < TIPS.comfy - 0.05 || t > TIPS.to + 0.05) return null;
  const out = ramp(TIPS.to - 0.3, TIPS.to, easeInOut);
  const items: [string, number][] = [
    ["Comodidad", TIPS.comfy],
    ["Acercarte al fallo", TIPS.fail],
    ["Progresar", TIPS.prog],
  ];
  return (
    <AbsoluteFill>
      <div style={{ position: "absolute", top: 300, right: 60, display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 14, opacity: 1 - out, transform: `translateX(${out * 60}px)` }}>
        {items.map(([txt, at], i) => {
          const q = squash(at, 9, 240);
          const id = idle(i * 1.7, 0.6);
          const check = ramp(at + 0.1, at + 0.35);
          return (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 14, opacity: Math.min(1, q.p * 2), transform: `translate(${(1 - q.p) * 140}px, ${id.y}px) scale(${q.sx}, ${q.sy}) rotate(${id.r * 0.6}deg)` }}>
              <div style={{ ...display, fontSize: 48, color: i === 2 ? INK : INK, background: i === 2 ? GREEN : PAPER, padding: "10px 20px 6px", borderRadius: 10, filter: i === 2 ? GLOW : undefined }}>{txt}</div>
              <svg width={52} height={52} viewBox="0 0 52 52">
                <circle cx={26} cy={26} r={24} fill={GREEN} style={{ filter: GLOW }} />
                <path d="M 14 27 L 23 36 L 39 17" fill="none" stroke={INK} strokeWidth={6} strokeLinecap="round" strokeLinejoin="round" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - check} />
              </svg>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

// CTA: un único rótulo «Sígueme · @heracles_fit», sin tapar cara ni subtítulos
const Follow: React.FC = () => {
  const { t, squash, idle } = useClock();
  if (t < CTA.follow - 0.05) return null;
  const q = squash(CTA.follow, 9, 220);
  const id = idle(7.3, 0.8);
  const shine = ((t - CTA.rig) * 1.2) % 1.6;
  return (
    <AbsoluteFill>
      <div style={{ position: "absolute", top: 300, left: 0, right: 0, display: "flex", justifyContent: "center", opacity: Math.min(1, q.p * 2) }}>
        <div
          style={{
            position: "relative",
            overflow: "hidden",
            display: "flex",
            alignItems: "center",
            gap: 14,
            background: "rgba(10,10,10,0.88)",
            border: `3px solid ${GREEN}`,
            padding: "14px 28px 12px",
            borderRadius: 999,
            boxShadow: "0 0 30px rgba(4,228,0,0.4)",
            transform: `translateY(${(1 - q.p) * -50 + id.y}px) scale(${q.sx}, ${q.sy}) rotate(${id.r * 0.5}deg)`,
          }}
        >
          <div style={{ ...display, fontSize: 46 }}>Sígueme</div>
          <div style={{ width: 10, height: 10, borderRadius: 99, background: GREEN }} />
          <div style={{ ...display, fontSize: 46, color: GREEN, textTransform: "none" }}>@heracles_fit</div>
          {t > CTA.rig ? (
            <div style={{ position: "absolute", top: 0, bottom: 0, width: 90, left: `${shine * 100 - 30}%`, background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.35), transparent)", transform: "skewX(-20deg)" }} />
          ) : null}
        </div>
      </div>
    </AbsoluteFill>
  );
};

export const Graphics: React.FC = () => (
  <AbsoluteFill>
    <Hook />
    <Two />
    <Point from={OBJ1.from} to={OBJ1.to} n="1" text="Demanda sobre el hombro" />
    <Point from={OBJ2.from} to={OBJ2.to} n="2" text="Giro al terminar" />
    <Iso />
    <Fore />
    <Neither />
    <Frames />
    <Tips />
    <Follow />
  </AbsoluteFill>
);
