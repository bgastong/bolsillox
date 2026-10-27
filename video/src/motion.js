import { Easing, interpolate, spring } from "remotion";

// Curvas suaves para todas las animaciones (entrada rapida, frenada larga).
export const easeOut = Easing.bezier(0.16, 1, 0.3, 1);
export const easeInOut = Easing.bezier(0.65, 0, 0.35, 1);

// 0 -> 1 entre dos cuadros, con frenada suave.
export function progress(frame, start, duration, easing = easeOut) {
  return interpolate(frame, [start, start + duration], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing,
  });
}

// Resorte sin rebote (o con poco), para que todo se sienta fisico pero calmo.
export function soft(frame, fps, start = 0, { damping = 200, stiffness = 90, mass = 1 } = {}) {
  return spring({ frame: frame - start, fps, config: { damping, stiffness, mass } });
}

// Aparece subiendo y enfocando.
export function rise(frame, start, { distance = 28, duration = 40 } = {}) {
  const p = progress(frame, start, duration);
  return {
    opacity: p,
    transform: `translateY(${(1 - p) * distance}px)`,
    filter: `blur(${(1 - p) * 8}px)`,
  };
}
