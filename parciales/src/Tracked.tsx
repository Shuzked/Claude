import React from "react";
import { spring, useCurrentFrame, useVideoConfig } from "remotion";
import { LegAnatomy } from "./Figures";
import { poseAt, type Pose } from "./pose";
import { FONT, GREEN, PAPER } from "./theme";
import { BURLA, handItems, POINT_END, pointItems, TRIM } from "./timeline";

// Elementos pegados al cuerpo (coordenadas del vídeo, dentro de la cámara virtual):
// nariz de payaso del doble, un objeto en cada mano y las tres ideas donde apunta.

const GLOW = "drop-shadow(0 0 12px rgba(4, 228, 0, 0.6))";

const useT = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return TRIM + frame / fps;
};

const usePopAt = (at: number, damping = 9) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return spring({
    frame: frame - (at - TRIM) * fps,
    fps,
    config: { damping, stiffness: 240, mass: 0.6 },
  });
};

/** Pose del fotograma o, si falta, la más cercana (hasta ±3 fotogramas). */
const near = (t: number): Pose | null => {
  for (const d of [0, -0.04, 0.04, -0.08, 0.08, -0.12, 0.12]) {
    const p = poseAt(t + d);
    if (p) return p;
  }
  return null;
};

// ---------------------------------------------------------------------------
// Burla: nariz de payaso roja sobre el doble

const ClownNose: React.FC = () => {
  const t = useT();
  const p = usePopAt(BURLA.nose, 7);
  if (t < BURLA.nose || t > 43.84) return null;
  const pose = near(t);
  if (!pose) return null;
  const eye = Math.hypot(pose.ley[0] - pose.rey[0], pose.ley[1] - pose.rey[1]);
  const r = Math.max(14, eye * 0.42);
  const [x, y] = pose.nose;
  return (
    <svg
      style={{
        position: "absolute",
        left: x - r * 1.5,
        top: y - r * 1.4,
        width: r * 3,
        height: r * 3,
        overflow: "visible",
        transform: `scale(${p})`,
        transformOrigin: "50% 50%",
      }}
      viewBox="-15 -15 30 30"
    >
      <circle r={10} fill="#E3121B" />
      <circle r={10} fill="url(#noseShade)" />
      <defs>
        <radialGradient id="noseShade" cx="-0.3" cy="-0.35" r="1.1">
          <stop offset="0" stopColor="rgba(255,255,255,0.0)" />
          <stop offset="0.75" stopColor="rgba(0,0,0,0)" />
          <stop offset="1" stopColor="rgba(0,0,0,0.35)" />
        </radialGradient>
      </defs>
      <ellipse
        cx={-3.4}
        cy={-3.8}
        rx={3}
        ry={2}
        fill="rgba(255,255,255,0.75)"
      />
    </svg>
  );
};

// ---------------------------------------------------------------------------
// Objetos en las manos: «qué tramo» y «qué músculo»

const Disc: React.FC<{ children: React.ReactNode; label: string }> = ({
  children,
  label,
}) => (
  <div
    style={{
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      gap: 10,
    }}
  >
    <div
      style={{
        width: 150,
        height: 150,
        borderRadius: "50%",
        background: "rgba(14,14,14,0.82)",
        border: `3px solid ${GREEN}`,
        filter: GLOW,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
      }}
    >
      {children}
    </div>
    <div
      style={{
        fontFamily: FONT,
        fontWeight: 900,
        fontStyle: "italic",
        fontSize: 34,
        textTransform: "uppercase",
        color: PAPER,
        WebkitTextStroke: "7px rgba(0,0,0,0.9)",
        paintOrder: "stroke fill",
        whiteSpace: "nowrap",
      }}
    >
      {label}
    </div>
  </div>
);

const TramoIcon: React.FC<{ t: number }> = ({ t }) => {
  // tramo verde que barre un arco de recorrido
  const k = (1 - Math.cos(t * 4)) / 2;
  const a = (deg: number) => {
    const r = (deg * Math.PI) / 180;
    return [75 + Math.cos(r) * 46, 70 + Math.sin(r) * 46];
  };
  const [x1, y1] = a(110);
  const [x2, y2] = a(0);
  const [s1, s2] = [a(100 - 35 * k), a(65 - 35 * k)];
  const leg = a(100 - 70 * k);
  return (
    <svg width={150} height={150} viewBox="0 0 150 150">
      <path
        d={`M ${x1} ${y1} A 46 46 0 0 0 ${x2} ${y2}`}
        fill="none"
        stroke="rgba(255,255,255,0.22)"
        strokeWidth={9}
        strokeDasharray="2 7"
      />
      <path
        d={`M ${s1[0]} ${s1[1]} A 46 46 0 0 0 ${s2[0]} ${s2[1]}`}
        fill="none"
        stroke={GREEN}
        strokeWidth={10}
        strokeLinecap="round"
      />
      <line
        x1={20}
        y1={70}
        x2={75}
        y2={70}
        stroke={PAPER}
        strokeWidth={10}
        strokeLinecap="round"
      />
      <line
        x1={75}
        y1={70}
        x2={leg[0]}
        y2={leg[1]}
        stroke={PAPER}
        strokeWidth={9}
        strokeLinecap="round"
      />
      <circle cx={75} cy={70} r={6} fill={GREEN} />
    </svg>
  );
};

const HandItem: React.FC<{
  at: number;
  end: number;
  hand: "l" | "r";
  kind: "tramo" | "musculo";
}> = ({ at, end, hand, kind }) => {
  const t = useT();
  const pIn = usePopAt(at, 8);
  const pOut = usePopAt(end - 0.25, 14);
  if (t < at || t > end + 0.1) return null;
  const pose = near(t);
  if (!pose) return null;
  const i = hand === "l" ? pose.li : pose.ri;
  const w = hand === "l" ? pose.lw : pose.rw;
  const hx = (i[0] + w[0]) / 2;
  const hy = Math.min(i[1], w[1]);
  const bob = Math.sin((t - at) * 4) * 6;
  const s = pIn * (1 - pOut);
  return (
    <div
      style={{
        position: "absolute",
        left: hx - 100,
        top: hy - 250 + bob,
        width: 200,
        display: "flex",
        justifyContent: "center",
        transform: `scale(${s}) rotate(${(1 - pIn) * (hand === "l" ? 20 : -20)}deg)`,
        transformOrigin: "50% 100%",
      }}
    >
      <Disc label={kind === "tramo" ? "Qué tramo" : "Qué músculo"}>
        {kind === "tramo" ? (
          <TramoIcon t={t} />
        ) : (
          <div style={{ marginTop: 6 }}>
            <LegAnatomy at={at - 0.3} lit="rf" litAt={at + 0.15} scale={0.24} />
          </div>
        )}
      </Disc>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Las tres ideas donde apunta: aparecen en la punta del dedo y las anteriores
// suben para dejar sitio.

const POINT_LABEL = {
  sustituir: "Sustituir",
  anadir: "Añadir",
  rutina: "En tu rutina",
};

const PointIcon: React.FC<{ kind: keyof typeof POINT_LABEL }> = ({ kind }) => (
  <svg width={44} height={44} viewBox="0 0 44 44" style={{ flexShrink: 0 }}>
    {kind === "sustituir" ? (
      <g
        fill="none"
        stroke={GREEN}
        strokeWidth={4.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M 6 15 L 34 15 M 26 7 L 34 15 L 26 23" />
        <path d="M 38 29 L 10 29 M 18 21 L 10 29 L 18 37" />
      </g>
    ) : kind === "anadir" ? (
      <path
        d="M 22 6 L 22 38 M 6 22 L 38 22"
        stroke={GREEN}
        strokeWidth={6}
        strokeLinecap="round"
      />
    ) : (
      <g fill={GREEN}>
        <rect x={6} y={8} width={32} height={6} />
        <rect x={6} y={19} width={32} height={6} />
        <rect x={6} y={30} width={20} height={6} />
      </g>
    )}
  </svg>
);

const PointCard: React.FC<{
  at: number;
  kind: keyof typeof POINT_LABEL;
  stack: number; // cuántas ideas han salido después
  anchor: { x: number; y: number };
}> = ({ at, kind, stack, anchor }) => {
  const p = usePopAt(at, 9);
  const out = usePopAt(POINT_END - 0.3, 14);
  const lift = stack * 118;
  const newest = stack === 0;
  return (
    <div
      style={{
        position: "absolute",
        // a la izquierda y encima de la punta del dedo: nunca se sale por la derecha
        right: 1080 - anchor.x,
        top: anchor.y - 150 - lift,
        transform: `scale(${p * (1 - out) * (newest ? 1 : 0.88)}) rotate(${(1 - p) * -12}deg)`,
        transformOrigin: "100% 100%",
        opacity: newest ? 1 : 0.75,
        display: "flex",
        alignItems: "center",
        gap: 14,
        padding: "18px 26px 16px 20px",
        background: "rgba(14,14,14,0.85)",
        border: `2.5px solid ${newest ? GREEN : "rgba(255,255,255,0.25)"}`,
        filter: newest ? GLOW : undefined,
        whiteSpace: "nowrap",
      }}
    >
      <PointIcon kind={kind} />
      <div
        style={{
          fontFamily: FONT,
          fontWeight: 900,
          fontStyle: "italic",
          fontSize: 40,
          textTransform: "uppercase",
          color: PAPER,
          lineHeight: 1,
        }}
      >
        {POINT_LABEL[kind]}
      </div>
    </div>
  );
};

const PointItems: React.FC = () => {
  const t = useT();
  if (t < pointItems[0].at || t > POINT_END + 0.05) return null;
  const pose = near(t);
  if (!pose) return null;
  // punta del dedo prolongada en la dirección del brazo (codo → índice)
  const dx = pose.li[0] - pose.le[0];
  const dy = pose.li[1] - pose.le[1];
  const len = Math.hypot(dx, dy) || 1;
  const anchor = {
    x: Math.min(720, pose.li[0] + (dx / len) * 50 + 40),
    y: pose.li[1] + (dy / len) * 70,
  };
  const shown = pointItems.filter((p) => t >= p.at);
  return (
    <>
      {shown.map((p, i) => (
        <PointCard
          key={p.kind}
          at={p.at}
          kind={p.kind}
          stack={shown.length - 1 - i}
          anchor={anchor}
        />
      ))}
    </>
  );
};

export const Tracked: React.FC = () => (
  <>
    <ClownNose />
    {handItems.map((h) => (
      <HandItem key={h.kind} {...h} />
    ))}
    <PointItems />
  </>
);
