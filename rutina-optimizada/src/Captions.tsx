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
import { f, scenes, TRIM, visiblePages, type Word } from "./timeline";

// Trazo de subrayador: bordes irregulares y punta inclinada, como un rotulador real.
const MARKER_PATH =
  "M 2 9 C 20 5, 45 7, 70 5 S 120 6, 150 4 L 198 3 L 196 47 C 170 49, 140 46, 110 48 S 50 46, 24 49 L 0 50 Z";

const Highlighter: React.FC<{ p: number }> = ({ p }) => (
  <svg
    viewBox="0 0 200 52"
    preserveAspectRatio="none"
    style={{
      position: "absolute",
      left: -10,
      right: -10,
      top: "12%",
      height: "82%",
      width: "calc(100% + 20px)",
      zIndex: -1,
      overflow: "visible",
      transform: "rotate(-1.5deg)",
      filter: "drop-shadow(0 0 14px rgba(4, 228, 0, 0.55))",
      // pinta de izquierda a derecha
      clipPath: `inset(0 ${(1 - p) * 100}% 0 0)`,
    }}
  >
    <path d={MARKER_PATH} fill={GREEN} opacity={0.92} />
    {/* segunda pasada más fina: textura de rotulador */}
    <path
      d="M 4 14 C 60 11, 120 13, 194 9"
      stroke="rgba(255,255,255,0.18)"
      strokeWidth={3}
      fill="none"
    />
  </svg>
);

// Palabra a palabra: cada palabra aparece cuando se pronuncia (mínimo 1 en
// pantalla, máximo 3). Las que aún no se han dicho ocupan su sitio invisibles
// para que la línea no salte. Los destacados del guion se pintan con subrayador.
const WordView: React.FC<{ w: Word; t: number }> = ({ w, t }) => {
  const { fps } = useVideoConfig();
  const local = (t - w.start) * fps;
  const shown = local >= 0;
  const pop = shown
    ? spring({
        frame: local,
        fps,
        config: { damping: 16, stiffness: 320, mass: 0.5 },
      })
    : 0;
  // el trazo dura lo que dura la palabra (entre 0,18 y 0,4 s)
  const dur = Math.min(0.4, Math.max(0.18, w.end - w.start));
  const paint = interpolate(t, [w.start, w.start + dur], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.bezier(0.33, 0, 0.2, 1),
  });
  return (
    <span
      style={{
        position: "relative",
        display: "inline-block",
        zIndex: 0,
        opacity: shown ? Math.min(1, pop * 1.6) : 0,
        transform: `translateY(${(1 - pop) * 22}px) scale(${0.9 + 0.1 * pop})`,
      }}
    >
      {w.underline ? <Highlighter p={paint} /> : null}
      <span
        style={
          w.underline && paint > 0
            ? {
                textShadow: `0 0 ${10 + 14 * paint}px rgba(255,255,255,${0.35 + 0.4 * paint}), 0 0 40px rgba(255,255,255,0.15)`,
              }
            : undefined
        }
      >
        {w.text.replace(/\.+$/, "")}
      </span>
    </span>
  );
};

const Page: React.FC<{ page: Word[] }> = ({ page }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = page[0].start + frame / fps;
  const cta = page[0].speaker === "YAGO";
  return (
    <AbsoluteFill
      style={{ top: cta ? 1400 : 1360, height: "auto", alignItems: "center" }}
    >
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
          // glow sutil
          textShadow:
            "0 0 18px rgba(255,255,255,0.28), 0 0 42px rgba(255,255,255,0.1)",
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
    {visiblePages.map((page, i) => {
      const next = visiblePages[i + 1];
      const from = f(Math.max(TRIM, page[0].start));
      // los subtítulos se ocultan en cuanto entra una escena de motion graphics
      const nextScene = scenes.find((s) => s.from > page[0].start);
      const endS = Math.min(
        page[page.length - 1].end + 0.35,
        next ? next[0].start : Infinity,
        nextScene ? nextScene.from + 0.1 : Infinity,
      );
      const dur = f(endS) - from;
      if (dur <= 0) return null;
      return (
        <Sequence
          key={i}
          from={from}
          durationInFrames={dur}
          name={`Subtítulo · ${page.map((w) => w.text).join(" ")}`}
        >
          <Page page={page} />
        </Sequence>
      );
    })}
  </AbsoluteFill>
);
