import { AbsoluteFill, Composition } from "remotion";
import "./fonts";
import { Captions } from "./Captions";
import { Finish } from "./Finish";
import { Graphics } from "./Graphics";
import { Scene } from "./Scene";
import { Sound } from "./Sound";
import { FPS, HEIGHT, WIDTH } from "./theme";
import { DURATION_FRAMES } from "./timeline";

export const Presidente: React.FC = () => (
  <AbsoluteFill style={{ backgroundColor: "black" }}>
    <Scene />
    <Graphics />
    <Finish />
    <Captions />
    <Sound />
  </AbsoluteFill>
);

export const MyComposition = () => (
  <Composition id="Presidente" component={Presidente} durationInFrames={DURATION_FRAMES} fps={FPS} width={WIDTH} height={HEIGHT} />
);
