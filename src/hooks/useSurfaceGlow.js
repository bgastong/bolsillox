import { useEffect } from "react";

/*
Brillo que sigue al cursor en las tarjetas (.surface): un solo listener
para toda la pantalla que actualiza --mx / --my en la tarjeta bajo el mouse.
Solo con mouse; en pantallas tactiles no hace nada.
*/
export function useSurfaceGlow() {
  useEffect(() => {
    function handleMove(event) {
      if (event.pointerType !== "mouse") return;
      const card = event.target.closest?.(".surface");
      if (!card) return;
      const rect = card.getBoundingClientRect();
      card.style.setProperty("--mx", `${event.clientX - rect.left}px`);
      card.style.setProperty("--my", `${event.clientY - rect.top}px`);
    }
    window.addEventListener("pointermove", handleMove, { passive: true });
    return () => window.removeEventListener("pointermove", handleMove);
  }, []);
}
