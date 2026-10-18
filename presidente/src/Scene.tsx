import React from "react";
import { AbsoluteFill, Sequence, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { Video } from "@remotion/media";
import { segmentsOut, toSrc } from "./timeline";
import { camAt } from "./camera";

// Plano compuesto (sala de prensa IA + Yago rotoscopiado + micrófonos), montado por
// tramos. La cámara virtual sigue la cara de Yago y mete zooms puntuales (camera.ts).
export const Scene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = toSrc(frame / fps);
  const c = camAt(t);
  return (
    <AbsoluteFill style={{ transform: `translate(${c.tx}px, ${c.ty}px) scale(${c.s})`, transformOrigin: "50% 50%" }}>
      {segmentsOut.map((x) => (
        <Sequence key={x.src} from={Math.round(x.out * fps)} durationInFrames={Math.round((x.out + x.dur) * fps) - Math.round(x.out * fps)} name={`Toma · ${x.src.toFixed(2)}s`}>
          <Video src={staticFile("comp.mp4")} trimBefore={Math.round(x.src * fps)} objectFit="cover" style={{ width: "100%", height: "100%" }} />
        </Sequence>
      ))}
    </AbsoluteFill>
  );
};
