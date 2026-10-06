import { useState } from "react";
import { BrandMark } from "./BrandIcons";

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
Animacion de entrada: se escribe "bolsillo", la "x" sticker se pega con
un rebote y la pantalla se desvanece mostrando la app.
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
        <span className="splash-word font-display font-extrabold tracking-[-0.045em]">
          {"bolsillo".split("").map((letter, index) => (
            <span key={index} style={{ "--i": index }}>
              {letter}
            </span>
          ))}
        </span>
        {/* La "x" sticker se pega al final */}
        <BrandMark className="splash-mark size-14" />
      </div>
      <span className="splash-bar" />
    </div>
  );
}

export default Splash;
