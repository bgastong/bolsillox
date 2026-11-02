import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useLocation, useNavigate } from "react-router-dom";
import { ArrowLeftIcon, ArrowRightIcon, XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/hooks/useLanguage";
import { cn } from "@/lib/utils";
import { openConvertDialog } from "./demoEvents";

/*
Pasos del recorrido. target: que se ilumina (el primero visible de los que
coinciden); sin target, el globito va centrado. Los textos estan en las
traducciones (tourStep1Title, tourStep1Text...).
*/
const STEPS = [
  { key: "welcome" },
  { key: "balance", target: '[data-tour="balance"]' },
  { key: "newMovement", target: '[data-tour="new-movement"]', waitsForDialog: true },
  { key: "categories", target: '[aria-labelledby="categories-title"]' },
  { key: "chartSettings", target: '[data-tour="chart-settings"]' },
  { key: "cashflow", target: '[aria-labelledby="cashflow-title"]' },
  { key: "menu", target: '[data-tour="menu"]' },
  { key: "end" },
];

const PAD = 6;
const GAP = 12;
const OTHER_DIALOG = '[role="dialog"]:not([data-tour-popover])';

function visibleTarget(selector) {
  if (!selector) return null;
  return [...document.querySelectorAll(selector)].find((element) => {
    const rect = element.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0 && getComputedStyle(element).visibility !== "hidden";
  });
}

function prefersReducedMotion() {
  return window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
}

// Donde va el globito: abajo del elemento si entra, si no arriba; nunca afuera de la pantalla.
function placePopover(rect, popover) {
  const width = window.innerWidth;
  const height = window.innerHeight;
  const box = popover?.getBoundingClientRect() ?? { width: 320, height: 160 };
  if (!rect) return { left: (width - box.width) / 2, top: (height - box.height) / 2, side: "center" };
  const below = rect.bottom + PAD + GAP;
  const side = below + box.height <= height - 12 || rect.top - PAD - GAP - box.height < 12 ? "bottom" : "top";
  const top = side === "bottom" ? below : rect.top - PAD - GAP - box.height;
  const left = Math.min(Math.max(12, rect.left + rect.width / 2 - box.width / 2), width - box.width - 12);
  return { left, top: Math.min(Math.max(12, top), height - box.height - 12), side };
}

/*
Recorrido guiado de la cuenta de prueba: oscurece la pantalla, ilumina una
parte del Inicio y explica que es, con un globito. Se puede ir y volver,
saltear (Esc) o tocar lo iluminado: en "Nuevo movimiento" el recorrido se
oculta mientras se carga el gasto y sigue al cerrar el formulario.
*/
function DemoTour({ onClose }) {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [index, setIndex] = useState(0);
  const [rect, setRect] = useState(null);
  const [position, setPosition] = useState(null);
  const [hidden, setHidden] = useState(false);
  const popoverRef = useRef(null);
  const step = STEPS[index];
  const last = index === STEPS.length - 1;
  const animate = !prefersReducedMotion();

  // El recorrido es sobre el Inicio.
  useEffect(() => {
    if (pathname !== "/") navigate("/");
  }, [pathname, navigate]);

  const go = useCallback(
    (next) => {
      if (next < 0) return;
      if (next >= STEPS.length) onClose();
      else setIndex(next);
    },
    [onClose],
  );

  // Al cambiar de paso, lleva lo iluminado a la vista.
  useEffect(() => {
    const target = visibleTarget(step.target);
    target?.scrollIntoView({ block: "center", behavior: animate ? "smooth" : "auto" });
    popoverRef.current?.focus({ preventScroll: true });
  }, [step, animate]);

  // Sigue al elemento mientras se scrollea o cambia el tamaño; se oculta con otro dialogo abierto.
  useLayoutEffect(() => {
    let frame;
    let dialogWasOpen = false;
    const update = () => {
      const dialogOpen = Boolean(document.querySelector(OTHER_DIALOG));
      setHidden(dialogOpen);
      // Cargo el gasto (o cerro el formulario): sigue con el paso siguiente.
      if (step.waitsForDialog && dialogWasOpen && !dialogOpen) setIndex((current) => current + 1);
      dialogWasOpen = dialogOpen;
      const target = visibleTarget(step.target);
      const box = target?.getBoundingClientRect() ?? null;
      setRect((current) =>
        current && box && current.top === box.top && current.left === box.left && current.width === box.width && current.height === box.height
          ? current
          : box && { top: box.top, left: box.left, width: box.width, height: box.height, bottom: box.bottom, right: box.right },
      );
      frame = requestAnimationFrame(update);
    };
    frame = requestAnimationFrame(update);
    return () => cancelAnimationFrame(frame);
  }, [step]);

  useLayoutEffect(() => {
    setPosition(placePopover(rect, popoverRef.current));
  }, [rect, index]);

  // Teclado: Esc cierra, flechas van y vienen.
  useEffect(() => {
    const onKey = (event) => {
      if (hidden) return;
      if (event.key === "Escape") onClose();
      else if (event.key === "ArrowRight") go(index + 1);
      else if (event.key === "ArrowLeft") go(index - 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [index, hidden, go, onClose]);

  if (hidden) return null;
  const n = index + 1;

  return createPortal(
    <div className={cn("demo-tour", animate && "demo-tour-animated")}>
      {rect ? (
        <div
          className="demo-tour-spotlight"
          aria-hidden="true"
          style={{ top: rect.top - PAD, left: rect.left - PAD, width: rect.width + PAD * 2, height: rect.height + PAD * 2 }}
        />
      ) : (
        <div className="demo-tour-backdrop" aria-hidden="true" />
      )}
      <div
        ref={popoverRef}
        role="dialog"
        aria-modal="false"
        aria-labelledby="demo-tour-title"
        aria-describedby="demo-tour-text"
        data-tour-popover=""
        tabIndex={-1}
        className="demo-tour-popover"
        style={position ? { left: position.left, top: position.top } : { visibility: "hidden" }}
      >
        <div className="flex items-start justify-between gap-3">
          <h2 id="demo-tour-title" className="m-0 text-[15px] font-medium tracking-[-0.01em]">
            {t(`tourStep${n}Title`)}
          </h2>
          <span className="flex items-center gap-1">
            <span className="font-mono text-[11px] text-[color:var(--text-4)] tabular-nums">
              {n}/{STEPS.length}
            </span>
            <button
              type="button"
              onClick={onClose}
              aria-label={t("tourClose")}
              className="-mr-1 grid size-7 place-items-center rounded-md text-[color:var(--text-3)] outline-none hover:bg-fg/[0.06] hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
            >
              <XIcon className="size-4" aria-hidden="true" />
            </button>
          </span>
        </div>
        <p id="demo-tour-text" className="m-0 text-sm leading-relaxed text-[color:var(--text-2)]">
          {t(`tourStep${n}Text`)}
        </p>
        <div className="mt-1 flex items-center justify-between gap-2">
          {last ? (
            <>
              <Button variant="ghost" size="sm" onClick={onClose}>
                {t("tourKeepExploring")}
              </Button>
              <Button
                size="sm"
                onClick={() => {
                  onClose();
                  openConvertDialog();
                }}
              >
                {t("demoCreateAccount")}
                <ArrowRightIcon data-icon="inline-end" />
              </Button>
            </>
          ) : (
            <>
              <Button variant="ghost" size="sm" onClick={onClose}>
                {t("tourSkip")}
              </Button>
              <span className="flex items-center gap-1.5">
                {index > 0 && (
                  <Button variant="outline" size="icon-sm" onClick={() => go(index - 1)} aria-label={t("tourBack")}>
                    <ArrowLeftIcon />
                  </Button>
                )}
                <Button size="sm" onClick={() => go(index + 1)}>
                  {t(index === 0 ? "tourStart" : "tourNext")}
                  <ArrowRightIcon data-icon="inline-end" />
                </Button>
              </span>
            </>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}

export default DemoTour;
