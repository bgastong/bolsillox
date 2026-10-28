import { progress, easeInCubic, easeOutExpo } from "./motion";
import { C, MONO, SANS } from "./theme";

/*
Titulo que entra palabra por palabra (cada una sube desde abajo de una mascara)
y sale igual hacia arriba. Va fijo en pantalla, arriba a la izquierda, con una
sombra detras para leerse sobre lo que muestre la camara.
- lines: [texto, texto tenue?]. start/end: cuadros de entrada y salida.
*/
export function Kinetic({ frame, start = 0, end = Infinity, eyebrow, lines, x = 120, y = 86, size = 68 }) {
  let index = 0;
  const word = (text, color) =>
    text.split(" ").map((part, i) => {
      const n = index++;
      const enter = progress(frame, start + 4 + n * 2.5, 26, easeOutExpo);
      const exit = Number.isFinite(end) ? progress(frame, end - 14 + n * 1.2, 14, easeInCubic) : 0;
      return (
        <span key={`${part}-${i}-${n}`} style={{ display: "inline-block", overflow: "hidden", verticalAlign: "top", paddingBottom: 6, marginRight: size * 0.24 }}>
          <span style={{ display: "inline-block", color, transform: `translateY(${(1 - enter) * 110 - exit * 110}%) rotate(${(1 - enter) * 6}deg)`, transformOrigin: "0 100%" }}>
            {part}
          </span>
        </span>
      );
    });
  const eyebrowIn = progress(frame, start, 20, easeOutExpo) * (Number.isFinite(end) ? 1 - progress(frame, end - 14, 14, easeInCubic) : 1);
  return (
    <>
      <div style={{ position: "absolute", left: 0, top: 0, right: 0, height: 360, background: "linear-gradient(180deg, rgba(8,9,10,0.92) 20%, rgba(8,9,10,0))", opacity: Math.max(eyebrowIn, 0), pointerEvents: "none" }} />
      <div style={{ position: "absolute", left: x, top: y, display: "grid", gap: 12 }}>
        {eyebrow && (
          <div style={{ fontFamily: MONO, fontSize: 20, letterSpacing: 3, textTransform: "uppercase", color: C.text3, opacity: eyebrowIn, transform: `translateX(${(1 - eyebrowIn) * -20}px)` }}>
            {eyebrow}
          </div>
        )}
        <div style={{ fontFamily: SANS, fontSize: size, lineHeight: 1.04, fontWeight: 500, letterSpacing: -size * 0.04 }}>
          <div>{word(lines[0], C.fg)}</div>
          {lines[1] && <div>{word(lines[1], C.text4)}</div>}
        </div>
      </div>
    </>
  );
}
