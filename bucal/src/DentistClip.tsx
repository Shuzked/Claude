import { Video } from "@remotion/media";
import React from "react";
import { AbsoluteFill, interpolate, Sequence, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { BROLL, f, SEGMENTS } from "./timeline";

// Plano del dentista (clip aportado por el cliente) en lugar del plano del banco:
// cubre exactamente 01:07:08–01:10:10 del original. El clip arranca donde empieza
// el tramo conservado del montaje y tiene un empuje lento de cámara.

const Clip: React.FC<{ offset: number }> = ({ offset }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const k = frame / Math.max(1, durationInFrames);
  const scale = interpolate(k, [0, 1], [1.04, 1.12]);
  return (
    <AbsoluteFill style={{ backgroundColor: "black", overflow: "hidden" }}>
      <AbsoluteFill style={{ transform: `scale(${scale})` }}>
        <Video src={staticFile("dentist.mp4")} muted trimBefore={offset} objectFit="cover" style={{ width: "100%", height: "100%" }} />
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

export const DentistClip: React.FC = () => {
  const { fps } = useVideoConfig();
  const from = f(BROLL.from);
  const dur = f(BROLL.to) - from;
  // el montaje puede entrar en el plano un poco después de 67,32 (corte de silencio):
  // el clip se adelanta lo mismo para seguir sincronizado con el original
  const seg = SEGMENTS.find(([, b]) => b > BROLL.from) ?? [BROLL.from, BROLL.to];
  const offset = Math.max(0, seg[0] - BROLL.from);
  return (
    <Sequence from={from} durationInFrames={dur} name="Plano del dentista">
      <Clip offset={Math.round(offset * fps)} />
    </Sequence>
  );
};
