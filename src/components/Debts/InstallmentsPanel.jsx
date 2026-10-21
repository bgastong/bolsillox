import { useCallback } from "react";
import InstallmentAlerts from "@/components/Recurring/InstallmentAlerts";
import InstallmentRow from "@/components/Recurring/InstallmentRow";
import InstallmentsByMonth from "@/components/Recurring/InstallmentsByMonth";
import { EmptyState, ErrorState } from "@/components/States/States";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api";
import { currentMonthKey, formatCurrency } from "@/lib/format";
import { convertAmount } from "@/lib/money";
import { useApiData } from "@/hooks/useApiData";
import { useLanguage } from "@/hooks/useLanguage";
import { useMovements } from "@/hooks/useMovements";
import { useSettings } from "@/hooks/useSettings";

// Suma montos de varias monedas en la elegida (convertible = false si falta la cotizacion).
function sumIn(items, amountOf, currency, rate) {
  const total = { amount: 0, convertible: true };
  for (const item of items) {
    const value = convertAmount(amountOf(item), item.currency, currency, rate);
    if (value === null) total.convertible = false;
    else total.amount += value;
  }
  return total;
}

/*
Deudas > Debo: compras en cuotas. Lo que falta pagar, lo que vence este mes
y cada compra con su progreso. Son reglas recurrentes con cantidad de cuotas
(ver server/recurring.js); los recurrentes comunes estan en su propia pantalla.
addButton: boton para cargar una compra en cuotas (lo arma la pagina).
*/
function InstallmentsPanel({ addButton }) {
  const { t, locale } = useLanguage();
  const { openEditRecurring, version } = useMovements();
  const { currency, rate } = useSettings();

  const loadRules = useCallback(
    (signal) => api.listRecurring({ signal }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [version],
  );
  const { data: allRules, error, loading, reload } = useApiData(loadRules);
  const plans = allRules?.filter((rule) => rule.kind === "installments");

  // En curso primero (la proxima cuota mas cercana arriba); las pagadas al final.
  const ongoing = (plans ?? [])
    .filter((rule) => rule.nextDate)
    .sort((a, b) => a.nextDate.localeCompare(b.nextDate));
  const finished = (plans ?? []).filter((rule) => !rule.nextDate);

  const pendingExpenses = ongoing.filter((rule) => rule.active && rule.type === "expense");
  const pending = sumIn(pendingExpenses, (rule) => rule.remainingAmount, currency, rate);
  const thisMonth = sumIn(
    pendingExpenses.filter((rule) => rule.nextDate.slice(0, 7) === currentMonthKey()),
    (rule) => rule.amount,
    currency,
    rate,
  );

  return (
    <>
      <InstallmentAlerts />

      {error && !plans ? (
        <ErrorState error={error} onRetry={reload} />
      ) : !plans ? (
        <div className="grid gap-2" aria-hidden="true">
          {Array.from({ length: 3 }, (_, index) => (
            <Skeleton key={index} className="h-24 w-full rounded-2xl" />
          ))}
        </div>
      ) : plans.length === 0 ? (
        <EmptyState message={t("installmentsEmpty")}>{addButton}</EmptyState>
      ) : (
        <div className="grid grid-cols-1 gap-4 transition-opacity" style={{ opacity: loading ? 0.6 : 1 }}>
          <section
            aria-label={t("installmentsSummaryLabel")}
            className="surface grid grid-cols-2 gap-3 rounded-2xl bg-card p-4 sm:p-5"
          >
            <div className="grid gap-1">
              <p className="m-0 text-xs text-muted-foreground">{t("installmentsPendingTotal")}</p>
              <p className="m-0 text-xl font-medium tracking-[-0.03em] tabular-nums">
                {formatCurrency(pending.amount, locale, { currency })}
              </p>
            </div>
            <div className="grid gap-1">
              <p className="m-0 text-xs text-muted-foreground">{t("installmentsThisMonth")}</p>
              <p className="m-0 text-xl font-medium tracking-[-0.03em] tabular-nums">
                {formatCurrency(thisMonth.amount, locale, { currency })}
              </p>
            </div>
            <p className="col-span-2 m-0 text-xs text-muted-foreground">
              {t("installmentsOngoingCount", { count: ongoing.length })}
            </p>
            {!(pending.convertible && thisMonth.convertible) && (
              <p className="col-span-2 m-0 text-xs text-warn">{t("rateMissingShort")}</p>
            )}
          </section>

          <InstallmentsByMonth plans={ongoing} currency={currency} rate={rate} />

          {ongoing.length > 0 && (
            <ul aria-label={t("installmentsOngoing")} className="m-0 flex list-none flex-col gap-2 p-0">
              {ongoing.map((rule) => (
                <li key={rule.id}>
                  <InstallmentRow rule={rule} onEdit={openEditRecurring} />
                </li>
              ))}
            </ul>
          )}

          {finished.length > 0 && (
            <section aria-labelledby="installments-finished" className="grid gap-2">
              <h2 id="installments-finished" className="m-0 px-1 text-sm font-medium text-muted-foreground">
                {t("installmentsFinished")}
              </h2>
              <ul className="m-0 flex list-none flex-col gap-2 p-0">
                {finished.map((rule) => (
                  <li key={rule.id}>
                    <InstallmentRow rule={rule} onEdit={openEditRecurring} />
                  </li>
                ))}
              </ul>
            </section>
          )}

          <p className="m-0 px-1 text-xs text-muted-foreground">{t("installmentsHowItWorks")}</p>
        </div>
      )}
    </>
  );
}

export default InstallmentsPanel;
