import { Audio } from "@remotion/media";
import React from "react";
import { interpolate, Sequence, staticFile } from "remotion";
import { DURATION_FRAMES, f, sfx } from "./timeline";
import { FPS } from "./theme";

// Música de fondo (sintetizada en audio-src/synth.py) muy por debajo de la voz,
// y efectos de sonido en los momentos marcados en timeline.ts.
const MUSIC_VOLUME = 0.11;

export const Sound: React.FC = () => (
  <>
    <Audio
      src={staticFile("audio/music.mp3")}
      volume={(frame) =>
        MUSIC_VOLUME *
        interpolate(frame, [0, 8, DURATION_FRAMES - 2.5 * FPS, DURATION_FRAMES], [0, 1, 1, 0], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        })
      }
    />
    {sfx.map((s, i) => (
      <Sequence key={i} from={Math.max(0, f(s.at))} durationInFrames={2 * FPS} name={`SFX · ${s.src}`} layout="none">
        <Audio src={staticFile(`audio/${s.src}.mp3`)} volume={s.volume} />
      </Sequence>
    ))}
  </>
);
