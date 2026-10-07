import { useEffect, useRef } from "react";

/*
Fondo interactivo: una grilla de puntitos que solo se ve en un circulo
alrededor del cursor y lo sigue con un leve retraso. Es decorativa
(aria-hidden) y no se muestra en pantallas tactiles ni si el sistema
pide menos movimiento.
*/
function CursorDots() {
  const ref = useRef(null);

  useEffect(() => {
    const layer = ref.current;
    const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!layer || !finePointer || reduced) return undefined;

    let targetX = window.innerWidth / 2;
    let targetY = window.innerHeight / 3;
    let x = targetX;
    let y = targetY;
    let frame = null;

    // Sigue al cursor suavemente (se acerca un 18% por cuadro).
    function tick() {
      x += (targetX - x) * 0.18;
      y += (targetY - y) * 0.18;
      layer.style.setProperty("--dots-x", `${x}px`);
      layer.style.setProperty("--dots-y", `${y}px`);
      frame = Math.abs(targetX - x) + Math.abs(targetY - y) > 0.5 ? requestAnimationFrame(tick) : null;
    }

    function handleMove(event) {
      targetX = event.clientX;
      targetY = event.clientY;
      layer.dataset.active = "true";
      if (!frame) frame = requestAnimationFrame(tick);
    }

    function handleLeave() {
      layer.dataset.active = "false";
    }

    window.addEventListener("pointermove", handleMove, { passive: true });
    document.documentElement.addEventListener("pointerleave", handleLeave);
    return () => {
      window.removeEventListener("pointermove", handleMove);
      document.documentElement.removeEventListener("pointerleave", handleLeave);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  return <div ref={ref} className="cursor-dots" data-active="false" aria-hidden="true" />;
}

export default CursorDots;
