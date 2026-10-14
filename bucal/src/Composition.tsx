import { AbsoluteFill, Composition } from "remotion";
import "./fonts";
import { Camera } from "./Camera";
import { Captions } from "./Captions";
import { Finish } from "./Finish";
import { Graphics } from "./Graphics";
import { HookSplit } from "./Hook";
import { Sound } from "./Sound";
import { FPS, HEIGHT, WIDTH } from "./theme";
import { DURATION_FRAMES } from "./timeline";

export const Bucal: React.FC = () => (
  <AbsoluteFill style={{ backgroundColor: "black" }}>
    <Camera />
    <HookSplit />
    <Graphics />
    <Finish />
    <Captions />
    <Sound />
  </AbsoluteFill>
);

export const MyComposition = () => (
  <Composition
    id="Bucal"
    component={Bucal}
    durationInFrames={DURATION_FRAMES}
    fps={FPS}
    width={WIDTH}
    height={HEIGHT}
  />
);
