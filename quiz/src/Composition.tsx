import { AbsoluteFill, Composition } from "remotion";
import "./fonts";
import { Camera } from "./Camera";
import { Captions } from "./Captions";
import { Finish } from "./Finish";
import { Graphics } from "./Graphics";
import { LevelLayer } from "./Level";
import { Sound } from "./Sound";
import { FPS, HEIGHT, WIDTH } from "./theme";
import { DURATION_FRAMES } from "./timeline";

export const Quiz: React.FC = () => (
  <AbsoluteFill style={{ backgroundColor: "black" }}>
    <Camera />
    <LevelLayer />
    <Graphics />
    <Finish />
    <Captions />
    <Sound />
  </AbsoluteFill>
);

export const MyComposition = () => (
  <Composition
    id="Quiz"
    component={Quiz}
    durationInFrames={DURATION_FRAMES}
    fps={FPS}
    width={WIDTH}
    height={HEIGHT}
  />
);
