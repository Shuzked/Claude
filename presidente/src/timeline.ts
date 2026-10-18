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

// --- Preguntas del periodista ---------------------------------------------------------
// Voces de Cartesia procesadas como micro de prensa (public/audio/q). a: inicio de la
// respuesta de Yago, end: fin de su respuesta, to: fin del bloque. La pregunta se coloca
// justo antes de la respuesta, dentro del silencio en que Yago escucha.
import qa from "./questions_audio.json";
type QA = { voice: string; start: number; dur: number; len: number; env: number[] };
const QAUD = qa as Record<string, QA>;

export type Q = {
  n: number;
  topic: string;
  text: string;
  a: number;
  end: number;
  to: number;
  key: { text: string; at: number }[];
  push?: number; // acercamiento digital en este instante
  icon?: "clock" | "calendar";
  // calculados
  q: number; // empieza a hablar el periodista (segundo del original)
  file: number; // empieza el archivo de audio
  dur: number;
  voice: string;
  env: number[];
};
type QIn = Omit<Q, "q" | "file" | "dur" | "voice" | "env">;
const PRE_GAP = 0.22; // silencio entre la pregunta y la respuesta
const place = (x: QIn, prevEnd: number): Q => {
  const au = QAUD[String(x.n)];
  const q = Math.max(prevEnd + 0.06, x.a - PRE_GAP - au.dur);
  return { ...x, q, file: q - au.start, dur: au.dur, voice: au.voice, env: au.env };
};
const QIN: QIn[] = [
  { n: 1, topic: "Elevaciones frontales", text: "¿Las elevaciones frontales sobran porque ya hacemos presses?", a: 16.84, end: 21.68, to: 21.9, key: [{ text: "Trabajo recibido + prioridad", at: 20.3 }] },
  { n: 3, topic: "Series rectas vs. drop sets", text: "¿Las series rectas hacen crecer más que los drop sets?", a: 26.0, end: 29.52, to: 29.72, key: [{ text: "Pueden ahorrar tiempo", at: 28.5 }], push: 26.0, icon: "clock" },
  { n: 4, topic: "Días consecutivos", text: "¿Entrenar el mismo músculo dos días seguidos impide que crezca?", a: 33.32, end: 36.6, to: 36.82, key: [{ text: "Importa la dosis, no solo el calendario", at: 35.2 }], icon: "calendar" },
  { n: 5, topic: "Straps", text: "¿Usar straps para levantar más peso no es hacer trampa?", a: 40.56, end: 44.32, to: 44.52, key: [{ text: "Espalda ≠ competición de agarre", at: 42.8 }] },
  { n: 6, topic: "Volumen de entrenamiento", text: "¿Para ganar más músculo siempre es mejor hacer menos series?", a: 48.72, end: 53.16, to: 53.4, key: [{ text: "Más puede aportar más", at: 50.0 }, { text: "Con rendimientos decrecientes", at: 51.3 }] },
  { n: 7, topic: "Cardio", text: "¿Para ganar músculo hay que dejar el cardio?", a: 57.28, end: 60.64, to: 60.84, key: [{ text: "Dosis + organización", at: 59.2 }], push: 57.28 },
  { n: 8, topic: "Llegar al fallo", text: "¿Toda serie que no llegue al fallo es una serie perdida?", a: 63.52, end: 66.96, to: 67.22, key: [{ text: "Crecer sin llegar", at: 64.6 }, { text: "Menos fatiga", at: 66.0 }] },
];
export const HOOK = { from: 2.12, to: 8.32, end: 8.2 };
export const QUESTIONS: Q[] = (() => {
  const out: Q[] = [];
  let prev = HOOK.end;
  for (const x of QIN) {
    const q = place(x, prev);
    out.push(q);
    prev = x.end;
  }
  return out;
})();
const CLOSE_IN = { n: 9, text: "Menuda mierda de presidente… ¿Entonces qué promete tu programa electoral?", a: 71.84, cta: 75.52, to: 77.98 };
export const CLOSE = (() => {
  const au = QAUD["9"];
  const q = Math.max(66.96 + 0.06, CLOSE_IN.a - 0.45 - au.dur); // pausa cómica breve antes de «Milagros, no»
  return { ...CLOSE_IN, q, file: q - au.start, dur: au.dur, voice: au.voice, env: au.env };
})();

// --- Montaje: tramos del original (Yago escucha un instante antes de que hable el periodista)
const LEAD = 0.5;
export const SEGMENTS: [number, number][] = (() => {
  const raw: [number, number][] = [[HOOK.from, HOOK.to]];
  for (const q of QUESTIONS) raw.push([q.q - LEAD, q.to]);
  raw.push([CLOSE.q - LEAD, CLOSE.to]);
  const out: [number, number][] = [];
  for (const [a, b] of raw) {
    const last = out[out.length - 1];
    if (last && a <= last[1] + 0.04) last[1] = Math.max(last[1], b);
    else out.push([a, b]);
  }
  return out;
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
