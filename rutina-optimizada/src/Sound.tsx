import { Audio } from "@remotion/media";
import React from "react";
import { interpolate, Sequence, staticFile } from "remotion";
import { FPS } from "./theme";
import { allSfx, DURATION_FRAMES, f, FX_PEAK, type FxName } from "./timeline";

// Música (audio-src/music.py): intro electrónica y parte chill, por debajo de la voz.
const MUSIC_VOLUME = 0.15;

export const Sound: React.FC = () => (
  <>
    <Audio
      src={staticFile("audio/music.mp3")}
      volume={(frame) =>
        MUSIC_VOLUME *
        interpolate(frame, [0, 3, DURATION_FRAMES - 2.5 * FPS, DURATION_FRAMES], [0, 1, 1, 0], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        })
      }
    />
    {allSfx.map((s, i) => {
      const name = s.src as FxName;
      // adelanta el archivo para que su pico caiga en `at`
      const from = Math.max(0, f(s.at - FX_PEAK[name]));
      return (
        <Sequence key={i} from={from} durationInFrames={4 * FPS} name={`SFX · ${name}`} layout="none">
          <Audio src={staticFile(`audio/fx/${name}.wav`)} volume={s.volume} />
        </Sequence>
      );
    })}
  </>
);
