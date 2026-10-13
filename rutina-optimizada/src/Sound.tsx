import { Audio } from "@remotion/media";
import React from "react";
import { interpolate, Sequence, staticFile } from "remotion";
import { FPS } from "./theme";
import { allSfx, DURATION_FRAMES, f, FX_DIR, FX_PEAK, words, type FxName } from "./timeline";

// Mezcla: la voz (ya procesada en el vídeo) manda; la música baja cuando se
// habla y sube en las pausas; los efectos van por encima de la música.
const MUSIC_GAP = 0.3; // nivel en pausas
const MUSIC_UNDER_VOICE = 0.17; // nivel mientras se habla
const ATTACK = 0.08; // s que tarda en bajar
const RELEASE = 0.35; // s que tarda en recuperarse

// Curva de ducking precalculada por fotograma a partir de la transcripción.
const duck: number[] = (() => {
  const speaking = new Array(DURATION_FRAMES).fill(0);
  for (const w of words) {
    const a = Math.max(0, f(w.start - 0.04));
    const b = Math.min(DURATION_FRAMES - 1, f(w.end + 0.08));
    for (let i = a; i <= b; i++) speaking[i] = 1;
  }
  const out: number[] = [];
  let level = 0;
  for (let i = 0; i < DURATION_FRAMES; i++) {
    const target = speaking[i];
    const rate = 1 / ((target > level ? ATTACK : RELEASE) * FPS);
    level += Math.max(-rate, Math.min(rate, target - level));
    out.push(level);
  }
  return out;
})();

const SFX_GAIN: Record<FxName, number> = {
  tic: 0.8,
  "whoosh-a": 1,
  "whoosh-b": 1,
  hit: 1.1,
  riser: 1,
  snap: 1,
  marker: 1,
  pop: 1,
};

export const Sound: React.FC = () => (
  <>
    <Audio
      src={staticFile("audio/music.mp3")}
      volume={(frame) => {
        const d = duck[Math.min(frame, DURATION_FRAMES - 1)] ?? 0;
        const base = MUSIC_GAP + (MUSIC_UNDER_VOICE - MUSIC_GAP) * d;
        const fades = interpolate(frame, [0, 3, DURATION_FRAMES - 2.5 * FPS, DURATION_FRAMES], [0, 1, 1, 0], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        });
        return base * fades;
      }}
    />
    {allSfx.map((s, i) => {
      const name = s.src as FxName;
      // adelanta el archivo para que su pico caiga en `at`
      const from = Math.max(0, f(s.at - FX_PEAK[name]));
      return (
        <Sequence key={i} from={from} durationInFrames={4 * FPS} name={`SFX · ${name}`} layout="none">
          <Audio src={staticFile(`audio/${FX_DIR[name]}/${name}.wav`)} volume={s.volume * SFX_GAIN[name]} />
        </Sequence>
      );
    })}
  </>
);
