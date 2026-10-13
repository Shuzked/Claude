import React from "react";
import {
  AbsoluteFill,
  Img,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { FONT, GREEN, PAPER } from "./theme";
import { HOOK_END, ROTO_FRAMES, TRIM, words } from "./timeline";

// Hook: «¿Por qué has vuelto a cambiar la rutina?» palabra a palabra DETRÁS de la
// persona. Se pinta dentro de la cámara virtual (Camera.tsx), entre el vídeo y el
// recorte rotoscopiado, así que sigue exactamente los zooms y las sacudidas.

const hookWords = words.filter((w) => w.start < HOOK_END);

// Líneas del cartel: cada una se ajusta al ancho disponible.
const LINES = [
  [0, 1],
  [2, 3],
  [4, 5],
]; // índices de palabra por línea (detrás de la persona)
// La frase final va DELANTE de la persona y más abajo, a la altura del pecho,
// para que se lea entera y nunca tape la cara.
const FRONT_LINE = [6, 7];
const FRONT_TOP = 1190;
const MAX_W = 1000;
const CHAR_W = 0.7; // ancho medio de Montserrat Black Italic en em
const TOP = 170;

const HookWord: React.FC<{
  text: string;
  start: number;
  size: number;
  accent: boolean;
  front?: boolean;
}> = ({ text, start, size, accent, front }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const local = frame - (start - TRIM) * fps;
  const p = spring({
    frame: local,
    fps,
    config: { damping: 13, stiffness: 260, mass: 0.6 },
  });
  const blur = interpolate(local, [0, 4], [10, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  if (local < 0) {
    return <span style={{ visibility: "hidden", fontSize: size }}>{text}</span>;
  }
  return (
    <span
      style={{
        display: "inline-block",
        fontSize: size,
        color: accent ? GREEN : PAPER,
        transform: `scale(${1.6 - 0.6 * p})`,
        opacity: Math.min(1, p * 2),
        filter: `blur(${blur}px)`,
        // delante de la persona: contorno oscuro para leerse sobre la camiseta
        ...(front
          ? {
              WebkitTextStroke: "10px rgba(0,0,0,0.9)",
              paintOrder: "stroke fill",
            }
          : {}),
        textShadow: accent
          ? "0 0 26px rgba(4,228,0,0.6), 0 0 60px rgba(4,228,0,0.25)"
          : "0 0 22px rgba(255,255,255,0.25)",
      }}
    >
      {text}
    </span>
  );
};

const lineSize = (idx: number[]) => {
  const text = idx.map((i) => hookWords[i]?.text.toUpperCase() ?? "").join(" ");
  return Math.min(230, MAX_W / (text.length * CHAR_W));
};

/** Frase final, por delante del recorte. */
export const HookFront: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  if (TRIM + frame / fps >= HOOK_END) return null;
  return (
    <AbsoluteFill>
      {renderLine(
        FRONT_LINE,
        FRONT_TOP,
        lineSize(FRONT_LINE) * 0.95,
        "front",
        true,
      )}
    </AbsoluteFill>
  );
};

/** Capa de palabras (va detrás del recorte). */
export const HookWords: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  if (TRIM + frame / fps >= HOOK_END) return null;
  let y = TOP;
  return (
    <AbsoluteFill>
      {LINES.map((idx, li) => {
        const size = lineSize(idx);
        const top = y;
        y += size * 0.98;
        return renderLine(idx, top, size, li);
      })}
    </AbsoluteFill>
  );
};

const renderLine = (
  idx: number[],
  top: number,
  size: number,
  key: React.Key,
  front = false,
) => (
  <div
    key={key}
    style={{
      position: "absolute",
      top,
      left: 0,
      right: 0,
      display: "flex",
      justifyContent: "center",
      gap: size * 0.22,
      fontFamily: FONT,
      fontWeight: 900,
      fontStyle: "italic",
      lineHeight: 1,
      letterSpacing: -2,
      whiteSpace: "nowrap",
    }}
  >
    {idx.map((i) =>
      hookWords[i] ? (
        <HookWord
          key={i}
          text={hookWords[i].text.toUpperCase()}
          start={hookWords[i].start}
          size={size}
          accent={i === hookWords.length - 1}
          front={front}
        />
      ) : null,
    )}
  </div>
);

/** Persona recortada fotograma a fotograma (va por encima de las palabras). */
export const HookCutout: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  if (TRIM + frame / fps >= HOOK_END || frame >= ROTO_FRAMES) return null;
  const n = String(frame).padStart(3, "0");
  return (
    <Img
      src={staticFile(`roto/p_${n}.png`)}
      style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
    />
  );
};
