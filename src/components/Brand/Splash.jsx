import { useState } from "react";
import { BrandTile } from "./BrandIcons";

const SEEN_KEY = "bolsillox.splashSeen";

// Se muestra una vez por sesion y nunca si el sistema pide menos movimiento.
function shouldShow() {
  try {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return false;
    if (sessionStorage.getItem(SEEN_KEY)) return false;
    sessionStorage.setItem(SEEN_KEY, "1");
  } catch {
    // sin storage: se muestra igual
  }
  return true;
}

/*
Animacion de entrada: aparece la ficha del logo, se escribe "bolsillox"
y la pantalla se desvanece mostrando la app.
Es decorativa: queda oculta para lectores de pantalla y no bloquea el foco.
*/
function Splash() {
  const [visible, setVisible] = useState(shouldShow);

  if (!visible) return null;

  return (
    <div
      className="splash"
      aria-hidden="true"
      onAnimationEnd={(event) => {
        if (event.target === event.currentTarget) setVisible(false);
      }}
    >
      <div className="splash-logo">
        <BrandTile className="splash-mark size-12 rounded-[13px]" />
        <span className="splash-word font-semibold tracking-[-0.045em]">
          {"bolsillox".split("").map((letter, index) => (
            <span key={index} style={{ "--i": index, color: index === 8 ? "var(--text-4)" : undefined }}>
              {letter}
            </span>
          ))}
        </span>
      </div>
      <span className="splash-bar" />
    </div>
  );
}

export default Splash;
