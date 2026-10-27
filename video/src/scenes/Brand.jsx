import { useCurrentFrame, useVideoConfig } from "remotion";
import { progress, rise, soft } from "../motion";
import { C, MONO, SANS } from "../theme";
import { Wordmark } from "../ui";

// Escena 1: el logo y la frase de la landing.
export function IntroScene() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const logo = soft(frame, fps, 4, { damping: 20, stiffness: 80 });
  return (
    <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center" }}>
      <div style={{ display: "grid", justifyItems: "center", gap: 36 }}>
        <div style={{ opacity: Math.min(1, logo * 1.3), transform: `scale(${0.85 + logo * 0.15})` }}>
          <Wordmark size={1.5} />
        </div>
        <div style={{ ...rise(frame, 34), fontFamily: SANS, fontSize: 76, fontWeight: 500, letterSpacing: -3.4, color: C.fg, textAlign: "center", lineHeight: 1.05 }}>
          Tu plata, clara.
          <span style={{ display: "block", color: C.text4 }}>Cada peso, en su lugar.</span>
        </div>
      </div>
    </div>
  );
}

// Ultima escena: el logo, la web y lo que la hace distinta.
export function OutroScene() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const logo = soft(frame, fps, 14, { damping: 22, stiffness: 80 });
  const glow = progress(frame, 30, 90);
  return (
    <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center" }}>
      <div style={{ display: "grid", justifyItems: "center", gap: 40 }}>
        <div style={{ opacity: Math.min(1, logo * 1.3), transform: `scale(${0.85 + logo * 0.15})` }}>
          <Wordmark size={1.7} />
        </div>
        <div style={{ ...rise(frame, 40), fontFamily: SANS, fontSize: 48, fontWeight: 500, letterSpacing: -1.6, color: C.fg }}>
          Empezá a ordenar tus finanzas hoy.
        </div>
        <div style={{ ...rise(frame, 56), display: "flex", gap: 18, alignItems: "center" }}>
          <div style={{ height: 66, padding: "0 34px", borderRadius: 16, background: C.fg, color: C.bg, display: "grid", placeItems: "center", fontFamily: SANS, fontSize: 24, fontWeight: 500, boxShadow: `0 0 ${40 * glow}px rgba(255,255,255,${0.18 * glow})` }}>
            Crear cuenta gratis →
          </div>
          <div style={{ fontFamily: MONO, fontSize: 26, color: C.text2 }}>bolsillox.com.ar</div>
        </div>
        <div style={{ ...rise(frame, 70), fontFamily: SANS, fontSize: 22, color: C.text4 }}>Gratis · Sin tarjeta · Código abierto</div>
      </div>
    </div>
  );
}
