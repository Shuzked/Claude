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
import { FONT, GREEN } from "./theme";
import { captionPages, f, TRIM, type Word } from "./timeline";

// Palabra a palabra: cada palabra aparece cuando se pronuncia (mínimo 1 en
// pantalla, máximo 3). Las que aún no se han dicho ocupan su sitio invisibles
// para que la línea no salte. Sin relleno: los destacados del guion se subrayan.

const WordView: React.FC<{ w: Word; t: number }> = ({ w, t }) => {
  const { fps } = useVideoConfig();
  const local = (t - w.start) * fps;
  const shown = local >= 0;
  const pop = shown ? spring({ frame: local, fps, config: { damping: 16, stiffness: 320, mass: 0.5 } }) : 0;
  const line = interpolate(t, [w.start + 0.02, w.start + 0.22], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.bezier(0.16, 1, 0.3, 1),
  });
  return (
    <span
      style={{
        position: "relative",
        display: "inline-block",
        opacity: shown ? Math.min(1, pop * 1.6) : 0,
        transform: `translateY(${(1 - pop) * 22}px) scale(${0.9 + 0.1 * pop})`,
      }}
    >
      {w.text}
      {w.underline ? (
        <span
          style={{
            position: "absolute",
            left: 2,
            right: 2,
            bottom: -4,
            height: 8,
            background: GREEN,
            transformOrigin: "left center",
            transform: `scaleX(${line}) skewX(-12deg)`,
            boxShadow: "0 2px 0 rgba(0,0,0,0.55)",
          }}
        />
      ) : null}
    </span>
  );
};

const Page: React.FC<{ page: Word[] }> = ({ page }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = page[0].start + frame / fps;
  const cta = page[0].speaker === "YAGO";
  return (
    <AbsoluteFill style={{ top: cta ? 1520 : 1360, height: "auto", alignItems: "center" }}>
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "center",
          columnGap: 22,
          rowGap: 6,
          maxWidth: 880,
          fontFamily: FONT,
          fontWeight: 800,
          fontSize: 72,
          lineHeight: 1.1,
          letterSpacing: -0.5,
          textTransform: "uppercase",
          color: "white",
          WebkitTextStroke: "10px rgba(0,0,0,0.92)",
          paintOrder: "stroke fill",
        }}
      >
        {page.map((w, i) => (
          <WordView key={i} w={w} t={t} />
        ))}
      </div>
    </AbsoluteFill>
  );
};

export const Captions: React.FC = () => (
  <AbsoluteFill>
    {captionPages.map((page, i) => {
      const next = captionPages[i + 1];
      const from = f(Math.max(TRIM, page[0].start));
      const endS = Math.min(page[page.length - 1].end + 0.35, next ? next[0].start : Infinity);
      const dur = f(endS) - from;
      if (dur <= 0) return null;
      return (
        <Sequence key={i} from={from} durationInFrames={dur} name={`Subtítulo · ${page.map((w) => w.text).join(" ")}`}>
          <Page page={page} />
        </Sequence>
      );
    })}
  </AbsoluteFill>
);
