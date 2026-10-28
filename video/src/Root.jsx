import { Composition } from "remotion";
import { FPS, Tutorial, TUTORIAL_FRAMES } from "./Tutorial";

// Video del tutorial (/tutorial): 1920x1080 a 60 cuadros por segundo.
export function Root() {
  return <Composition id="Tutorial" component={Tutorial} durationInFrames={TUTORIAL_FRAMES} fps={FPS} width={1920} height={1080} />;
}
