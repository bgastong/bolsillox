import { useEffect, useState } from "react";
import { useCountUp } from "@/hooks/useCountUp";
import { useLanguage } from "@/hooks/useLanguage";

const START = 1284350;
// Cada cuanto entra plata en la vista previa y cuanto (de ejemplo, en pesos).
const EVERY_MS = 1800;
const MIN_STEP = 800;
const MAX_STEP = 5200;

function prefersReducedMotion() {
  return window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
}

/*
Saldo de ejemplo de la pagina de inicio: cuenta desde 0 al abrir y despues
sigue subiendo de a poco mientras el grafico se mueve, con un "+$ ..." que
aparece y se desvanece en cada ingreso. Se pausa con la pestaña oculta.
*/
function LiveBalance() {
  const { locale } = useLanguage();
  const [target, setTarget] = useState(START);
  const [last, setLast] = useState(null);
  const current = useCountUp(target, 1400);
  const format = (value) => new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }).format(Math.round(value));

  useEffect(() => {
    if (prefersReducedMotion()) return undefined;
    // Arranca despues de la cuenta inicial.
    let timer;
    const tick = () => {
      if (!document.hidden) {
        const step = Math.round((MIN_STEP + Math.random() * (MAX_STEP - MIN_STEP)) / 50) * 50;
        setTarget((value) => value + step);
        setLast({ step, id: Date.now() });
      }
      timer = setTimeout(tick, EVERY_MS);
    };
    timer = setTimeout(tick, 1600);
    return () => clearTimeout(timer);
  }, []);

  return (
    <span className="relative inline-flex items-baseline">
      <span className="text-[color:var(--text-4)]">$</span>
      {format(current)}
      {last && (
        <span
          key={last.id}
          className="live-increment absolute -top-5 right-0 font-mono text-[12px] tracking-normal text-income"
          aria-hidden="true"
        >
          +{format(last.step)}
        </span>
      )}
    </span>
  );
}

export default LiveBalance;
