// Mapa de edición de «La rutina optimizada».
// Todos los tiempos están en segundos sobre el vídeo de public/video.mp4.
//
// "verificado": el tiempo cuadra con el corte de plano y las pausas de voz.
// "estimado":   no hay transcripción todavía; el texto es el del guion y el tiempo
//               se ha repartido por la duración del bloque. Revisar con el audio.

export type Speaker = "ENTRENADOR" | "CLIENTE" | "YAGO";

export type Line = {
  speaker: Speaker;
  start: number;
  end: number;
  text: string;
  status: "verificado" | "estimado";
  // Muestra la etiqueta del personaje (solo en su primera intervención, E01).
  label?: boolean;
};

export type Callout = {
  // Palabras que aparecen en una misma línea, una tras otra.
  words: { text: string; at: number }[];
  end: number;
  // "joke" para los remates (E02, E04), "neutral" para el resto.
  tone: "joke" | "neutral" | "cta";
  sub?: string;
};

export const FPS = 25;
export const DURATION_SECONDS = 65.6;

export const lines: Line[] = [
  // Hook · E01
  { speaker: "ENTRENADOR", start: 1.35, end: 3.5, text: "¿Por qué has vuelto a cambiar la rutina?", status: "verificado", label: true },
  { speaker: "CLIENTE", start: 3.8, end: 4.6, text: "Para optimizarla.", status: "verificado", label: true },
  { speaker: "ENTRENADOR", start: 4.8, end: 6.3, text: "¿Y qué has optimizado?", status: "verificado" },
  // E02
  { speaker: "CLIENTE", start: 6.3, end: 9.8, text: "De momento, el Excel. El pecho sigue igual.", status: "verificado" },
  // Desarrollo · E03
  { speaker: "ENTRENADOR", start: 10.4, end: 11.9, text: "Vale. ¿Qué has cambiado?", status: "verificado" },
  { speaker: "CLIENTE", start: 11.9, end: 14.1, text: "Más volumen, frecuencia tres y drop sets.", status: "verificado" },
  { speaker: "ENTRENADOR", start: 14.6, end: 16.4, text: "¿Y cuál de esas cosas necesitabas?", status: "verificado" },
  { speaker: "CLIENTE", start: 16.8, end: 17.1, text: "Sí.", status: "verificado" },
  // E04
  { speaker: "ENTRENADOR", start: 17.4, end: 22.9, text: "¿Hacías poco trabajo? ¿No recuperabas? ¿O cambiaste por lo que viste en un vídeo?", status: "verificado" },
  { speaker: "CLIENTE", start: 23.3, end: 25.5, text: "Por tres vídeos, en realidad.", status: "verificado" },
  // Cambio de tono · bloque largo del entrenador sin pausas: reparto estimado
  { speaker: "ENTRENADOR", start: 25.9, end: 30.0, text: "Vale. Tu rutina puede tener buenas ideas, pero juntarlas no significa que encajen contigo.", status: "estimado" },
  { speaker: "ENTRENADOR", start: 30.0, end: 35.7, text: "Antes de añadir más, revisaría tus registros, cómo ejecutas y cómo te recuperas. Después ajustaría el trabajo a tus prioridades y al tiempo que tienes.", status: "estimado" },
  // E06
  { speaker: "CLIENTE", start: 36.1, end: 38.4, text: "Entonces, ¿me vas a cambiar toda la rutina?", status: "verificado" },
  { speaker: "ENTRENADOR", start: 38.6, end: 40.4, text: "Solo lo que haga falta.", status: "estimado" },
  { speaker: "ENTRENADOR", start: 40.4, end: 44.2, text: "Y comprobaría cómo respondes antes de volver a tocarla.", status: "estimado" },
  // 44.7–49.8: el entrenador sigue hablando y esa parte no está en el guion.
  // Sin subtítulo hasta tener la transcripción.
  // Cierre · E07
  { speaker: "CLIENTE", start: 50.1, end: 56.9, text: "Es que entreno en serio, pero ya no sé si necesito hacer más, hacer menos o dejar de cambiar cosas.", status: "estimado" },
  { speaker: "ENTRENADOR", start: 57.1, end: 61.6, text: "Eso es lo que quiero ayudarte a decidir. No darte otra rutina para que vuelvas a adivinar.", status: "estimado" },
  // E08 · CTA a cámara
  { speaker: "YAGO", start: 61.8, end: 65.3, text: "Comenta PLAN y te escribo por privado para contarte cómo puedo ayudarte.", status: "estimado" },
];

export const callouts: Callout[] = [
  // E02: solo al pronunciarlos
  { words: [{ text: "EL EXCEL", at: 7.0 }], end: 7.9, tone: "joke" },
  { words: [{ text: "EL PECHO SIGUE IGUAL", at: 8.1 }], end: 10.0, tone: "joke" },
  // E03: en una misma línea, sin cruces
  {
    words: [
      { text: "VOLUMEN", at: 12.1 },
      { text: "FRECUENCIA 3", at: 12.7 },
      { text: "DROP SETS", at: 13.5 },
    ],
    end: 14.4,
    tone: "neutral",
  },
  // E04: después de que empiece a decirlo
  { words: [{ text: "TRES VÍDEOS", at: 23.8 }], end: 25.6, tone: "joke" },
  // E06
  { words: [{ text: "SOLO LO QUE HAGA FALTA", at: 38.8 }], end: 41.0, tone: "neutral" },
  // E07
  {
    words: [
      { text: "HACER MÁS", at: 54.9 },
      { text: "HACER MENOS", at: 55.6 },
      { text: "DEJAR DE CAMBIAR", at: 56.2 },
    ],
    end: 57.1,
    tone: "neutral",
  },
  // E08
  { words: [{ text: "COMENTA PLAN", at: 62.0 }], end: 65.6, tone: "cta", sub: "Te escribo por privado" },
];

// E02: acercamiento digital suave en «el Excel».
export const zooms = [{ start: 6.6, peak: 7.4, end: 9.8, scale: 1.08 }];
