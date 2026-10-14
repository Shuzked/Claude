// Línea de tiempo de «Bucal e hipertrofia» (Yago, Heracles Fit).
//
// Los tiempos de este archivo están en segundos del vídeo ORIGINAL (yago.6.mov).
// El montaje recorta silencios largos y la primera toma repetida de «Lo que sí
// cuestiono…». `f()` convierte un segundo del original en un fotograma del montaje.

import transcript from "./transcript.json";
import { FPS } from "./theme";

export const SOURCE_END = 91.16;

// --- Transcripción ------------------------------------------------------------------
export type Speaker = "YAGO" | "CTA";

export type Word = {
  text: string;
  start: number;
  end: number;
  speaker: Speaker;
  eos: boolean;
  underline: boolean;
};

// Correcciones (signos, palabras mal reconocidas). "" = la palabra no se subtitula.
const fixes: Record<string, string> = {
  "0.4": "¿Por qué",
  "3.64": "entrena?",
  "4.96": "ojo,",
  "20.48": "músculo?",
  "24.36": "una,",
  "42.44": "",
  "42.72": "Apretar",
  "51": "¿Cuánto",
  "53.04": "Pues…",
  "69.56": "dentista",
  "69.68": "",
};

// Destacados (subrayador): la imagen del hook, la tesis y el cierre.
const underlined = new Set(["2.28", "11", "20.48", "90.32"]);

// Primera toma de «Lo que sí cuestiono…» (se repite mejor justo después).
const RETAKE: [number, number] = [70.3, 77.84];

type RawWord = { text: string; start: number; duration: number; eos: boolean };

const CTA_AT = 84.9;

const timed: Word[] = (
  transcript as { segments: { words: RawWord[] }[] }
).segments
  .flatMap((s) => s.words)
  .filter((w) => !(w.start >= RETAKE[0] && w.start < RETAKE[1]))
  .map((w) => {
    const id = String(Math.round(w.start * 100) / 100);
    const text = fixes[id] ?? w.text;
    return {
      text,
      start: w.start,
      end: w.start + w.duration,
      speaker: (w.start >= CTA_AT ? "CTA" : "YAGO") as Speaker,
      eos: w.eos || /[.?:]$/.test(text),
      underline: underlined.has(id),
    };
  });
export const words = timed.filter((w) => w.text !== "");

// --- Montaje: se conserva la voz; los silencios > 0,55 s se dejan en ~0,35 s ------
const LEAD = 0.15;
const TAIL = 0.2;
const MAX_GAP = 0.55;
// Planos donde no se corta (la reacción del hook y el plano recurso del banco).
const KEEP: [number, number][] = [
  [0, 4.6],
  [67.2, 70.3],
];

export const SEGMENTS: [number, number][] = (() => {
  const segs: [number, number][] = [];
  let a = 0;
  for (let i = 0; i < timed.length - 1; i++) {
    const end = timed[i].end;
    const next = timed[i + 1].start;
    const inKeep = KEEP.some(([x, y]) => end >= x && next <= y);
    if (next - end > MAX_GAP && !inKeep) {
      segs.push([a, end + TAIL]);
      a = next - LEAD;
    }
  }
  segs.push([a, Math.min(SOURCE_END, timed[timed.length - 1].end + 0.7)]);
  return segs;
})();

const segOut: number[] = [];
{
  let acc = 0;
  for (const [a, b] of SEGMENTS) {
    segOut.push(acc);
    acc += b - a;
  }
}
export const OUT_DURATION = SEGMENTS.reduce((acc, [a, b]) => acc + b - a, 0);
export const DURATION_FRAMES = Math.round(OUT_DURATION * FPS);

/** Segundo del original → segundo del montaje (lo recortado se pega al corte). */
export const toOut = (src: number) => {
  for (let i = SEGMENTS.length - 1; i >= 0; i--) {
    const [a, b] = SEGMENTS[i];
    if (src >= a) return segOut[i] + Math.min(src, b) - a;
  }
  return 0;
};

/** Segundo del montaje → segundo del original. */
export const toSrc = (out: number) => {
  for (let i = SEGMENTS.length - 1; i >= 0; i--) {
    if (out >= segOut[i]) return SEGMENTS[i][0] + (out - segOut[i]);
  }
  return 0;
};

export const segmentsOut = SEGMENTS.map(([a, b], i) => ({
  src: a,
  out: segOut[i],
  dur: b - a,
}));

/** Cambios de plano (cortes del original + del montaje): la cámara virtual alterna
 *  encuadre medio / cerrado en cada uno. */
export const JUMPS = [4.5, 21.28, 49.48, 58.0, 67.32, 70.44, 77.73, 84.9];

/** Segundo del original → fotograma del montaje. */
export const f = (sourceSeconds: number) =>
  Math.round(toOut(sourceSeconds) * FPS);

// --- Escenas (segundos del original) ----------------------------------------------
// Planos negros del original: ahí van los recursos a pantalla completa.
export const BLACK: [number, number][] = [
  [16.88, 21.28],
  [33.52, 49.48],
];

export const HOOK = {
  question: 0.4, // «¿Por qué este chaval usa chupete…»
  pacifier: 2.28, // «chupete»
  end: 4.5, // «Pues ojo»: Yago a pantalla completa
  ojo: 4.56,
  strength: 9.08, // «sí que puede mejorar algunas pruebas de fuerza»
};

// E02 · P1 (Boroojerdi et al., 2000): mandíbula → sistema nervioso → otros músculos
export const NERVE = { from: 11.92, jaw: 12.3, nerve: 14.84, muscles: 16.04, to: 16.6 };

// La pregunta de hipertrofia (plano negro)
export const QUESTION = { from: 16.88, bite: 18.32, muscle: 19.8, card: 20.5, to: 21.28 };

// «Separar dos cosas»
export const TWO = { from: 22.9, clench: 25.2, guard: 26.8, to: 29.4 };

// E05 · P2 (Miró et al., 2023), plano negro
export const STUDY = {
  from: 33.52,
  athletes: 34.64,
  tests: 36.28,
  grip: 37.04,
  press: 37.48,
  curl: 38.16,
  c1: 38.84, // sin apretar
  c2: 39.68, // apretando sin bucal
  c3: 41.2, // apretando con él
  figure: 42.6, // «Apretar mejoró la fuerza…»
  noExtra: 45.36, // «pero no detectaron una ventaja adicional…»
  to: 49.48,
};

// «¿Cuánto músculo más ganaron?» → «eso no lo midieron»
export const MEASURE = { question: 51.0, no: 54.04, to: 57.4 };

// Rótulo de síntesis (E07)
export const SYNTH = { from: 62.0, to: 66.9 };

// Plano recurso del banco con bucal: «Otra cosa es que te lo haya indicado tu dentista»
export const DENTIST = { from: 67.44, label: 68.84, to: 70.3 };

// CTA (E08)
export const FOLLOW = { at: 88.72, criterio: 89.84 };

// Sin subtítulos encima de la pregunta a pantalla completa (la dice el rótulo).
export const MUTE: [number, number][] = [[QUESTION.from, QUESTION.to]];
export const mutedAt = (t: number) => MUTE.some(([a, b]) => t >= a && t < b);

// --- Encuadre ----------------------------------------------------------------------
export type Punch = { at: number; amount: number; hold: number };
export const punches: Punch[] = [
  { at: 0.4, amount: 0.05, hold: 3.0 },
  { at: 4.56, amount: 0.08, hold: 0.8 }, // «Pues ojo»
  { at: 9.08, amount: 0.05, hold: 1.8 }, // «sí que puede»
  { at: 51.0, amount: 0.08, hold: 1.2 }, // «¿Cuánto músculo más ganaron?»
  { at: 54.04, amount: 0.05, hold: 1.0 }, // «eso no lo midieron»
  { at: 62.0, amount: 0.05, hold: 2.0 },
  { at: 88.72, amount: 0.06, hold: 2.0 }, // «sígueme»
];

// --- Sonido ------------------------------------------------------------------------
export type FxName =
  | "hit"
  | "riser"
  | "snap"
  | "tic"
  | "whoosh-a"
  | "whoosh-b"
  | "marker"
  | "pop"
  | "paper"
  | "ding"
  | "stamp"
  | "tick"
  | "tock"
  | "correct"
  | "shine"
  | "impact"
  | "impact-hi";

export const FX_PEAK: Record<FxName, number> = {
  hit: 0.27,
  riser: 0.85,
  snap: 0.02,
  tic: 0.03,
  "whoosh-a": 0.5,
  "whoosh-b": 0.58,
  marker: 0.02,
  pop: 0.005,
  paper: 0.05,
  ding: 0.003,
  stamp: 0.01,
  tick: 0.003,
  tock: 0.003,
  correct: 0.01,
  shine: 0.08,
  impact: 0.003,
  "impact-hi": 0.003,
};

export const FX_DIR: Record<FxName, "fx" | "ui"> = {
  hit: "fx",
  riser: "fx",
  snap: "fx",
  tic: "fx",
  "whoosh-a": "fx",
  "whoosh-b": "fx",
  marker: "ui",
  pop: "ui",
  paper: "ui",
  ding: "ui",
  stamp: "ui",
  tick: "ui",
  tock: "ui",
  correct: "ui",
  shine: "ui",
  impact: "ui",
  "impact-hi": "ui",
};

export type Sfx = { at: number; src: FxName; volume: number };

export const allSfx: Sfx[] = [
  // hook: el vídeo de referencia y el giro «Pues ojo»
  { at: 0.05, src: "hit", volume: 0.4 },
  { at: HOOK.pacifier, src: "pop", volume: 0.25 },
  { at: HOOK.end, src: "whoosh-a", volume: 0.3 },
  { at: HOOK.strength + 0.9, src: "marker", volume: 0.25 },
  // E02 · esquema nervioso
  { at: NERVE.jaw, src: "pop", volume: 0.22 },
  { at: NERVE.nerve, src: "shine", volume: 0.3 },
  { at: NERVE.muscles, src: "pop", volume: 0.22 },
  // la pregunta
  { at: QUESTION.from + 0.05, src: "whoosh-b", volume: 0.3 },
  { at: QUESTION.card, src: "stamp", volume: 0.35 },
  // dos cosas
  { at: TWO.clench, src: "pop", volume: 0.25 },
  { at: TWO.guard, src: "pop", volume: 0.25 },
  // estudio
  { at: STUDY.from + 0.05, src: "paper", volume: 0.3 },
  { at: STUDY.athletes, src: "pop", volume: 0.22 },
  { at: STUDY.grip, src: "tic", volume: 0.3 },
  { at: STUDY.press, src: "tic", volume: 0.3 },
  { at: STUDY.curl, src: "tic", volume: 0.3 },
  { at: STUDY.c1, src: "pop", volume: 0.22 },
  { at: STUDY.c2, src: "pop", volume: 0.22 },
  { at: STUDY.c3, src: "pop", volume: 0.22 },
  { at: STUDY.figure, src: "whoosh-a", volume: 0.25 },
  { at: STUDY.noExtra, src: "marker", volume: 0.3 },
  // «¿cuánto músculo?» → «no lo midieron»
  { at: MEASURE.question, src: "pop", volume: 0.25 },
  { at: MEASURE.no, src: "stamp", volume: 0.35 },
  // síntesis, dentista y CTA
  { at: SYNTH.from, src: "whoosh-b", volume: 0.22 },
  { at: DENTIST.label, src: "pop", volume: 0.22 },
  { at: FOLLOW.at, src: "whoosh-a", volume: 0.25 },
  { at: FOLLOW.at + 0.6, src: "shine", volume: 0.25 },
];

// --- Subtítulos ----------------------------------------------------------------------
const MAX_WORDS = 3;
const CAP_GAP = 0.3;

export const captionPages: Word[][] = [];
{
  let page: Word[] = [];
  for (const w of words) {
    const prev = page[page.length - 1];
    if (prev && (prev.speaker !== w.speaker || w.start - prev.end > CAP_GAP)) {
      captionPages.push(page);
      page = [];
    }
    page.push(w);
    if (page.length >= MAX_WORDS || w.eos || /,$/.test(w.text)) {
      captionPages.push(page);
      page = [];
    }
  }
  if (page.length) captionPages.push(page);
}

/** Momento en que se muestra una página (después de un tramo silenciado). */
export const pageStart = (p: Word[]) => {
  const m = MUTE.find(([a, b]) => p[0].start >= a && p[0].start < b);
  return m ? m[1] : p[0].start;
};
export const visiblePages = captionPages.filter(
  (p) => pageStart(p) < p[p.length - 1].end + 0.1,
);
