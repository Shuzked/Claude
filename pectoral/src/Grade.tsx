import React from "react";
import grade from "./grade.json";

// Etalonaje por plano (grade.json, calculado sobre el metraje): balance de blancos con
// la camiseta blanca, niveles (negro y blancos iguales entre planos), gamma para que
// la persona quede a la misma exposición, una curva en S suave y algo de saturación.
// Se aplica como filtro SVG solo al vídeo (y a los recortes del vídeo), no a gráficos.

type G = { from: number; to: number; gain: number[]; off: number; gamma: number };
const SHOTS = grade as G[];

const table = (gain: number, off: number, gamma: number) => {
  const N = 33;
  const v: string[] = [];
  for (let i = 0; i < N; i++) {
    const x = i / (N - 1);
    let y = Math.max(0, Math.min(1, x * gain + off));
    y = Math.pow(y, gamma);
    const s = y * y * (3 - 2 * y); // curva en S
    y = y + (s - y) * 0.28;
    v.push(Math.max(0, Math.min(1, y)).toFixed(4));
  }
  return v.join(" ");
};

export const shotIndex = (t: number) => {
  const i = SHOTS.findIndex((s) => t >= s.from && t < s.to);
  return i < 0 ? SHOTS.length - 1 : i;
};
export const gradeFilter = (t: number) => `url(#grade-${shotIndex(t)})`;

export const GradeDefs: React.FC = () => (
  <svg width={0} height={0} style={{ position: "absolute" }}>
    <defs>
      {SHOTS.map((s, i) => (
        <filter key={i} id={`grade-${i}`} colorInterpolationFilters="sRGB" x="0" y="0" width="100%" height="100%">
          <feComponentTransfer>
            <feFuncR type="table" tableValues={table(s.gain[0], s.off, s.gamma)} />
            <feFuncG type="table" tableValues={table(s.gain[1], s.off, s.gamma)} />
            <feFuncB type="table" tableValues={table(s.gain[2], s.off, s.gamma)} />
          </feComponentTransfer>
          <feColorMatrix type="saturate" values="1.08" />
        </filter>
      ))}
    </defs>
  </svg>
);
