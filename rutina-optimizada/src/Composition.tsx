import { Video } from "@remotion/media";
import {
  AbsoluteFill,
  Composition,
  Easing,
  interpolate,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import "./fonts";
import { Captions } from "./Captions";
import { DURATION_SECONDS, FPS, zooms } from "./edit";
import { Overlays } from "./Overlays";

const useZoom = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  for (const z of zooms) {
    if (t >= z.start && t <= z.end) {
      return interpolate(t, [z.start, z.peak, z.end - 0.3, z.end], [1, z.scale, z.scale, 1], {
        easing: Easing.inOut(Easing.cubic),
      });
    }
  }
  return 1;
};

export const RutinaOptimizada: React.FC = () => {
  const scale = useZoom();
  return (
    <AbsoluteFill style={{ backgroundColor: "black" }}>
      <AbsoluteFill style={{ transform: `scale(${scale})`, transformOrigin: "50% 35%" }}>
        <Video
          src={staticFile("video.mp4")}
          objectFit="cover"
          style={{ width: "100%", height: "100%" }}
        />
      </AbsoluteFill>
      <Overlays />
      <Captions />
    </AbsoluteFill>
  );
};

export const MyComposition = () => {
  return (
    <Composition
      id="RutinaOptimizada"
      component={RutinaOptimizada}
      durationInFrames={Math.round(DURATION_SECONDS * FPS)}
      fps={FPS}
      width={1080}
      height={1920}
    />
  );
};
