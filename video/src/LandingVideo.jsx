import { AbsoluteFill, Sequence, useCurrentFrame, useVideoConfig } from "remotion";
import { easeInOut, progress } from "./motion";
import { Background, Fonts } from "./ui";
import { IntroScene, OutroScene } from "./scenes/Brand";
import { ExpenseScene } from "./scenes/Expense";
import { PieScene } from "./scenes/Pie";
import { CashflowScene } from "./scenes/Cashflow";
import { GoalsScene } from "./scenes/Goals";
import { InvestScene } from "./scenes/Invest";

// Escenas en orden: [componente, duracion en cuadros]. Se pisan OVERLAP cuadros
// para que una se funda con la siguiente.
const SCENES = [
  [IntroScene, 170],
  [ExpenseScene, 560],
  [PieScene, 320],
  [CashflowScene, 320],
  [GoalsScene, 320],
  [InvestScene, 400],
  [OutroScene, 220],
];
const OVERLAP = 24;

let cursor = 0;
const TIMELINE = SCENES.map(([Component, duration]) => {
  const item = { Component, from: cursor, duration };
  cursor += duration - OVERLAP;
  return item;
});
export const TOTAL_FRAMES = cursor + OVERLAP;

/*
Transicion de cada escena: entra con un leve zoom hacia atras y desenfoque,
sale fundiendose y achicandose apenas. El video arranca desde negro y termina
en negro, asi el loop de la pagina vuelve a empezar sin salto.
*/
function Transition({ children, duration }) {
  const frame = useCurrentFrame();
  const enter = progress(frame, 0, OVERLAP + 10, easeInOut);
  const exit = progress(frame, duration - OVERLAP, OVERLAP, easeInOut);
  const scale = (1 + (1 - enter) * 0.04) * (1 - exit * 0.03);
  return (
    <AbsoluteFill
      style={{
        opacity: enter * (1 - exit),
        transform: `scale(${scale})`,
        filter: enter < 1 || exit > 0 ? `blur(${(1 - enter) * 10 + exit * 10}px)` : undefined,
      }}
    >
      {children}
    </AbsoluteFill>
  );
}

export function LandingVideo() {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  return (
    <AbsoluteFill>
      <Fonts />
      <Background shift={Math.sin((frame / durationInFrames) * Math.PI * 2)} />
      {TIMELINE.map(({ Component, from, duration }, index) => (
        <Sequence key={index} from={from} durationInFrames={duration}>
          <Transition duration={duration}>
            <Component />
          </Transition>
        </Sequence>
      ))}
    </AbsoluteFill>
  );
}
