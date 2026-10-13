import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";

// Acabado de imagen: grano de película animado y viñeta suave.
// Une el metraje y los gráficos para que no parezcan capas pegadas encima.
export const Finish: React.FC = () => {
  const frame = useCurrentFrame();
  const seed = frame % 12;
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <AbsoluteFill
        style={{
          background: "radial-gradient(ellipse 75% 60% at 50% 38%, transparent 55%, rgba(0,0,0,0.42) 100%)",
        }}
      />
      <AbsoluteFill style={{ mixBlendMode: "overlay", opacity: 0.16 }}>
        <svg width="100%" height="100%">
          <filter id={`grain-${seed}`}>
            <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves={2} seed={seed} stitchTiles="stitch" />
            <feColorMatrix type="saturate" values="0" />
          </filter>
          <rect width="100%" height="100%" filter={`url(#grain-${seed})`} />
        </svg>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
