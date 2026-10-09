import { useEffect, useMemo, useRef, useState } from "react";
import { CalendarIcon, ChevronLeftIcon, ChevronRightIcon, XIcon } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { parseISODate, todayISO } from "@/lib/format";
import { useLanguage } from "@/hooks/useLanguage";
import { cn } from "@/lib/utils";

const pad = (value) => String(value).padStart(2, "0");
const toISO = (date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

function addDays(iso, days) {
  const date = parseISODate(iso);
  date.setDate(date.getDate() + days);
  return toISO(date);
}

function addMonths(iso, months) {
  const date = parseISODate(iso);
  const day = date.getDate();
  date.setDate(1);
  date.setMonth(date.getMonth() + months);
  // 31 de enero + 1 mes = 28/29 de febrero, no 3 de marzo.
  const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  date.setDate(Math.min(day, lastDay));
  return toISO(date);
}

const clamp = (iso, min, max) => (min && iso < min ? min : max && iso > max ? max : iso);

// Semanas que empiezan el lunes (Argentina) o el domingo (ingles de EE.UU.).
const weekStartsOn = (locale) => (locale.startsWith("en-US") ? 0 : 1);

// Las 6 semanas del mes que contiene a monthIso, como fechas ISO.
function monthGrid(monthIso, firstWeekday) {
  const first = parseISODate(`${monthIso.slice(0, 7)}-01`);
  const offset = (first.getDay() - firstWeekday + 7) % 7;
  const start = new Date(first);
  start.setDate(1 - offset);
  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    return toISO(date);
  });
}

/*
Calendario. focused: el dia que tiene el foco del teclado (define el mes visible).
Teclado: flechas (dia / semana), Inicio/Fin (semana), RePag/AvPag (mes), Enter/Espacio (elegir).
*/
function Calendar({ value, onSelect, min, max }) {
  const { t, locale } = useLanguage();
  const today = todayISO();
  const [focused, setFocused] = useState(() => clamp(value || today, min, max));
  const gridRef = useRef(null);
  const firstWeekday = weekStartsOn(locale);
  const days = useMemo(() => monthGrid(focused, firstWeekday), [focused, firstWeekday]);
  const month = focused.slice(0, 7);

  const monthLabel = new Intl.DateTimeFormat(locale, { month: "long", year: "numeric" }).format(
    parseISODate(`${month}-01`),
  );
  const weekdayFormat = new Intl.DateTimeFormat(locale, { weekday: "narrow" });
  const weekdayLong = new Intl.DateTimeFormat(locale, { weekday: "long" });
  const dayLabel = new Intl.DateTimeFormat(locale, { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  const isDisabled = (iso) => (min && iso < min) || (max && iso > max);

  // Al moverse con el teclado, el foco sigue al dia elegido.
  const moved = useRef(false);
  useEffect(() => {
    if (!moved.current) return;
    moved.current = false;
    gridRef.current?.querySelector(`[data-day="${focused}"]`)?.focus();
  }, [focused]);

  function move(next) {
    moved.current = true;
    setFocused(clamp(next, min, max));
  }

  function handleKeyDown(event) {
    const actions = {
      ArrowLeft: () => addDays(focused, -1),
      ArrowRight: () => addDays(focused, 1),
      ArrowUp: () => addDays(focused, -7),
      ArrowDown: () => addDays(focused, 7),
      PageUp: () => addMonths(focused, event.shiftKey ? -12 : -1),
      PageDown: () => addMonths(focused, event.shiftKey ? 12 : 1),
      Home: () => addDays(focused, -((parseISODate(focused).getDay() - firstWeekday + 7) % 7)),
      End: () => addDays(focused, 6 - ((parseISODate(focused).getDay() - firstWeekday + 7) % 7)),
    };
    const action = actions[event.key];
    if (!action) return;
    event.preventDefault();
    move(action());
  }

  const prevMonth = addMonths(`${month}-01`, -1);
  const nextMonth = addMonths(`${month}-01`, 1);
  const canPrev = !min || prevMonth.slice(0, 7) >= min.slice(0, 7);
  const canNext = !max || nextMonth.slice(0, 7) <= max.slice(0, 7);
  const navButton =
    "flex size-9 items-center justify-center rounded-lg text-muted-foreground outline-none hover:bg-fg/[0.06] hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/40 disabled:pointer-events-none disabled:opacity-30";

  return (
    <div className="grid gap-2">
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          className={navButton}
          onClick={() => setFocused(clamp(prevMonth, min, max))}
          disabled={!canPrev}
          aria-label={t("previousMonth")}
        >
          <ChevronLeftIcon className="size-4" aria-hidden="true" />
        </button>
        <p className="m-0 text-sm font-medium first-letter:uppercase" aria-live="polite">
          {monthLabel}
        </p>
        <button
          type="button"
          className={navButton}
          onClick={() => setFocused(clamp(nextMonth, min, max))}
          disabled={!canNext}
          aria-label={t("nextMonth")}
        >
          <ChevronRightIcon className="size-4" aria-hidden="true" />
        </button>
      </div>

      <div ref={gridRef} role="grid" aria-label={monthLabel} onKeyDown={handleKeyDown} className="grid gap-1">
        <div role="row" className="grid grid-cols-7">
          {days.slice(0, 7).map((iso) => (
            <span
              key={iso}
              role="columnheader"
              abbr={weekdayLong.format(parseISODate(iso))}
              className="flex h-8 items-center justify-center text-xs font-medium text-muted-foreground uppercase"
            >
              {weekdayFormat.format(parseISODate(iso))}
            </span>
          ))}
        </div>
        {Array.from({ length: 6 }, (_, week) => (
          <div role="row" key={week} className="grid grid-cols-7 gap-0.5">
            {days.slice(week * 7, week * 7 + 7).map((iso) => {
              const outside = iso.slice(0, 7) !== month;
              const selected = iso === value;
              const isToday = iso === today;
              const disabled = isDisabled(iso);
              return (
                <div role="gridcell" key={iso} aria-selected={selected || undefined}>
                  <button
                    type="button"
                    data-day={iso}
                    tabIndex={iso === focused ? 0 : -1}
                    disabled={disabled}
                    onClick={() => onSelect(iso)}
                    onFocus={() => iso !== focused && !outside && setFocused(iso)}
                    aria-label={dayLabel.format(parseISODate(iso))}
                    aria-current={isToday ? "date" : undefined}
                    aria-pressed={selected}
                    className={cn(
                      "relative flex h-10 w-full items-center justify-center rounded-lg text-sm tabular-nums outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-25 sm:h-9",
                      selected
                        ? "bg-primary font-semibold text-primary-foreground"
                        : "hover:bg-fg/[0.07]",
                      !selected && outside && "text-muted-foreground/45",
                      !selected && isToday && "font-semibold text-foreground",
                    )}
                  >
                    {Number(iso.slice(8))}
                    {isToday && !selected && (
                      <span aria-hidden="true" className="absolute bottom-1 size-1 rounded-full bg-primary" />
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

/*
Campo de fecha con el estilo de la app (reemplaza al <input type="date">,
que en el tema oscuro se ve distinto en cada navegador).
- value / onChange: "YYYY-MM-DD" o "" (sin fecha).
- clearable: muestra "Borrar" (para fechas opcionales).
- shortcuts: muestra "Hoy" y "Ayer" (para cargar movimientos rapido).
*/
function DatePicker({
  id,
  value,
  onChange,
  min,
  max,
  placeholder,
  clearable = false,
  shortcuts = false,
  disabled,
  className,
  "aria-invalid": ariaInvalid,
  "aria-describedby": ariaDescribedBy,
}) {
  const { t, locale } = useLanguage();
  const [open, setOpen] = useState(false);
  const today = todayISO();
  const yesterday = addDays(today, -1);

  function select(iso) {
    onChange(iso);
    setOpen(false);
  }

  function describe(iso) {
    const full = new Intl.DateTimeFormat(locale, { weekday: "short", day: "numeric", month: "short", year: "numeric" }).format(parseISODate(iso));
    if (iso === today) return `${t("today")} · ${full}`;
    if (iso === yesterday) return `${t("yesterday")} · ${full}`;
    return full;
  }

  const allowed = (iso) => !(min && iso < min) && !(max && iso > max);
  const chip =
    "h-9 rounded-lg border border-input px-3 text-sm font-medium outline-none hover:border-fg/20 hover:bg-fg/[0.05] focus-visible:ring-2 focus-visible:ring-ring/40 disabled:pointer-events-none disabled:opacity-40";

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          id={id}
          disabled={disabled}
          aria-invalid={ariaInvalid}
          aria-describedby={ariaDescribedBy}
          aria-haspopup="dialog"
          className={cn(
            "flex h-11 w-full min-w-0 cursor-pointer items-center gap-2.5 rounded-lg border border-input bg-fg/[0.03] px-3 text-left text-base transition-colors outline-none hover:border-fg/20 focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-2 aria-invalid:ring-destructive/20 data-[state=open]:border-ring sm:h-10 sm:text-sm",
            className,
          )}
        >
          <CalendarIcon className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
          <span className={cn("min-w-0 flex-1 truncate first-letter:uppercase", !value && "text-muted-foreground")}>
            {value ? describe(value) : (placeholder ?? t("chooseDate"))}
          </span>
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[min(20rem,calc(100vw-2rem))] p-3">
        <Calendar value={value} onSelect={select} min={min} max={max} />
        {(shortcuts || (clearable && value)) && (
          <div className="mt-3 flex items-center gap-2 border-t pt-3">
            {shortcuts && (
              <>
                <button type="button" className={chip} onClick={() => select(today)} disabled={!allowed(today)}>
                  {t("today")}
                </button>
                <button type="button" className={chip} onClick={() => select(yesterday)} disabled={!allowed(yesterday)}>
                  {t("yesterday")}
                </button>
              </>
            )}
            {clearable && value && (
              <button
                type="button"
                className={cn(chip, "ml-auto inline-flex items-center gap-1.5 text-muted-foreground")}
                onClick={() => select("")}
              >
                <XIcon className="size-3.5" aria-hidden="true" />
                {t("clearDate")}
              </button>
            )}
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}

export { DatePicker };
