import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { impacts, TRIM } from "./timeline";

// Acabado de imagen: grano de película animado y una viñeta muy sutil.
// Une el metraje y los gráficos para que no parezcan capas pegadas encima.
export const Finish: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const seed = frame % 12;
  const t = TRIM + frame / fps;
  // destello breve en cada golpe de la apertura
  let flash = 0;
  for (const at of impacts) {
    const k = (t - at) * fps;
    if (k >= 0 && k < 5) flash = Math.max(flash, 0.32 * Math.exp(-k / 1.3));
  }
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <AbsoluteFill
        style={{
          background: "radial-gradient(ellipse 85% 70% at 50% 40%, transparent 65%, rgba(0,0,0,0.12) 100%)",
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
      {flash > 0.01 ? <AbsoluteFill style={{ background: "white", opacity: flash, mixBlendMode: "screen" }} /> : null}
    </AbsoluteFill>
  );
};
