import pose from "./pose.json";

// Pose por fotograma (MediaPipe, suavizada): caderas, rodillas, tobillos, codos,
// muñecas, índices, nariz y ojos, en coordenadas del vídeo 1080×1920.
export type Pt = [number, number, number];
export type Pose = Record<
  | "lh"
  | "rh"
  | "lk"
  | "rk"
  | "la"
  | "ra"
  | "nose"
  | "le"
  | "re"
  | "lw"
  | "rw"
  | "li"
  | "ri"
  | "ley"
  | "rey",
  Pt
>;

const frames = (
  pose as unknown as { fps: number; frames: Record<string, Pose> }
).frames;

/** Pose en el segundo `t` del original (null si no hay detección). */
export const poseAt = (t: number): Pose | null =>
  frames[String(Math.round(t * 25))] ?? null;
