import { useCurrentFrame, useVideoConfig } from "remotion";
import { easeOutExpo, progress, soft } from "../motion";
import { C, MONO, SANS } from "../theme";
import { Wordmark } from "../ui";

// Frase centrada que entra palabra por palabra desde abajo de una mascara.
function Words({ frame, start, text, color = C.fg, size = 76, step = 3 }) {
  return (
    <div style={{ display: "flex", justifyContent: "center", flexWrap: "wrap", fontFamily: SANS, fontSize: size, fontWeight: 500, letterSpacing: -size * 0.045, lineHeight: 1.05 }}>
      {text.split(" ").map((word, i) => {
        const t = progress(frame, start + i * step, 28, easeOutExpo);
        return (
          <span key={`${word}-${i}`} style={{ display: "inline-block", overflow: "hidden", paddingBottom: 8, marginRight: size * 0.24 }}>
            <span style={{ display: "inline-block", color, transform: `translateY(${(1 - t) * 110}%) rotate(${(1 - t) * 8}deg)`, transformOrigin: "0 100%" }}>{word}</span>
          </span>
        );
      })}
    </div>
  );
}

// El logo llega desde muy cerca y desenfocado, y se asienta con un rebote.
function LogoPunch({ frame, fps, start, size }) {
  const t = soft(frame, fps, start, { damping: 13, stiffness: 110 });
  return (
    <div style={{ opacity: Math.min(1, t * 2), transform: `scale(${3 - 2 * t})`, filter: `blur(${Math.max(0, 1 - t) * 18}px)` }}>
      <Wordmark size={size} />
    </div>
  );
}

// Escena 1: el logo y la frase de la landing.
export function IntroScene() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  // Al final, todo se acerca un poco: empuja hacia la escena siguiente.
  const push = 1 + progress(frame, 90, 60) * 0.06;
  return (
    <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", transform: `scale(${push})` }}>
      <div style={{ display: "grid", justifyItems: "center", gap: 40 }}>
        <LogoPunch frame={frame} fps={fps} start={2} size={1.5} />
        <div style={{ display: "grid", gap: 4 }}>
          <Words frame={frame} start={26} text="Tu plata, clara." />
          <Words frame={frame} start={38} text="Cada peso, en su lugar." color={C.text4} />
        </div>
      </div>
    </div>
  );
}

// Ultima escena: el logo, el llamado a crear cuenta y la web.
export function OutroScene() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const glow = progress(frame, 40, 80);
  const cta = soft(frame, fps, 52, { damping: 14, stiffness: 140 });
  const rest = progress(frame, 70, 30, easeOutExpo);
  return (
    <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center" }}>
      <div style={{ display: "grid", justifyItems: "center", gap: 42 }}>
        <LogoPunch frame={frame} fps={fps} start={4} size={1.7} />
        <Words frame={frame} start={28} text="Empezá a ordenar tus finanzas hoy." size={50} step={2.5} />
        <div style={{ display: "flex", gap: 20, alignItems: "center", opacity: Math.min(1, cta * 1.5), transform: `translateY(${(1 - Math.min(1, cta)) * 30}px) scale(${0.9 + cta * 0.1})` }}>
          <div style={{ height: 68, padding: "0 36px", borderRadius: 16, background: C.fg, color: C.bg, display: "grid", placeItems: "center", fontFamily: SANS, fontSize: 25, fontWeight: 500, boxShadow: `0 0 ${50 * glow}px rgba(255,255,255,${0.22 * glow})` }}>
            Crear cuenta gratis →
          </div>
          <div style={{ fontFamily: MONO, fontSize: 27, color: C.text2 }}>bolsillox.com.ar</div>
        </div>
        <div style={{ opacity: rest, fontFamily: SANS, fontSize: 22, color: C.text4 }}>Gratis · Sin tarjeta · Código abierto</div>
      </div>
    </div>
  );
}
