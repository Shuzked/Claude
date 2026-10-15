// Línea de tiempo de «Parciales» (Yago, Heracles Fit).
//
// Todos los tiempos están en segundos del vídeo ORIGINAL (public/video.mp4) y
// salen de la transcripción por palabra (transcript.json). La voz arranca en el
// primer fotograma, así que no se recorta nada.

import transcript from "./transcript.json";
import { FPS } from "./theme";

export const TRIM = 0;
export const SOURCE_END = 74.6;
export const DURATION_FRAMES = Math.round((SOURCE_END - TRIM) * FPS);

/** Segundo del original -> fotograma de la composición. */
export const f = (sourceSeconds: number) =>
  Math.round((sourceSeconds - TRIM) * FPS);

export type Speaker = "YAGO" | "CTA";

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

// Correcciones de la transcripción automática (puntuación, tildes y la palabra
// que queda cortada en el corte de 21,76 s). Identificadas por su inicio.
const fixes: Record<string, string> = {
  "19.04": "comienzo,",
  "21.16": "final.",
  "21.88": "Las",
  "22.04": "parciales",
  "22.48": "al",
  "47": "qué",
  "57.8": "cuándo",
  "67.48": "decidir.",
};
const dropped = new Set(["21.68"]); // «por»: arrastre del corte

// Destacados del guion que van en subtítulos (el resto va en los gráficos).
const underlined = new Set([
  "33.36",
  "33.76", // lo realmente interesante
  "56",
  "56.76",
  "57.08", // una decisión más importante (E07)
]);

type RawWord = { text: string; start: number; duration: number; eos: boolean };

const CTA_AT = 71.7;

export const words: Word[] = (
  transcript as { segments: { words: RawWord[] }[] }
).segments
  .flatMap((s) => s.words)
  .filter((w) => !dropped.has(String(Math.round(w.start * 100) / 100)))
  .map((w) => {
    const id = String(Math.round(w.start * 100) / 100);
    const text = fixes[id] ?? w.text;
    return {
      text,
      start: w.start,
      end: w.start + w.duration,
      speaker: w.start >= CTA_AT ? "CTA" : "YAGO",
      eos: w.eos || /[.?]$/.test(text),
      underline: underlined.has(id),
    };
  });

// --- Planos ----------------------------------------------------------------
// Cortes medidos en el vídeo (ffmpeg scene > 0.18).
export type Shot = { start: number; end: number; who: "E" | "C" | "CTA" };

const CUTS = [
  0,
  1.84,
  5.48,
  8.72,
  11.96,
  16.44,
  21.76,
  27.64,
  32.44,
  40.08,
  43.84,
  49.64,
  57.84,
  65.2,
  71.72,
  SOURCE_END,
];
export const shots: Shot[] = CUTS.slice(0, -1).map((start, i) => ({
  start,
  end: CUTS[i + 1],
  who: start >= 71.7 ? "CTA" : i % 2 ? "C" : "E",
}));

// Golpes de zoom sobre los momentos clave (además del empuje continuo).
export type Punch = { at: number; amount: number; hold: number };

export const punches: Punch[] = [
  { at: 0.04, amount: 0.04, hold: 1.6 }, // hook
  { at: 4.16, amount: 0.07, hold: 1.2 }, // «más detalle en tus piernas»
  { at: 33.36, amount: 0.07, hold: 1.0 }, // «lo realmente interesante»
  { at: 41.28, amount: 0.04, hold: 0.9 }, // «la conclusión…»
  { at: 50.92, amount: 0.04, hold: 2.8 }, // «una repetición incompleta…»
  { at: 55.4, amount: 0.07, hold: 2.6 }, // «te falta una decisión más importante» (E07)
  { at: 65.44, amount: 0.04, hold: 2.3 }, // «pues justo esto…»
  { at: 71.76, amount: 0.05, hold: 2.6 }, // CTA
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
  | "stamp"
  | "boing"
  | "buzzer"
  | "trombone"
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
  boing: 0.01,
  buzzer: 0.01,
  trombone: 0.03,
  shine: 0.08,
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
  boing: "ui",
  buzzer: "ui",
  trombone: "ui",
  shine: "ui",
};

export type Sfx = { at: number; src: FxName | "whoosh"; volume: number };

// Golpes visuales (sacudida) en la apertura.
export const impacts = [1.32, 1.84];

// Cortes con transición de barrido (desenfoque de movimiento + whoosh). Los cortes
// que quedan tapados por una escena completa no llevan barrido.
export const whips = [
  1.84, 5.48, 8.72, 21.76, 32.44, 43.84, 49.64, 57.84, 65.2, 71.72,
];

// --- Escenas de motion graphics ---------------------------------------------
export type Scene = {
  id: string;
  from: number;
  to: number;
  title: string;
  // "full": todo motion graphics, tapa el vídeo. "overlay": gráficos encima de la persona.
  mode: "full" | "overlay";
  // velo oscuro bajo los gráficos sobre la persona (por defecto sí)
  scrim?: boolean;
};

export const SCENE_IN = 0.42;
export const SCENE_OUT = 0.36;

// Las salidas de las escenas completas terminan DESPUÉS del corte siguiente, así la
// cortinilla revela directamente el plano nuevo y el corte no se ve.
const OUT_AFTER_CUT = (cut: number) => cut + 0.38;

export const scenes: Scene[] = [
  // rótulos mínimos mientras brilla el músculo (sin velo: se ve la persona)
  // el estudio enlaza con las tres formas en la misma escena a pantalla completa
  {
    id: "study",
    from: 12.1,
    to: OUT_AFTER_CUT(21.76),
    title: "Estudio",
    mode: "full",
  },
  {
    id: "master",
    from: 68.05,
    to: 71.68,
    title: "Masterclass",
    mode: "overlay",
  },
  { id: "cta", from: 71.72, to: SOURCE_END, title: "Comenta", mode: "overlay" },
];

const isLast = (s: Scene) => s.to >= SOURCE_END - 0.05;

export const sceneAt = (t: number) =>
  scenes.find((s) => t >= s.from && t < s.to);

// Mitad de la entrada y de la salida de cada escena completa (llevan whoosh).
export const panelIns = scenes
  .filter((s) => s.mode === "full")
  .flatMap((s) => (isLast(s) ? [s.from + 0.2] : [s.from + 0.2, s.to - 0.18]));

const designed: Sfx[] = [
  // Hook: captación (los únicos hits y risers del vídeo)
  { at: 0.04, src: "hit", volume: 0.45 },
  { at: 1.32, src: "riser", volume: 0.4 },
  { at: 1.32, src: "hit", volume: 0.55 },
  { at: 1.84, src: "snap", volume: 0.45 },
  { at: 1.84, src: "hit", volume: 0.35 },
  // remates puntuales: solo snaps
  { at: 4.16, src: "snap", volume: 0.3 },
  { at: 33.36, src: "snap", volume: 0.3 },
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
export type HeadlineLine = { text: string; at: number; marker?: number };
export const HEADLINE_STAGGER = 0.11;

export const headlines: Record<string, HeadlineLine[]> = {
  study: [{ text: "Este estudio", at: 12.25 }],
  studySerie: [
    { text: "Desde el inicio", at: 15.16, marker: 15.5 },
    { text: "de la serie", at: 15.84, marker: 16.08 },
  ],
};

/** Momento (segundos del original) en que aparece cada palabra de cada titular. */
export const headlineWordTimes = Object.values(headlines).flatMap((lines) =>
  lines.flatMap((l) =>
    l.text.split(" ").map((_, i) => l.at + i * HEADLINE_STAGGER),
  ),
);

const headline = (...at: number[]): Sfx[] =>
  at.map((t) => ({ at: t, src: "tic", volume: 0.3 }));
const headlineMarkers = Object.values(headlines).flatMap((lines) =>
  lines.filter((l) => l.marker !== undefined).map((l) => l.marker as number),
);
const marker = (...at: number[]): Sfx[] =>
  at.map((t) => ({ at: t, src: "marker", volume: 0.4 }));
const pop = (...at: number[]): Sfx[] =>
  at.map((t) => ({ at: t, src: "pop", volume: 0.22 }));

// Momentos de los gráficos (compartidos con Graphics.tsx).
export const T = {
  context: 12.92,
  forms: [16.48, 17.96, 20.12], // «ejecución normal», «rango parcial al comienzo», «…al final»
  rfSub: 24.12,
  vlSub: 29.84,
  tramoFinal: 35.64,
  tramoInitial: 39.28,
  master: 68.2,
  comenta: 71.76,
  keyword: 72.4,
};

// Foto de Yago en el escenario con el recto femoral señalado («…de tu recto femoral»)
export const PHOTO_RF = { from: 7.6, to: 10.3 };
// El paper real (Pedrosa et al., 2021) en la escena del estudio: entra en
// «…formas de hacer» y resalta «knee extension exercise» en «extensión de rodilla»
export const PAPER_AT = { at: 13.6, mark: 14.84, out: 16.4 };

// --- Tarjeta anatómica (como en las referencias) --------------------------------
// Mientras brilla el músculo, abajo sale una tarjeta con la pierna y el músculo en
// verde. No tapa los subtítulos.
export const anatomyCards = [
  { from: 10.32, to: 11.9, muscle: "rf" as const, title: "Recto femoral" },
  {
    from: 24.96,
    to: 27.6,
    muscle: "rf" as const,
    title: "Recto femoral",
    sub: "▲ Más crecimiento",
    subAt: 25.3,
  },
  {
    from: 28.84,
    to: 32.4,
    muscle: "vl" as const,
    title: "Vasto lateral",
    sub: "Sin ventaja detectada",
    subAt: 29.84,
  },
];

// --- Músculo encendido -------------------------------------------------------
// La rotoscopia del muslo (public/glow/g_NNNN.png, piel teñida de verde) se
// enciende, brilla un momento y se apaga. Mientras, la cámara se acerca al muslo.
export type Glow = { at: number; end: number };
// El cliente hará el brillo del músculo por su cuenta: sin capa de brillo.
export const glows: Glow[] = [];
/** Fotogramas con capa de brillo generada (segundos del original). */
export const GLOW_FRAMES: [number, number][] = [];

// Encuadres: «thighs» = muslos, «legs» = piernas enteras (se ve el movimiento),
// «face» = cara (nariz de la pose), «left» = persona a la izquierda para la lista.
export type Focus = {
  from: number;
  to: number;
  zoom: number;
  on: "thighs" | "legs" | "face" | "left";
};
export const focuses: Focus[] = [
  { from: 10.15, to: 11.9, zoom: 1.4, on: "thighs" },
  { from: 24.85, to: 26.7, zoom: 1.6, on: "thighs" },
  { from: 28.75, to: 30.5, zoom: 1.45, on: "thighs" },
  { from: 34.55, to: 40.1, zoom: 1.3, on: "legs" },
  { from: 40.15, to: 42.32, zoom: 1.55, on: "face" },
  { from: 42.3, to: 43.84, zoom: 1.32, on: "face" }, // el doble: la pose ya es la suya
  { from: 57.84, to: 65.15, zoom: 1.08, on: "left" },
];

// --- El doble -----------------------------------------------------------------
// Aparece de golpe: esa parte va en blanco y negro y el de atrás desenfocado
// (public/bgblur).
export const DOUBLE = {
  from: 42.3,
  to: 43.84,
};

// --- Recorrido sobre sus piernas (0:34–0:40) -----------------------------------
// Mientras hace la extensión: palos sobre muslo y pierna, ángulo en vivo de la
// rodilla y el tramo del que habla marcado alrededor de la rodilla.
export const LEG_ROM = {
  from: 34.6,
  to: 40.08,
  zones: [
    { at: 34.88, from: 65, to: 30, label: "Parcial final" }, // «las parciales al final…»
    { at: 39.28, from: 100, to: 65, label: "Parcial inicial" }, // «…que las del comienzo»
  ],
};

// --- Hologramas en las manos (0:45) ------------------------------------------
export const HOLO = {
  a: { at: 45.04, hand: "l" as const }, // «qué parte del recorrido»
  grab: { at: 46.72, hand: "r" as const }, // coge algo de la otra mano: puntito de luz
  b: { at: 47.42, hand: "r" as const }, // abre la mano: proyecta «qué músculo»
  collapse: [49.0, 49.45] as [number, number], // junta las manos: se recogen en las palmas
};

// --- Lista de la parte final (0:57) --------------------------------------------
export const listItems = [
  { at: 58.0, text: "Utilización" }, // «cuándo utilizarla»
  { at: 59.12, text: "Sustituir o añadir" }, // «si sustituye… o si tiene sentido añadirla»
  { at: 63.68, text: "Encajar" }, // «cómo encajar todo esto en tu rutina»
];
export const LIST_END = 65.12;

const graphicsSfx: Sfx[] = [
  ...headline(...headlineWordTimes),
  ...marker(...headlineMarkers),
  { at: PHOTO_RF.from + 0.05, src: "paper", volume: 0.25 },
  { at: PHOTO_RF.from + 0.3, src: "marker", volume: 0.2 },
  { at: PHOTO_RF.from + 1.05, src: "pop", volume: 0.22 },
  { at: PAPER_AT.at, src: "paper", volume: 0.25 },
  { at: PAPER_AT.mark, src: "marker", volume: 0.35 },
  // estudio y las tres formas
  ...pop(T.context, ...T.forms),
  { at: T.forms[2] + 0.5, src: "paper", volume: 0.2 },
  // el músculo se enciende
  ...pop(T.rfSub, T.vlSub),
  // el doble
  { at: DOUBLE.from, src: "whoosh-a", volume: 0.3 },
  // recorrido sobre las piernas
  ...LEG_ROM.zones.map((z) => ({
    at: z.at,
    src: "pop" as const,
    volume: 0.28,
  })),
  // hologramas
  { at: HOLO.a.at, src: "shine", volume: 0.35 },
  { at: HOLO.grab.at, src: "pop", volume: 0.2 },
  { at: HOLO.b.at, src: "shine", volume: 0.35 },
  { at: HOLO.collapse[0] + 0.15, src: "whoosh-b", volume: 0.18 },
  // lista
  ...listItems.map((l) => ({ at: l.at, src: "pop" as const, volume: 0.28 })),
  // masterclass
  ...headline(T.master, T.master + 0.6),
  { at: T.master + 0.7, src: "ding", volume: 0.18 },
  // CTA
  ...headline(T.comenta),
  ...pop(T.keyword),
  { at: T.keyword + 0.6, src: "ding", volume: 0.2 },
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
// Primer plano (hasta el corte de 1,84 s): «ESTAS REPETICIONES PARECEN» detrás de la
// persona recortada y «¿TRAMPA?» delante, por debajo de la cara. Sin subtítulos.
export const HOOK_END = 1.84;
export const ROTO_FRAMES = 47; // public/roto/p_000.png …

// Una página que empieza durante una escena se muestra en cuanto la escena acaba
// (si aún le quedan palabras por decir); si no, se omite.
export const pageStart = (p: Word[]) => {
  const sc = sceneAt(p[0].start);
  return Math.max(HOOK_END, sc ? sc.to : p[0].start);
};
export const visiblePages = captionPages.filter(
  (p) =>
    p[p.length - 1].end > HOOK_END && pageStart(p) < p[p.length - 1].end + 0.1,
);

// TIC solo en las palabras del hook; los subtítulos van sin tic (feedback del cliente).
const tics: Sfx[] = words
  .filter((w) => w.start < 1.7)
  .map((w) => ({ at: w.start, src: "tic" as const, volume: 0.28 }));

export const allSfx: Sfx[] = [...sfx, ...tics];
