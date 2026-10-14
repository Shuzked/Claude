// Línea de tiempo del quiz «Entrenamiento vs. biomecánica» (Yago, Heracles Fit).
//
// Los tiempos de este archivo están en segundos del vídeo ORIGINAL (una sola toma).
// El montaje recorta las pausas de reflexión: tras leer las opciones se conservan
// exactamente 2 s (con tic-tac) y se salta a la respuesta (E01). `f()` convierte
// un segundo del original en un fotograma del montaje.

import transcript from "./transcript.json";
import { FPS } from "./theme";

export const TRIM = 0;
export const SOURCE_END = 142.76;
export const THINK = 2; // segundos de reflexión que se conservan

// --- Montaje: tramos del original que se conservan -------------------------------
// Cada pausa se corta 2 s después de la última opción y se reanuda 0,1 s antes de
// la respuesta.
export const SEGMENTS: [number, number][] = [
  [0, 17.96 + THINK],
  [22.86, 34.04 + THINK],
  [39.1, 55.48 + THINK],
  [60.58, 76.52 + THINK],
  [81.86, 98.48 + THINK],
  [103.82, 119.84 + THINK],
  [125.34, SOURCE_END],
];

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

/** Segundo del original → segundo del montaje (las pausas recortadas se pegan al corte). */
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

/** Inicio de cada tramo en el montaje (para colocar los vídeos). */
export const segmentsOut = SEGMENTS.map(([a, b], i) => ({
  src: a,
  out: segOut[i],
  dur: b - a,
}));

/** Cortes del montaje (en segundos del original, el punto donde se reanuda). */
export const JUMPS = SEGMENTS.slice(1).map(([a]) => a);

/** Segundo del original → fotograma del montaje. */
export const f = (sourceSeconds: number) =>
  Math.round(toOut(sourceSeconds) * FPS);

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

// Correcciones (puntuación, signos de pregunta y palabras mal reconocidas).
const fixes: Record<string, string> = {
  "0.04": "¿Sabes",
  "1.92": "biomecánica?",
  "28.24": "dos.",
  "28.8": "¿Qué",
  "33.4": "general?",
  "43.68": "tres.",
  "50.16": "descanso,",
  "51.04": "¿crecerían",
  "54.84": "similar?",
  "68.76": "uno.",
  "71.28": "prensa,",
  "71.68": "¿sobre",
  "73.44": "demanda?",
  "75.8": "cuádriceps?",
  "87.08": "dos.",
  "91.2": "¿dónde",
  "94.6": "hipertrofia:",
  "97.84": "isquios?",
  "104.52": "aductores.",
  "109.52": "Y",
  "110.08": "tres.",
};

// Destacados (subrayador) en subtítulos: solo los retos y el cierre.
const underlined = new Set(["0.8", "1.92", "133.44", "134.6"]);

type RawWord = { text: string; start: number; duration: number; eos: boolean };

const CTA_AT = 135.2;

export const words: Word[] = (
  transcript as { segments: { words: RawWord[] }[] }
).segments
  .flatMap((s) => s.words)
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

// --- El juego ----------------------------------------------------------------------
// Opciones en el orden en que se pronuncian (E01): mismo tratamiento hasta la respuesta.
export type Block = "T" | "B";
export type Question = {
  block: Block;
  level: number;
  nivelAt: number; // «Nivel …»
  options: { text: string; at: number }[];
  qEnd: number; // fin de la lectura de opciones: arranca el reloj de 2 s
  answer: number; // índice de la correcta
  answerAt: number; // empieza la respuesta: se para el reloj y se revela
  resEnd: number; // el recurso se retira antes de la siguiente pregunta
};

export const QUESTIONS: Question[] = [
  {
    block: "T",
    level: 1,
    nivelAt: 9.56,
    options: [
      { text: "Tensión mecánica", at: 14.64 },
      { text: "Estrés metabólico", at: 15.68 },
      { text: "Daño muscular", at: 17.0 },
    ],
    qEnd: 17.96,
    answer: 0,
    answerAt: 22.96,
    resEnd: 27.6,
  },
  {
    block: "T",
    level: 2,
    nivelAt: 27.68,
    options: [
      { text: "Rápida", at: 31.04 },
      { text: "Lenta", at: 31.64 },
      { text: "Ninguna de forma general", at: 32.68 },
    ],
    qEnd: 34.04,
    answer: 2,
    answerAt: 39.2,
    resEnd: 42.98,
  },
  {
    block: "T",
    level: 3,
    nivelAt: 43.04,
    options: [
      { text: "Descansando 3 min", at: 51.96 },
      { text: "Descansando 1 min", at: 53.32 },
      { text: "De forma similar", at: 53.96 },
    ],
    qEnd: 55.48,
    answer: 2,
    answerAt: 60.68,
    resEnd: 66.0,
  },
  {
    block: "B",
    level: 1,
    nivelAt: 68.28,
    options: [
      { text: "Glúteos", at: 74.04 },
      { text: "Isquios", at: 74.88 },
      { text: "Cuádriceps", at: 75.8 },
    ],
    qEnd: 76.52,
    answer: 2,
    answerAt: 81.96,
    resEnd: 86.48,
  },
  {
    block: "B",
    level: 2,
    nivelAt: 86.52,
    options: [
      { text: "Cuádriceps", at: 95.48 },
      { text: "Glúteos y aductores", at: 96.36 },
      { text: "Isquios", at: 97.84 },
    ],
    qEnd: 98.48,
    answer: 1,
    answerAt: 103.92,
    resEnd: 109.5,
  },
  {
    block: "B",
    level: 3,
    nivelAt: 109.64,
    options: [
      { text: "Superior", at: 117.28 },
      { text: "Media", at: 118.24 },
      { text: "Inferior", at: 119.04 },
    ],
    qEnd: 119.84,
    answer: 0,
    answerAt: 125.44,
    resEnd: 131.4,
  },
];

// Bloques: identificación arriba durante todo el bloque
export const BLOCKS = [
  { block: "T" as Block, from: 8.44, to: 66.1, title: "Entrenamiento" },
  { block: "B" as Block, from: 66.12, to: 131.42, title: "Biomecánica" },
];

// Hook y reglas
export const HOOK = {
  training: 0.8, // «entrenamiento»
  bio: 1.92, // «biomecánica»
  end: 2.62,
  boards: 5.36, // «contando tus aciertos por separado»: los dos casilleros
  noChange: 7.24, // «no vale cambiar de respuesta»
  rulesEnd: 8.42,
};

// Cierre: «Si has acertado las seis…» y CTA con ejemplo de comentario
export const CTA = {
  six: 131.44,
  comment: 135.28,
  example: 137.64, // «entrenamiento versus biomecánica»
  follow: 140.12, // «no te olvides de seguirme…»
};

// --- Recursos de cada respuesta (E02–E07), en segundos del original --------------
export const RES = {
  e02: { quote: 23.4, notKilos: 25.12 }, // «no la confundas con los kilos»
  e03: { plot: 39.3 },
  e04: { bars: 60.9, sets: 62.36 }, // «con un minuto tuvieron que hacer más series»
  e05: { arrow: 82.0 },
  e06: { card: 104.0, quads: 105.84 }, // «en el ensayo… no apareció la misma ventaja»
  e07: { map: 125.6, note: 126.56 },
};

// Planos abiertos: en E05 la cámara abre para que se vea la pierna y la rodilla.
export const WIDE: [number, number][] = [[81.86, 86.5]];

// Mientras se leen las opciones y se resuelve, sin subtítulos (lo cuenta la gráfica).
export const MUTE: [number, number][] = [
  [0, HOOK.end],
  [HOOK.noChange - 0.05, HOOK.rulesEnd], // lo dice el rótulo «No vale cambiar de respuesta»
  ...QUESTIONS.map(
    (q) => [q.options[0].at - 0.05, q.resEnd] as [number, number],
  ),
  [CTA.comment, SOURCE_END],
];
export const mutedAt = (t: number) => MUTE.some(([a, b]) => t >= a && t < b);

// --- Encuadre ----------------------------------------------------------------------
// Golpes de zoom en los remates; en cada corte de pausa, el zoom cambia de golpe
// (la revelación) para que el salto de la toma no se note.
export type Punch = { at: number; amount: number; hold: number };
export const punches: Punch[] = [
  { at: 0.04, amount: 0.06, hold: 2.4 }, // hook
  { at: 7.24, amount: 0.05, hold: 1.1 }, // «no vale cambiar de respuesta»
  ...QUESTIONS.map((q) => ({ at: q.answerAt, amount: 0.12, hold: 0.9 })),
  { at: 67.12, amount: 0.06, hold: 1.0 }, // «a ver si remontas»
  { at: 133.04, amount: 0.07, hold: 1.6 }, // «estás fuerte hasta en la teoría»
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
  | "shine";

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
};

export type Sfx = { at: number; src: FxName; volume: number };

const pop = (...at: number[]): Sfx[] =>
  at.map((t) => ({ at: t, src: "pop", volume: 0.22 }));

export const allSfx: Sfx[] = [
  // hook: los únicos golpes fuertes
  { at: 0.04, src: "hit", volume: 0.45 },
  { at: HOOK.training, src: "whoosh-a", volume: 0.3 },
  { at: HOOK.bio, src: "snap", volume: 0.4 },
  ...pop(HOOK.boards, HOOK.boards + 0.25),
  { at: HOOK.noChange, src: "stamp", volume: 0.35 },
  // bloques
  ...BLOCKS.map((b) => ({
    at: b.from + 0.05,
    src: "whoosh-b" as const,
    volume: 0.3,
  })),
  // preguntas: opciones, reloj y revelación
  ...QUESTIONS.flatMap((q) => [
    ...q.options.map((o) => ({ at: o.at, src: "pop" as const, volume: 0.25 })),
    ...Array.from({ length: 4 }).map((_, k) => ({
      at: q.qEnd + k * 0.5,
      src: (k % 2 ? "tock" : "tick") as FxName,
      volume: 0.5,
    })),
    { at: q.answerAt, src: "correct" as const, volume: 0.45 },
    { at: q.answerAt + 0.35, src: "whoosh-a" as const, volume: 0.2 },
  ]),
  // recursos
  { at: RES.e02.quote, src: "paper", volume: 0.25 },
  { at: RES.e02.notKilos, src: "pop", volume: 0.22 },
  { at: RES.e03.plot, src: "paper", volume: 0.25 },
  { at: RES.e04.bars, src: "paper", volume: 0.25 },
  { at: RES.e04.sets, src: "pop", volume: 0.22 },
  { at: RES.e05.arrow, src: "shine", volume: 0.3 },
  { at: RES.e06.card, src: "paper", volume: 0.25 },
  { at: RES.e06.quads, src: "pop", volume: 0.22 },
  { at: RES.e07.map, src: "paper", volume: 0.25 },
  // cierre
  { at: 133.04, src: "ding", volume: 0.22 },
  { at: CTA.comment, src: "whoosh-b", volume: 0.25 },
  { at: CTA.example, src: "pop", volume: 0.25 },
  { at: CTA.follow, src: "pop", volume: 0.25 },
];

// --- Subtítulos ----------------------------------------------------------------------
const MAX_WORDS = 3;
const MAX_GAP = 0.3;

export const captionPages: Word[][] = [];
{
  let page: Word[] = [];
  for (const w of words) {
    const prev = page[page.length - 1];
    if (prev && (prev.speaker !== w.speaker || w.start - prev.end > MAX_GAP)) {
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
