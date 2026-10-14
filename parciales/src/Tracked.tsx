import React from "react";
import {
  Easing,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { LegAnatomy } from "./Figures";
import { poseAt, type Pose } from "./pose";
import { FONT } from "./theme";
import { HOLO, TRIM } from "./timeline";

// Hologramas en las manos (0:45). Van en coordenadas del vídeo, dentro de la cámara
// virtual, así que siguen exactamente a las manos con los zooms.
//  · «Qué tramo»: proyectado desde la palma izquierda.
//  · Gesto de coger con la otra mano: aparece un puntito de luz en esa mano.
//  · Al abrirla: el puntito se convierte en el proyector de «Qué músculo».
//  · Al juntar las manos: los dos orbitan a su alrededor y se difuminan.

const HOLO_RGB = "120,255,170";
const holo = (a: number) => `rgba(${HOLO_RGB},${a})`;
const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

const useT = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return TRIM + frame / fps;
};

/** Pose del fotograma o la más cercana (±3 fotogramas). */
const near = (t: number): Pose | null => {
  for (const d of [0, -0.04, 0.04, -0.08, 0.08, -0.12, 0.12]) {
    const p = poseAt(t + d);
    if (p) return p;
  }
  return null;
};

/** Centro de la palma, promediado en 3 fotogramas para que no tiemble. */
const palm = (t: number, hand: "l" | "r") => {
  let x = 0;
  let y = 0;
  let n = 0;
  for (const d of [-0.04, 0, 0.04]) {
    const p = near(t + d);
    if (!p) continue;
    const pts = [p[`${hand}w`], p[`${hand}i`], p[`${hand}p`], p[`${hand}t`]];
    for (const q of pts) {
      x += q[0];
      y += q[1];
      n++;
    }
  }
  return n ? { x: x / n, y: y / n } : null;
};

// Parpadeo pseudoaleatorio estable por fotograma
const noise = (k: number) => {
  const v = Math.sin(k * 12.9898) * 43758.5453;
  return v - Math.floor(v);
};

// ---------------------------------------------------------------------------
// Objetos holográficos (dibujados en el color del holograma)

const TramoHolo: React.FC<{ t: number }> = ({ t }) => {
  const R = 70;
  const a = (deg: number) => {
    const r = (deg * Math.PI) / 180;
    return [100 + Math.cos(r) * R, 90 + Math.sin(r) * R];
  };
  const k = (1 - Math.cos(t * 4.2)) / 2;
  const [x1, y1] = a(110);
  const [x2, y2] = a(0);
  const [s1, s2] = [a(100), a(65)];
  const leg = a(100 - 35 * k);
  return (
    <svg width={200} height={200} viewBox="0 0 200 200">
      <path
        d={`M ${x1} ${y1} A ${R} ${R} 0 0 0 ${x2} ${y2}`}
        fill="none"
        stroke={holo(0.35)}
        strokeWidth={6}
        strokeDasharray="3 8"
      />
      <path
        d={`M ${s1[0]} ${s1[1]} A ${R} ${R} 0 0 0 ${s2[0]} ${s2[1]}`}
        fill="none"
        stroke={holo(1)}
        strokeWidth={12}
        strokeLinecap="round"
      />
      <line
        x1={22}
        y1={90}
        x2={100}
        y2={90}
        stroke={holo(0.9)}
        strokeWidth={10}
        strokeLinecap="round"
      />
      <line
        x1={100}
        y1={90}
        x2={leg[0]}
        y2={leg[1]}
        stroke={holo(0.9)}
        strokeWidth={9}
        strokeLinecap="round"
      />
      <circle
        cx={leg[0]}
        cy={leg[1]}
        r={9}
        fill="none"
        stroke={holo(1)}
        strokeWidth={3}
      />
      <circle cx={100} cy={90} r={6} fill={holo(1)} />
      {[0, 1, 2, 3].map((i) => (
        <line
          key={i}
          x1={20}
          y1={150 + i * 10}
          x2={180}
          y2={150 + i * 10}
          stroke={holo(0.12)}
          strokeWidth={1}
        />
      ))}
    </svg>
  );
};

const MusculoHolo: React.FC<{ at: number }> = ({ at }) => (
  <div
    style={{
      width: 200,
      height: 200,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      // piernas en tonos del holograma
      filter:
        "grayscale(1) brightness(1.9) sepia(1) hue-rotate(75deg) saturate(3.2)",
    }}
  >
    <LegAnatomy at={at - 0.4} lit="rf" litAt={at + 0.1} scale={0.33} />
  </div>
);

// ---------------------------------------------------------------------------
// Holograma completo: proyector en la palma, haz de luz y objeto volumétrico

const Hologram: React.FC<{
  t: number;
  at: number;
  base: { x: number; y: number }; // palma (proyector)
  obj: { x: number; y: number }; // centro del objeto
  label: string;
  children: React.ReactNode;
  beam: number; // 0..1 visibilidad del haz y del proyector
  fade: number; // 0..1 opacidad global
  blur: number;
  spin: number; // giro en Y (grados)
  seed: number;
}> = ({ t, at, base, obj, label, children, beam, fade, blur, spin, seed }) => {
  const { fps } = useVideoConfig();
  const frame = Math.round(t * fps);
  const grow = interpolate(t, [at, at + 0.25], [0, 1], {
    ...clamp,
    easing: Easing.out(Easing.cubic),
  });
  const mat = interpolate(t, [at + 0.12, at + 0.55], [0, 1], {
    ...clamp,
    easing: Easing.out(Easing.cubic),
  });
  const flick = 0.86 + 0.14 * noise(frame + seed * 31);
  const glitch =
    noise(Math.floor(frame / 2) + seed) > 0.93 ? (noise(frame) - 0.5) * 14 : 0;
  const size = 200;
  const SCALE = 1.45; // tamaño del holograma
  const topY = obj.y + size * 0.42 * 1.45; // base del objeto, donde llega el haz
  const beamTopW = 260;
  const beamBotW = 34;
  const slices = [-14, -7, 0, 7, 14];
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        opacity: fade * flick,
        filter: blur > 0.2 ? `blur(${blur}px)` : undefined,
      }}
    >
      {/* haz de luz */}
      <svg
        style={{
          position: "absolute",
          inset: 0,
          overflow: "visible",
          opacity: beam * grow,
          mixBlendMode: "screen",
        }}
        width={1080}
        height={1920}
      >
        <defs>
          <linearGradient id={`beam-${seed}`} x1="0" y1="1" x2="0" y2="0">
            <stop offset="0" stopColor={holo(0.55)} />
            <stop offset="1" stopColor={holo(0.04)} />
          </linearGradient>
          <radialGradient id={`pad-${seed}`}>
            <stop offset="0" stopColor={holo(0.95)} />
            <stop offset="0.5" stopColor={holo(0.35)} />
            <stop offset="1" stopColor={holo(0)} />
          </radialGradient>
        </defs>
        <polygon
          points={`${base.x - beamBotW / 2},${base.y} ${base.x + beamBotW / 2},${base.y} ${obj.x + beamTopW / 2},${base.y + (topY - base.y) * grow} ${obj.x - beamTopW / 2},${base.y + (topY - base.y) * grow}`}
          fill={`url(#beam-${seed})`}
          style={{ filter: "blur(3px)" }}
        />
        <ellipse
          cx={base.x}
          cy={base.y}
          rx={42}
          ry={11}
          fill={`url(#pad-${seed})`}
        />
        {/* partículas que suben por el haz */}
        {Array.from({ length: 10 }).map((_, i) => {
          const life = (((t * 0.9 + noise(i + seed) * 3) % 1) + 1) % 1;
          const px =
            base.x +
            (obj.x - base.x) * life +
            (noise(i * 7 + seed) - 0.5) *
              (beamBotW + (beamTopW - beamBotW) * life) *
              0.8;
          const py = base.y + (topY - base.y) * life;
          return (
            <circle
              key={i}
              cx={px}
              cy={py}
              r={1.8 + noise(i) * 1.5}
              fill={holo(0.9 * (1 - life))}
            />
          );
        })}
      </svg>
      {/* objeto volumétrico: varias capas a distinta profundidad, con perspectiva */}
      <div
        style={{
          position: "absolute",
          left: obj.x - size / 2 + glitch,
          top: obj.y - size / 2,
          width: size,
          height: size,
          perspective: 520,
          mixBlendMode: "screen",
          clipPath: `inset(${(1 - mat) * 100}% -40% -40% -40%)`,
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            transformStyle: "preserve-3d",
            transform: `rotateX(14deg) rotateY(${spin}deg) scale(${(0.85 + 0.15 * mat) * SCALE})`,
          }}
        >
          {slices.map((z, i) => (
            <div
              key={z}
              style={{
                position: "absolute",
                inset: 0,
                transform: `translateZ(${z}px)`,
                opacity: i === 2 ? 1 : 0.28,
                filter: `drop-shadow(0 0 ${i === 2 ? 10 : 4}px ${holo(0.9)})`,
              }}
            >
              {children}
            </div>
          ))}
        </div>
        {/* líneas de escaneo */}
        <div
          style={{
            position: "absolute",
            inset: -10,
            background: `repeating-linear-gradient(0deg, rgba(0,0,0,0.45) 0px, rgba(0,0,0,0.45) 1.5px, transparent 1.5px, transparent 4px)`,
            backgroundPosition: `0 ${(t * 40) % 4}px`,
            mixBlendMode: "multiply",
          }}
        />
        {/* barrido de luz */}
        <div
          style={{
            position: "absolute",
            left: -10,
            right: -10,
            height: 14,
            top: (((t - at) * 120) % (size + 40)) - 20,
            background: `linear-gradient(180deg, transparent, ${holo(0.35)}, transparent)`,
          }}
        />
      </div>
      {/* rótulo */}
      <div
        style={{
          position: "absolute",
          left: obj.x - 150,
          width: 300,
          top: obj.y - (size / 2) * 1.45 - 48,
          textAlign: "center",
          fontFamily: FONT,
          fontWeight: 800,
          fontSize: 32,
          letterSpacing: 4,
          textTransform: "uppercase",
          color: holo(1),
          textShadow: `0 0 12px ${holo(0.9)}, 0 0 2px rgba(0,0,0,0.8)`,
          opacity: mat,
          whiteSpace: "nowrap",
          mixBlendMode: "screen",
        }}
      >
        {label}
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------

const Holograms: React.FC = () => {
  const t = useT();
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const [o0, o1] = HOLO.orbit;
  if (t < HOLO.a.at - 0.05 || t > o1 + 0.02) return null;
  const pose = near(t);
  if (!pose) return null;

  // órbita final: se sueltan de las manos, giran alrededor del torso y se difuminan
  const orb = interpolate(t, [o0, o0 + 0.25], [0, 1], {
    ...clamp,
    easing: Easing.inOut(Easing.cubic),
  });
  const fadeOut = interpolate(t, [o0 + 0.15, o1], [1, 0], clamp);
  const blurOut = interpolate(t, [o0 + 0.1, o1], [0, 14], clamp);
  const torso = {
    x: (pose.ls[0] + pose.rs[0] + pose.lh[0] + pose.rh[0]) / 4,
    y: (pose.ls[1] + pose.rs[1] + pose.lh[1] + pose.rh[1]) / 4,
  };
  const orbitPos = (phase: number) => {
    const ang = phase + (t - o0) * 7;
    return {
      x: torso.x + Math.cos(ang) * 230,
      y: torso.y - 40 + Math.sin(ang) * 55,
      depth: Math.sin(ang),
    };
  };

  const items: React.ReactNode[] = [];

  // A · «Qué tramo» en la palma izquierda
  const pa = palm(t, "l");
  if (pa && t >= HOLO.a.at) {
    const inHand = { x: pa.x, y: pa.y - 210 };
    const op = orbitPos(Math.PI);
    const obj = {
      x: inHand.x + (op.x - inHand.x) * orb,
      y: inHand.y + (op.y - inHand.y) * orb,
    };
    items.push(
      <Hologram
        key="a"
        t={t}
        at={HOLO.a.at}
        base={pa}
        obj={obj}
        label="Qué tramo"
        beam={1 - orb}
        fade={fadeOut * (orb > 0 ? 0.75 + 0.25 * op.depth : 1)}
        blur={blurOut}
        spin={Math.sin((t - HOLO.a.at) * 1.6) * 38}
        seed={1}
      >
        <TramoHolo t={t} />
      </Hologram>,
    );
  }

  // puntito de luz en la mano que «coge» (hasta que la abre)
  const pr = palm(t, "r");
  if (pr && t >= HOLO.grab.at && t < HOLO.b.at + 0.2) {
    const p = spring({
      frame: frame - (HOLO.grab.at - TRIM) * fps,
      fps,
      config: { damping: 9, stiffness: 260, mass: 0.4 },
    });
    const burst = interpolate(
      t,
      [HOLO.b.at - 0.02, HOLO.b.at + 0.2],
      [0, 1],
      clamp,
    );
    const r = (7 + Math.sin(t * 18) * 1.5) * p * (1 + burst * 3);
    items.push(
      <svg
        key="dot"
        width={1080}
        height={1920}
        style={{
          position: "absolute",
          inset: 0,
          overflow: "visible",
          mixBlendMode: "screen",
          opacity: 1 - burst,
        }}
      >
        <circle cx={pr.x} cy={pr.y} r={r * 3.2} fill={holo(0.18)} />
        <circle
          cx={pr.x}
          cy={pr.y}
          r={r}
          fill="white"
          style={{
            filter: `drop-shadow(0 0 10px ${holo(1)}) drop-shadow(0 0 22px ${holo(0.8)})`,
          }}
        />
        <line
          x1={pr.x - r * 4}
          y1={pr.y}
          x2={pr.x + r * 4}
          y2={pr.y}
          stroke={holo(0.6)}
          strokeWidth={1.5}
        />
        <line
          x1={pr.x}
          y1={pr.y - r * 4}
          x2={pr.x}
          y2={pr.y + r * 4}
          stroke={holo(0.6)}
          strokeWidth={1.5}
        />
      </svg>,
    );
  }

  // B · «Qué músculo» al abrir la mano derecha
  if (pr && t >= HOLO.b.at) {
    const inHand = { x: pr.x, y: pr.y - 210 };
    const op = orbitPos(0);
    const obj = {
      x: inHand.x + (op.x - inHand.x) * orb,
      y: inHand.y + (op.y - inHand.y) * orb,
    };
    items.push(
      <Hologram
        key="b"
        t={t}
        at={HOLO.b.at}
        base={pr}
        obj={obj}
        label="Qué músculo"
        beam={1 - orb}
        fade={fadeOut * (orb > 0 ? 0.75 + 0.25 * op.depth : 1)}
        blur={blurOut}
        spin={Math.sin((t - HOLO.b.at) * 1.4 + 1) * 34}
        seed={2}
      >
        <MusculoHolo at={HOLO.b.at} />
      </Hologram>,
    );
  }
  return <>{items}</>;
};

export const Tracked: React.FC = () => <Holograms />;
