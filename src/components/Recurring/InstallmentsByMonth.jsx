import { useState } from "react";
import { ChevronDownIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { currentMonthKey, formatCurrency, formatMonth } from "@/lib/format";
import { installmentsSchedule } from "@/lib/installments";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/hooks/useLanguage";

// Meses que se ven antes de "Ver todos".
const VISIBLE_MONTHS = 6;

// Lista de meses con una barra proporcional al monto (el mes mas caro llena la barra).
function InstallmentsByMonth({ plans, currency, rate }) {
  const { t, locale } = useLanguage();
  const [expanded, setExpanded] = useState(false);
  const { months, convertible } = installmentsSchedule(plans, currency, rate);
  if (months.length === 0) return null;

  const max = Math.max(...months.map((item) => item.amount));
  const visible = expanded ? months : months.slice(0, VISIBLE_MONTHS);
  const thisMonth = currentMonthKey();

  return (
    <section aria-labelledby="installments-by-month" className="surface grid gap-3 rounded-2xl bg-card p-4 sm:p-5">
      <div className="grid gap-0.5">
        <h2 id="installments-by-month" className="m-0 text-sm font-medium">
          {t("installmentsByMonth")}
        </h2>
        <p className="m-0 text-xs text-muted-foreground">{t("installmentsByMonthHint")}</p>
      </div>

      <ul className="m-0 grid list-none gap-2.5 p-0">
        {visible.map(({ month, amount, count }) => {
          const label = formatMonth(month, locale);
          const value = formatCurrency(amount, locale, { currency });
          return (
            <li
              key={month}
              aria-label={`${label}: ${value}, ${t("installmentsCount", { count })}`}
              className="grid grid-cols-[minmax(7.5rem,9rem)_minmax(0,1fr)_auto] items-center gap-3 max-sm:grid-cols-[minmax(0,1fr)_auto] max-sm:gap-x-3 max-sm:gap-y-1.5"
            >
              <span className="min-w-0 truncate text-sm first-letter:uppercase">
                {label}
                {month === thisMonth && (
                  <span className="ml-1.5 text-xs text-muted-foreground">· {t("thisMonthShort")}</span>
                )}
              </span>
              {/* Barra: decorativa, el monto esta escrito al lado */}
              <span
                aria-hidden="true"
                className="h-2 overflow-hidden rounded-full bg-fg/[0.06] max-sm:order-3 max-sm:col-span-2"
              >
                <span
                  className="block h-full rounded-full bg-expense/80"
                  style={{ width: `${Math.max(2, (amount / max) * 100)}%` }}
                />
              </span>
              <span className="text-right text-sm font-medium tabular-nums">
                {value}
                <span className="block text-[11px] font-normal text-muted-foreground">
                  {t("installmentsCount", { count })}
                </span>
              </span>
            </li>
          );
        })}
      </ul>

      {months.length > VISIBLE_MONTHS && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setExpanded((value) => !value)}
          aria-expanded={expanded}
          className="justify-self-start"
        >
          <ChevronDownIcon
            data-icon="inline-start"
            className={cn("transition-transform", expanded && "rotate-180")}
          />
          {expanded ? t("showLess") : t("showAllMonths", { count: months.length })}
        </Button>
      )}

      {!convertible && <p className="m-0 text-xs text-warn">{t("rateMissingShort")}</p>}
    </section>
  );
}

export default InstallmentsByMonth;
