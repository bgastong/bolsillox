import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeftIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { currentMonthKey, formatMonth, shiftMonth } from "@/lib/format";
import { useLanguage } from "@/hooks/useLanguage";

// Cuantos meses hacia atras se pueden elegir.
const MONTHS_BACK = 35;

function capitalize(text) {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/*
Selector de mes tipo ruleta: los meses se desplazan con scroll (con "snap"),
el del centro queda resaltado y los de los extremos se difuminan.
Tocar un mes lo elige; con el teclado, flechas arriba/abajo + Enter.
*/
function MonthWheel({ value, onSelect }) {
  const { t, locale } = useLanguage();
  const listRef = useRef(null);
  const frame = useRef(0);
  const current = currentMonthKey();
  const months = Array.from({ length: MONTHS_BACK + 1 }, (_, index) =>
    shiftMonth(current, index - MONTHS_BACK),
  );
  const [centered, setCentered] = useState(value);

  // Opacidad y desenfoque segun la distancia al centro (efecto ruleta).
  const paint = useCallback(() => {
    const list = listRef.current;
    if (!list) return;
    const center = list.scrollTop + list.clientHeight / 2;
    let closest = null;
    let closestDistance = Infinity;
    for (const item of list.querySelectorAll("[data-month]")) {
      const itemCenter = item.offsetTop + item.offsetHeight / 2;
      const distance = Math.abs(itemCenter - center) / item.offsetHeight;
      item.style.opacity = String(Math.max(1 - distance * 0.28, 0.15));
      item.style.filter = distance < 0.5 ? "none" : `blur(${Math.min(distance * 0.6, 2.4)}px)`;
      if (distance < closestDistance) {
        closestDistance = distance;
        closest = item.dataset.month;
      }
    }
    if (closest) setCentered(closest);
  }, []);

  const onScroll = useCallback(() => {
    cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame(paint);
  }, [paint]);

  // Al abrir, centra el mes elegido.
  useEffect(() => {
    const item = listRef.current?.querySelector(`[data-month="${value}"]`);
    if (item) {
      listRef.current.scrollTop =
        item.offsetTop - listRef.current.clientHeight / 2 + item.offsetHeight / 2;
    }
    frame.current = requestAnimationFrame(paint);
    item?.focus({ preventScroll: true });
    return () => cancelAnimationFrame(frame.current);
  }, [value, paint]);

  function focusSibling(month, offset) {
    const index = months.indexOf(month) + offset;
    if (index < 0 || index >= months.length) return;
    const item = listRef.current.querySelector(`[data-month="${months[index]}"]`);
    item?.focus();
    item?.scrollIntoView({ block: "center", behavior: "smooth" });
  }

  return (
    <div className="grid gap-3">
      <div className="relative">
        {/* Banda central resaltada */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-1/2 h-11 -translate-y-1/2 rounded-xl border border-white/10 bg-white/[0.06]"
        />
        <div
          ref={listRef}
          className="wheel"
          role="listbox"
          aria-label={t("chooseMonth")}
          onScroll={onScroll}
        >
          {months.map((month) => {
            const selected = month === value;
            const isCentered = month === centered;
            return (
              <button
                key={month}
                type="button"
                role="option"
                aria-selected={selected}
                data-month={month}
                tabIndex={selected ? 0 : -1}
                onClick={() => onSelect(month)}
                onKeyDown={(event) => {
                  if (event.key === "ArrowDown") {
                    event.preventDefault();
                    focusSibling(month, 1);
                  } else if (event.key === "ArrowUp") {
                    event.preventDefault();
                    focusSibling(month, -1);
                  }
                }}
                className={cn(
                  "wheel-item relative flex w-full touch-manipulation items-center justify-center gap-2 rounded-xl text-[17px] outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  isCentered ? "font-semibold text-foreground" : "text-muted-foreground",
                )}
              >
                {capitalize(formatMonth(month, locale))}
                {isCentered && (
                  <ArrowLeftIcon className="absolute right-4 size-4 text-primary" aria-hidden="true" />
                )}
              </button>
            );
          })}
          <p className="m-0 flex h-11 items-center justify-center text-xs text-muted-foreground/70">
            {t("noFutureMonths")}
          </p>
        </div>
      </div>
      <Button onClick={() => onSelect(centered)} className="w-full">
        {t("showMonth", { month: formatMonth(centered, locale) })}
      </Button>
    </div>
  );
}

export default MonthWheel;
