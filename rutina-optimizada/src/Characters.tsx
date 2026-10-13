import React from "react";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { GREEN } from "./theme";

// Personajes planos estilo «blob»: entrenador (camiseta blanca, barba) y cliente
// (sudadera azul marino). Sin contorno, colores planos con una sombra suave de
// forma; parpadean, respiran y reaccionan. Lienzo 260×380.

export type Mood = "neutral" | "happy" | "doubt" | "o" | "smug";
export type Pose = "rest" | "laptop" | "phone" | "shrug" | "point" | "think";

const SKIN = "#E9B48C";
const SKIN_SHADE = "#D79C72";
const HAIR = "#1E1E1E";
const INK_C = "#1A1A1A";

type Look = { shirt: string; shirtShade: string; collar: string; beard: boolean };

const LOOKS: Record<"trainer" | "client", Look> = {
  trainer: { shirt: "#F7F7F4", shirtShade: "#DCDCD6", collar: GREEN, beard: true },
  client: { shirt: "#24304D", shirtShade: "#1A2338", collar: "#3A4A73", beard: true },
};

const Mouth: React.FC<{ mood: Mood; talk: number }> = ({ mood, talk }) => {
  const open = 2 + 7 * talk;
  switch (mood) {
    case "happy":
      return <path d={`M 112 132 Q 130 ${146 + open * 0.4} 148 132`} fill="none" stroke={INK_C} strokeWidth={5} strokeLinecap="round" />;
    case "doubt":
      return <path d="M 114 138 Q 126 132 146 136" fill="none" stroke={INK_C} strokeWidth={5} strokeLinecap="round" />;
    case "o":
      return <ellipse cx={130} cy={138} rx={7} ry={6 + talk * 3} fill={INK_C} />;
    case "smug":
      return <path d="M 116 136 Q 134 142 146 130" fill="none" stroke={INK_C} strokeWidth={5} strokeLinecap="round" />;
    default:
      return <ellipse cx={130} cy={136} rx={11} ry={open / 2 + 1.5} fill={INK_C} />;
  }
};

const Arm: React.FC<{ d: string; color: string; hand?: [number, number] }> = ({ d, color, hand }) => (
  <g>
    <path d={d} fill="none" stroke={color} strokeWidth={30} strokeLinecap="round" strokeLinejoin="round" />
    {hand ? <circle cx={hand[0]} cy={hand[1]} r={17} fill={SKIN} /> : null}
  </g>
);

const LaptopProp: React.FC = () => (
  <g>
    <rect x={62} y={238} width={136} height={86} rx={10} fill="#C9CCD1" />
    <rect x={70} y={246} width={120} height={70} rx={6} fill="#FFFFFF" />
    {/* hoja de cálculo en pantalla */}
    <rect x={70} y={246} width={120} height={12} rx={3} fill={GREEN} />
    {[0, 1, 2, 3].map((r) => (
      <rect key={r} x={78} y={265 + r * 12} width={104} height={4} rx={2} fill="#D7D9DD" />
    ))}
    <rect x={44} y={322} width={172} height={12} rx={6} fill="#AEB2B9" />
  </g>
);

const PhoneProp: React.FC<{ x: number; y: number }> = ({ x, y }) => (
  <g transform={`translate(${x} ${y}) rotate(-12)`}>
    <rect x={-20} y={-36} width={40} height={72} rx={9} fill="#202124" />
    <rect x={-16} y={-30} width={32} height={58} rx={5} fill="#FFFFFF" />
    <path d="M -5 -9 L 9 0 L -5 9 Z" fill={GREEN} />
  </g>
);

export const Character: React.FC<{
  who: "trainer" | "client";
  mood?: Mood;
  pose?: Pose;
  talking?: boolean;
  at?: number; // segundos desde el inicio de la Sequence en que entra
  flip?: boolean;
  scale?: number;
}> = ({ who, mood = "neutral", pose = "rest", talking = false, at = 0, flip = false, scale = 1 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const look = LOOKS[who];
  const pop = spring({ frame: frame - at * fps, fps, config: { damping: 10, stiffness: 170, mass: 0.7 } });
  const bob = Math.sin(t * 3.2 + (who === "client" ? 1.3 : 0)) * 3;
  const squash = 1 + Math.sin(t * 6.4) * 0.012;
  // parpadeo cada ~2,6 s
  const phase = (t + (who === "client" ? 0.9 : 0)) % 2.6;
  const blink = phase > 2.5 ? 0.1 : 1;
  const talk = talking ? Math.abs(Math.sin(t * 14)) : 0;

  const arms: Record<Pose, React.ReactNode> = {
    rest: (
      <>
        <Arm d="M 62 222 C 46 262, 50 300, 66 322" color={look.shirt} hand={[68, 326]} />
        <Arm d="M 198 222 C 214 262, 210 300, 194 322" color={look.shirt} hand={[192, 326]} />
      </>
    ),
    laptop: (
      <>
        <Arm d="M 62 222 C 44 256, 60 290, 92 296" color={look.shirt} hand={[96, 296]} />
        <Arm d="M 198 222 C 216 256, 200 290, 168 296" color={look.shirt} hand={[164, 296]} />
      </>
    ),
    phone: (
      <>
        <Arm d="M 62 222 C 46 262, 50 300, 66 322" color={look.shirt} hand={[68, 326]} />
        <Arm d="M 198 222 C 230 238, 226 200, 196 182" color={look.shirt} hand={[190, 178]} />
      </>
    ),
    shrug: (
      <>
        <Arm d="M 62 222 C 30 220, 20 190, 34 166" color={look.shirt} hand={[36, 160]} />
        <Arm d="M 198 222 C 230 220, 240 190, 226 166" color={look.shirt} hand={[224, 160]} />
      </>
    ),
    point: (
      <>
        <Arm d="M 62 222 C 46 262, 50 300, 66 322" color={look.shirt} hand={[68, 326]} />
        <Arm d="M 198 222 C 228 214, 248 196, 258 176" color={look.shirt} hand={[260, 172]} />
      </>
    ),
    think: (
      <>
        <Arm d="M 62 222 C 46 262, 50 300, 66 322" color={look.shirt} hand={[68, 326]} />
        <Arm d="M 198 222 C 214 196, 186 168, 160 158" color={look.shirt} hand={[156, 158]} />
      </>
    ),
  };

  return (
    <svg
      width={260 * scale}
      height={380 * scale}
      viewBox="0 0 260 380"
      style={{
        overflow: "visible",
        transform: `translateY(${(1 - pop) * 120 + bob}px) scale(${(flip ? -1 : 1) * (0.6 + 0.4 * pop)}, ${(0.6 + 0.4 * pop) * squash})`,
        transformOrigin: "50% 100%",
        opacity: Math.min(1, pop * 3),
      }}
    >
      {/* sombra en el suelo */}
      <ellipse cx={130} cy={372} rx={92} ry={9} fill="rgba(0,0,0,0.12)" />
      {/* piernas */}
      <rect x={86} y={318} width={36} height={52} rx={16} fill="#2B2B2B" />
      <rect x={138} y={318} width={36} height={52} rx={16} fill="#2B2B2B" />
      {/* cuerpo */}
      <path d="M 58 232 C 58 196, 92 182, 130 182 C 168 182, 202 196, 202 232 L 206 312 C 206 332, 190 340, 130 340 C 70 340, 54 332, 54 312 Z" fill={look.shirt} />
      <path d="M 150 186 C 184 192, 202 210, 202 236 L 206 312 C 206 330, 192 338, 160 340 Z" fill={look.shirtShade} opacity={0.7} />
      <path d="M 106 184 Q 130 204 154 184" fill="none" stroke={look.collar} strokeWidth={8} strokeLinecap="round" />
      {who === "trainer" ? <circle cx={156} cy={238} r={9} fill={GREEN} /> : null}
      {pose === "laptop" ? <LaptopProp /> : null}
      {arms[pose]}
      {pose === "phone" ? <PhoneProp x={188} y={150} /> : null}
      {/* cabeza */}
      <g>
        <rect x={116} y={150} width={28} height={40} rx={12} fill={SKIN_SHADE} />
        <circle cx={130} cy={104} r={60} fill={SKIN} />
        <path d="M 160 56 C 196 76, 196 136, 166 160 C 186 128, 184 86, 160 56 Z" fill={SKIN_SHADE} opacity={0.55} />
        {/* pelo */}
        <path d="M 70 98 C 66 52, 104 30, 136 34 C 172 36, 196 62, 190 100 C 180 78, 162 66, 134 66 C 106 66, 82 76, 70 98 Z" fill={HAIR} />
        {/* barba */}
        {look.beard ? (
          <path d="M 76 118 C 80 160, 106 172, 130 172 C 154 172, 180 160, 184 118 C 174 140, 160 150, 130 150 C 100 150, 86 140, 76 118 Z" fill={HAIR} opacity={0.88} />
        ) : null}
        {/* cejas */}
        <path
          d={mood === "doubt" ? "M 96 84 L 118 90 M 142 92 L 164 82" : "M 96 88 Q 107 82 118 87 M 142 87 Q 153 82 164 88"}
          fill="none"
          stroke={HAIR}
          strokeWidth={6}
          strokeLinecap="round"
        />
        {/* ojos */}
        <ellipse cx={108} cy={104} rx={6.5} ry={8 * blink} fill={INK_C} />
        <ellipse cx={152} cy={104} rx={6.5} ry={8 * blink} fill={INK_C} />
        <circle cx={92} cy={124} r={8} fill="#F08C7A" opacity={0.35} />
        <circle cx={168} cy={124} r={8} fill="#F08C7A" opacity={0.35} />
        <Mouth mood={mood} talk={talk} />
      </g>
    </svg>
  );
};

/** Signos de interrogación que saltan encima de un personaje. */
export const QuestionMarks: React.FC<{ at: number; count?: number }> = ({ at, count = 3 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return (
    <svg width={260} height={120} viewBox="0 0 260 120" style={{ overflow: "visible" }}>
      {Array.from({ length: count }).map((_, i) => {
        const p = spring({ frame: frame - (at + i * 0.12) * fps, fps, config: { damping: 8, stiffness: 220, mass: 0.5 } });
        const x = 50 + i * 80;
        const wob = Math.sin(frame / 6 + i) * 6;
        const y = interpolate(p, [0, 1], [80, 40]);
        return (
          <text
            key={i}
            x={x}
            y={y}
            textAnchor="middle"
            fontFamily="Montserrat"
            fontWeight={900}
            fontSize={64}
            fill={i === 1 ? GREEN : "#1A1A1A"}
            opacity={Math.min(1, p * 2)}
            transform={`rotate(${wob} ${x} ${y})`}
          >
            ?
          </text>
        );
      })}
    </svg>
  );
};
