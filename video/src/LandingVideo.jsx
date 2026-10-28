import { AbsoluteFill, Sequence, useCurrentFrame, useVideoConfig } from "remotion";
import { easeInCubic, easeOutBack, easeOutExpo, progress } from "./motion";
import { Background, Fonts } from "./ui";
import { IntroScene, OutroScene } from "./scenes/Brand";
import { ExpenseScene } from "./scenes/Expense";
import { PieScene } from "./scenes/Pie";
import { CashflowScene } from "./scenes/Cashflow";
import { GoalsScene } from "./scenes/Goals";
import { InvestScene } from "./scenes/Invest";

// Escenas en orden con su duracion (cuadros a 60 fps).
const SCENES = [
  [IntroScene, 150],
  [ExpenseScene, 660],
  [PieScene, 330],
  [CashflowScene, 330],
  [GoalsScene, 330],
  [InvestScene, 420],
  [OutroScene, 230],
];

/*
Transicion entre cada escena y la siguiente: tipo y cuantos cuadros se pisan.
- zoom: la que sale se agranda y se va; la que entra llega desde lejos con un
  rebote. Con un destello en el medio.
- whip: barrido rapido de costado (o vertical, whipUp) con desenfoque de movimiento.
*/
const TRANSITIONS = [
  { type: "zoom", frames: 26 },
  { type: "whip", frames: 22 },
  { type: "whipUp", frames: 22 },
  { type: "zoom", frames: 26 },
  { type: "whip", frames: 22 },
  { type: "zoom", frames: 30 },
];
// Entrada desde negro y salida a negro (el loop de la pagina vuelve sin salto).
const EDGE_FADE = 24;

let cursor = 0;
const TIMELINE = SCENES.map(([Component, duration], index) => {
  const item = { Component, from: cursor, duration, enter: TRANSITIONS[index - 1] ?? null, exit: TRANSITIONS[index] ?? null };
  cursor += duration - (TRANSITIONS[index]?.frames ?? 0);
  return item;
});
export const TOTAL_FRAMES = cursor;

// Estilo de la escena en un momento de su entrada (p de 0 a 1) o salida (q de 0 a 1).
function transitionState(type, phase, t) {
  const W = 1920;
  const H = 1080;
  if (type === "zoom") {
    if (phase === "in") {
      const e = easeOutBack(t);
      return { scale: 0.45 + 0.55 * e, opacity: Math.min(1, t * 2.5), blur: [(1 - t) * 22, (1 - t) * 22] };
    }
    const e = easeInCubic(t);
    return { scale: 1 + e * 2.2, opacity: 1 - Math.min(1, t * 1.4), blur: [e * 26, e * 26] };
  }
  const vertical = type === "whipUp";
  if (phase === "in") {
    const e = easeOutExpo(t);
    const shift = (1 - e) * (vertical ? H : W) * 1.05;
    const blur = Math.pow(1 - t, 2) * 90;
    return { x: vertical ? 0 : shift, y: vertical ? shift : 0, blur: vertical ? [0, blur] : [blur, 0] };
  }
  const e = easeInCubic(t);
  const shift = -e * (vertical ? H : W) * 1.05;
  const blur = t * t * 90;
  return { x: vertical ? 0 : shift, y: vertical ? shift : 0, blur: vertical ? [0, blur] : [blur, 0] };
}

function SceneFrame({ index, duration, enter, exit, children }) {
  const frame = useCurrentFrame();
  let state = { scale: 1, x: 0, y: 0, opacity: 1, blur: [0, 0] };
  if (enter && frame < enter.frames) state = { ...state, ...transitionState(enter.type, "in", progress(frame, 0, enter.frames, (v) => v)) };
  else if (!enter) state.opacity = progress(frame, 0, EDGE_FADE);
  if (exit && frame >= duration - exit.frames) {
    state = { ...state, ...transitionState(exit.type, "out", progress(frame, duration - exit.frames, exit.frames, (v) => v)) };
  } else if (!exit) state.opacity *= 1 - progress(frame, duration - EDGE_FADE, EDGE_FADE);
  const [bx, by] = state.blur;
  const blurred = bx > 0.3 || by > 0.3;
  const id = `motion-blur-${index}`;
  return (
    <AbsoluteFill
      style={{
        opacity: state.opacity,
        transform: `translate(${state.x}px, ${state.y}px) scale(${state.scale})`,
        filter: blurred ? `url(#${id})` : undefined,
      }}
    >
      {/* Desenfoque direccional (de movimiento) para los barridos */}
      <svg width={0} height={0} style={{ position: "absolute" }}>
        <filter id={id} x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation={`${bx} ${by}`} />
        </filter>
      </svg>
      {children}
    </AbsoluteFill>
  );
}

// Destello blanco en el medio de cada transicion de zoom.
function Flashes({ frame }) {
  let opacity = 0;
  TIMELINE.forEach((item) => {
    if (item.exit?.type !== "zoom") return;
    const start = item.from + item.duration - item.exit.frames;
    const t = progress(frame, start, item.exit.frames, (v) => v);
    opacity = Math.max(opacity, Math.sin(t * Math.PI) * 0.16);
  });
  if (opacity < 0.005) return null;
  return <AbsoluteFill style={{ background: "radial-gradient(circle at 50% 50%, #ffffff, rgba(255,255,255,0) 70%)", opacity, mixBlendMode: "screen" }} />;
}

export function LandingVideo() {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  return (
    <AbsoluteFill style={{ overflow: "hidden" }}>
      <Fonts />
      <Background shift={Math.sin((frame / durationInFrames) * Math.PI * 2)} />
      {TIMELINE.map(({ Component, from, duration, enter, exit }, index) => (
        <Sequence key={index} from={from} durationInFrames={duration}>
          <SceneFrame index={index} duration={duration} enter={enter} exit={exit}>
            <Component />
          </SceneFrame>
        </Sequence>
      ))}
      <Flashes frame={frame} />
    </AbsoluteFill>
  );
}
