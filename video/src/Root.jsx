import { Composition } from "remotion";
import { LandingVideo, TOTAL_FRAMES } from "./LandingVideo";

// Video de la pagina de inicio: 1920x1080 a 60 cuadros por segundo.
export function Root() {
  return (
    <Composition
      id="Landing"
      component={LandingVideo}
      durationInFrames={TOTAL_FRAMES}
      fps={60}
      width={1920}
      height={1080}
    />
  );
}
