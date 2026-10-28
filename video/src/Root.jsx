import { Composition } from "remotion";
import { PHONE_FRAMES, PhoneVideo } from "./PhoneVideo";

// Video de la landing: 1920x1080 a 60 cuadros por segundo.
export function Root() {
  return <Composition id="Landing" component={PhoneVideo} durationInFrames={PHONE_FRAMES} fps={60} width={1920} height={1080} />;
}
