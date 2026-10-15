// Línea de tiempo de «Press vs. aperturas con mancuernas» (Yago, Heracles Fit).
//
// Tiempos en segundos del ORIGINAL (yago.3.sin.editar.mp4). El montaje recorta los
// silencios reales de la voz; `f()` convierte un segundo del original en un
// fotograma del montaje.

import transcript from "./transcript.json";
import { FPS } from "./theme";

export const SOURCE_END = 108.9;

// --- Transcripción ------------------------------------------------------------------
export type Speaker = "Y1" | "Y2" | "THOUGHT" | "CTA";

export type Word = {
  text: string;
  start: number;
  end: number;
  speaker: Speaker;
  eos: boolean;
  underline: boolean;
};

// Correcciones (signos, palabras mal reconocidas). "" = no se subtitula.
const fixes: Record<string, string> = {
  "41.28": "cómo",
  "50.68": "con",
  "51": "mancuernas,",
  "105.6": "PECTORAL",
  "106.68": "escribo",
};

// Destacados (subrayador): la aducción horizontal y el remate del CTA
const underlined = new Set(["15.76", "16.68", "16.92", "17.32", "105.6"]);

const CTA_AT = 105.04;

type RawWord = { text: string; start: number; duration: number; eos: boolean };

const timed: Word[] = (
  transcript as { segments: { words: RawWord[] }[] }
).segments
  .flatMap((s) => s.words)
  .map((w) => {
    const id = String(Math.round(w.start * 100) / 100);
    const text = fixes[id] ?? w.text;
    const speaker: Speaker = w.start >= CTA_AT ? "CTA" : "Y2";
    return {
      text,
      start: w.start,
      end: w.start + w.duration,
      speaker,
      eos: w.eos || /[.?:]$/.test(text),
      underline: underlined.has(id),
    };
  });
export const words = timed.filter((w) => w.text !== "");

// --- Montaje: se recortan los silencios reales de la voz (silencedetect −38 dB) ---
const SILENCES: [number, number][] = [
  [4.24, 4.56], [5.68, 5.86], [17.99, 18.33], [27.19, 27.76], [34.2, 34.61], [40.85, 41.06],
  [51.35, 51.61], [52.66, 53.09], [58.93, 59.22], [67.17, 67.55], [75.09, 75.47], [80.8, 81.21],
  [88.33, 88.61], [94.08, 94.34], [100.64, 100.95],
];
const PAD_IN = 0.1;
const PAD_OUT = 0.08;
const START = 0.0;

export const SEGMENTS: [number, number][] = (() => {
  const cuts = SILENCES.map(([a, b]) => [a + PAD_IN, b - PAD_OUT] as [number, number]);
  const segs: [number, number][] = [];
  let a = START;
  for (const [x, y] of cuts) {
    if (y <= a) continue;
    segs.push([a, Math.max(a, x)]);
    a = y;
  }
  segs.push([a, SOURCE_END]);
  return segs.filter(([x, y]) => y - x > 0.05);
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

/** Segundo del original → fotograma del montaje. */
export const f = (sourceSeconds: number) =>
  Math.round(toOut(sourceSeconds) * FPS);

// --- Planos ----------------------------------------------------------------------
export const SHOT_CUTS = [4.4, 5.96, 18.24, 20, 21.76, 22.52, 24.04, 25.4, 26.72, 27.72, 34.48, 38.48, 44.08, 53.04, 67.4, 75.36, 81.04, 88.48, 94.2, 100.84];

export type Framing = { from: number; to: number; face: [number, number]; scale: number; ty?: number };
export const FIXED: Framing[] = [
  { from: 0, to: 4.4, face: [540, 960], scale: 1.0 }, // press de apertura: plano entero
  { from: 4.4, to: 5.96, face: [540, 900], scale: 1.0 },
  { from: 5.96, to: 18.24, face: [560, 900], scale: 1.12, ty: 900 }, // brazo entero: hombro, codo, mano
  { from: 27.72, to: 34.48, face: [540, 960], scale: 1.0 },
  { from: 38.48, to: 44.08, face: [540, 960], scale: 1.0 }, // los dos Yagos
  { from: 53.04, to: 67.4, face: [520, 1000], scale: 1.45, ty: 900 },
  { from: 67.4, to: 75.36, face: [540, 1233], scale: 1.6, ty: 960 }, // banco desde atrás
  { from: 88.48, to: 94.2, face: [540, 1000], scale: 1.35, ty: 900 },
];
export const TRACKS = [] as { from: number; to: number; file: string; scale: number }[];

export const JUMPS = [
  ...new Set([
    ...SHOT_CUTS,
    ...SEGMENTS.slice(1)
      .map(([a]) => a)
      .filter((a) => !SHOT_CUTS.some((c) => Math.abs(c - a) < 0.8))
      .filter((a) => !(a > 18.2 && a < 27.8) && !(a > 44 && a < 53.1)), // pantalla dividida y estudio: sin saltos
  ]),
].sort((a, b) => a - b);

// --- Escenas (segundos del original) ----------------------------------------------
export const HOOK = { from: 0.16, to: 5.85 };
export const HUMERUS = { from: 6.52, line: 7.76, to: 11.6 };
export const ADD = { from: 15.76, to: 18.2 };
// Pantalla dividida (press a la izquierda, aperturas a la derecha)
export const SPLIT = { from: 18.24, elbow: 20.36, fixed: 22.96, lever: 24.84, to: 27.72 };
export const KG = { from: 28.56, to: 34.15 };
export const SIMILAR = { from: 36.16, word: 39.56, to: 40.85 };
export const REHOOK = { at: 41.08 };
export const STUDY = { from: 44.12, n: 44.92, weeks: 48.16, days: 51.48, fig: 53.1, both: 53.8, none: 55.08, to: 58.9 };
export const INTEREST = { at: 64.16, to: 67.1 };
export const ELBOW = { press: 68.32, fly: 71.08, to: 75.05 };
export const DECIDE = { press: 76.68, fly: 82.0, needs: 90.44, needsTo: 93.9 };
export const CTA = { from: 105.04, key: 105.6 };

export const MUTE: [number, number][] = [[53.1, 58.95], [105.04, 109]]; // figura y CTA: lo dice el rótulo
export const mutedAt = (t: number) => MUTE.some(([a, b]) => t >= a && t < b);

// --- Encuadre ----------------------------------------------------------------------
export type Punch = { at: number; amount: number; hold: number };
export const punches: Punch[] = [
  { at: 3.24, amount: 0.05, hold: 0.6 }, // «200 kilos»
  { at: 5.52, amount: 0.05, hold: 0.3 }, // «diez»
  { at: 30.36, amount: 0.05, hold: 1.0 }, // «no lo convierte»
  { at: 39.12, amount: 0.05, hold: 1.4 }, // «crezca similar»
  { at: 41.08, amount: 0.09, hold: 2.6 }, // «¿Pero cómo…?» acercamiento suave
  { at: 59.92, amount: 0.05, hold: 1.0 }, // «interesante»
  { at: 97.72, amount: 0.08, hold: 2.4 }, // «cuál te conviene a ti»
  { at: 105.04, amount: 0.05, hold: 1.4 }, // «comenta PECTORAL»
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
  | "impact-hi"
  | "buzzer"
  | "boing";

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
  buzzer: 0.01,
  boing: 0.01,
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
  buzzer: "ui",
  boing: "ui",
};

export type Sfx = { at: number; src: FxName; volume: number };

export const allSfx: Sfx[] = [
  { at: HOOK.from, src: "hit", volume: 0.3 },
  { at: HOOK.from + 0.25, src: "whoosh-b", volume: 0.2 },
  { at: HUMERUS.line, src: "marker", volume: 0.25 },
  { at: ADD.from, src: "pop", volume: 0.24 },
  { at: SPLIT.from, src: "whoosh-a", volume: 0.25 },
  { at: SPLIT.elbow, src: "tic", volume: 0.28 },
  { at: SPLIT.fixed, src: "stamp", volume: 0.25 },
  { at: SPLIT.lever, src: "snap", volume: 0.3 },
  { at: SPLIT.lever + 0.4, src: "marker", volume: 0.22 },
  { at: KG.from, src: "pop", volume: 0.22 },
  { at: KG.from + 1.9, src: "buzzer", volume: 0.12 },
  { at: SIMILAR.word, src: "correct", volume: 0.25 },
  { at: REHOOK.at, src: "riser", volume: 0.12 },
  { at: STUDY.from, src: "paper", volume: 0.3 },
  { at: STUDY.n, src: "pop", volume: 0.24 },
  { at: STUDY.weeks, src: "pop", volume: 0.24 },
  { at: STUDY.days, src: "pop", volume: 0.24 },
  { at: STUDY.fig, src: "whoosh-b", volume: 0.24 },
  { at: STUDY.both, src: "correct", volume: 0.25 },
  { at: STUDY.none, src: "stamp", volume: 0.25 },
  { at: INTEREST.at, src: "pop", volume: 0.22 },
  { at: ELBOW.press, src: "tic", volume: 0.28 },
  { at: ELBOW.fly, src: "tic", volume: 0.28 },
  { at: DECIDE.press, src: "pop", volume: 0.22 },
  { at: DECIDE.fly, src: "pop", volume: 0.22 },
  { at: DECIDE.needs, src: "shine", volume: 0.25 },
  { at: CTA.from, src: "whoosh-a", volume: 0.25 },
  { at: CTA.key, src: "stamp", volume: 0.35 },
  // barridos en los cortes
  ...JUMPS.filter((j) => j > 1).map((j, i) => ({
    at: j,
    src: (i % 2 ? "whoosh-a" : "whoosh-b") as FxName,
    volume: SHOT_CUTS.includes(j) ? 0.36 : 0.24,
  })),
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
