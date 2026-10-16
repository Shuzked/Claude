import { AbsoluteFill, Composition } from "remotion";
import "./fonts";
import { Camera } from "./Camera";
import { Captions } from "./Captions";
import { Finish } from "./Finish";
import { BodyLayer } from "./Body";
import { Graphics } from "./Graphics";
import { Sound } from "./Sound";
import { FPS, HEIGHT, WIDTH } from "./theme";
import { DURATION_FRAMES } from "./timeline";

export const Gluteos: React.FC = () => (
  <AbsoluteFill style={{ backgroundColor: "black" }}>
    <Camera>
      <BodyLayer />
    </Camera>
    <Graphics />
    <Finish />
    <Captions />
    <Sound />
  </AbsoluteFill>
);

export const MyComposition = () => (
  <Composition
    id="Gluteos"
    component={Gluteos}
    durationInFrames={DURATION_FRAMES}
    fps={FPS}
    width={WIDTH}
    height={HEIGHT}
  />
);
