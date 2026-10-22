import { ChevronRightIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDate, todayISO } from "@/lib/format";
import { movementLabel } from "@/lib/movementLabel";
import { useLanguage } from "@/hooks/useLanguage";
import { useCategories } from "@/hooks/useCategories";
import Money from "../../Money/Money";
import { CategoryIcon, RecurringMark } from "../../Movements/MovementBits";

function yesterdayISO() {
  const date = new Date();
  date.setDate(date.getDate() - 1);
  const pad = (value) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

// Agrupa los movimientos por fecha, respetando el orden en que llegan.
function groupByDay(movements) {
  const groups = [];
  for (const movement of movements) {
    const last = groups.at(-1);
    if (last && last.date === movement.date) last.items.push(movement);
    else groups.push({ date: movement.date, items: [movement] });
  }
  return groups;
}

// Encabezado del dia: "Hoy · lun 5 oct" (o "Programado · jue 30 oct" si todavia
// no llego: esos movimientos no estan en el saldo) y el neto del dia. El neto solo se
// muestra si hay mas de un movimiento (con uno repetiria el monto de la fila)
// y si son todos de la misma moneda.
function DayHeader({ date, items }) {
  const { t, locale } = useLanguage();
  const pretty = formatDate(date, locale, { weekday: "short", day: "numeric", month: "short" });
  const scheduled = date > todayISO();
  const label =
    date === todayISO()
      ? `${t("todayLabel")} · ${pretty}`
      : date === yesterdayISO()
        ? `${t("yesterdayLabel")} · ${pretty}`
        : pretty;
  const currencies = new Set(items.map((item) => item.currency));
  const net =
    items.length > 1 && currencies.size === 1
      ? items.reduce((sum, item) => sum + (item.type === "income" ? item.amount : -item.amount), 0)
      : null;

  return (
    <div className="flex items-center justify-between px-2 pt-3 pb-1 text-xs text-[color:var(--text-4)]">
      <span className="flex items-center gap-1.5">
        {scheduled && (
          <span className="rounded-md border border-fg/10 px-1.5 py-0.5 text-[11px] leading-none text-[color:var(--text-3)]">
            {t("scheduledLabel")}
          </span>
        )}
        {label}
      </span>
      {net !== null && (
        <Money
          amount={net}
          type={net > 0 ? "income" : net < 0 ? "expense" : "neutral"}
          currency={[...currencies][0]}
          className={cn("font-normal", net <= 0 && "text-[color:var(--text-3)]")}
        />
      )}
    </div>
  );
}

// Actividad reciente (dashboard), agrupada por dia. Cada fila es un boton
// grande (comodo para el pulgar) que abre la edicion.
function ExpenseList({ movements, onEdit }) {
  const { t, locale } = useLanguage();
  const { nameOf } = useCategories();

  return (
    <div className="-mx-2 -mt-2">
      {groupByDay(movements).map((group) => (
        <section key={group.date} aria-label={formatDate(group.date, locale)}>
          <DayHeader date={group.date} items={group.items} />
          <ul className="m-0 flex list-none flex-col p-0">
            {group.items.map((movement) => (
              <li key={movement.id}>
                <button
                  type="button"
                  onClick={() => onEdit(movement)}
                  aria-label={movementLabel(movement, t, locale, nameOf)}
                  className="group flex min-h-14 w-full touch-manipulation items-center gap-3 rounded-[10px] px-2 py-2 text-left transition-colors outline-none hover:bg-fg/[0.035] focus-visible:ring-2 focus-visible:ring-ring active:bg-fg/[0.05]"
                >
                  <CategoryIcon category={movement.category} />
                  <div className="min-w-0 flex-1">
                    <p className="m-0 flex min-w-0 items-center gap-1.5 text-[15px] sm:text-sm">
                      <span className="truncate">{movement.title}</span>
                      {movement.recurringId && <RecurringMark />}
                    </p>
                    <p className="m-0 truncate text-xs text-[color:var(--text-4)]">
                      {nameOf(movement.category)}
                    </p>
                  </div>
                  {movement.paymentMethod && (
                    <span className="hidden shrink-0 rounded-md border border-fg/[0.07] px-1.5 py-0.5 text-[11.5px] text-[color:var(--text-3)] sm:inline">
                      {t(`pm_${movement.paymentMethod}`)}
                    </span>
                  )}
                  <Money
                    listItem
                    type={movement.type}
                    amount={movement.amount}
                    currency={movement.currency}
                    className="min-w-24 text-right text-[14px] font-normal"
                  />
                  <ChevronRightIcon
                    aria-hidden="true"
                    className="size-4 shrink-0 text-[color:var(--text-4)] opacity-0 transition-all group-hover:translate-x-0.5 group-hover:opacity-100 max-sm:hidden"
                  />
                </button>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

export default ExpenseList;
