// Línea de tiempo de «Glúteos: extensión y abducción» (Yago, Heracles Fit).
//
// Tiempos en segundos del ORIGINAL (yago.4.SIN.EDITAR.mp4). El montaje recorta las
// pausas largas entre palabras; `f()` convierte un segundo del original en un
// fotograma del montaje.

import transcript from "./transcript.json";
import { FPS } from "./theme";

export const SOURCE_END = 94.3;

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
  "84.32": "de cada",
};
// Palabras que la transcripción no recogió (se oyen en la toma, según el guion)
const extra: { text: string; start: number; duration: number }[] = [
  { text: "aislar", start: 15.9, duration: 0.42 },
  { text: "step-ups,", start: 26.44, duration: 0.36 },
  { text: "hip", start: 26.84, duration: 0.14 },
  { text: "thrust", start: 26.98, duration: 0.2 },
];

// Destacados (subrayador)
const underlined = new Set(["15.9", "17.6", "33.72", "38.84", "50.48", "63.36", "84.32", "88.68", "91.12"]);

const CTA_AT = 90.16;

type RawWord = { text: string; start: number; duration: number; eos: boolean };

const timed: Word[] = [
  ...(transcript as { segments: { words: RawWord[] }[] }).segments.flatMap((s) => s.words),
  ...extra.map((w) => ({ ...w, eos: false })),
]
  .sort((a, b) => a.start - b.start)
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

// --- Montaje: se recortan las pausas largas entre palabras --------------------------
const START = 1.8;
const GAP = 0.32; // pausa mínima que se recorta
const PAD = 0.1; // aire que se deja a cada lado
export const SEGMENTS: [number, number][] = (() => {
  const segs: [number, number][] = [];
  let a = START;
  for (let i = 0; i < words.length - 1; i++) {
    const e = words[i].end;
    const s = words[i + 1].start;
    if (s - e > GAP) {
      segs.push([a, e + PAD]);
      a = s - PAD;
    }
  }
  segs.push([a, SOURCE_END]);
  return segs.filter(([x, y]) => y - x > 0.05);
})();

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

export const OUT_DURATION = SEGS.reduce((acc, x) => acc + x.dur, 0);
export const DURATION_FRAMES = Math.round(OUT_DURATION * FPS);

/** Segundo del original → segundo del montaje (lo recortado se pega al corte). */
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
  return START;
};

export const segmentsOut = SEGS.filter((x) => Math.round((x.out + x.dur) * FPS) - Math.round(x.out * FPS) >= 1).map((x) => ({ src: x.src, out: x.out, dur: x.dur }));

/** Segundo del original → fotograma del montaje. */
export const f = (sourceSeconds: number) => Math.round(toOut(sourceSeconds) * FPS);

// --- Planos ----------------------------------------------------------------------
export const SHOT_CUTS = [6.88, 14.84, 19.36, 23.88, 29.6, 41.6, 51.24, 61.64, 68.88, 77.24, 79.96, 82.72, 85.52, 90.08];

export type Framing = { from: number; to: number; face: [number, number]; scale: number; ty?: number };
export const FIXED: Framing[] = [
  { from: 0, to: 6.88, face: [540, 960], scale: 1.0 }, // hook: rotoscopia sobre el vídeo de la reacción
  { from: 6.88, to: 14.84, face: [540, 960], scale: 1.0 }, // Yago entero + tarjeta del vídeo original
  { from: 14.84, to: 19.36, face: [540, 960], scale: 1.0 },
  { from: 61.64, to: 68.88, face: [540, 960], scale: 1.0 }, // el feed sale de su móvil
  { from: 77.24, to: 79.96, face: [540, 960], scale: 1.0 }, // abducción de pie en polea
];
// plano general 29,6–41,6: plano medio mientras habla y entero en cada gesto de pierna
export const SCALEKEYS = [
  {
    from: 29.6,
    to: 41.6,
    keys: [
      [29.6, 1.65],
      [32.2, 1.65],
      [32.75, 1.0],
      [34.4, 1.0],
      [35.0, 1.6],
      [37.85, 1.6],
      [38.4, 1.0],
      [41.6, 1.0],
    ] as [number, number][],
  },
];
export const ZOOMS = [] as { from: number; to: number; s0: number; s1: number }[];
// planos de charla: la cabeza siempre centrada (nariz de la pose, suavizada por plano)
export const HEADCAMS = [
  { from: 19.36, to: 23.88, scale: 1.45, ty: 640, data: 0 },
  { from: 23.88, to: 29.6, scale: 1.3, ty: 640, data: 0 },
  { from: 41.6, to: 51.24, scale: 1.35, ty: 640, data: 0 },
  { from: 68.88, to: 77.24, scale: 1.4, ty: 640, data: 0 },
  { from: 79.96, to: 82.72, scale: 1.45, ty: 640, data: 0 },
  { from: 82.72, to: 85.52, scale: 1.6, ty: 640, data: 0 },
  { from: 85.52, to: 90.08, scale: 1.5, ty: 640, data: 0 },
  { from: 90.08, to: 94.4, scale: 1.6, ty: 640, data: 0 },
];
export const KEYCAMS = [] as { from: number; to: number; ty: number; keys: [number, number, number, number][] }[];
export const TRACKS = [] as { from: number; to: number; file: string; scale: number }[];
// (sin temblor de hook en este vídeo)
export const HOOK = { press: -10, heavy: -10, light: -10, to: -10 };

export const JUMPS = [
  ...new Set([
    ...SHOT_CUTS,
    ...SEGMENTS.slice(1)
      .map(([a]) => a)
      .filter((a) => !SHOT_CUTS.some((c) => Math.abs(c - a) < 0.8)),
  ]),
].sort((a, b) => a - b);

// --- Escenas (segundos del original) ----------------------------------------------
// E01–E02: reacción al vídeo original (pantalla dividida) y «mapa simplista»
export const REACT = { hook: 1.8, cut: 6.88, in: 5.48, map: 7.48, out: 14.74 };
// E02: anatomía (P2, figura 3A) y «Aislar ≠ favorecer»
export const ANAT = { from: 14.8, iso: 15.9, fav: 17.6, to: 19.34 };
// E03: re-hook del ex
export const EX = { at: 21.48 };
// E04: catálogo de ejercicios → «Todos incluyen extensión de cadera»
export const CAT = {
  bgFrom: 23.88,
  bgTo: 29.95,
  from: 24.64,
  items: [
    [25.0, "sentadilla", "Sentadillas"],
    [25.48, "peso", "Peso muerto"],
    [26.0, "bulgaras", "Búlgaras"],
    [26.44, "stepups", "Step-ups"],
    [26.84, "hipthrust", "Hip thrust"],
    [27.52, "reaccion", "3 patadas"],
  ] as [number, string, string][],
  session: 28.88,
  clear: 30.04,
  ext: 33.72,
  to: 35.1,
};
// E05: la abducción
export const ABD = { other: 36.56, word: 38.84, sep: 39.92, to: 41.5 };
export const MAYOR = { medio: 44.4, mayor: 49.08, to: 51.2 };
// E06: P1, figura 3A
export const STUDY = { from: 51.28, fig: 52.92, ext: 53.08, extLab: 55.12, abd: 57.68, abdLab: 58.56, to: 61.62, bgFrom: 51.24, bgTo: 62.05 };
// E07: el móvil «escupe» un feed de vídeos que pasa con sus propios swipes
export const PHONE = { in: 61.9, swipes: [63.0, 63.9, 64.8, 65.6, 66.4, 67.2, 68.0], out: 68.7 };
// E07: elegir, no acumular
export const COMBO = { at: 61.88, to: 64.2 };
export const STARTP = { at: 69.08, card: 70.56, abd: 75.88, to: 77.2 };
// E08: dos posiciones de abducción
export const POS = { ext: 77.32, flex: 78.9, to: 79.94 };
export const CRIT = { at: 83.16, to: 85.45 };
// E09: conclusión y CTA
export const APORTE = { at: 88.32, to: 90.0 };
export const CTA = { from: 90.16, follow: 91.12 };

export const MUTE: [number, number][] = [];
export const mutedAt = (t: number) => MUTE.some(([a, b]) => t >= a && t < b);

// --- Encuadre ----------------------------------------------------------------------
export type Punch = { at: number; amount: number; hold: number };
export const punches: Punch[] = [
  { at: 5.48, amount: 0.05, hold: 1.2 }, // «cosas absurdas como esta»
  { at: 21.48, amount: 0.12, hold: 1.6 }, // «para que tu ex vea lo que se ha perdido»
  { at: 30.04, amount: 0.05, hold: 1.2 }, // «no son idénticos»
  { at: 44.4, amount: 0.1, hold: 2.4 }, // «no es solo un gesto para tu glúteo medio»
  { at: 61.88, amount: 0.05, hold: 1.4 },
  { at: 86.36, amount: 0.06, hold: 1.6 }, // «no busques acumular»
  { at: 91.12, amount: 0.06, hold: 2.0 }, // CTA
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
  { at: REACT.in, src: "whoosh-b", volume: 0.3 },
  { at: REACT.map, src: "stamp", volume: 0.3 },
  { at: ANAT.from, src: "paper", volume: 0.28 },
  { at: ANAT.iso, src: "pop", volume: 0.24 },
  { at: ANAT.fav, src: "buzzer", volume: 0.1 },
  { at: EX.at, src: "riser", volume: 0.1 },
  ...CAT.items.map(([at]) => ({ at, src: "pop" as FxName, volume: 0.24 })),
  { at: CAT.session, src: "boing", volume: 0.18 },
  { at: CAT.clear, src: "whoosh-a", volume: 0.25 },
  { at: CAT.ext, src: "correct", volume: 0.24 },
  { at: ABD.word, src: "shine", volume: 0.24 },
  { at: ABD.sep, src: "pop", volume: 0.22 },
  { at: MAYOR.mayor, src: "marker", volume: 0.22 },
  { at: STUDY.from, src: "paper", volume: 0.3 },
  { at: STUDY.fig, src: "whoosh-b", volume: 0.24 },
  { at: STUDY.extLab, src: "marker", volume: 0.24 },
  { at: STUDY.abdLab, src: "marker", volume: 0.24 },
  { at: COMBO.at, src: "pop", volume: 0.22 },
  { at: STARTP.card, src: "pop", volume: 0.24 },
  { at: POS.ext, src: "tic", volume: 0.26 },
  { at: POS.flex, src: "tic", volume: 0.26 },
  { at: CRIT.at, src: "pop", volume: 0.2 },
  { at: APORTE.at, src: "shine", volume: 0.22 },
  { at: CTA.from, src: "whoosh-a", volume: 0.25 },
  { at: CTA.follow, src: "stamp", volume: 0.35 },
  ...JUMPS.filter((j) => j > 2.5).map((j, i) => ({
    at: j,
    src: (i % 2 ? "whoosh-a" : "whoosh-b") as FxName,
    volume: SHOT_CUTS.includes(j) ? 0.34 : 0.22,
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
