import { AbsoluteFill, Img, staticFile } from "remotion";
import { C, MONO, SANS } from "./theme";
import { rise } from "./motion";

// Tipografias de la app (Geist y Geist Mono), servidas desde public/.
export function Fonts() {
  return (
    <style>{`
      @font-face { font-family: "Geist"; src: url(${staticFile("geist.woff2")}) format("woff2"); font-weight: 100 900; }
      @font-face { font-family: "Geist Mono"; src: url(${staticFile("geist-mono.woff2")}) format("woff2"); font-weight: 100 900; }
    `}</style>
  );
}

// Fondo de la landing: negro con un brillo suave arriba.
export function Background({ shift = 0 }) {
  return (
    <AbsoluteFill style={{ background: C.bg }}>
      <AbsoluteFill
        style={{
          background: `radial-gradient(1200px 600px at ${50 + shift * 8}% -10%, rgba(255,255,255,0.09), transparent 60%),
                       radial-gradient(900px 500px at ${85 - shift * 6}% 110%, rgba(62,207,142,0.06), transparent 60%)`,
        }}
      />
    </AbsoluteFill>
  );
}

// Tarjeta con el estilo "surface" de la app.
export function Card({ children, style }) {
  return (
    <div
      style={{
        background: C.card,
        border: `1px solid ${C.border}`,
        borderRadius: 22,
        boxShadow: "0 40px 80px -30px rgba(0,0,0,0.7), inset 0 1px 0 rgba(255,255,255,0.04)",
        padding: 32,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

// Titulo grande de cada escena, con una linea chica arriba.
export function Caption({ frame, start = 0, eyebrow, title, muted, style }) {
  return (
    <div style={{ display: "grid", gap: 14, ...style }}>
      {eyebrow && (
        <div style={{ ...rise(frame, start), fontFamily: MONO, fontSize: 20, letterSpacing: 2, textTransform: "uppercase", color: C.text3 }}>
          {eyebrow}
        </div>
      )}
      <div style={{ ...rise(frame, start + 6), fontFamily: SANS, fontSize: 64, lineHeight: 1.05, fontWeight: 500, letterSpacing: -2.6, color: C.fg }}>
        {title}
        {muted && <span style={{ display: "block", color: C.text4 }}>{muted}</span>}
      </div>
    </div>
  );
}

export function Label({ children, style }) {
  return <div style={{ fontFamily: SANS, fontSize: 19, color: C.text3, ...style }}>{children}</div>;
}

export function Mono({ children, style }) {
  return <span style={{ fontFamily: MONO, fontVariantNumeric: "tabular-nums", letterSpacing: -0.5, ...style }}>{children}</span>;
}

// Logo: la ficha de la app (public/favicon.svg) + "bolsillox" (la x tenue).
export function Wordmark({ size = 1 }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 18 * size }}>
      <Img src={staticFile("logo.svg")} style={{ width: 68 * size, height: 68 * size, borderRadius: 16 * size }} />
      <div style={{ fontFamily: SANS, fontWeight: 600, fontSize: 64 * size, letterSpacing: -2.5 * size, color: C.fg }}>
        bolsillo<span style={{ color: C.text4 }}>x</span>
      </div>
    </div>
  );
}
