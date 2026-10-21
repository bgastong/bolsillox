import { useEffect, useState } from "react";

// Lo que cuenta como "la persona ya esta usando la pagina".
const EVENTS = ["pointermove", "pointerdown", "touchstart", "wheel", "scroll", "keydown"];

let interacted = false;
const listeners = new Set();

function markInteracted() {
  if (interacted) return;
  interacted = true;
  EVENTS.forEach((type) => window.removeEventListener(type, markInteracted));
  listeners.forEach((notify) => notify());
  listeners.clear();
}

/*
true desde la primera interaccion (mover el mouse, tocar, bajar o una tecla).
Sirve para que las animaciones decorativas de la pagina de inicio arranquen
quietas: asi la pagina "termina de cargar" antes (mejor Speed Index) y no se
mueve nada mientras nadie la mira.
*/
export function useFirstInteraction() {
  const [value, setValue] = useState(interacted);

  useEffect(() => {
    if (interacted) return undefined;
    const notify = () => setValue(true);
    listeners.add(notify);
    if (listeners.size === 1) {
      EVENTS.forEach((type) => window.addEventListener(type, markInteracted, { passive: true }));
    }
    return () => {
      listeners.delete(notify);
      if (!listeners.size && !interacted) {
        EVENTS.forEach((type) => window.removeEventListener(type, markInteracted));
      }
    };
  }, []);

  return value;
}
