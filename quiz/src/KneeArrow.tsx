import React from "react";
import { Easing, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { poseAt, type Pose } from "./pose";
import { FONT, GREEN } from "./theme";
import { RES, QUESTIONS, toSrc } from "./timeline";

// E05 · «Cuádriceps»: sobre su propia pierna, flecha de extensión de rodilla y el
// cuádriceps señalado en la cara anterior del muslo. Ilustración anatómico-mecánica
// (sin cifras ni comparaciones experimentales). Va dentro de la cámara virtual.

const NEON = "#3BFF2E";
const glow = (r: number) =>
  `drop-shadow(0 0 ${r}px rgba(4,228,0,0.85)) drop-shadow(0 0 ${r * 2}px rgba(4,228,0,0.45))`;
const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

const near = (t: number): Pose | null => {
  for (const d of [0, -0.04, 0.04, -0.08, 0.08, -0.12, 0.12]) {
    const p = poseAt(t + d);
    if (p) return p;
  }
  return null;
};

const avg = (t: number, k: "rh" | "rk" | "ra") => {
  let x = 0;
  let y = 0;
  let n = 0;
  for (const d of [-0.08, -0.04, 0, 0.04, 0.08]) {
    const p = near(t + d);
    if (!p) continue;
    x += p[k][0];
    y += p[k][1];
    n++;
  }
  return n ? { x: x / n, y: y / n } : null;
};

export const KneeArrow: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = toSrc(frame / fps);
  const q = QUESTIONS[3];
  const from = RES.e05.arrow;
  const to = q.resEnd;
  if (t < from || t > to) return null;
  // pierna derecha (a la izquierda de la pantalla), la que queda más despejada
  const H = avg(t, "rh");
  const K = avg(t, "rk");
  const A = avg(t, "ra");
  if (!H || !K || !A) return null;
  const draw = interpolate(t, [from, from + 0.5], [0, 1], {
    ...clamp,
    easing: Easing.out(Easing.cubic),
  });
  const out = interpolate(t, [to - 0.35, to], [1, 0], clamp);
  // flecha de extensión: arco alrededor de la rodilla, de la pierna hacia la
  // prolongación del muslo
  const thigh = Math.atan2(K.y - H.y, K.x - H.x);
  const shin = Math.atan2(A.y - K.y, A.x - K.x);
  let diff = thigh - shin;
  while (diff > Math.PI) diff -= 2 * Math.PI;
  while (diff < -Math.PI) diff += 2 * Math.PI;
  const R = Math.max(90, Math.hypot(A.x - K.x, A.y - K.y) * 0.42);
  const a0 = shin;
  const a1 = shin + diff * 0.8 * draw;
  const P = (a: number) => ({
    x: K.x + Math.cos(a) * R,
    y: K.y + Math.sin(a) * R,
  });
  const p0 = P(a0);
  const p1 = P(a1);
  const sweep = diff > 0 ? 1 : 0;
  const tip =
    Math.atan2(p1.y - K.y, p1.x - K.x) + (sweep ? Math.PI / 2 : -Math.PI / 2);
  const head = (s: number, ang: number) => ({
    x: p1.x + Math.cos(ang) * s,
    y: p1.y + Math.sin(ang) * s,
  });
  const h1 = head(-22, tip - 0.5);
  const h2 = head(-22, tip + 0.5);
  // cuádriceps: punto en la cara anterior del muslo (60 % hacia la rodilla)
  const Q = { x: H.x + (K.x - H.x) * 0.6, y: H.y + (K.y - H.y) * 0.6 };
  const L = { x: Q.x + 170, y: Q.y - 190 };
  const lab = interpolate(t, [from + 0.35, from + 0.7], [0, 1], clamp);
  return (
    <svg
      width={1080}
      height={1920}
      style={{
        position: "absolute",
        inset: 0,
        overflow: "visible",
        opacity: out,
      }}
    >
      <g style={{ filter: glow(6) }}>
        <path
          d={`M ${p0.x} ${p0.y} A ${R} ${R} 0 0 ${sweep} ${p1.x} ${p1.y}`}
          fill="none"
          stroke={NEON}
          strokeWidth={12}
          strokeLinecap="round"
        />
        {draw > 0.3 ? (
          <polygon
            points={`${p1.x},${p1.y} ${h1.x},${h1.y} ${h2.x},${h2.y}`}
            fill={NEON}
          />
        ) : null}
        <circle cx={K.x} cy={K.y} r={13} fill={NEON} />
      </g>
      {/* señal del cuádriceps en el muslo anterior */}
      <g opacity={lab}>
        <circle
          cx={Q.x}
          cy={Q.y}
          r={16}
          fill="none"
          stroke="white"
          strokeWidth={5}
          style={{ filter: glow(5) }}
        />
        <circle cx={Q.x} cy={Q.y} r={6} fill="white" />
        <line
          x1={Q.x}
          y1={Q.y - 16}
          x2={L.x + 10}
          y2={L.y + 14}
          stroke="white"
          strokeWidth={4}
        />
        <text
          x={L.x}
          y={L.y}
          textAnchor="middle"
          fontFamily={FONT}
          fontWeight={900}
          fontStyle="italic"
          fontSize={46}
          fill={GREEN}
          stroke="rgba(0,0,0,0.85)"
          strokeWidth={9}
          paintOrder="stroke"
        >
          CUÁDRICEPS
        </text>
      </g>
    </svg>
  );
};
