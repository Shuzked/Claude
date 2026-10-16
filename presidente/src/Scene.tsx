import React from "react";
import { AbsoluteFill, Easing, interpolate, Sequence, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { Video } from "@remotion/media";
import { QUESTIONS, segmentsOut, toSrc } from "./timeline";

// Plano compuesto (sala de prensa IA + Yago rotoscopiado + micrófonos), montado por
// tramos. Acercamientos digitales suaves en «No necesariamente» y en el «No» del cardio.
export const Scene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = toSrc(frame / fps);
  let s = 1;
  for (const q of QUESTIONS) {
    if (q.push && t >= q.push - 0.1 && t < q.to) {
      s = interpolate(t, [q.push, q.push + 0.5], [1, 1.07], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.bezier(0.16, 1, 0.3, 1) });
    }
  }
  return (
    <AbsoluteFill style={{ transform: `scale(${s})`, transformOrigin: "50% 32%" }}>
      {segmentsOut.map((x) => (
        <Sequence key={x.src} from={Math.round(x.out * fps)} durationInFrames={Math.round((x.out + x.dur) * fps) - Math.round(x.out * fps)} name={`Toma · ${x.src.toFixed(2)}s`}>
          <Video src={staticFile("comp.mp4")} trimBefore={Math.round(x.src * fps)} objectFit="cover" style={{ width: "100%", height: "100%" }} />
        </Sequence>
      ))}
    </AbsoluteFill>
  );
};
