// Línea de tiempo de «Utiliza la cuerda para hacer tríceps» (Yago, Heracles Fit).
// Versión B del guion (Hook 2: voz en off sobre la repetición con cuerda).
//
// Tiempos en segundos del ORIGINAL (yago.2.sin.editar.mp4). El montaje recorta los
// silencios reales de la voz; `f()` convierte un segundo del original en un
// fotograma del montaje.

import transcript from "./transcript.json";
import { FPS } from "./theme";

export const SOURCE_END = 94.2;

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
  "49.32": "este.",
  "30.56": "¿Pero",
};

// Destacados (subrayador): solo «extensión del codo» y el remate del CTA
const underlined = new Set(["35.8", "36.32", "36.52", "93.08"]);

const CTA_AT = 89.48;

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
  [4.55, 4.94],
  [9.53, 10.09],
  [12.85, 13.3],
  [16.87, 17.33],
  [30.41, 30.72],
  [37.64, 38.1],
  [44.12, 44.38],
  [49.48, 49.78],
  [56.61, 56.89],
  [59.82, 60.28],
  [64.45, 64.72],
  [66.81, 67.22],
  [79.67, 80.05],
  [89.3, 89.62],
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
export const SHOT_CUTS = [1.8, 4.84, 9.92, 13.12, 16.68, 19.84, 22.16, 24.4, 30.52, 37.96, 49.68, 52.6, 60.16, 70.84, 76.2, 80.0];

// Planos de cuerda: encuadre abierto y fijo (sin seguir la cara) para que se vean
// hombros, codos, manos y la unión de la cuerda; los gráficos van pegados al cuerpo.
export type Framing = { from: number; to: number; face: [number, number]; scale: number; ty?: number };
export const FIXED: Framing[] = [
  { from: 0, to: 1.8, face: [540, 760], scale: 1.12 }, // voz en off: señala el tríceps
  { from: 13.12, to: 16.68, face: [540, 900], scale: 1.0 }, // frontal: hombros, codos, manos y unión
  { from: 16.68, to: 19.84, face: [540, 960], scale: 1.0 }, // final de la repetición, cerca
  { from: 19.84, to: 22.16, face: [540, 900], scale: 1.04 }, // brazos abajo: rotación
  { from: 24.4, to: 30.52, face: [560, 820], scale: 1.08 }, // colocación del brazo
  { from: 70.84, to: 76.2, face: [560, 860], scale: 1.0 }, // perfil: recorrido
  { from: 76.2, to: 80.0, face: [540, 860], scale: 1.0 }, // frontal: cables
  { from: 37.96, to: 49.68, face: [520, 1130], scale: 1.1, ty: 1010 }, // tríceps y postura enteros
  { from: 56.81, to: 60.16, face: [540, 1090], scale: 1.7, ty: 980 }, // zoom a los antebrazos
  { from: 80.0, to: 94.2, face: [540, 1060], scale: 1.1, ty: 1000 }, // conclusión: herramientas a la vista
];
export const TRACKS = [] as { from: number; to: number; file: string; scale: number }[];

export const JUMPS = [
  ...new Set([
    ...SHOT_CUTS,
    ...SEGMENTS.slice(1)
      .map(([a]) => a)
      .filter((a) => !SHOT_CUTS.some((c) => Math.abs(c - a) < 0.8)),
  ]),
].sort((a, b) => a - b);

// --- Escenas (segundos del original) ----------------------------------------------
// Hook (voz en off): «ni se te ocurra utilizar la cuerda»
export const HOOK = { from: 1.8, no: 2.84, to: 4.7 };
// Las dos objeciones
export const TWO = { at: 12.12, to: 13.1 }; // «estas dos cosas»
export const OBJ1 = { from: 13.16, cable: 13.4, inside: 15.2, demand: 16.04, to: 17.15 };
export const OBJ2 = { from: 17.2, open: 17.52, rot: 20.5, to: 22.1 };
// «Es cierto que… fuerza isométrica»
export const ISO = { from: 24.5, inward: 26.64, hold: 29.32, to: 30.45 };
// Rotación del antebrazo (rótulo) y «ni tríceps ni hombro pinchan ni cortan»
export const FORE = { from: 57.52, green: 59.3, to: 60.1 };
export const NEITHER = { from: 61.88, triceps: 62.28, shoulder: 63.76, cut: 64.6, to: 66.9 };
// Recorrido: demanda de más a menos (perfil) y tres fotogramas Inicio / Medio / Final
export const RANGE = { from: 71.0, more: 73.92, frames: 74.3, to: 76.15 };
export const FRONT = { from: 76.25, to: 79.7 };
// Conclusión práctica: saca la barra y la cuerda (brillan y se apagan)
export const TOOLS = { bar: 85.6, rope: 86.5, fade: 87.6, to: 88.6 };
export const TIPS = { comfy: 86.64, fail: 87.56, prog: 88.68, to: 89.35 };
// Hook: el tríceps se enciende
export const TRI = { on: 0.7, off: 1.5 };
// CTA
export const CTA = { from: 89.48, follow: 91.28, rig: 93.08 };

export const MUTE: [number, number][] = [];
export const mutedAt = (t: number) => MUTE.some(([a, b]) => t >= a && t < b);

// --- Encuadre ----------------------------------------------------------------------
export type Punch = { at: number; amount: number; hold: number };
export const punches: Punch[] = [
  { at: 8.76, amount: 0.05, hold: 0.9 }, // «no van a crecer»
  { at: 22.36, amount: 0.06, hold: 1.4 }, // «vamos a ver si es tan malo como dicen»
  { at: 30.56, amount: 0.05, hold: 7.0 }, // «¿Pero de verdad…?» acercamiento suave
  { at: 49.64, amount: 0.04, hold: 2.6 }, // «puede parecer hasta mejor»
  { at: 64.6, amount: 0.05, hold: 1.0 }, // «ni pinchan ni cortan»
  { at: 69.6, amount: 0.05, hold: 1.0 }, // «la cuerda es mejor»
  { at: 80.2, amount: 0.04, hold: 1.4 }, // «no soy reduccionista»
  { at: 93.08, amount: 0.05, hold: 1.2 }, // «riguroso»
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
  // hook: el tríceps se enciende; la imagen se tiñe de rojo y golpea el rótulo
  { at: TRI.on, src: "shine", volume: 0.3 },
  { at: HOOK.from, src: "pop", volume: 0.22 },
  { at: HOOK.no, src: "impact", volume: 0.45 },
  { at: HOOK.no, src: "buzzer", volume: 0.16 },
  // «2» y «COSAS» detrás de Yago
  { at: TWO.at - 0.22, src: "riser", volume: 0.1 },
  { at: TWO.at - 0.2, src: "hit", volume: 0.32 },
  { at: TWO.at + 0.12, src: "impact-hi", volume: 0.3 },
  // 1 · demanda sobre el hombro
  { at: OBJ1.from, src: "whoosh-b", volume: 0.2 },
  { at: OBJ1.cable - 0.1, src: "marker", volume: 0.25 },
  { at: OBJ1.cable + 0.35, src: "pop", volume: 0.22 },
  { at: OBJ1.inside + 0.1, src: "tic", volume: 0.3 },
  { at: OBJ1.demand - 0.25, src: "buzzer", volume: 0.1 },
  // 2 · giro al terminar
  { at: OBJ2.from, src: "whoosh-b", volume: 0.2 },
  { at: OBJ2.open, src: "whoosh-a", volume: 0.18 },
  { at: OBJ2.rot, src: "whoosh-b", volume: 0.22 },
  // isométrico
  { at: ISO.from, src: "marker", volume: 0.2 },
  { at: ISO.inward - 0.1, src: "tic", volume: 0.28 },
  { at: ISO.hold - 0.15, src: "stamp", volume: 0.3 },
  // antebrazo
  { at: FORE.green - 0.05, src: "shine", volume: 0.28 },
  { at: FORE.from, src: "pop", volume: 0.22 },
  { at: NEITHER.from, src: "whoosh-b", volume: 0.2 },
  { at: NEITHER.triceps, src: "tick", volume: 0.3 },
  { at: NEITHER.shoulder, src: "tock", volume: 0.3 },
  { at: NEITHER.cut, src: "buzzer", volume: 0.12 },
  // recorrido y cruce
  { at: RANGE.from, src: "marker", volume: 0.22 },
  { at: FRONT.from + 0.1, src: "marker", volume: 0.2 },
  { at: FRONT.from + 0.9, src: "ding", volume: 0.3 },
  // conclusión
  { at: TIPS.prog - 0.05, src: "hit", volume: 0.32 },
  { at: TIPS.prog + 0.05, src: "impact-hi", volume: 0.28 },
  // CTA
  { at: CTA.follow, src: "whoosh-a", volume: 0.25 },
  { at: CTA.follow + 0.15, src: "pop", volume: 0.25 },
  { at: CTA.rig, src: "shine", volume: 0.25 },
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
