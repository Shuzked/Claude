import React from "react";
import { AbsoluteFill, Sequence, useCurrentFrame, useVideoConfig } from "remotion";
import { FONT } from "./fonts";
import { lines, type Line } from "./edit";

const MAX_WORDS_PER_PAGE = 4;
const ACTIVE = "#FFD84D";

type Word = { text: string; from: number; to: number };

// Sin transcripción, el tiempo de cada palabra se reparte por su longitud
// dentro de la frase. Cuando haya un .srt o transcripción, se sustituye aquí.
const wordsOf = (line: Line): Word[] => {
  const tokens = line.text.split(" ");
  const total = tokens.reduce((n, t) => n + t.length + 1, 0);
  const span = line.end - line.start;
  let t = line.start;
  return tokens.map((text) => {
    const d = ((text.length + 1) / total) * span;
    const w = { text, from: t, to: t + d };
    t += d;
    return w;
  });
};

const pagesOf = (line: Line): Word[][] => {
  const words = wordsOf(line);
  const pages: Word[][] = [];
  let page: Word[] = [];
  for (const w of words) {
    page.push(w);
    // Corta la página al llenarse o al final de una frase.
    if (page.length >= MAX_WORDS_PER_PAGE || /[.?!,]$/.test(w.text)) {
      pages.push(page);
      page = [];
    }
  }
  if (page.length) pages.push(page);
  return pages;
};

const Page: React.FC<{ words: Word[]; offset: number }> = ({ words, offset }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = offset + frame / fps;
  return (
    <AbsoluteFill style={{ justifyContent: "flex-start", alignItems: "center", top: 1400 }}>
      <div
        style={{
          fontFamily: FONT,
          fontWeight: 800,
          fontSize: 66,
          lineHeight: 1.15,
          color: "white",
          textAlign: "center",
          maxWidth: 860,
          textShadow: "0 4px 18px rgba(0,0,0,0.85), 0 0 3px rgba(0,0,0,0.9)",
        }}
      >
        {words.map((w, i) => (
          <span key={i} style={{ color: t >= w.from && t < w.to ? ACTIVE : "white" }}>
            {(i ? " " : "") + w.text}
          </span>
        ))}
      </div>
    </AbsoluteFill>
  );
};

export const Captions: React.FC = () => {
  const { fps } = useVideoConfig();
  return (
    <AbsoluteFill>
      {lines.flatMap((line, li) =>
        pagesOf(line).map((page, pi) => {
          const start = page[0].from;
          const end = page[page.length - 1].to;
          return (
            <Sequence
              key={`${li}-${pi}`}
              from={Math.round(start * fps)}
              durationInFrames={Math.max(1, Math.round((end - start) * fps))}
              name={`Subtítulo · ${line.speaker}`}
            >
              <Page words={page} offset={start} />
            </Sequence>
          );
        }),
      )}
    </AbsoluteFill>
  );
};
