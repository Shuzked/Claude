// Línea de tiempo de «Presidente de la hipertrofia — 8 mitos» (Yago 9, Heracles Fit).
//
// Tiempos en segundos del ORIGINAL (yago.9.mov). Yago dejó un hueco tras cada
// respuesta para la pregunta del periodista: el montaje conserva solo el final de
// ese hueco (Yago escuchando) y en él aparece la pregunta en pantalla.

import transcript from "./transcript.json";
import { FPS } from "./theme";

export type Word = { text: string; start: number; end: number; eos: boolean; underline: boolean };

// Correcciones de la transcripción. "" = no se subtitula.
const fixes: Record<string, string> = {
  "0.76": "",
  "1.16": "",
  "1.56": "",
  "1.76": "",
  "4.44": "hipertrofia.",
  "5.12": "Así",
  "57.28": "No.",
  "57.84": "Ajusto",
  "72.68": "no,",
  "74.36": "entrenar,",
  "74.8": "sí.",
  "75.52": "Mejor",
  "76.68": "votes:",
};

// Destacados (subrayador) de cada respuesta
const underlined = new Set([
  "3.32", "4.44", // presidente de la hipertrofia
  "17.84", "18.4", "20.84", "20.6", // trabajo que reciba / mis prioridades
  "28.52", "28.96", // ahorrarte tiempo
  "34.84", "35.84", // dosis / calendario
  "41.76", "42.32", // entrenar espalda
  "51.4", "52.2", // rendimientos decrecientes
  "58.6", "59.72", // dosis / organización
  "64.51", "64.76", "66.08", "66.44", // sin llegar / menos fatiga
  "77.16", // sígueme
]);

type RawWord = { text: string; start: number; duration: number; eos: boolean };
export const words: Word[] = (transcript as { segments: { words: RawWord[] }[] }).segments
  .flatMap((s) => s.words)
  .map((w) => {
    const id = String(Math.round(w.start * 100) / 100);
    const text = fixes[id] ?? w.text;
    return {
      text,
      start: w.start,
      end: w.start + w.duration,
      eos: w.eos || /[.?:]$/.test(text),
      underline: underlined.has(id),
    };
  })
  .filter((w) => w.text !== "");

// --- Montaje --------------------------------------------------------------------
// [inicio, fin] en el original. Cada bloque = pregunta (Yago escucha) + respuesta.
export const SEGMENTS: [number, number][] = [
  [2.12, 8.32], // hook: «me presento a presidente…» → «Primera pregunta.»
  [13.76, 21.9], // 1/8 elevaciones frontales
  [22.86, 29.72], // 3/8 drop sets
  [30.36, 36.82], // 4/8 días consecutivos
  [37.5, 44.52], // 5/8 straps
  [45.66, 53.4], // 6/8 volumen
  [54.3, 60.84], // 7/8 cardio
  [60.84, 67.22], // 8/8 fallo
  [68.0, 77.98], // cierre: «Menuda mierda de presidente…» → CTA
];

type Seg = { src: number; dur: number; out: number };
const SEGS: Seg[] = (() => {
  const out: Seg[] = [];
  let acc = 0;
  for (const [a, b] of SEGMENTS) {
    out.push({ src: a, dur: b - a, out: acc });
    acc += b - a;
  }
  return out;
})();

export const OUT_DURATION = SEGS.reduce((a, s) => a + s.dur, 0);
export const DURATION_FRAMES = Math.round(OUT_DURATION * FPS);
export const segmentsOut = SEGS;

/** Segundo del original → segundo del montaje. */
export const toOut = (src: number) => {
  for (let i = SEGS.length - 1; i >= 0; i--) {
    const x = SEGS[i];
    if (src >= x.src) return x.out + Math.min(src - x.src, x.dur);
  }
  return 0;
};
/** Segundo del montaje → segundo del original. */
export const toSrc = (out: number) => {
  for (let i = SEGS.length - 1; i >= 0; i--) {
    const x = SEGS[i];
    if (out >= x.out) return x.src + (out - x.out);
  }
  return 0;
};
/** Segundo del original → fotograma del montaje. */
export const f = (src: number) => Math.round(toOut(src) * FPS);

// --- Preguntas --------------------------------------------------------------------
// q: inicio de la pregunta (en el original), a: inicio de la respuesta, to: fin del bloque.
// key: rótulo de la respuesta (uno o dos tiempos).
export type Q = {
  n: number;
  topic: string;
  text: string;
  q: number;
  a: number;
  to: number;
  key: { text: string; at: number }[];
  push?: number; // acercamiento digital en este instante
  icon?: "clock" | "calendar";
};
export const QUESTIONS: Q[] = [
  { n: 1, topic: "Elevaciones frontales", text: "¿Las elevaciones frontales sobran porque ya hacemos presses?", q: 13.8, a: 16.84, to: 21.9, key: [{ text: "Trabajo recibido + prioridad", at: 20.3 }] },
  { n: 3, topic: "Series rectas vs. drop sets", text: "¿Las series rectas hacen crecer más que los drop sets?", q: 22.9, a: 26.0, to: 29.72, key: [{ text: "Pueden ahorrar tiempo", at: 28.5 }], push: 26.0, icon: "clock" },
  { n: 4, topic: "Días consecutivos", text: "¿Entrenar el mismo músculo dos días seguidos impide que crezca?", q: 30.4, a: 33.32, to: 36.82, key: [{ text: "Importa la dosis, no solo el calendario", at: 35.2 }], icon: "calendar" },
  { n: 5, topic: "Straps", text: "¿Usar straps para levantar más peso no es hacer trampa?", q: 37.54, a: 40.56, to: 44.52, key: [{ text: "Espalda ≠ competición de agarre", at: 42.8 }] },
  { n: 6, topic: "Volumen de entrenamiento", text: "¿Para ganar más músculo siempre es mejor hacer menos series?", q: 45.7, a: 48.72, to: 53.4, key: [{ text: "Más puede aportar más", at: 50.0 }, { text: "Con rendimientos decrecientes", at: 51.3 }] },
  { n: 7, topic: "Cardio", text: "¿Para ganar músculo hay que dejar el cardio?", q: 54.34, a: 57.28, to: 60.84, key: [{ text: "Dosis + organización", at: 59.2 }], push: 57.28 },
  { n: 8, topic: "Llegar al fallo", text: "¿Toda serie que no llegue al fallo es una serie perdida?", q: 60.86, a: 63.52, to: 67.22, key: [{ text: "Crecer sin llegar", at: 64.6 }, { text: "Menos fatiga", at: 66.0 }] },
];
export const CLOSE = {
  q: 68.04,
  text: "Menuda mierda de presidente… ¿Entonces qué promete tu programa electoral?",
  a: 71.84,
  cta: 75.52,
  to: 77.98,
};
export const HOOK = { from: 2.12, to: 8.32 };

// --- Subtítulos: páginas de 1 a 3 palabras ------------------------------------------
export const captionPages: Word[][] = [];
{
  let cur: Word[] = [];
  const flush = () => {
    if (cur.length) captionPages.push(cur);
    cur = [];
  };
  for (const w of words) {
    const prev = cur[cur.length - 1];
    if (prev && (w.start - prev.end > 0.45 || cur.length >= 3)) flush();
    cur.push(w);
    if (w.eos || /,$/.test(w.text)) flush();
  }
  flush();
}
export const visiblePages = captionPages.filter((p) =>
  SEGMENTS.some(([a, b]) => p[0].start >= a - 0.05 && p[0].start < b),
);
