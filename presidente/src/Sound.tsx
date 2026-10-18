import React from "react";
import { Audio } from "@remotion/media";
import { AbsoluteFill, getInputProps, interpolate, Sequence, staticFile, useVideoConfig } from "remotion";
import { CLOSE, DURATION_FRAMES, f, HOOK, QUESTIONS, segmentsOut, toOut } from "./timeline";

// Voces: «prensa» (micro de mano por la megafonía) o «limpio» (render alternativo).
const VOICE = ((getInputProps() as { voice?: string }).voice ?? "limpio") as "prensa" | "limpio";

type Sfx = { at: number; src: string; volume: number };
const sfx: Sfx[] = [
  // flashes de cámara al abrir la rueda de prensa
  { at: HOOK.from + 0.05, src: "fx/snap.wav", volume: 0.16 },
  { at: HOOK.from + 0.42, src: "fx/snap.wav", volume: 0.1 },
  { at: HOOK.from + 0.95, src: "fx/snap.wav", volume: 0.13 },
  ...QUESTIONS.flatMap((q) => [
    { at: q.q - 0.4, src: "fx/whoosh-a.wav", volume: 0.18 }, // entra la tarjeta del periodista
    { at: q.q - 0.15, src: "ui/pop.wav", volume: 0.2 }, // contador
    { at: q.a + 0.02, src: "fx/snap.wav", volume: 0.07 }, // un flash cuando empieza a responder
  ]),
  { at: 43.05, src: "fx/snap.wav", volume: 0.12 }, // remate de los straps
  { at: 43.3, src: "fx/snap.wav", volume: 0.08 },
  { at: CLOSE.q - 0.4, src: "fx/whoosh-b.wav", volume: 0.2 },
  { at: CLOSE.q + 0.05, src: "ui/impact.wav", volume: 0.12 }, // «Menuda mierda de presidente…»
  { at: CLOSE.follow - 0.05, src: "fx/hit.wav", volume: 0.18 },
  { at: CLOSE.follow, src: "ui/shine.wav", volume: 0.2 },
  { at: CLOSE.follow + 0.2, src: "fx/snap.wav", volume: 0.12 },
  { at: CLOSE.follow + 0.55, src: "fx/snap.wav", volume: 0.09 },
];

// Música: cama baja que respira; sube un poco en el arranque y en el CTA y baja cuando
// habla el periodista para que la pregunta se entienda.
const MusicBed: React.FC = () => {
  const { fps } = useVideoConfig();
  const T = DURATION_FRAMES / fps;
  const qs = [...QUESTIONS.map((q) => [toOut(q.q) - 0.2, toOut(q.q + q.dur) + 0.1]), [toOut(CLOSE.q) - 0.2, toOut(CLOSE.q + CLOSE.dur) + 0.1]];
  const ctaT = toOut(CLOSE.cta);
  return (
    <Audio
      src={staticFile("audio/music.mp3")}
      volume={(fr) => {
        const s = fr / fps;
        let v = 0.075;
        v *= interpolate(s, [0, 0.6], [0.4, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
        if (s < 3) v *= 1.35;
        for (const [a, b] of qs) if (s > a && s < b) v *= 0.55;
        if (s > ctaT - 0.2) v *= interpolate(s, [ctaT - 0.2, ctaT + 0.3], [1, 1.9], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
        v *= interpolate(s, [T - 1.2, T], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
        return v;
      }}
    />
  );
};

export const Sound: React.FC = () => {
  const { fps } = useVideoConfig();
  return (
    <AbsoluteFill>
      {segmentsOut.map((x) => (
        <Sequence key={x.src} from={Math.round(x.out * fps)} durationInFrames={Math.round((x.out + x.dur) * fps) - Math.round(x.out * fps)} name={`Voz · ${x.src.toFixed(2)}s`}>
          <Audio src={staticFile("audio/voice.wav")} trimBefore={Math.round(x.src * fps)} />
        </Sequence>
      ))}
      {[...QUESTIONS.map((q) => ({ n: q.n, file: q.file })), { n: 9, file: CLOSE.file }].map((q) => (
        <Sequence key={`q${q.n}`} from={f(q.file)} durationInFrames={Math.round(6 * fps)} name={`Periodista · ${q.n}`}>
          <Audio src={staticFile(`audio/q/q${q.n}_${VOICE}.wav`)} volume={VOICE === "prensa" ? 0.23 : 0.28} />
        </Sequence>
      ))}
      <Sequence durationInFrames={DURATION_FRAMES} name="Sala">
        <Audio src={staticFile("audio/room.wav")} volume={0.55} />
      </Sequence>
      <Sequence durationInFrames={DURATION_FRAMES} name="Música">
        <MusicBed />
      </Sequence>
      {sfx.map((s, i) => (
        <Sequence key={i} from={Math.max(0, f(s.at))} durationInFrames={50} name={`Efecto · ${s.src}`}>
          <Audio src={staticFile(`audio/${s.src}`)} volume={s.volume} />
        </Sequence>
      ))}
    </AbsoluteFill>
  );
};
