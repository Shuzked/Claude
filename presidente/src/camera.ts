// Cámara virtual: sigue la cara de Yago y mete zooms puntuales para dar dinamismo.
// Plano abierto (sala de prensa) cuando pregunta el periodista; al responder, acercamientos
// suaves o golpes de zoom en los remates. No siempre: hay respuestas que se quedan abiertas.
import faces from "./faces.json";
import { CLOSE, HOOK, QUESTIONS, SEGMENTS } from "./timeline";
import { FPS, HEIGHT, WIDTH } from "./theme";

const F = faces as unknown as Record<string, [number, number, number]>;
const N = 1950;
// cara suavizada (media de ±6 fotogramas) para que la cámara no tiemble
const raw: ([number, number, number] | null)[] = Array.from({ length: N }, (_, i) => F[String(i)] ?? null);
const smooth: [number, number, number][] = raw.map((_, i) => {
  let sx = 0, sy = 0, sh = 0, k = 0;
  for (let j = i - 6; j <= i + 6; j++) {
    const v = raw[Math.max(0, Math.min(N - 1, j))];
    if (v) { sx += v[0]; sy += v[1]; sh += v[2]; k++; }
  }
  return k ? [sx / k, sy / k, sh / k] : [540, 640, 300];
});
export const faceAt = (t: number) => {
  const x = Math.max(0, Math.min(N - 1.001, t * FPS));
  const i = Math.floor(x), fr = x - i;
  const a = smooth[i], b = smooth[i + 1];
  return { x: a[0] + (b[0] - a[0]) * fr, y: a[1] + (b[1] - a[1]) * fr, h: a[2] + (b[2] - a[2]) * fr };
};

// Claves de zoom (segundos del original): s = escala, d = duración de la transición.
type Key = { t: number; s: number; d: number };
const q = (n: number) => QUESTIONS.find((x) => x.n === n)!;
const isCut = (t: number) => SEGMENTS.some(([a]) => Math.abs(a - t) < 0.01);
const keys: Key[] = [
  { t: HOOK.from, s: 1.0, d: 0 },
  { t: 2.6, s: 1.14, d: 3.2 }, // empuje lento en «me presento a presidente de la hipertrofia»
  { t: 7.22, s: 1.3, d: 0.18 }, // golpe en «Primera pregunta»
];
for (const x of QUESTIONS) {
  const st = x.q - 0.5;
  keys.push({ t: st, s: 1.0, d: isCut(st) ? 0 : 0.45 }); // abre a la sala cuando pregunta el periodista
  keys.push({ t: x.q, s: 1.04, d: 2.5 });
}
// respuestas: unas suaves, otras con golpe en el remate
keys.push(
  { t: q(1).a, s: 1.16, d: 0.7 },
  { t: q(3).a, s: 1.32, d: 0.16 }, // «No necesariamente»
  { t: q(4).a, s: 1.1, d: 0.9 },
  { t: q(5).a, s: 1.12, d: 0.7 },
  { t: 42.76, s: 1.34, d: 0.16 }, // «no que compita el agarre»
  { t: q(6).a, s: 1.13, d: 0.9 },
  { t: q(7).a, s: 1.3, d: 0.16 }, // «No.»
  { t: q(8).a, s: 1.15, d: 0.8 },
  { t: CLOSE.q - 0.5, s: 1.0, d: 0.45 },
  { t: CLOSE.q, s: 1.05, d: 3 },
  { t: CLOSE.a, s: 1.2, d: 0.18 }, // «Milagros, no»
  { t: CLOSE.cta, s: 1.3, d: 1.4 }, // «Mejor no me votes: sígueme»
);
keys.sort((a, b) => a.t - b.t);

const easeOut = (x: number) => 1 - Math.pow(1 - x, 3);
const scaleAt = (t: number) => {
  let v = 1;
  for (const k of keys) {
    if (t < k.t) break;
    const p = k.d <= 0 ? 1 : Math.min(1, (t - k.t) / k.d);
    v = v + (k.s - v) * easeOut(p);
  }
  return v;
};

const CX = WIDTH / 2, CY = HEIGHT / 2;
const TARGET = { x: 540, y: 700 }; // dónde queda la cara cuando hay zoom
/** Transformación de cámara en el instante t (origen en el centro del cuadro). */
export const camAt = (t: number) => {
  const s = scaleAt(t);
  const fc = faceAt(t);
  const w = Math.max(0, Math.min(1, (s - 1) / 0.15));
  let tx = (TARGET.x - ((fc.x - CX) * s + CX)) * w;
  let ty = (TARGET.y - ((fc.y - CY) * s + CY)) * w;
  const mx = ((s - 1) * WIDTH) / 2, my = ((s - 1) * HEIGHT) / 2;
  tx = Math.max(-mx, Math.min(mx, tx));
  ty = Math.max(-my, Math.min(my, ty));
  return { s, tx, ty };
};
/** Punto del original → posición en pantalla con la cámara aplicada. */
export const toScreen = (t: number, x: number, y: number) => {
  const c = camAt(t);
  return { x: (x - CX) * c.s + CX + c.tx, y: (y - CY) * c.s + CY + c.ty, s: c.s };
};
