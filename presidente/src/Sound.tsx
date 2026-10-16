import React from "react";
import { Audio } from "@remotion/media";
import { AbsoluteFill, Sequence, staticFile, useVideoConfig } from "remotion";
import { CLOSE, f, QUESTIONS, segmentsOut, DURATION_FRAMES } from "./timeline";

type Sfx = { at: number; src: string; volume: number };
const sfx: Sfx[] = [
  ...QUESTIONS.flatMap((q) => [
    { at: q.q, src: "ui/pop.wav", volume: 0.22 },
    ...q.key.map((k) => ({ at: k.at, src: "ui/ding.wav", volume: 0.16 })),
  ]),
  { at: CLOSE.q, src: "ui/buzzer.wav", volume: 0.12 },
  { at: CLOSE.cta, src: "ui/shine.wav", volume: 0.22 },
];

export const Sound: React.FC = () => {
  const { fps } = useVideoConfig();
  return (
    <AbsoluteFill>
      {segmentsOut.map((x) => (
        <Sequence key={x.src} from={Math.round(x.out * fps)} durationInFrames={Math.round((x.out + x.dur) * fps) - Math.round(x.out * fps)} name={`Voz · ${x.src.toFixed(2)}s`}>
          <Audio src={staticFile("audio/voice.wav")} trimBefore={Math.round(x.src * fps)} />
        </Sequence>
      ))}
      {/* tono de sala: un murmullo grave y muy bajo para que la sala respire */}
      <Sequence durationInFrames={DURATION_FRAMES} name="Sala">
        <Audio src={staticFile("audio/room.wav")} volume={0.5} />
      </Sequence>
      {sfx.map((s, i) => (
        <Sequence key={i} from={f(s.at)} durationInFrames={50} name={`Efecto · ${s.src}`}>
          <Audio src={staticFile(`audio/${s.src}`)} volume={s.volume} />
        </Sequence>
      ))}
    </AbsoluteFill>
  );
};
