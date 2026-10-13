import React from "react";
import {
  AbsoluteFill,
  Easing,
  interpolate,
  Sequence,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { FONT } from "./fonts";
import { callouts, lines, type Callout } from "./edit";

const pop = (frame: number, fps: number) =>
  spring({ frame, fps, config: { damping: 14, stiffness: 180 } });

// E01: etiqueta discreta del personaje en su primera intervención.
const SpeakerLabel: React.FC<{ text: string; seconds: number }> = ({ text, seconds }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const out = interpolate(frame, [seconds * fps - 6, seconds * fps], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const s = pop(frame, fps);
  return (
    <AbsoluteFill style={{ top: 250, left: 80 }}>
      <div
        style={{
          alignSelf: "flex-start",
          fontFamily: FONT,
          fontWeight: 600,
          fontSize: 38,
          letterSpacing: 6,
          color: "white",
          padding: "12px 22px",
          borderLeft: "6px solid #FFD84D",
          background: "rgba(0,0,0,0.45)",
          opacity: Math.min(s, out),
          transform: `translateX(${(1 - s) * -30}px)`,
        }}
      >
        {text}
      </div>
    </AbsoluteFill>
  );
};

const CalloutView: React.FC<{ callout: Callout }> = ({ callout }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t0 = callout.words[0].at;
  const total = (callout.end - t0) * fps;
  const fadeOut = interpolate(frame, [total - 5, total], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const isCta = callout.tone === "cta";
  const bg = callout.tone === "joke" ? "#FFD84D" : isCta ? "#FFFFFF" : "rgba(15,15,15,0.82)";
  const fg = callout.tone === "neutral" ? "#FFFFFF" : "#111111";

  return (
    <AbsoluteFill
      style={{
        top: isCta ? 1080 : 1190,
        height: "auto",
        alignItems: "center",
        opacity: fadeOut,
      }}
    >
      <div style={{ display: "flex", gap: 16, flexWrap: "wrap", justifyContent: "center", maxWidth: 900 }}>
        {callout.words.map((w, i) => {
          const local = frame - (w.at - t0) * fps;
          if (local < 0) return null;
          const s = pop(local, fps);
          return (
            <div
              key={i}
              style={{
                fontFamily: FONT,
                fontWeight: 900,
                fontSize: isCta ? 104 : callout.words.length > 1 ? 50 : 72,
                color: fg,
                background: bg,
                padding: isCta ? "18px 40px" : "10px 26px",
                borderRadius: 14,
                transform: `scale(${0.6 + 0.4 * s}) translateY(${(1 - s) * 20}px)`,
                opacity: s,
                whiteSpace: "nowrap",
              }}
            >
              {w.text}
            </div>
          );
        })}
      </div>
      {callout.sub ? (
        <div
          style={{
            marginTop: 22,
            fontFamily: FONT,
            fontWeight: 600,
            fontSize: 44,
            color: "white",
            textShadow: "0 3px 14px rgba(0,0,0,0.85)",
            opacity: interpolate(frame, [12, 22], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
              easing: Easing.out(Easing.quad),
            }),
          }}
        >
          {callout.sub}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};

export const Overlays: React.FC = () => {
  const { fps } = useVideoConfig();
  return (
    <AbsoluteFill>
      {lines
        .filter((l) => l.label)
        .map((l, i) => (
          <Sequence
            key={`label-${i}`}
            from={Math.round(l.start * fps)}
            durationInFrames={Math.round((l.end - l.start + 0.6) * fps)}
            name={`Etiqueta · ${l.speaker}`}
          >
            <SpeakerLabel text={l.speaker} seconds={l.end - l.start + 0.6} />
          </Sequence>
        ))}
      {callouts.map((c, i) => (
        <Sequence
          key={`callout-${i}`}
          from={Math.round(c.words[0].at * fps)}
          durationInFrames={Math.round((c.end - c.words[0].at) * fps)}
          name={`Rótulo · ${c.words.map((w) => w.text).join(" / ")}`}
        >
          <CalloutView callout={c} />
        </Sequence>
      ))}
    </AbsoluteFill>
  );
};
