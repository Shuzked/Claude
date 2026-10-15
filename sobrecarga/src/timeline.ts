// Línea de tiempo de «Sobrecarga progresiva — ¿No mejorar significa no crecer?»
// (Yago, Heracles Fit).
//
// Los tiempos de este archivo están en segundos del ORIGINAL (Yago.5.sin.editar.mp4;
// los primeros 16,84 s ya vienen compuestos con los dos Yagos). El montaje recorta
// los silencios reales de la voz. `f()` convierte un segundo del original en un
// fotograma del montaje.
//
// Personajes: Yago 1 = camiseta blanca (frustrado, pregunta). Yago 2 = sudadera azul
// (explica).

import transcript from "./transcript.json";
import { FPS } from "./theme";

export const SOURCE_END = 86.4;

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
  "6.12": "mejoro.",
  "7.08": "sabes",
  "7.56": "dicen",
  "12.92": "¿Y",
  "14.04": "repe",
  "15.8": "cuádriceps?", // dice «cuádriceps» (la transcripción automática ponía «cuadro»)
  "27.08": "ese.",
  "27.84": "¿Habré",
  "29.04": "muscular?",
  "30.56": "cambio",
  "76.8": "¿cuándo",
  "78.32": "cuándo",
  "79.32": "algo?",
  "84.88": "SOBRECARGA",
};

// Destacados (subrayador)
const underlined = new Set(["23.2", "33.24", "75.32", "84.88"]);

// Quién habla en cada tramo (el resto es Yago 2)
const Y1: [number, number][] = [
  [0, 6.58],
  [12.1, 16.5],
  [76.0, 79.86],
];
const THOUGHT_AT: [number, number] = [27.8, 31.4];
const CTA_AT = 79.86;

type RawWord = { text: string; start: number; duration: number; eos: boolean };

const timed: Word[] = (
  transcript as { segments: { words: RawWord[] }[] }
).segments
  .flatMap((s) => s.words)
  .map((w) => {
    const id = String(Math.round(w.start * 100) / 100);
    const text = fixes[id] ?? w.text;
    const t = w.start;
    const speaker: Speaker =
      t >= THOUGHT_AT[0] && t < THOUGHT_AT[1]
        ? "THOUGHT"
        : t >= CTA_AT
          ? "CTA"
          : Y1.some(([a, b]) => t >= a && t < b)
            ? "Y1"
            : "Y2";
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
  [3.64, 4.3],
  [11.88, 12.33],
  [16.19, 17.01],
  [24.67, 25.0],
  [27.37, 27.77],
  [35.42, 35.71],
  [39.42, 40.02],
  [45.49, 45.9],
  [50.81, 51.2],
  [56.6, 56.9],
  [68.16, 68.45],
  [73.37, 73.68],
  [75.85, 76.21],
  [79.52, 80.07],
];
const PAD_IN = 0.1;
const PAD_OUT = 0.08;
const START = 0.5; // final de la repetición de Yago 1, sin cabecera

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
// Cortes de plano del original
export const SHOT_CUTS = [16.84, 27.36, 30.12, 32.8, 35.6, 39.72, 42.6, 45.76, 56.76, 68.32, 76.0, 79.76];

// Apertura compuesta (los dos Yagos, plano fijo): abre en general para ver que
// comparten el espacio y luego se acerca al que habla, sin invertir posiciones.
// face = punto a centrar (coordenadas del vídeo 1080×1920).
export type Framing = { from: number; to: number; face: [number, number]; scale: number };
const YAGO1: [number, number] = [790, 860];
const YAGO2: [number, number] = [350, 700];
export const FIXED: Framing[] = [
  { from: 0, to: 4.3, face: [560, 820], scale: 1.0 }, // general: los dos
  { from: 4.3, to: 6.58, face: YAGO1, scale: 1.55 }, // «Otra serie en la que no mejoro»
  { from: 6.58, to: 12.2, face: YAGO2, scale: 1.55 }, // «Pues ya sabes lo que dicen…»
  { from: 12.2, to: 16.84, face: YAGO1, scale: 1.55 }, // «Sí, claro…»
];

// Planos con seguimiento de persona (u2net_human_seg): el plano lejano de Yago 1
// andando con la libreta y el plano contra la pared (entra por la izquierda).
export const TRACKS = [
  { from: 27.36, to: 30.12, file: "far", scale: 2.3 },
  { from: 30.12, to: 32.8, file: "wall", scale: 1.3 },
] as const;

export const JUMPS = [
  ...new Set([
    ...FIXED.slice(1).map((x) => x.from),
    ...SHOT_CUTS,
    ...SEGMENTS.slice(1)
      .map(([a]) => a)
      .filter((a) => !SHOT_CUTS.some((c) => Math.abs(c - a) < 0.8)),
  ]),
].sort((a, b) => a - b);

// --- Escenas (segundos del original) ----------------------------------------------
// E01 · el tópico: «LO QUE DICEN»
export const SAYING = { from: 7.36, to: 12.0 };
// E02 · libreta de ejemplo 10 / 10 / 10 y la undécima que no sale
export const NOTES = { from: 18.9, rows: [19.3, 20.4, 21.12], eleven: 23.2, fail: 24.24, to: 24.75 };
// E03 · pensamiento de Yago 1 (voz interior)
export const THOUGHT = { from: THOUGHT_AT[0], to: THOUGHT_AT[1], wake: 31.36, out: 32.4 }; // se retira poco a poco desde «A ver, tranquilo»
// E04 · «Tranquilo»: repetir marca ≠ demostrar que no creces / registro de rendimiento
export const CALM = { at: 31.68, in: 32.8, no: 33.08, grow: 34.72, labelTo: 35.5 }; // entra con el plano de la sudadera azul (32,8)
// E05 · fatiga y ritmo
export const FATIGUE = { from: 42.84, to: 45.7 };
// E06 · una sesión frente a una tendencia
export const TREND = { review: 63.56, look: 64.92, reviewTo: 68.2 };
// E07 · la idea que queda
export const IDEA = { from: 70.8, to: 75.95 };
// E08 · «¿Mantener?» / «¿Cambiar?»
export const CHOICE = { keep: 77.2, change: 78.96, to: 79.8 };
// E09 · CTA
export const CTA = { from: 80.0, master: 83.44, keyword: 84.88 };

// Sin subtítulos encima de la libreta (lo dice el rótulo)
export const MUTE: [number, number][] = [[CALM.in, CALM.labelTo]];
export const mutedAt = (t: number) => MUTE.some(([a, b]) => t >= a && t < b);

// --- Encuadre ----------------------------------------------------------------------
export type Punch = { at: number; amount: number; hold: number };
export const punches: Punch[] = [
  { at: 15.24, amount: 0.06, hold: 1.0 }, // «¿qué tengo que devolver, el bíceps?»
  { at: 16.88, amount: 0.05, hold: 1.2 }, // «Déjame adivinar»
  { at: 31.68, amount: 0.05, hold: 0.8 }, // «tranquilo»
  { at: 70.8, amount: 0.05, hold: 2.0 }, // «no es una medición directa…»
  { at: 21.12, amount: 0.04, hold: 0.6 }, // «diez repeticiones»
  { at: 24.24, amount: 0.06, hold: 0.6 }, // «no sale»
  { at: 33.08, amount: 0.06, hold: 1.2 }, // «no significa»
  { at: 42.84, amount: 0.04, hold: 1.4 }, // «la fatiga»
  { at: 46.48, amount: 0.05, hold: 1.0 }, // «no esperes progresar al mismo ritmo»
  { at: 51.04, amount: 0.04, hold: 1.0 }, // «Por eso»
  { at: 56.72, amount: 0.07, hold: 1.0 }, // «Pero tampoco…»
  { at: 63.56, amount: 0.05, hold: 1.4 }, // «semana tras semana»
  { at: 80.44, amount: 0.05, hold: 1.0 }, // «estás de suerte»
  { at: 84.88, amount: 0.06, hold: 1.4 }, // «SOBRECARGA»
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
  { at: SAYING.from, src: "pop", volume: 0.25 },
  { at: 15.8, src: "tic", volume: 0.3 }, // remate del bíceps
  // libreta
  { at: NOTES.from, src: "paper", volume: 0.3 },
  ...NOTES.rows.map((at) => ({ at, src: "marker" as const, volume: 0.22 })),
  { at: NOTES.eleven, src: "riser", volume: 0.15 },
  { at: NOTES.fail, src: "buzzer", volume: 0.18 },
  { at: NOTES.fail, src: "impact-hi", volume: 0.3 }, // sacudida de la barra
  // pensamiento: entra y lo corta el «tranquilo»
  { at: THOUGHT.from - 0.1, src: "riser", volume: 0.12 },
  { at: CALM.at - 0.05, src: "snap", volume: 0.35 },
  { at: CALM.in, src: "whoosh-b", volume: 0.3 },
  { at: CALM.no, src: "hit", volume: 0.3 },
  { at: CALM.grow, src: "whoosh-a", volume: 0.2 },
  { at: FATIGUE.from, src: "pop", volume: 0.22 },
  ...[0, 1, 2, 3].map((i) => ({ at: TREND.review + i * 0.32, src: "tic" as const, volume: 0.25 })),
  { at: TREND.look, src: "whoosh-b", volume: 0.2 },
  { at: TREND.look + 0.6, src: "pop", volume: 0.25 },
  { at: IDEA.from, src: "whoosh-b", volume: 0.22 },
  { at: CHOICE.keep, src: "pop", volume: 0.25 },
  { at: CHOICE.change, src: "pop", volume: 0.25 },
  { at: CTA.master, src: "whoosh-a", volume: 0.25 },
  { at: CTA.keyword, src: "stamp", volume: 0.35 },
  // barridos en los cortes
  ...JUMPS.filter((j) => j > 1).map((j, i) => ({
    at: j,
    src: (i % 2 ? "whoosh-a" : "whoosh-b") as FxName,
    volume: SHOT_CUTS.includes(j) || FIXED.some((x) => x.from === j) ? 0.38 : 0.26,
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
