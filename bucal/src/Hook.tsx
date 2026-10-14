import { Video } from "@remotion/media";
import React from "react";
import {
  AbsoluteFill,
  Easing,
  interpolate,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { FONT, GREEN } from "./theme";
import { f, HOOK, SEGMENTS } from "./timeline";

// E01 · Hook en pantalla dividida: arriba el vídeo de referencia (V01, el chaval con
// el bucal azul), abajo Yago reaccionando. En «Pues ojo» se va el vídeo de arriba y
// Yago pasa a pantalla completa (lo pinta Camera.tsx por debajo).

const REF_FROM = 6.0; // s del vídeo de referencia: primer plano con el bucal
const HALF = 960;

export const HookSplit: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const end = f(HOOK.end);
  if (frame > end + 8) return null;
  const k = interpolate(frame, [end - 4, end + 6], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.bezier(0.7, 0, 0.3, 1),
  });
  // el panel de arriba entra de golpe con el primer fotograma
  const enter = interpolate(frame, [0, 6], [1.15, 1], {
    extrapolateRight: "clamp",
    easing: Easing.bezier(0.16, 1, 0.3, 1),
  });
  return (
    <AbsoluteFill style={{ opacity: 1 - interpolate(k, [0.6, 1], [0, 1], { extrapolateLeft: "clamp" }) }}>
      {/* abajo: Yago (misma toma que la cámara, encuadrado en la mitad inferior) */}
      <div style={{ position: "absolute", left: 0, top: HALF, width: 1080, height: HALF, overflow: "hidden", background: "black" }}>
        <div
          style={{
            position: "absolute",
            width: 1080,
            height: 1920,
            transform: "translate(-170px, -330px) scale(1.25)",
            transformOrigin: "0 0",
          }}
        >
          <Video src={staticFile("video.mp4")} muted trimBefore={Math.round(SEGMENTS[0][0] * fps)} objectFit="cover" style={{ width: "100%", height: "100%" }} />
        </div>
      </div>
      {/* arriba: vídeo de referencia */}
      <div
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          width: 1080,
          height: HALF,
          overflow: "hidden",
          background: "black",
          transform: `translateY(${-k * HALF}px)`,
        }}
      >
        <div
          style={{
            position: "absolute",
            width: 1080,
            height: 1920,
            top: -110,
            transform: `scale(${enter})`,
          }}
        >
          <Video
            src={staticFile("ref.mp4")}
            muted
            trimBefore={Math.round(REF_FROM * fps)}
            objectFit="cover"
            style={{ width: "100%", height: "100%" }}
          />
        </div>
        {/* atribución de origen */}
        <div
          style={{
            position: "absolute",
            left: 34,
            bottom: 26,
            fontFamily: FONT,
            fontWeight: 700,
            fontSize: 24,
            color: "rgba(255,255,255,0.85)",
            textShadow: "0 2px 10px rgba(0,0,0,0.8)",
          }}
        >
          Vídeo: @jacksongoesnd
        </div>
      </div>
      {/* línea divisoria verde */}
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: HALF - 3 - k * HALF,
          height: 6,
          background: GREEN,
          boxShadow: "0 0 18px rgba(4,228,0,0.8)",
        }}
      />
    </AbsoluteFill>
  );
};
