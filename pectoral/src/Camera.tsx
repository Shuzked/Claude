import { Video } from "@remotion/media";
import React from "react";
import {
  AbsoluteFill,
  Easing,
  interpolate,
  Sequence,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import faceTrack from "./faceTrack.json";
import { GradeDefs, gradeFilter } from "./Grade";
import { f, FIXED, HOOK, JUMPS, punches, segmentsOut, SHOT_CUTS, toSrc, TRACKS, ZOOMS } from "./timeline";

// Cámara virtual sobre una toma única y fija:
//  1. Encuadre base que alterna (medio / cerrado) en cada corte de pausa: el salto
//     de la toma se convierte en un cambio de plano.
//  2. Empuje lento dentro de cada tramo.
//  3. Golpes de zoom en los remates y en cada revelación.
//  4. Deriva mínima de cámara en mano.
//  5. Tracking de cabeza: la cara se mantiene en el tercio superior.

const ORIGIN = { x: 540, y: 1920 * 0.32 };
const TARGET = { x: 540, y: 640 };
const EDGE_MARGIN = 14;

const track = faceTrack as { fps: number; points: [number, number][] };
// Tracking estabilizado por plano: media móvil de 1,2 s y, como mucho, ±50 px de la
// mediana del plano (evita que la cámara «caiga» cuando el detector se pierde).
const smooth: [number, number][] = (() => {
  const P = track.points;
  const bounds = [0, ...SHOT_CUTS, 1e9].map((s) => Math.round(s * track.fps));
  const out: [number, number][] = P.map((p) => [p[0], p[1]]);
  const half = Math.round(0.6 * track.fps);
  for (let b = 0; b < bounds.length - 1; b++) {
    const a = bounds[b];
    const z = Math.min(P.length, bounds[b + 1]);
    if (z <= a) continue;
    const med = (k: 0 | 1) => {
      const v = P.slice(a, z).map((p) => p[k]).sort((m, n) => m - n);
      return v[Math.floor(v.length / 2)];
    };
    const mx = med(0);
    const my = med(1);
    for (let i = a; i < z; i++) {
      let sx = 0;
      let sy = 0;
      let n = 0;
      for (let j = Math.max(a, i - half); j < Math.min(z, i + half + 1); j++) {
        sx += Math.max(mx - 50, Math.min(mx + 50, P[j][0]));
        sy += Math.max(my - 50, Math.min(my + 50, P[j][1]));
        n++;
      }
      out[i] = [sx / n, sy / n];
    }
  }
  return out;
})();
// en los acercamientos la persona camina: mediana ±0,5 s (quita saltos del detector)
// y media ±0,6 s, sin el límite alrededor de la mediana del plano
const zoomSmooth: [number, number][] = (() => {
  const P = track.points;
  const out: [number, number][] = P.map((p) => [p[0], p[1]]);
  for (const z of ZOOMS) {
    const a = Math.round(z.from * track.fps);
    const b = Math.min(P.length, Math.round(z.to * track.fps));
    const med: [number, number][] = [];
    for (let i = a; i < b; i++) {
      const w = P.slice(Math.max(a, i - 12), Math.min(b, i + 13));
      const m = (k: 0 | 1) => w.map((p) => p[k]).sort((x, y) => x - y)[Math.floor(w.length / 2)];
      med.push([m(0), m(1)]);
    }
    for (let i = a; i < b; i++) {
      const w = med.slice(Math.max(0, i - a - 15), Math.min(med.length, i - a + 16));
      out[i] = [w.reduce((s, p) => s + p[0], 0) / w.length, w.reduce((s, p) => s + p[1], 0) / w.length];
    }
  }
  return out;
})();
const zoomAt = (t: number) => ZOOMS.find((z) => t >= z.from && t < z.to);

const trackAt = (t: number) => {
  const tr = TRACKS.find((x) => t >= x.from && t < x.to);
  return tr ? { x: 540, y: 640, scale: tr.scale } : null;
};

const faceAt = (t: number) => {
  const tp = trackAt(t);
  if (tp) return { x: tp.x, y: tp.y };
  const fx = FIXED.find((x) => t >= x.from && t < x.to);
  if (fx) return { x: fx.face[0], y: fx.face[1] };
  if (zoomAt(t)) {
    const i = Math.min(zoomSmooth.length - 1, Math.max(0, Math.round(t * track.fps)));
    return { x: zoomSmooth[i][0], y: zoomSmooth[i][1] };
  }
  const i = Math.min(smooth.length - 1, Math.max(0, Math.round(t * track.fps)));
  return { x: smooth[i][0], y: smooth[i][1] };
};

const FRAMING = [1.32, 1.6]; // medio, cerrado
// planos donde el corte de pausa no cambia de encuadre (se ve continuo)
const STEADY: [number, number][] = [];
// zoom al antebrazo de la izquierda cuando dice «antebrazo»
const FORE_ZOOM = { at: 1e9, out: 1e9, target: { x: 540, y: 960 }, amount: 0 };

export const cameraAt = (frame: number, fps: number) => {
  const outT = frame / fps;
  const t = toSrc(outT);
  const index = JUMPS.filter((j) => t >= j).length;
  const segStart = index === 0 ? 0 : JUMPS[index - 1];
  const segEnd = index < JUMPS.length ? JUMPS[index] : segStart + 12;
  const progress = Math.min(1, (t - segStart) / Math.max(1, segEnd - segStart));

  const steady = STEADY.find(([a, b]) => t >= a && t < b);
  const base = steady ? FRAMING[0] : FRAMING[index % 2];
  const drift = 0.05 * progress;

  let punch = 0;
  for (const p of punches) {
    const local = (t - p.at) * fps;
    if (local < -1 || t > p.at + p.hold + 0.6) continue;
    const inS = spring({
      frame: local,
      fps,
      config: { damping: 15, stiffness: 160, mass: 0.7 },
    });
    const outS = interpolate(t, [p.at + p.hold, p.at + p.hold + 0.6], [0, 1], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: Easing.inOut(Easing.cubic),
    });
    punch = Math.max(punch, p.amount * inS * (1 - outS));
  }

  // entrada de golpe en el primer fotograma
  const slam = interpolate(frame, [0, 7], [0.2, 0], {
    extrapolateRight: "clamp",
    easing: Easing.bezier(0.16, 1, 0.3, 1),
  });

  // hook exagerado: con 200 kg la cámara tiembla por el esfuerzo y recibe el golpe del
  // peso; con 10 kg flota ligera
  const strain = t < HOOK.light ? interpolate(t, [HOOK.press, HOOK.heavy, HOOK.light - 0.15, HOOK.light], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) : 0;
  const jolt = 0;
  const shakeX = 0.6 * strain * (Math.sin(frame * 2.9) * 5 + Math.sin(frame * 5.3) * 3) + jolt * Math.sin(frame * 3.7) * 26;
  const shakeY = 0.6 * strain * (Math.cos(frame * 3.4) * 4 + Math.sin(frame * 6.1) * 2) + jolt * 34 * Math.cos((t - HOOK.heavy) * 30);
  const float = 0;
  const x = Math.sin(frame / 41) * 6 + Math.sin(frame / 17) * 2 + shakeX;
  const y = Math.cos(frame / 53) * 5 + Math.sin(frame / 23) * 1.5 + shakeY + float;
  const rot = Math.sin(frame / 67) * 0.25 + strain * Math.sin(frame * 2.3) * 0.5 + jolt * 1.2 * Math.sin(frame * 2.1);

  // apertura compuesta: encuadres fijos (general → el que habla)
  const fixed = FIXED.find((x) => t >= x.from && t < x.to);
  const tracked = trackAt(t);
  // zoom suave al antebrazo (muelle de entrada, salida al cortar)
  const zin = spring({ frame: frame - f(FORE_ZOOM.at), fps, config: { damping: 18, stiffness: 120, mass: 0.8 } });
  const zk = t >= FORE_ZOOM.at - 0.05 ? zin : 0;
  const zm = zoomAt(t);
  const zu = zm ? interpolate(t, [zm.from, zm.to], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.inOut(Easing.cubic) }) : 0;
  const scale =
    (zm ? zm.s0 + (zm.s1 - zm.s0) * zu : fixed ? fixed.scale + drift * 0.6 : tracked ? tracked.scale + drift * 0.6 : base + drift) + punch + slam + FORE_ZOOM.amount * zk;

  // barridos en los cortes: desenfoque de movimiento + empujón (como en los anteriores)
  let blur = 0;
  let whipY = 0;
  for (const at of JUMPS) {
    const k = frame - f(at);
    if (k < -3 || k > 6) continue;
    const a = k < 0 ? (k + 3) / 3 : Math.exp(-k / 1.8);
    blur = Math.max(blur, 12 * a);
    whipY += (k < 0 ? -1 : 1) * 36 * a;
  }
  const f0 = faceAt(t);
  const face = zk > 0 ? { x: f0.x + (FORE_ZOOM.target.x - f0.x) * zk * 0.55, y: f0.y + (FORE_ZOOM.target.y - f0.y) * zk * 0.55 } : f0;
  const clampAxis = (tr: number, o: number, size: number) =>
    Math.max(
      -(scale - 1) * (size - o) + EDGE_MARGIN,
      Math.min((scale - 1) * o - EDGE_MARGIN, tr),
    );
  const trX = clampAxis(
    TARGET.x - ORIGIN.x - scale * (face.x - ORIGIN.x),
    ORIGIN.x,
    1080,
  );
  const ty = FIXED.find((x) => t >= x.from && t < x.to)?.ty ?? TARGET.y;
  const trY = clampAxis(
    ty - ORIGIN.y - scale * (face.y - ORIGIN.y),
    ORIGIN.y,
    1920,
  );
  return { scale, x: trX + x, y: trY + y + whipY, rot, t, blur };
};

/** La cámara virtual; `children` va en coordenadas del vídeo (1080×1920) y se mueve
 *  con el encuadre, así los gráficos quedan pegados al cuerpo. */
export const Camera: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { scale, x, y, rot, blur, t } = cameraAt(frame, fps);
  const transform: React.CSSProperties = {
    transform: `translate(${x}px, ${y}px) scale(${scale}) rotate(${rot}deg)`,
    transformOrigin: "50% 32%",
    filter: blur > 0.3 ? `blur(${blur}px)` : undefined,
  };
  return (
    <AbsoluteFill style={{ overflow: "hidden", backgroundColor: "black" }}>
      <GradeDefs />
      <AbsoluteFill style={transform}>
        <AbsoluteFill style={{ filter: gradeFilter(t) }}>
        {segmentsOut.map((s) => (
          <Sequence
            key={s.src}
            from={Math.round(s.out * fps)}
            durationInFrames={
              Math.round((s.out + s.dur) * fps) - Math.round(s.out * fps)
            }
            name={`Toma · ${s.src.toFixed(2)}s`}
          >
            <Video
              src={staticFile("video.mp4")}
              trimBefore={Math.round(s.src * fps)}
              objectFit="cover"
              style={{ width: "100%", height: "100%" }}
            />
          </Sequence>
        ))}
        </AbsoluteFill>
        {children}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

/** Capa en coordenadas del vídeo que se mueve exactamente como la cámara (para poner
 *  recortes por encima de los rótulos, p. ej. la persona delante de la «pizarra»). */
export const CameraSpace: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { scale, x, y, rot } = cameraAt(frame, fps);
  return (
    <AbsoluteFill style={{ overflow: "hidden" }}>
      <AbsoluteFill style={{ transform: `translate(${x}px, ${y}px) scale(${scale}) rotate(${rot}deg)`, transformOrigin: "50% 32%" }}>{children}</AbsoluteFill>
    </AbsoluteFill>
  );
};

/** Punto del vídeo (1080×1920) → punto de la pantalla con la cámara de este fotograma. */
export const toScreen = (frame: number, fps: number, p: { x: number; y: number }) => {
  const { scale, x, y } = cameraAt(frame, fps);
  const o = { x: 540, y: 1920 * 0.32 };
  return { x: o.x + x + scale * (p.x - o.x), y: o.y + y + scale * (p.y - o.y) };
};
