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
export const f = (sourceSeconds: number) => Math.round((sourceSeconds - TRIM) * FPS);

export type Speaker = "ENTRENADOR" | "CLIENTE" | "YAGO";

export type Word = {
  text: string;
  start: number;
  end: number;
  speaker: Speaker;
  // Fin de frase: los subtítulos no juntan palabras de frases distintas.
  eos: boolean;
  // Palabra clave: va en verde aunque no sea la que suena.
  key?: boolean;
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

const keywords = new Set([
  "excel,",
  "pecho",
  "igual.",
  "volumen.",
  "frecuencia",
  "tres",
  "drop",
  "sets.",
  "realmente",
  "vídeos,",
  "funcionar.",
  "prioridades",
  "tiempo",
  "toda",
  "falta.",
  "comprobar",
  "registros,",
  "ejecutas,",
  "recuperas.",
  "serio",
  "más,",
  "menos",
  "cambiar",
  "decidir,",
  "adivinar.",
  "plan",
  "privado",
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
    const speaker = speakerAt(w.start);
    // «tres» solo es clave en «frecuencia tres» y «tres vídeos».
    const lower = text.toLowerCase();
    return {
      text,
      start: w.start,
      end: w.start + w.duration,
      speaker,
      eos: w.eos || /[.?]$/.test(text),
      key:
        keywords.has(lower) &&
        !((lower === "cambiar" || lower === "más,") && w.start < 50),
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

// Efectos de sonido. Desde 25,84 (cambio de tono, E04) se reducen.
export type Sfx = { at: number; src: string; volume: number };

export const sfx: Sfx[] = [
  { at: 3.72, src: "swipe", volume: 0.25 },
  { at: 7.3, src: "keys", volume: 0.45 },
  { at: 8.2, src: "whoosh", volume: 0.28 },
  { at: 8.72, src: "thump", volume: 0.5 },
  { at: 11.68, src: "pop", volume: 0.35 },
  { at: 12.48, src: "pop", volume: 0.35 },
  { at: 13.76, src: "pop", volume: 0.4 },
  { at: 16.68, src: "pop-low", volume: 0.35 },
  { at: 24.32, src: "pop", volume: 0.3 },
  { at: 24.5, src: "pop", volume: 0.3 },
  { at: 24.68, src: "pop", volume: 0.3 },
  { at: 33.76, src: "tick", volume: 0.25 },
  { at: 34.92, src: "tick", volume: 0.25 },
  { at: 38.96, src: "swipe", volume: 0.2 },
  { at: 47.32, src: "tick", volume: 0.3 },
  { at: 48.16, src: "tick", volume: 0.3 },
  { at: 49.24, src: "tick", volume: 0.3 },
  { at: 54.0, src: "tick", volume: 0.25 },
  { at: 54.72, src: "tick", volume: 0.25 },
  { at: 55.8, src: "tick", volume: 0.25 },
  { at: 62.12, src: "ding", volume: 0.35 },
];
