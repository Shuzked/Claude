import React from "react";
import {
  Easing,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { RF, SHIN, THIGH, VL, VM } from "./Figures";
import { poseAt, type Pose, type Pt } from "./pose";
import { FONT, GREEN } from "./theme";
import { HOLO, LEG_ROM, TRIM } from "./timeline";

// Elementos pegados al cuerpo, en coordenadas del vídeo y dentro de la cámara
// virtual (siguen exactamente a la persona con los zooms):
//  · 0:34–0:40 palos sobre la pierna con el ángulo de la rodilla y el tramo.
//  · 0:45 hologramas en las manos.

const NEON = "#3BFF2E"; // núcleo brillante sobre el verde de marca
const glow = (r: number, a = 0.85) =>
  `drop-shadow(0 0 ${r}px rgba(4,228,0,${a})) drop-shadow(0 0 ${r * 2.2}px rgba(4,228,0,${a * 0.5}))`;
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

/** Media de varios puntos de la pose en 3 fotogramas (quita el temblor). */
const avg = (t: number, keys: (keyof Pose)[]) => {
  let x = 0;
  let y = 0;
  let n = 0;
  for (const d of [-0.04, 0, 0.04]) {
    const p = near(t + d);
    if (!p) continue;
    for (const k of keys) {
      const q = p[k] as Pt;
      x += q[0];
      y += q[1];
      n++;
    }
  }
  return n ? { x: x / n, y: y / n } : null;
};

const noise = (k: number) => {
  const v = Math.sin(k * 12.9898) * 43758.5453;
  return v - Math.floor(v);
};

// ---------------------------------------------------------------------------
// 0:34–0:40 · recorrido sobre sus piernas

const LegRom: React.FC = () => {
  const t = useT();
  if (t < LEG_ROM.from || t >= LEG_ROM.to) return null;
  const p0 = near(t);
  if (!p0) return null;
  // siempre la misma pierna: la más cercana a cámara (la de pierna más larga en imagen)
  const ref = near(36.0) ?? p0;
  const shinLen = (k: "l" | "r") =>
    Math.hypot(
      ref[`${k}a`][0] - ref[`${k}k`][0],
      ref[`${k}a`][1] - ref[`${k}k`][1],
    );
  const s = shinLen("l") >= shinLen("r") ? "l" : "r";
  const H = avg(t, [`${s}h`]);
  const K = avg(t, [`${s}k`]);
  const A = avg(t, [`${s}a`]);
  if (!H || !K || !A) return null;
  const draw = interpolate(
    t,
    [LEG_ROM.from + 0.05, LEG_ROM.from + 0.5],
    [0, 1],
    {
      ...clamp,
      easing: Easing.out(Easing.cubic),
    },
  );
  const ux = K.x - H.x;
  const uy = K.y - H.y;
  const sx = A.x - K.x;
  const sy = A.y - K.y;
  const sL = Math.hypot(sx, sy) || 1;
  // flexión: 0° = pierna estirada (alineada con el muslo)
  const cross = ux * sy - uy * sx;
  const dot = ux * sx + uy * sy;
  const sign = cross >= 0 ? 1 : -1;
  const flex = Math.abs((Math.atan2(cross, dot) * 180) / Math.PI);
  const base = Math.atan2(uy, ux);
  const R = Math.max(70, sL * 0.42);
  const dir = (deg: number, r: number) => {
    const a = base + (sign * deg * Math.PI) / 180;
    return { x: K.x + Math.cos(a) * r, y: K.y + Math.sin(a) * r };
  };
  const arc = (a: number, b: number, r: number) => {
    const p = dir(a, r);
    const q = dir(b, r);
    const sweep = (b > a ? 1 : 0) ^ (sign < 0 ? 1 : 0);
    return `M ${p.x} ${p.y} A ${r} ${r} 0 0 ${sweep} ${q.x} ${q.y}`;
  };
  const shown = LEG_ROM.zones.filter((z) => t >= z.at);
  const current = shown.length - 1;
  return (
    <svg
      width={1080}
      height={1920}
      style={{ position: "absolute", inset: 0, overflow: "visible" }}
    >
      {/* recorrido completo de referencia */}
      <path
        d={arc(30, 100, R)}
        fill="none"
        stroke="rgba(255,255,255,0.35)"
        strokeWidth={5}
        strokeDasharray="3 9"
        opacity={draw}
      />
      {/* tramos nombrados */}
      {shown.map((z, i) => {
        const k = interpolate(t, [z.at, z.at + 0.45], [0, 1], {
          ...clamp,
          easing: Easing.out(Easing.cubic),
        });
        const on = i === current;
        // rótulo encima de la rodilla (solo el del tramo actual)
        const mid = { x: K.x, y: K.y - R - 70 };
        return (
          <g key={z.label} opacity={on ? 1 : 0.45}>
            <path
              d={arc(z.from, z.from + (z.to - z.from) * k, R)}
              fill="none"
              stroke={NEON}
              strokeWidth={14}
              strokeLinecap="round"
              style={{ filter: glow(8) }}
            />
            <text
              x={mid.x}
              y={mid.y}
              textAnchor="middle"
              fontFamily={FONT}
              fontWeight={900}
              fontStyle="italic"
              fontSize={34}
              fill="white"
              stroke="rgba(0,0,0,0.85)"
              strokeWidth={7}
              paintOrder="stroke"
              opacity={on ? k : 0}
              style={{ textTransform: "uppercase" }}
            >
              {z.label.toUpperCase()}
            </text>
            <text
              x={mid.x}
              y={mid.y + 34}
              textAnchor="middle"
              fontFamily={FONT}
              fontWeight={800}
              fontSize={26}
              fill={NEON}
              stroke="rgba(0,0,0,0.8)"
              strokeWidth={6}
              paintOrder="stroke"
              opacity={on ? k : 0}
            >
              {`${z.from}°–${z.to}°`}
            </text>
          </g>
        );
      })}
      {/* palos: muslo y pierna */}
      <g style={{ filter: glow(6, 0.7) }} opacity={draw}>
        <line
          x1={H.x}
          y1={H.y}
          x2={H.x + (K.x - H.x) * draw}
          y2={H.y + (K.y - H.y) * draw}
          stroke="white"
          strokeWidth={9}
          strokeLinecap="round"
        />
        <line
          x1={K.x}
          y1={K.y}
          x2={K.x + (A.x - K.x) * draw}
          y2={K.y + (A.y - K.y) * draw}
          stroke="white"
          strokeWidth={9}
          strokeLinecap="round"
        />
        <circle
          cx={H.x}
          cy={H.y}
          r={11}
          fill="#111"
          stroke={NEON}
          strokeWidth={5}
        />
        <circle
          cx={A.x}
          cy={A.y}
          r={11}
          fill="#111"
          stroke={NEON}
          strokeWidth={5}
        />
        <circle cx={K.x} cy={K.y} r={15} fill={NEON} />
      </g>
      {/* ángulo de la rodilla en vivo */}
      <text
        x={K.x + (K.x - (H.x + A.x) / 2) * 0.35}
        y={K.y + (K.y - (H.y + A.y) / 2) * 0.35 + 12}
        textAnchor="middle"
        fontFamily={FONT}
        fontWeight={900}
        fontSize={40}
        fill="white"
        stroke="rgba(0,0,0,0.85)"
        strokeWidth={8}
        paintOrder="stroke"
        opacity={draw}
      >
        {`${Math.round(flex)}°`}
      </text>
    </svg>
  );
};

// ---------------------------------------------------------------------------
// 0:45 · hologramas

const TramoHolo: React.FC<{ t: number }> = ({ t }) => {
  const R = 70;
  const a = (deg: number) => {
    const r = (deg * Math.PI) / 180;
    return [100 + Math.cos(r) * R, 86 + Math.sin(r) * R];
  };
  const k = (1 - Math.cos(t * 4.2)) / 2;
  const [x1, y1] = a(110);
  const [x2, y2] = a(0);
  const [s1, s2] = [a(100), a(65)];
  const leg = a(100 - 35 * k);
  return (
    <svg
      width={200}
      height={200}
      viewBox="0 0 200 200"
      style={{ overflow: "visible" }}
    >
      <path
        d={`M ${x1} ${y1} A ${R} ${R} 0 0 0 ${x2} ${y2}`}
        fill="none"
        stroke={GREEN}
        strokeOpacity={0.55}
        strokeWidth={5}
        strokeDasharray="3 8"
      />
      <path
        d={`M ${s1[0]} ${s1[1]} A ${R} ${R} 0 0 0 ${s2[0]} ${s2[1]}`}
        fill="none"
        stroke={NEON}
        strokeWidth={13}
        strokeLinecap="round"
      />
      <line
        x1={22}
        y1={86}
        x2={100}
        y2={86}
        stroke={NEON}
        strokeWidth={9}
        strokeLinecap="round"
      />
      <line
        x1={100}
        y1={86}
        x2={leg[0]}
        y2={leg[1]}
        stroke={NEON}
        strokeWidth={9}
        strokeLinecap="round"
      />
      <circle
        cx={leg[0]}
        cy={leg[1]}
        r={10}
        fill="none"
        stroke={NEON}
        strokeWidth={4}
      />
      <circle cx={100} cy={86} r={7} fill="white" />
      {/* rejilla de base */}
      <ellipse
        cx={100}
        cy={176}
        rx={80}
        ry={14}
        fill="none"
        stroke={GREEN}
        strokeOpacity={0.6}
        strokeWidth={2}
      />
      <ellipse
        cx={100}
        cy={176}
        rx={50}
        ry={8}
        fill="none"
        stroke={GREEN}
        strokeOpacity={0.4}
        strokeWidth={1.5}
      />
    </svg>
  );
};

const MusculoHolo: React.FC<{ t: number }> = ({ t }) => {
  const pulse = 0.75 + 0.25 * Math.sin(t * 6);
  const leg = (key: string) => (
    <g key={key}>
      <path d={THIGH} fill="rgba(4,228,0,0.08)" stroke={NEON} strokeWidth={3} />
      <path
        d={SHIN}
        fill="none"
        stroke={NEON}
        strokeOpacity={0.7}
        strokeWidth={2.5}
      />
      <path
        d={VL}
        fill="none"
        stroke={NEON}
        strokeOpacity={0.55}
        strokeWidth={2}
      />
      <path
        d={VM}
        fill="none"
        stroke={NEON}
        strokeOpacity={0.55}
        strokeWidth={2}
      />
      <path
        d={RF}
        fill={NEON}
        fillOpacity={0.85 * pulse}
        stroke="white"
        strokeWidth={2}
      />
      <ellipse
        cx={78}
        cy={487}
        rx={19}
        ry={16}
        fill="none"
        stroke={NEON}
        strokeWidth={2.5}
      />
    </g>
  );
  return (
    <svg
      width={200}
      height={200}
      viewBox="-20 -10 340 580"
      style={{ overflow: "visible" }}
    >
      <g>{leg("r")}</g>
      <g transform="translate(300 0) scale(-1 1)">{leg("l")}</g>
    </svg>
  );
};

const SIZE = 200;
const SCALE = 1.45;

const Hologram: React.FC<{
  t: number;
  at: number;
  base: { x: number; y: number };
  label: string;
  children: React.ReactNode;
  collapse: number; // 0..1 se recoge en la palma
  spin: number;
  seed: number;
}> = ({ t, at, base, label, children, collapse, spin, seed }) => {
  const { fps } = useVideoConfig();
  const frame = Math.round(t * fps);
  const grow = interpolate(t, [at, at + 0.25], [0, 1], {
    ...clamp,
    easing: Easing.out(Easing.cubic),
  });
  const mat = interpolate(t, [at + 0.1, at + 0.5], [0, 1], {
    ...clamp,
    easing: Easing.out(Easing.cubic),
  });
  const flick = 0.92 + 0.08 * noise(frame + seed * 31);
  const glitch =
    noise(Math.floor(frame / 2) + seed) > 0.95 ? (noise(frame) - 0.5) * 10 : 0;
  // al recogerse: baja hacia la palma y encoge
  const lift = 210 * (1 - collapse);
  const obj = { x: base.x, y: base.y - lift };
  const k = SCALE * (1 - collapse * 0.95);
  const topY = obj.y + (SIZE / 2) * 0.84 * k;
  const beamTopW = 250 * (1 - collapse);
  const beamBotW = 34 * (1 - collapse * 0.7);
  const flash = collapse > 0.85 ? (1 - collapse) / 0.15 : 0;
  const fade = collapse >= 1 ? 0 : 1;
  return (
    <div style={{ position: "absolute", inset: 0, opacity: fade * flick }}>
      <svg
        width={1080}
        height={1920}
        style={{
          position: "absolute",
          inset: 0,
          overflow: "visible",
          opacity: grow,
          mixBlendMode: "screen",
        }}
      >
        <defs>
          <linearGradient id={`beam-${seed}`} x1="0" y1="1" x2="0" y2="0">
            <stop offset="0" stopColor="rgba(59,255,46,0.6)" />
            <stop offset="1" stopColor="rgba(4,228,0,0.03)" />
          </linearGradient>
          <radialGradient id={`pad-${seed}`}>
            <stop offset="0" stopColor="rgba(255,255,255,0.95)" />
            <stop offset="0.35" stopColor="rgba(59,255,46,0.8)" />
            <stop offset="1" stopColor="rgba(4,228,0,0)" />
          </radialGradient>
        </defs>
        <polygon
          points={`${base.x - beamBotW / 2},${base.y} ${base.x + beamBotW / 2},${base.y} ${obj.x + beamTopW / 2},${base.y + (topY - base.y) * grow} ${obj.x - beamTopW / 2},${base.y + (topY - base.y) * grow}`}
          fill={`url(#beam-${seed})`}
          style={{ filter: "blur(2px)" }}
        />
        <ellipse
          cx={base.x}
          cy={base.y}
          rx={44 * (1 - collapse * 0.5)}
          ry={12}
          fill={`url(#pad-${seed})`}
        />
        {Array.from({ length: 12 }).map((_, i) => {
          const life = (((t * 0.9 + noise(i + seed) * 3) % 1) + 1) % 1;
          const px =
            base.x +
            (noise(i * 7 + seed) - 0.5) *
              (beamBotW + (beamTopW - beamBotW) * life) *
              0.8;
          const py = base.y + (topY - base.y) * life;
          return (
            <circle
              key={i}
              cx={px}
              cy={py}
              r={1.6 + noise(i) * 1.6}
              fill={`rgba(120,255,110,${0.9 * (1 - life) * (1 - collapse)})`}
            />
          );
        })}
        {/* destello final al recogerse */}
        {flash > 0 ? (
          <circle
            cx={base.x}
            cy={base.y}
            r={26 * flash}
            fill="white"
            style={{ filter: glow(12) }}
            opacity={flash}
          />
        ) : null}
      </svg>
      <div
        style={{
          position: "absolute",
          left: obj.x - SIZE / 2 + glitch,
          top: obj.y - SIZE / 2,
          width: SIZE,
          height: SIZE,
          perspective: 600,
          mixBlendMode: "screen",
          clipPath: `inset(${(1 - mat) * 100}% -60% -60% -60%)`,
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            transformStyle: "preserve-3d",
            transform: `rotateX(12deg) rotateY(${spin}deg) scale(${(0.85 + 0.15 * mat) * k})`,
          }}
        >
          {[-9, 0, 9].map((z, i) => (
            <div
              key={z}
              style={{
                position: "absolute",
                inset: 0,
                transform: `translateZ(${z}px)`,
                opacity: i === 1 ? 1 : 0.22,
                filter: i === 1 ? glow(7) : undefined,
              }}
            >
              {children}
            </div>
          ))}
          {/* líneas de escaneo finas, en el mismo verde */}
          <div
            style={{
              position: "absolute",
              inset: -6,
              background:
                "repeating-linear-gradient(0deg, rgba(59,255,46,0.10) 0px, rgba(59,255,46,0.10) 1px, transparent 1px, transparent 5px)",
              backgroundPosition: `0 ${(t * 30) % 5}px`,
            }}
          />
        </div>
      </div>
      <div
        style={{
          position: "absolute",
          left: obj.x - 160,
          width: 320,
          top: obj.y - (SIZE / 2) * k - 50,
          textAlign: "center",
          fontFamily: FONT,
          fontWeight: 900,
          fontStyle: "italic",
          fontSize: 34,
          letterSpacing: 2,
          textTransform: "uppercase",
          color: "white",
          WebkitTextStroke: "6px rgba(0,0,0,0.75)",
          paintOrder: "stroke fill",
          filter: glow(6, 0.6),
          opacity: mat * (1 - collapse),
          whiteSpace: "nowrap",
        }}
      >
        {label}
      </div>
    </div>
  );
};

const Holograms: React.FC = () => {
  const t = useT();
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const [c0, c1] = HOLO.collapse;
  if (t < HOLO.a.at - 0.05 || t > c1 + 0.08) return null;
  const collapse = interpolate(t, [c0, c1], [0, 1], {
    ...clamp,
    easing: Easing.in(Easing.cubic),
  });
  const items: React.ReactNode[] = [];

  const pa = avg(t, ["lw", "li", "lp", "lt"]);
  if (pa && t >= HOLO.a.at) {
    items.push(
      <Hologram
        key="a"
        t={t}
        at={HOLO.a.at}
        base={pa}
        label="Qué tramo"
        collapse={collapse}
        spin={Math.sin((t - HOLO.a.at) * 1.6) * 36}
        seed={1}
      >
        <TramoHolo t={t} />
      </Hologram>,
    );
  }

  const pr = avg(t, ["rw", "ri", "rp", "rt"]);
  // puntito de luz en la mano que «coge», hasta que la abre
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
    const r = (8 + Math.sin(t * 18) * 1.5) * p * (1 + burst * 3);
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
        <circle cx={pr.x} cy={pr.y} r={r * 3.4} fill="rgba(59,255,46,0.2)" />
        <circle
          cx={pr.x}
          cy={pr.y}
          r={r}
          fill="white"
          style={{ filter: glow(10) }}
        />
        <line
          x1={pr.x - r * 4.5}
          y1={pr.y}
          x2={pr.x + r * 4.5}
          y2={pr.y}
          stroke={NEON}
          strokeOpacity={0.7}
          strokeWidth={2}
        />
        <line
          x1={pr.x}
          y1={pr.y - r * 4.5}
          x2={pr.x}
          y2={pr.y + r * 4.5}
          stroke={NEON}
          strokeOpacity={0.7}
          strokeWidth={2}
        />
      </svg>,
    );
  }

  if (pr && t >= HOLO.b.at) {
    items.push(
      <Hologram
        key="b"
        t={t}
        at={HOLO.b.at}
        base={pr}
        label="Qué músculo"
        collapse={collapse}
        spin={Math.sin((t - HOLO.b.at) * 1.4 + 1) * 32}
        seed={2}
      >
        <MusculoHolo t={t} />
      </Hologram>,
    );
  }
  return <>{items}</>;
};

export const Tracked: React.FC = () => (
  <>
    <LegRom />
    <Holograms />
  </>
);
