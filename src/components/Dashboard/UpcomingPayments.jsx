import { useCallback } from "react";
import { api } from "@/lib/api";
import { formatCurrency, parseISODate, todayISO } from "@/lib/format";
import { useApiData } from "@/hooks/useApiData";
import { useLanguage } from "@/hooks/useLanguage";
import { useMovements } from "@/hooks/useMovements";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/States/States";
import { Button } from "@/components/ui/button";
import Panel from "./Panel";

const MAX_ITEMS = 3;

function daysUntil(date) {
  const ms = parseISODate(date) - parseISODate(todayISO());
  return Math.round(ms / 86400000);
}

// Fecha como mini calendario: mes arriba (rojo, como un vencimiento) y dia abajo.
function CalendarDate({ date }) {
  const { locale } = useLanguage();
  const value = parseISODate(date);
  const month = new Intl.DateTimeFormat(locale, { month: "short" }).format(value).replace(".", "");
  return (
    <span
      aria-hidden="true"
      className="flex size-10 shrink-0 flex-col items-center justify-center rounded-[9px] border border-fg/[0.07] bg-fg/[0.02] leading-none"
    >
      <span className="font-mono text-[9px] font-medium tracking-[0.06em] text-expense uppercase">{month}</span>
      <span className="mt-[3px] font-mono text-[15px] font-medium">{String(value.getDate()).padStart(2, "0")}</span>
    </span>
  );
}

// Proximos gastos recurrentes (los que todavia no se generaron), por fecha.
function UpcomingPayments({ className }) {
  const { t, locale } = useLanguage();
  const { version, openCreateRecurring } = useMovements();

  const load = useCallback(
    (signal) => api.listRecurring({ signal }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [version],
  );
  const { data: rules } = useApiData(load);

  const upcoming = (rules ?? [])
    .filter((rule) => rule.active && rule.type === "expense" && rule.nextDate)
    .sort((a, b) => a.nextDate.localeCompare(b.nextDate))
    .slice(0, MAX_ITEMS);
  const total = upcoming.every((rule) => rule.currency === upcoming[0]?.currency)
    ? upcoming.reduce((sum, rule) => sum + rule.amount, 0)
    : null;

  return (
    <Panel
      className={className}
      title={t("upcomingTitle")}
      titleId="upcoming-title"
      action={
        total !== null && upcoming.length > 0 ? (
          <span className="text-xs text-[color:var(--text-3)] tabular-nums">
            {formatCurrency(total, locale, { currency: upcoming[0].currency })}
          </span>
        ) : null
      }
    >
      {!rules ? (
        <div className="grid gap-3">
          {Array.from({ length: 3 }, (_, index) => (
            <Skeleton key={index} className="h-10 rounded-lg" />
          ))}
        </div>
      ) : upcoming.length ? (
        <ul className="-mx-2 -mt-1 m-0 flex list-none flex-col p-0">
          {upcoming.map((rule) => {
            const days = daysUntil(rule.nextDate);
            return (
              <li key={rule.id} className="flex items-center gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-fg/[0.03]">
                <CalendarDate date={rule.nextDate} />
                <div className="min-w-0 flex-1">
                  <p className="m-0 truncate text-sm">
                    {rule.title}
                    {rule.kind === "installments" && rule.nextInstallment && (
                      <span className="text-muted-foreground">
                        {" "}
                        ({rule.nextInstallment}/{rule.installmentsTotal})
                      </span>
                    )}
                  </p>
                  <p className="m-0 truncate text-xs text-[color:var(--text-4)]">
                    {days < 0 ? (
                      <span className="text-expense">{t("installmentOverdue", { count: -days })}</span>
                    ) : days === 0 ? (
                      t("dueToday")
                    ) : (
                      t("dueInDays", { count: days })
                    )}{" "}
                    · {t(`pm_${rule.paymentMethod}`)}
                  </p>
                </div>
                <span className="text-[13.5px] whitespace-nowrap text-expense tabular-nums">
                  {formatCurrency(-rule.amount, locale, { signed: true, currency: rule.currency })}
                </span>
              </li>
            );
          })}
        </ul>
      ) : (
        <EmptyState message={t("upcomingEmpty")}>
          <Button size="sm" variant="outline" onClick={openCreateRecurring}>
            {t("upcomingCreate")}
          </Button>
        </EmptyState>
      )}
    </Panel>
  );
}

export default UpcomingPayments;
