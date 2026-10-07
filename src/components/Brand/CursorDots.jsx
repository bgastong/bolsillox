import { useEffect, useRef } from "react";

// Despues de soltar el dedo, cuanto tarda en volver a flotar solo.
const TOUCH_IDLE_MS = 1600;

/*
Fondo interactivo: una grilla de puntitos que solo se ve en un circulo.
- Con mouse: el circulo sigue al cursor con un leve retraso.
- En pantallas tactiles: sigue al dedo mientras se toca o se desliza y,
  sin tocar, flota despacio por la parte de arriba (en forma de ocho).
Es decorativa (aria-hidden) y no aparece si el sistema pide menos movimiento.
*/
function CursorDots() {
  const ref = useRef(null);

  useEffect(() => {
    const layer = ref.current;
    if (!layer || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return undefined;
    const mouse = window.matchMedia("(hover: hover) and (pointer: fine)").matches;

    let targetX = window.innerWidth / 2;
    let targetY = window.innerHeight / 3;
    let x = targetX;
    let y = targetY;
    let frame = null;
    let touching = false;
    let lastTouch = 0;
    const startedAt = performance.now();

    function place() {
      layer.style.setProperty("--dots-x", `${x}px`);
      layer.style.setProperty("--dots-y", `${y}px`);
    }

    // Recorrido "en ocho" por la parte de arriba de la pantalla.
    function ambientTarget(now) {
      const t = (now - startedAt) / 1000;
      const w = window.innerWidth;
      const h = window.innerHeight;
      return [w * (0.5 + 0.32 * Math.sin(t * 0.45)), h * (0.34 + 0.14 * Math.sin(t * 0.9))];
    }

    function tickMouse() {
      x += (targetX - x) * 0.18;
      y += (targetY - y) * 0.18;
      place();
      frame = Math.abs(targetX - x) + Math.abs(targetY - y) > 0.5 ? requestAnimationFrame(tickMouse) : null;
    }

    function tickTouch(now) {
      const idle = !touching && now - lastTouch > TOUCH_IDLE_MS;
      if (idle) [targetX, targetY] = ambientTarget(now);
      // Con el dedo sigue rapido; flotando, se mueve suave.
      const ease = idle ? 0.04 : 0.3;
      x += (targetX - x) * ease;
      y += (targetY - y) * ease;
      place();
      layer.dataset.active = touching || idle ? "true" : "false";
      frame = document.hidden ? null : requestAnimationFrame(tickTouch);
    }

    if (mouse) {
      const handleMove = (event) => {
        targetX = event.clientX;
        targetY = event.clientY;
        layer.dataset.active = "true";
        if (!frame) frame = requestAnimationFrame(tickMouse);
      };
      const handleLeave = () => {
        layer.dataset.active = "false";
      };
      window.addEventListener("pointermove", handleMove, { passive: true });
      document.documentElement.addEventListener("pointerleave", handleLeave);
      return () => {
        window.removeEventListener("pointermove", handleMove);
        document.documentElement.removeEventListener("pointerleave", handleLeave);
        if (frame) cancelAnimationFrame(frame);
      };
    }

    // Tactil: touchmove sigue llegando mientras se desliza la pagina.
    const handleTouch = (event) => {
      const touch = event.touches[0];
      if (!touch) return;
      touching = true;
      targetX = touch.clientX;
      targetY = touch.clientY;
    };
    const handleEnd = () => {
      touching = false;
      lastTouch = performance.now();
    };
    const handleVisibility = () => {
      if (!document.hidden && !frame) frame = requestAnimationFrame(tickTouch);
    };
    window.addEventListener("touchstart", handleTouch, { passive: true });
    window.addEventListener("touchmove", handleTouch, { passive: true });
    window.addEventListener("touchend", handleEnd, { passive: true });
    window.addEventListener("touchcancel", handleEnd, { passive: true });
    document.addEventListener("visibilitychange", handleVisibility);
    // Arranca flotando desde el centro.
    lastTouch = -TOUCH_IDLE_MS;
    frame = requestAnimationFrame(tickTouch);

    return () => {
      window.removeEventListener("touchstart", handleTouch);
      window.removeEventListener("touchmove", handleTouch);
      window.removeEventListener("touchend", handleEnd);
      window.removeEventListener("touchcancel", handleEnd);
      document.removeEventListener("visibilitychange", handleVisibility);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  return <div ref={ref} className="cursor-dots" data-active="false" aria-hidden="true" />;
}

export default CursorDots;
