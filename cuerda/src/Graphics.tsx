import React from "react";
import {
  AbsoluteFill,
  Easing,
  Img,
  staticFile,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { cameraAt } from "./Camera";
import { FONT, GREEN, PAPER } from "./theme";
import { CTA, f, FORE, HOOK, ISO, NEITHER, OBJ1, OBJ2, TIPS, toSrc, TWO } from "./timeline";

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

// Hook: «ni se te ocurra utilizar la cuerda» → la imagen se tiñe de rojo (está mal)
// y el rótulo golpea con sacudida
const Hook: React.FC = () => {
  const { t, squash, ramp, idle } = useClock();
  if (t < HOOK.from - 0.05 || t > HOOK.to + 0.05) return null;
  const q = squash(HOOK.from, 10, 220);
  const no = squash(HOOK.no, 6, 320);
  const red = ramp(HOOK.no - 0.05, HOOK.no + 0.12) * (1 - ramp(HOOK.to - 0.3, HOOK.to, easeInOut));
  const out = ramp(HOOK.to - 0.25, HOOK.to, easeInOut);
  const id = idle(1.2);
  const d = t - HOOK.no;
  const hit = d > 0 && d < 0.4 ? Math.sin(d * 85) * 16 * (1 - d / 0.4) : 0;
  const flash = d > 0 && d < 0.18 ? 1 - d / 0.18 : 0;
  return (
    <AbsoluteFill>
      {/* filtro rojo: la imagen se tiñe y se oscurece por los bordes */}
      <AbsoluteFill style={{ background: "rgba(255,30,20,1)", mixBlendMode: "color", opacity: 0.62 * red }} />
      <AbsoluteFill style={{ background: "radial-gradient(ellipse at 50% 45%, transparent 35%, rgba(60,0,0,0.75) 100%)", opacity: red }} />
      <AbsoluteFill style={{ background: "rgba(255,59,48,1)", opacity: 0.35 * flash }} />
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
          transform: `translate(${hit}px, ${id.y}px) rotate(${-3 + id.r}deg)`,
        }}
      >
        <Words text="¿No usar" at={HOOK.from} gap={0.07} style={{ ...display, ...stroke(8), fontSize: 86, marginRight: "-0.22em" }} />
        <div
          style={{
            ...display,
            fontSize: 112,
            color: PAPER,
            background: RED,
            padding: "8px 30px 2px",
            marginTop: 10,
            filter: "drop-shadow(0 0 18px rgba(255,59,48,0.7))",
            transform: `scale(${(0.5 + 0.5 * q.p) * no.sx}, ${(0.5 + 0.5 * q.p) * no.sy}) rotate(${(1 - no.p) * 8 - 2}deg)`,
          }}
        >
          Cuerda?
        </div>
      </div>
    </AbsoluteFill>
  );
};

// «estas dos cosas»: «2» y «COSAS» en grande DETRÁS de Yago (como en el quiz). El
// recorte de Yago va encima con la misma cámara que el vídeo.
const neonOn = (d: number) => {
  if (d < 0) return 0;
  if ((d > 0.06 && d < 0.1) || (d > 0.17 && d < 0.2)) return 0.25;
  return Math.min(1, d / 0.05) * (0.9 + 0.1 * Math.sin(d * 31) * Math.sin(d * 11));
};
const TwoBehind: React.FC = () => {
  const { t, frame, fps, pop, ramp } = useClock();
  if (t < TWO.at - 0.3 || t >= 13.12) return null;
  const a = pop(TWO.at - 0.2, 14, 260);
  const b = pop(TWO.at + 0.12, 13, 260);
  const out = ramp(TWO.to - 0.2, TWO.to + 0.02, easeInOut);
  const d = t - (TWO.at - 0.2);
  const light = neonOn(d);
  const sh = (at: number) => {
    const k = t - at;
    return k > 0 && k < 0.35 ? Math.sin(k * 90) * 12 * (1 - k / 0.35) : 0;
  };
  const sx = sh(TWO.at - 0.2) + sh(TWO.at + 0.12);
  const cam = cameraAt(frame, fps);
  const big: React.CSSProperties = { ...display, position: "absolute", left: 0, right: 0, textAlign: "center", lineHeight: 0.8 };
  return (
    <AbsoluteFill>
      <AbsoluteFill style={{ background: "radial-gradient(ellipse at 50% 38%, rgba(4,228,0,0.16) 0%, rgba(0,0,0,0.55) 55%, rgba(0,0,0,0.7) 100%)", opacity: Math.min(1, a) * (1 - out) }} />
      <AbsoluteFill style={{ transform: `translate(${sx}px, ${sx * 0.4}px) scale(${1 + out * 0.12})`, opacity: 1 - out }}>
        <div
          style={{
            ...big,
            top: 150,
            fontSize: 760,
            fontStyle: "italic",
            color: GREEN,
            WebkitTextStroke: "14px #A6FF9E",
            paintOrder: "stroke fill",
            textShadow: `0 0 ${30 + 60 * light}px rgba(4,228,0,${0.35 + 0.55 * light}), 0 0 ${120 * light}px rgba(59,255,46,${0.5 * light})`,
            transform: `scale(${2.2 - 1.2 * a}) rotate(${(1 - a) * 12}deg)`,
            opacity: Math.min(1, a * 3) * (0.55 + 0.45 * light),
            filter: `blur(${(1 - Math.min(1, a)) * 24}px)`,
          }}
        >
          2
        </div>
        <div
          style={{
            ...big,
            top: 800,
            fontSize: 250,
            letterSpacing: -6,
            transform: `scale(${1.8 - 0.8 * b})`,
            opacity: Math.min(1, b * 3),
            filter: `blur(${(1 - Math.min(1, b)) * 18}px)`,
          }}
        >
          Cosas
        </div>
      </AbsoluteFill>
      {/* Yago por delante */}
      <AbsoluteFill style={{ transform: `translate(${cam.x}px, ${cam.y}px) scale(${cam.scale}) rotate(${cam.rot}deg)`, transformOrigin: "50% 32%" }}>
        <Img src={staticFile(`roto/two/r_${String(Math.round(t * 25)).padStart(5, "0")}.png`)} style={{ width: "100%", height: "100%" }} />
      </AbsoluteFill>
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

// «rotación del antebrazo»: zoom a los antebrazos (cámara) y rótulo limpio con
// una flecha circular que gira
const Fore: React.FC = () => {
  const { t, squash, ramp, idle } = useClock();
  if (t < FORE.from - 0.05 || t > FORE.to + 0.05) return null;
  const q = squash(FORE.from, 9, 230);
  const out = ramp(FORE.to - 0.3, FORE.to, easeInOut);
  const id = idle(5.1, 0.8);
  const spin = (t - FORE.from) * 300;
  return (
    <AbsoluteFill>
      <div style={{ position: "absolute", top: 300, left: 0, right: 0, display: "flex", justifyContent: "center", opacity: Math.min(1, q.p * 2) * (1 - out) }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 16,
            background: GREEN,
            padding: "10px 26px 8px 14px",
            borderRadius: 14,
            filter: GLOW,
            transform: `translateY(${(1 - q.p) * -50 + id.y}px) scale(${q.sx}, ${q.sy}) rotate(${-2 + id.r}deg)`,
          }}
        >
          <svg width={64} height={64} viewBox="0 0 64 64" style={{ transform: `rotate(${spin}deg)` }}>
            <path d="M 32 8 A 24 24 0 1 1 9.5 23" fill="none" stroke={INK} strokeWidth={7} strokeLinecap="round" />
            <path d="M 2 16 L 11 30 L 20 15 Z" fill={INK} />
          </svg>
          <Words text="Rotación del antebrazo" at={FORE.from + 0.05} gap={0.06} style={{ ...display, fontSize: 52, color: INK, marginRight: "-0.22em" }} />
        </div>
      </div>
    </AbsoluteFill>
  );
};

// «ni la musculatura del tríceps, ni del hombro pinchan ni cortan»: medidor de quién
// trabaja en el giro. El antebrazo se llena; tríceps y hombro intentan subir, caen a 0
// y se apagan con «ni pinchan ni cortan»
const Neither: React.FC = () => {
  const { t, squash, ramp, idle } = useClock();
  if (t < NEITHER.from - 0.05 || t > NEITHER.to + 0.05) return null;
  const card = squash(NEITHER.from, 10, 220);
  const out = ramp(NEITHER.to - 0.3, NEITHER.to, easeInOut);
  const id = idle(6.2, 0.7);
  const rows: { name: string; at: number; on: boolean }[] = [
    { name: "Antebrazo", at: NEITHER.from + 0.05, on: true },
    { name: "Tríceps", at: NEITHER.triceps, on: false },
    { name: "Hombro", at: NEITHER.shoulder, on: false },
  ];
  return (
    <AbsoluteFill>
      <div
        style={{
          position: "absolute",
          top: 1010,
          left: 0,
          right: 0,
          display: "flex",
          justifyContent: "center",
          opacity: Math.min(1, card.p * 2) * (1 - out),
          transform: `translateY(${(1 - card.p) * 80 + id.y}px) rotate(${id.r * 0.5}deg)`,
        }}
      >
        <Glass style={{ padding: "18px 26px 20px", width: 640, transform: `scale(${card.sx}, ${card.sy})` }}>
          <div style={{ ...label, fontSize: 20, letterSpacing: 4, color: "rgba(255,255,255,0.55)", marginBottom: 6 }}>¿Quién gira la cuerda?</div>
          {rows.map((r, i) => {
            const q = squash(r.at, 9, 240);
            // los «off» suben un poco y caen a cero; el «on» se llena con rebote
            const lvl = r.on
              ? Math.min(1.05, ramp(r.at, r.at + 0.5, Easing.bezier(0.3, 1.5, 0.5, 1)))
              : Math.max(0, Math.sin(Math.min(1, (t - r.at) / 0.45) * Math.PI) * 0.28) * (t > r.at ? 1 : 0);
            const dead = !r.on && t > NEITHER.cut;
            const x = ramp(NEITHER.cut, NEITHER.cut + 0.2);
            const shake = dead && t < NEITHER.cut + 0.3 ? Math.sin(t * 80) * 5 * (1 - (t - NEITHER.cut) / 0.3) : 0;
            return (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 16, marginTop: 12, opacity: Math.min(1, q.p * 2) * (dead ? 0.5 + 0.5 * (1 - x) : 1), transform: `translateX(${(1 - q.p) * -60 + shake}px)` }}>
                <div style={{ ...display, fontSize: 38, width: 210, color: r.on ? GREEN : PAPER }}>{r.name}</div>
                <div style={{ position: "relative", flex: 1, height: 26, borderRadius: 13, background: "rgba(255,255,255,0.1)", overflow: "hidden" }}>
                  <div style={{ width: `${Math.max(0, lvl) * 100}%`, height: "100%", borderRadius: 13, background: r.on ? `linear-gradient(90deg, rgba(4,228,0,0.6), ${GREEN})` : PAPER, boxShadow: r.on ? "0 0 18px rgba(4,228,0,0.7)" : undefined }} />
                </div>
                <div style={{ ...display, fontSize: 36, width: 86, textAlign: "right", color: r.on ? GREEN : dead ? RED : PAPER, transform: `scale(${dead ? 1 + 0.25 * Math.sin(x * Math.PI) : 1})` }}>
                  {r.on ? `${Math.round(Math.min(1, lvl) * 100)}%` : dead ? "0%" : `${Math.round(lvl * 100)}%`}
                </div>
              </div>
            );
          })}
        </Glass>
      </div>
    </AbsoluteFill>
  );
};

// Conclusión: escalera de tres peldaños que sube (Comodidad → Al fallo → Progresar);
// una bola verde salta de peldaño en peldaño al ritmo de la voz
const Tips: React.FC = () => {
  const { t, squash, ramp, idle, pop } = useClock();
  if (t < TIPS.comfy - 0.15 || t > TIPS.to + 0.05) return null;
  const out = ramp(TIPS.to - 0.3, TIPS.to, easeInOut);
  const steps: [string, number][] = [
    ["Comodidad", TIPS.comfy],
    ["Al fallo", TIPS.fail],
    ["Progresar", TIPS.prog],
  ];
  const SW = 300;
  const SH = 70;
  const id = idle(8.1, 0.6);
  // posición de la bola: salta al peldaño que se nombra
  let bx = 0;
  let by = 0;
  steps.forEach(([, at], i) => {
    const h = pop(at - 0.05, 11, 260);
    if (i === 0) {
      bx = SW * 0.5;
      by = -SH * 0 - 40 * (1 - h);
    } else {
      bx += SW * h;
      by -= SH * h;
    }
  });
  const hop = steps.reduce((acc, [, at]) => {
    const d = t - (at - 0.05);
    return d > 0 && d < 0.35 ? Math.sin((d / 0.35) * Math.PI) * 60 : acc;
  }, 0);
  return (
    <AbsoluteFill>
      <div style={{ position: "absolute", top: 200, left: 540 - (SW * 3) / 2, width: SW * 3, height: SH * 3 + 60, opacity: 1 - out, transform: `translateY(${id.y - out * 30}px) rotate(${-3 + id.r * 0.5}deg)` }}>
        {steps.map(([txt, at], i) => {
          const q = squash(at - 0.12, 10, 240);
          return (
            <div key={i} style={{ position: "absolute", left: i * SW, top: SH * (2 - i) + 40, width: SW - 10, opacity: Math.min(1, q.p * 2), transform: `translateY(${(1 - q.p) * 60}px) scale(${q.sx}, ${q.sy})`, transformOrigin: "50% 100%" }}>
              <div style={{ ...display, fontSize: 40, textAlign: "center", color: i === 2 ? GREEN : PAPER, filter: i === 2 ? GLOW : undefined, ...stroke(6) }}>{txt}</div>
              <div style={{ height: 14, marginTop: 10, borderRadius: 7, background: i === 2 ? GREEN : "rgba(255,255,255,0.85)", boxShadow: i === 2 ? "0 0 20px rgba(4,228,0,0.8)" : "0 6px 18px rgba(0,0,0,0.5)" }} />
            </div>
          );
        })}
        <div style={{ position: "absolute", left: bx - 20, top: SH * 2 + 40 + by - 40 - hop + 54, width: 40, height: 40, borderRadius: 99, background: GREEN, boxShadow: "0 0 24px rgba(4,228,0,0.9)", opacity: Math.min(1, pop(TIPS.comfy - 0.05, 11) * 2) }} />
      </div>
    </AbsoluteFill>
  );
};

// CTA «Sígueme» (como siempre): una línea verde se traza, la palabra sube a través de
// ella y una flecha fina sigue empujando hacia arriba. El @ va sobre su cabeza (Body).
const Follow: React.FC = () => {
  const { t, ramp } = useClock();
  const at = CTA.follow;
  if (t < at - 0.1) return null;
  const line = ramp(at - 0.05, at + 0.35, easeInOut);
  const rise = ramp(at + 0.2, at + 0.75, Easing.bezier(0.2, 1.4, 0.35, 1));
  const arrow = ramp(at + 0.7, at + 1.05, Easing.bezier(0.2, 1.3, 0.4, 1));
  const bob = Math.sin(Math.max(0, t - at - 1.0) * 5) * 8 * arrow;
  const W = 560;
  return (
    <div style={{ position: "absolute", top: 1080, left: 0, right: 0, display: "flex", flexDirection: "column", alignItems: "center" }}>
      <svg width={120} height={70} viewBox="0 0 120 70" style={{ opacity: Math.min(1, arrow * 3), transform: `translateY(${(1 - arrow) * 190 - bob}px) scaleX(${0.4 + 0.6 * arrow})`, filter: GLOW }}>
        <path d="M 14 56 L 60 14 L 106 56" fill="none" stroke={GREEN} strokeWidth={8} strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <div style={{ height: 140, overflow: "hidden", marginTop: 6, display: "flex", alignItems: "flex-end" }}>
        <div style={{ ...display, fontSize: 132, letterSpacing: interpolate(rise, [0, 1], [30, 2]), transform: `translateY(${(1 - rise) * 150}px)`, textShadow: "0 6px 30px rgba(0,0,0,0.6)" }}>Sígueme</div>
      </div>
      <div style={{ width: W * line, height: 5, borderRadius: 3, background: GREEN, boxShadow: "0 0 18px rgba(4,228,0,0.8)", marginTop: 6 }} />
    </div>
  );
};

export const Graphics: React.FC = () => (
  <AbsoluteFill>
    <Hook />
    <TwoBehind />
    <Point from={OBJ1.from} to={OBJ1.to} n="1" text="Demanda sobre el hombro" />
    <Point from={OBJ2.from} to={OBJ2.to} n="2" text="Giro al terminar" />
    <Iso />
    <Fore />
    <Neither />
    <Tips />
    <Follow />
  </AbsoluteFill>
);
