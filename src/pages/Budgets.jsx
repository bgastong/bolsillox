import { useCallback, useState } from "react";
import { PlusIcon } from "lucide-react";
import BudgetDialog from "@/components/Budgets/BudgetDialog";
import BudgetRow from "@/components/Budgets/BudgetRow";
import MonthPicker from "@/components/MonthPicker/MonthPicker";
import { CategoryIcon, PageHeader } from "@/components/Movements/MovementBits";
import { EmptyState, ErrorState } from "@/components/States/States";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api";
import { currentMonthKey, formatCurrency } from "@/lib/format";
import { useApiData } from "@/hooks/useApiData";
import { useLanguage } from "@/hooks/useLanguage";
import { useCategories } from "@/hooks/useCategories";
import { useMovements } from "@/hooks/useMovements";
import { useSettings } from "@/hooks/useSettings";

function Budgets() {
  const { t, locale } = useLanguage();
  const { keysOf, nameOf } = useCategories();
  const { version } = useMovements();
  const { rate } = useSettings();
  const [month, setMonth] = useState(currentMonthKey);
  const [target, setTarget] = useState(null);
  const [savedVersion, setSavedVersion] = useState(0);

  // Recarga al cambiar de mes, al cargar movimientos, al guardar un
  // presupuesto o si cambia la cotizacion (los gastos en USD se convierten).
  const loadBudgets = useCallback(
    (signal) => api.getBudgets(month, { signal }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [month, version, savedVersion, rate],
  );
  const { data, error, loading, reload } = useApiData(loadBudgets);

  const budgeted = new Set(data?.items.map((item) => item.category));
  const unbudgeted = keysOf("expense").filter((category) => !budgeted.has(category));
  const alerts = data?.items.filter((item) => item.status !== "ok").length ?? 0;

  return (
    <div className="grid grid-cols-1 gap-6">
      <PageHeader
        title={t("budgetsTitle")}
        subtitle={t("budgetsSubtitle")}
        actions={<MonthPicker month={month} onChange={setMonth} />}
      />

      {error && !data ? (
        <ErrorState error={error} onRetry={reload} />
      ) : !data ? (
        <div className="grid gap-3" aria-hidden="true">
          <Skeleton className="h-28 w-full rounded-2xl" />
          {Array.from({ length: 3 }, (_, index) => (
            <Skeleton key={index} className="h-24 w-full rounded-2xl" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 transition-opacity" style={{ opacity: loading ? 0.6 : 1 }}>
          {data.items.length > 0 && (
            <section
              aria-label={t("budgetsTotal")}
              className="surface grid gap-3 rounded-2xl bg-card p-5"
            >
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="m-0 text-sm text-muted-foreground">{t("budgetsTotal")}</p>
                <p className="m-0 text-sm text-muted-foreground tabular-nums">
                  {Math.round(data.totals.percent)}%
                </p>
              </div>
              <p className="m-0 text-2xl font-medium tracking-[-0.03em] tabular-nums sm:text-3xl">
                {formatCurrency(data.totals.spent, locale)}
                <span className="text-base font-medium text-muted-foreground">
                  {" "}
                  / {formatCurrency(data.totals.amount, locale)}
                </span>
              </p>
              <div
                role="progressbar"
                aria-label={t("budgetsTotal")}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={Math.min(Math.round(data.totals.percent), 100)}
                className="h-2.5 overflow-hidden rounded-full bg-fg/[0.06]"
              >
                <div
                  className="h-full rounded-full bg-primary transition-[width] duration-500"
                  style={{ width: `${Math.min(data.totals.percent, 100)}%` }}
                />
              </div>
              <p className="m-0 text-xs text-muted-foreground">
                {alerts
                  ? t("budgetsAlerts", { count: alerts })
                  : t("budgetsAllGood")}
              </p>
            </section>
          )}

          <section aria-labelledby="budgets-active" className="grid gap-3">
            <h2 id="budgets-active" className="m-0 text-lg font-medium">
              {t("budgetsActive")}
            </h2>
            {data.items.length ? (
              <ul className="m-0 flex list-none flex-col gap-2 p-0">
                {data.items.map((item) => (
                  <li key={item.category}>
                    <BudgetRow
                      item={item}
                      onClick={() => setTarget({ category: item.category, current: item })}
                    />
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState message={t("budgetsEmpty")} />
            )}
          </section>

          {unbudgeted.length > 0 && (
            <section aria-labelledby="budgets-add" className="grid gap-3">
              <div className="grid gap-1">
                <h2 id="budgets-add" className="m-0 text-lg font-medium">
                  {t("budgetsAdd")}
                </h2>
                <p className="m-0 text-sm text-muted-foreground">{t("budgetsAddHint")}</p>
              </div>
              <ul className="m-0 grid list-none grid-cols-1 gap-2 p-0 sm:grid-cols-2 lg:grid-cols-3">
                {unbudgeted.map((category) => (
                  <li key={category}>
                    <button
                      type="button"
                      onClick={() => setTarget({ category, current: null })}
                      className="flex min-h-14 w-full touch-manipulation items-center gap-3 rounded-2xl border border-dashed bg-transparent px-3 py-2.5 text-left text-sm transition-colors outline-none hover:border-fg/20 hover:bg-fg/[0.02] focus-visible:ring-2 focus-visible:ring-ring active:bg-fg/[0.04]"
                    >
                      <CategoryIcon category={category} className="size-9 rounded-lg" />
                      <span className="flex-1 font-medium">{nameOf(category)}</span>
                      <PlusIcon className="size-4 text-muted-foreground" aria-hidden="true" />
                      <span className="sr-only">{t("budgetsAddFor")}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      )}

      <BudgetDialog
        target={target}
        onClose={() => setTarget(null)}
        onSaved={() => setSavedVersion((value) => value + 1)}
      />
    </div>
  );
}

export default Budgets;
