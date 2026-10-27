import { interpolate } from "remotion";
import { cinematic } from "./motion";

/*
Camara sobre un "mundo" de 1920x1080 (o mas grande): en cada momento mira a un
punto (x, y) con un zoom (s) y una inclinacion 3D (rx, ry). Entre claves se
mueve con una curva de cine (arranca y frena suave). El zoom se interpola en
escala logaritmica: asi acercarse y alejarse se sienten parejos.
- keys: [{ at, x, y, s, rx?, ry? }] ordenadas por cuadro.
*/
export function cameraAt(frame, keys) {
  const at = keys.map((key) => key.at);
  const opts = { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: cinematic };
  const pick = (name, fallback = 0) => interpolate(frame, at, keys.map((key) => key[name] ?? fallback), opts);
  return {
    x: pick("x"),
    y: pick("y"),
    s: Math.exp(pick("ls")),
    rx: pick("rx"),
    ry: pick("ry"),
  };
}

export function Camera({ frame, keys, width = 1920, height = 1080, children }) {
  const withLog = keys.map((key) => ({ ...key, ls: Math.log(key.s) }));
  const { x, y, s, rx, ry } = cameraAt(frame, withLog);
  return (
    <div style={{ position: "absolute", inset: 0, perspective: 2400, overflow: "hidden" }}>
      <div
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          width,
          height,
          transformOrigin: "0 0",
          transform: `translate(${960 - x * s}px, ${540 - y * s}px) scale(${s})`,
        }}
      >
        <div style={{ position: "absolute", inset: 0, transformOrigin: `${x}px ${y}px`, transform: `rotateX(${rx}deg) rotateY(${ry}deg)` }}>
          {children}
        </div>
      </div>
    </div>
  );
}
