import React from "react";
import {
  AbsoluteFill,
  interpolate,
  Sequence,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { FONT, GREEN, INK } from "./theme";
import { f, TRIM, words, type Word } from "./timeline";

const MAX_WORDS = 3;
const MAX_GAP = 0.3;

// Agrupa palabras en páginas: corta al llenarse, al final de frase,
// al cambiar de personaje o si hay una pausa.
const pages: Word[][] = [];
{
  let page: Word[] = [];
  for (const w of words) {
    const prev = page[page.length - 1];
    if (prev && (prev.speaker !== w.speaker || w.start - prev.end > MAX_GAP)) {
      pages.push(page);
      page = [];
    }
    page.push(w);
    if (page.length >= MAX_WORDS || w.eos || /,$/.test(w.text)) {
      pages.push(page);
      page = [];
    }
  }
  if (page.length) pages.push(page);
}

const Page: React.FC<{ page: Word[] }> = ({ page }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = page[0].start + frame / fps;
  const enter = spring({ frame, fps, config: { damping: 18, stiffness: 260, mass: 0.6 } });
  const cta = page[0].speaker === "YAGO";

  return (
    <AbsoluteFill
      style={{
        top: cta ? 1500 : 1330,
        height: "auto",
        alignItems: "center",
      }}
    >
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "center",
          columnGap: 20,
          rowGap: 4,
          maxWidth: 900,
          transform: `translateY(${(1 - enter) * 18}px) scale(${0.92 + 0.08 * enter})`,
          opacity: interpolate(enter, [0, 0.4], [0, 1], { extrapolateRight: "clamp" }),
        }}
      >
        {page.map((w, i) => {
          const active = t >= w.start && t < w.end + 0.04;
          const local = (t - w.start) * fps;
          const hit = active ? spring({ frame: local, fps, config: { damping: 12, stiffness: 300 } }) : 0;
          return (
            <span
              key={i}
              style={{
                position: "relative",
                fontFamily: FONT,
                fontWeight: 800,
                fontSize: 70,
                lineHeight: 1.12,
                letterSpacing: -0.5,
                textTransform: "uppercase",
                color: active ? INK : w.key ? GREEN : "white",
                padding: "0 8px",
                WebkitTextStroke: active ? "0px" : "9px rgba(0,0,0,0.9)",
                paintOrder: "stroke fill",
                transform: `scale(${1 + hit * 0.04})`,
                zIndex: active ? 1 : 0,
              }}
            >
              {active ? (
                <span
                  style={{
                    position: "absolute",
                    inset: "4px 0 2px 0",
                    background: GREEN,
                    zIndex: -1,
                    transform: `scaleX(${0.6 + 0.4 * hit})`,
                  }}
                />
              ) : null}
              {w.text}
            </span>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

export const Captions: React.FC = () => {
  return (
    <AbsoluteFill>
      {pages.map((page, i) => {
        const next = pages[i + 1];
        const from = f(Math.max(TRIM, page[0].start));
        const endS = Math.min(page[page.length - 1].end + 0.3, next ? next[0].start : Infinity);
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
};
