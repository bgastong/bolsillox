import { useEffect, useState } from "react";

// Distancia minima de scroll (px) antes de cambiar de estado, para que no "tiemble".
const THRESHOLD = 8;
// Cerca del principio de la pagina siempre se muestra.
const TOP_ZONE = 64;

/*
Devuelve true cuando hay que ocultar el elemento: al bajar se oculta y
al subir vuelve a aparecer. Con `enabled` en false siempre se muestra.
*/
export function useHideOnScroll(enabled = true) {
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    if (!enabled) return undefined;

    let lastY = window.scrollY;
    let frame = 0;

    function update() {
      const y = window.scrollY;
      const delta = y - lastY;
      if (y < TOP_ZONE) {
        setHidden(false);
        lastY = y;
      } else if (Math.abs(delta) >= THRESHOLD) {
        setHidden(delta > 0);
        lastY = y;
      }
    }

    function onScroll() {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(update);
    }

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(frame);
      setHidden(false);
    };
  }, [enabled]);

  return enabled && hidden;
}
