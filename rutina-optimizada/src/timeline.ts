// Línea de tiempo de «La rutina optimizada».
//
// Todos los tiempos de este archivo están en segundos del vídeo ORIGINAL
// (public/video.mp4) y salen de la transcripción por palabra (transcript.json).
// La composición empieza en TRIM: el silencio inicial se recorta para que la
// pregunta suene en el primer fotograma (E01).

import transcript from "./transcript.json";
import { FPS } from "./theme";

export const TRIM = 1.2;
export const SOURCE_END = 65.6;
export const DURATION_FRAMES = Math.round((SOURCE_END - TRIM) * FPS);

/** Segundo del original -> fotograma de la composición. */
export const f = (sourceSeconds: number) =>
  Math.round((sourceSeconds - TRIM) * FPS);

export type Speaker = "ENTRENADOR" | "CLIENTE" | "YAGO";

export type Word = {
  text: string;
  start: number;
  end: number;
  speaker: Speaker;
  // Fin de frase: los subtítulos no juntan palabras de frases distintas.
  eos: boolean;
  // Se pinta con subrayador al pronunciarse (destacados del guion).
  underline: boolean;
};

// Quién habla en cada tramo (cortes de plano + guion).
const turns: [number, Speaker][] = [
  [1.2, "ENTRENADOR"],
  [3.7, "CLIENTE"],
  [4.78, "ENTRENADOR"],
  [6.06, "CLIENTE"],
  [9.5, "ENTRENADOR"],
  [11.02, "CLIENTE"],
  [14.5, "ENTRENADOR"],
  [16.66, "CLIENTE"],
  [17.3, "ENTRENADOR"],
  [23.18, "CLIENTE"],
  [25.82, "ENTRENADOR"],
  [35.98, "CLIENTE"],
  [38.55, "ENTRENADOR"],
  [49.94, "CLIENTE"],
  [57.06, "ENTRENADOR"],
  [61.66, "YAGO"],
];

const speakerAt = (t: number): Speaker => {
  let s: Speaker = "ENTRENADOR";
  for (const [at, who] of turns) if (t >= at) s = who;
  return s;
};

// Correcciones de la transcripción automática: puntuación, mayúsculas y
// palabras mal reconocidas. El contenido es el que se oye en la toma.
const fixes: Record<string, string> = {
  "16.68": "Sí.",
  "17.32": "¿Estabas",
  "18.64": "trabajo?",
  "19.4": "¿No",
  "19.68": "recuperabas?",
  "23.2": "Bueno,",
  "38.56": "No,",
  "38.96": "solo",
  "44.64": "De",
  "49.24": "recuperas.",
  "36": "Pero",
  "38.04": "rutina?",
  "62.12": "PLAN",
};

// Preguntas que la transcripción dejó sin signo de apertura.
const openQuestion = new Set(["36"]);

// Palabras que se pintan con subrayador al pronunciarse: las que el guion pide
// destacar (E02, E03, E04, E06, E07, E08). Identificadas por su inicio.
const underlined = new Set([
  "7.12",
  "7.36", // el Excel
  "8.04",
  "8.2",
  "8.48",
  "8.72", // el pecho sigue igual
  "11.68", // volumen
  "12.48",
  "12.96", // frecuencia tres
  "13.76",
  "14.04", // drop sets
  "24.32",
  "24.6", // tres vídeos
  "38.96",
  "39.4",
  "39.52",
  "39.6",
  "39.8", // solo lo que haga falta
  "54",
  "54.36", // hacer más
  "54.72",
  "55.12", // hacer menos
  "55.8",
  "56.12",
  "56.2", // dejar de cambiar
  "61.68",
  "62.12", // comenta PLAN
]);

type RawWord = { text: string; start: number; duration: number; eos: boolean };

export const words: Word[] = (
  transcript as { segments: { words: RawWord[] }[] }
).segments
  .flatMap((s) => s.words)
  .map((w) => {
    const id = String(Math.round(w.start * 100) / 100);
    let text = fixes[id] ?? w.text;
    if (openQuestion.has(id)) text = "¿" + text;
    return {
      text,
      start: w.start,
      end: w.start + w.duration,
      speaker: speakerAt(w.start),
      eos: w.eos || /[.?]$/.test(text),
      underline: underlined.has(id),
    };
  });

// --- Planos ----------------------------------------------------------------
// Cortes medidos en el vídeo. «tight» alterna el encuadre base para que cada
// contraplano entre con distinto tamaño.
export type Shot = { start: number; end: number; who: "E" | "C" | "CTA" };

export const shots: Shot[] = [
  { start: 0, end: 3.7, who: "E" },
  { start: 3.7, end: 4.8, who: "C" },
  { start: 4.8, end: 6.3, who: "E" },
  { start: 6.3, end: 9.1, who: "C" },
  { start: 9.1, end: 11.0, who: "E" },
  { start: 11.0, end: 14.4, who: "C" },
  { start: 14.4, end: 16.6, who: "E" },
  { start: 16.6, end: 17.3, who: "C" },
  { start: 17.3, end: 23.1, who: "E" },
  { start: 23.1, end: 25.8, who: "C" },
  { start: 25.8, end: 33.9, who: "E" },
  { start: 33.9, end: 34.3, who: "C" },
  { start: 34.3, end: 34.9, who: "E" },
  { start: 34.9, end: 35.2, who: "C" },
  { start: 35.2, end: 36.0, who: "E" },
  { start: 36.0, end: 38.6, who: "C" },
  { start: 38.6, end: 50.0, who: "E" },
  { start: 50.0, end: 57.1, who: "C" },
  { start: 57.1, end: 61.7, who: "E" },
  { start: 61.7, end: 65.6, who: "CTA" },
];

// Golpes de zoom sobre los momentos clave (además del empuje continuo).
export type Punch = { at: number; amount: number; hold: number };

export const punches: Punch[] = [
  { at: 1.28, amount: 0.05, hold: 2.3 }, // la pregunta del hook
  { at: 7.36, amount: 0.07, hold: 0.8 }, // «el Excel» (E02)
  { at: 8.2, amount: 0.1, hold: 0.9 }, // «el pecho sigue igual»
  { at: 11.68, amount: 0.04, hold: 0.6 },
  { at: 13.76, amount: 0.05, hold: 0.5 }, // «drop sets»
  { at: 16.68, amount: 0.09, hold: 0.6 }, // «Sí.»
  { at: 20.4, amount: 0.05, hold: 2.6 }, // «¿o cambiaste por algo que viste…?»
  { at: 24.32, amount: 0.08, hold: 1.4 }, // «tres vídeos» (E04)
  { at: 28.16, amount: 0.04, hold: 2.0 }, // «pero juntarlas…»
  { at: 36.96, amount: 0.05, hold: 1.5 }, // «¿me vas a cambiar toda la rutina?»
  { at: 38.96, amount: 0.06, hold: 1.2 }, // «solo lo que haga falta» (E06)
  { at: 41.88, amount: 0.04, hold: 2.6 }, // «comprobar cómo respondes»
  { at: 46.52, amount: 0.04, hold: 3.3 }, // «revisaría…»
  { at: 53.28, amount: 0.05, hold: 3.6 }, // «hacer más / menos / dejar de cambiar» (E07)
  { at: 58.28, amount: 0.07, hold: 3.3 }, // «ayudarte a decidir»: cerrar ligeramente (E07)
  { at: 62.12, amount: 0.05, hold: 3.4 }, // «PLAN»
];

// --- Diseño de sonido y transiciones --------------------------------------
// `at` es el momento del IMPACTO en segundos del original; Sound.tsx adelanta
// cada archivo lo necesario para que su pico caiga ahí.

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
  | "stamp";

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
};

// Carpeta de cada efecto: fx/ son los aportados (no se suben al repo),
// ui/ son los sintetizados en audio-src/ui_sfx.py.
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
};

export type Sfx = { at: number; src: FxName | "whoosh"; volume: number };

// Golpes visuales (sacudida + destello) en la apertura.
export const impacts = [1.47, 3.72];

// Cortes con transición de barrido (desenfoque de movimiento + whoosh).
export const whips = [3.7, 6.3, 11.0, 23.1, 25.8, 36.0, 50.0, 57.1, 61.7];

// --- Escenas de motion graphics a pantalla completa ---------------------------
// Durante una escena todo es motion graphics: el fondo texturizado tapa el vídeo
// (la voz sigue sonando) y no se muestran subtítulos.
export type Scene = {
  id: string;
  from: number;
  to: number;
  title: string;
  // "full": todo motion graphics, tapa el vídeo. "overlay": gráficos encima de la persona.
  mode: "full" | "overlay";
};

export const SCENE_IN = 0.42;
export const SCENE_OUT = 0.36;

// Se alternan escenas completas y gráficos sobre la persona; el final es la persona.
// Las salidas de las escenas completas terminan DESPUÉS del corte de cámara
// siguiente (cortes medidos: 14.44, 36.04, 49.96, 57.12), así la cortinilla
// revela directamente el plano nuevo y el corte nunca se ve.
const OUT_AFTER_CUT = (cut: number) => cut + 0.38;

export const scenes: Scene[] = [
  { id: "excel", from: 6.94, to: 9.66, title: "Excel", mode: "overlay" },
  {
    id: "tools",
    from: 11.04,
    to: OUT_AFTER_CUT(14.44),
    title: "Cambios",
    mode: "full",
  },
  { id: "videos", from: 23.2, to: 25.85, title: "Vídeos", mode: "overlay" },
  {
    id: "prio",
    from: 31.8,
    to: OUT_AFTER_CUT(36.04),
    title: "Ajuste",
    mode: "full",
  },
  { id: "falta", from: 38.5, to: 40.75, title: "Falta", mode: "overlay" },
  {
    id: "check",
    from: 44.6,
    to: OUT_AFTER_CUT(49.96),
    title: "Revisar",
    mode: "full",
  },
  {
    id: "options",
    from: 52.2,
    to: OUT_AFTER_CUT(57.12),
    title: "Decidir",
    mode: "full",
  },
  { id: "cta", from: 61.6, to: 65.6, title: "Plan", mode: "overlay" },
];

const isLast = (s: Scene) => s.to >= SOURCE_END - 0.05;

export const sceneAt = (t: number) =>
  scenes.find((s) => t >= s.from && t < s.to);

// Mitad de la entrada y de la salida de cada escena (llevan whoosh salvo que ya tengan golpe).
export const panelIns = scenes.flatMap((s) =>
  isLast(s) ? [s.from + 0.2] : [s.from + 0.2, s.to - 0.18],
);

const designed: Sfx[] = [
  // Hook: captación y retención (los únicos hits y risers del vídeo)
  { at: 1.47, src: "hit", volume: 0.55 },
  { at: 3.72, src: "riser", volume: 0.45 },
  { at: 3.72, src: "hit", volume: 0.4 },
  { at: 3.72, src: "snap", volume: 0.45 },
  { at: 4.8, src: "snap", volume: 0.3 },
  // Remates puntuales: solo snaps
  { at: 8.2, src: "snap", volume: 0.3 },
  { at: 16.68, src: "snap", volume: 0.3 },
];

const near = (list: Sfx[], at: number, gap: number) =>
  list.some((x) => Math.abs(x.at - at) < gap);

// Whooshes en barridos y paneles, alternando las dos muestras.
const whooshes: Sfx[] = [];
for (const at of [...whips, ...panelIns].sort((a, b) => a - b)) {
  if (near(designed, at, 0.35) || near(whooshes, at, 0.5)) continue;
  whooshes.push({ at, src: "whoosh", volume: at < 26 ? 0.45 : 0.32 });
}
whooshes.forEach((w, i) => (w.src = i % 2 === 0 ? "whoosh-a" : "whoosh-b"));

// --- Titulares de las escenas -----------------------------------------------
// Aparecen palabra a palabra (una cada HEADLINE_STAGGER s), con un tic en cada una.
// `at` y `marker` en segundos del original.
export type HeadlineLine = { text: string; at: number; marker?: number };
export const HEADLINE_STAGGER = 0.11;

export const headlines: Record<string, HeadlineLine[]> = {
  excelA: [
    { text: "De momento,", at: 7.2 },
    { text: "el Excel", at: 7.42, marker: 7.62 },
  ],
  excelB: [
    { text: "El pecho", at: 8.12, marker: 8.3 },
    { text: "sigue igual", at: 8.38, marker: 8.56 },
  ],
  tools: [
    { text: "Lo que", at: 11.27 },
    { text: "ha cambiado", at: 11.5 },
  ],
  prio: [
    { text: "Ajustar", at: 32.07 },
    { text: "el trabajo a", at: 32.2 },
  ],
  falta: [
    { text: "Solo lo que", at: 38.91 },
    { text: "haga falta", at: 39.4, marker: 39.62 },
  ],
  check: [
    { text: "Antes de", at: 45.24 },
    { text: "añadir más", at: 45.7 },
  ],
  options: [
    { text: "¿Qué tengo", at: 52.47 },
    { text: "que hacer?", at: 52.75 },
  ],
};

/** Momento (segundos del original) en que aparece cada palabra de cada titular. */
export const headlineWordTimes = Object.values(headlines).flatMap((lines) =>
  lines.flatMap((l) =>
    l.text.split(" ").map((_, i) => l.at + i * HEADLINE_STAGGER),
  ),
);

// Motion graphics: tic en cada palabra de titular, trazo en cada subrayado y pop
// suave en cada elemento que aparece. Tiempos en segundos del original.
const headline = (...at: number[]): Sfx[] =>
  at.map((t) => ({ at: t, src: "tic", volume: 0.3 }));
const headlineMarkers = Object.values(headlines).flatMap((lines) =>
  lines.filter((l) => l.marker !== undefined).map((l) => l.marker as number),
);
const marker = (...at: number[]): Sfx[] =>
  at.map((t) => ({ at: t, src: "marker", volume: 0.4 }));
const pop = (...at: number[]): Sfx[] =>
  at.map((t) => ({ at: t, src: "pop", volume: 0.22 }));

const graphicsSfx: Sfx[] = [
  // titulares: un tic por palabra y el trazo de cada subrayado
  ...headline(...headlineWordTimes),
  ...marker(...headlineMarkers),
  // 01 · Excel → pecho
  { at: 7.36, src: "paper", volume: 0.3 },
  // «sin cambios»: sello y caída de todo
  { at: 8.72, src: "stamp", volume: 0.6 },
  { at: 8.8, src: "whoosh-b", volume: 0.3 },
  ...pop(7.4, 8.25),
  // 02 · lo que ha cambiado
  ...pop(11.62, 12.42, 13.7),
  ...marker(11.74, 12.54, 13.82),
  // 03 · tres vídeos (sobre la persona)
  ...pop(23.47, 23.62, 23.77, 24.32),
  ...headline(24.55),
  ...marker(24.6),
  // 04 · ajustar el trabajo a
  ...pop(33.7, 34.86),
  // 05 · solo lo que haga falta (sobre la persona)
  ...pop(39.7, 39.85),
  // 06 · antes de añadir más
  ...pop(47.07, 47.91, 48.99),
  { at: 47.32, src: "ding", volume: 0.18 },
  { at: 48.16, src: "ding", volume: 0.18 },
  { at: 49.24, src: "ding", volume: 0.18 },
  // 07 · ¿qué tengo que hacer?
  ...pop(52.92, 53.04, 53.16),
  ...pop(54.0, 54.72, 55.8),
  ...marker(54.12, 54.84, 55.92),
  // 08 · CTA minimalista: «Comenta», bocadillo PLAN, «te escribo por privado»
  ...headline(61.68),
  ...pop(62.12),
  { at: 62.64, src: "ding", volume: 0.2 },
];

export const sfx: Sfx[] = [...designed, ...whooshes, ...graphicsSfx];

// --- Páginas de subtítulos ---------------------------------------------------
// Máximo 3 palabras; se corta al final de frase, en coma, al cambiar de
// personaje o si hay una pausa.
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

// --- Hook rotoscopiado ----------------------------------------------------------
// Hasta el primer corte (3,7 s) las palabras de la pregunta aparecen detrás de la
// persona recortada, así que no hay subtítulos.
export const HOOK_END = 3.7;
export const ROTO_FRAMES = 64; // public/roto/p_000.png … desde TRIM

// Una página que empieza durante una escena se muestra en cuanto la escena acaba
// (si aún le quedan palabras por decir); si no, se omite.
export const pageStart = (p: Word[]) => {
  const sc = sceneAt(p[0].start);
  return sc ? sc.to : p[0].start;
};
export const visiblePages = captionPages.filter(
  (p) => p[0].start >= HOOK_END && pageStart(p) < p[p.length - 1].end + 0.1,
);

// TIC en cada palabra que aparece en pantalla (subtítulos y hook).
const tics: Sfx[] = words
  .filter((w) => w.start >= TRIM && !sceneAt(w.start))
  .map((w) => ({ at: w.start, src: "tic" as const, volume: 0.28 }));

export const allSfx: Sfx[] = [...sfx, ...tics];
