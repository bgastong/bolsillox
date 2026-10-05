import { useCallback, useState } from "react";
import { Link } from "react-router-dom";
import { PlusIcon, TriangleAlertIcon } from "lucide-react";
import SummaryCards, {
  SummaryCardsSkeleton,
} from "@/components/Cards/SummaryCards/SummaryCards";
import BudgetRow from "@/components/Budgets/BudgetRow";
import DollarRates from "@/components/Dashboard/DollarRates";
import CategoryBreakdown from "@/components/Dashboard/Charts/CategoryBreakdown";
import MonthlyChart from "@/components/Dashboard/Charts/MonthlyChart";
import ExpenseList from "@/components/Dashboard/ExpenseList/ExpenseList";
import Panel from "@/components/Dashboard/Panel";
import MonthPicker from "@/components/MonthPicker/MonthPicker";
import { PageHeader } from "@/components/Movements/MovementBits";
import { EmptyState, ErrorState } from "@/components/States/States";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api";
import { currentMonthKey, formatMonth } from "@/lib/format";
import { useApiData } from "@/hooks/useApiData";
import { useLanguage } from "@/hooks/useLanguage";
import { useMovements } from "@/hooks/useMovements";
import { useSettings } from "@/hooks/useSettings";
import "@/components/Dashboard/Charts/chartSetup";

// Presupuestos que se muestran en el dashboard (los mas comprometidos).
const DASHBOARD_BUDGETS = 3;

function PanelSkeleton({ className = "h-64" }) {
  return <Skeleton className={`w-full rounded-lg ${className}`} />;
}

function PanelLink({ to, children }) {
  return (
    <Button asChild variant="link" className="-mt-2.5 -mr-3">
      <Link to={to}>{children}</Link>
    </Button>
  );
}

function Dashboard() {
  const { t, locale } = useLanguage();
  const [month, setMonth] = useState(currentMonthKey);
  const { openCreate, openEdit, version } = useMovements();
  const { currency, rate } = useSettings();

  // Se recarga al cambiar de mes o de moneda, al crear/editar/borrar
  // (`version`) y cuando cambia la cotizacion.
  const loadSummary = useCallback(
    (signal) => api.getSummary(month, currency, { signal }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [month, currency, version, rate],
  );
  const { data: summary, error, loading, reload } = useApiData(loadSummary);

  const loadBudgets = useCallback(
    (signal) => api.getBudgets(month, { signal }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [month, version, rate],
  );
  const { data: budgets } = useApiData(loadBudgets);

  const hasMonthlyData = summary?.monthly.some((item) => item.income || item.expense);
  const showSkeleton = loading && !summary;

  return (
    <div className="grid gap-6">
      <PageHeader
        title={t("dashboardTitle")}
        subtitle={t("dashboardSubtitle", { month: formatMonth(month, locale) })}
        actions={
          <>
            <MonthPicker month={month} onChange={setMonth} />
            <Button onClick={openCreate} className="max-md:hidden">
              <PlusIcon data-icon="inline-start" />
              {t("newMovement")}
            </Button>
          </>
        }
      />

      {summary?.unconverted > 0 && (
        <p
          role="alert"
          className="m-0 flex flex-wrap items-center gap-x-2 gap-y-1 rounded-xl border border-amber-400/30 bg-amber-400/10 px-4 py-3 text-sm text-amber-200"
        >
          <TriangleAlertIcon className="size-4 shrink-0" aria-hidden="true" />
          <span className="flex-1">{t("rateMissingSummary", { count: summary.unconverted })}</span>
          <Link to="/settings" className="font-medium text-amber-100 underline underline-offset-4">
            {t("rateConfigure")}
          </Link>
        </p>
      )}

      {error && !summary ? (
        <ErrorState error={error} onRetry={reload} />
      ) : (
        <div
          className="grid gap-6 transition-opacity"
          style={{ opacity: loading && summary ? 0.6 : 1 }}
          aria-busy={loading}
        >
          {showSkeleton ? <SummaryCardsSkeleton /> : <SummaryCards summary={summary} />}

          <DollarRates />

          {/* En mobile: ultimos movimientos, presupuestos y despues los graficos */}
          <div className="grid gap-6 lg:grid-cols-5">
            <Panel
              className="order-4 lg:order-1 lg:col-span-3"
              title={t("chartMonthly")}
              hint={t("chartMonthlyHint")}
            >
              {showSkeleton ? (
                <PanelSkeleton className="h-64 sm:h-72" />
              ) : hasMonthlyData ? (
                <MonthlyChart data={summary.monthly} currency={summary.currency} />
              ) : (
                <EmptyState message={t("chartEmpty")} />
              )}
            </Panel>

            <Panel
              className="order-3 lg:order-2 lg:col-span-2"
              title={t("chartByCategory")}
              hint={t("chartByCategoryHint")}
            >
              {showSkeleton ? (
                <PanelSkeleton />
              ) : summary.byCategory.length ? (
                <CategoryBreakdown data={summary.byCategory} currency={summary.currency} />
              ) : (
                <EmptyState message={t("chartEmpty")} />
              )}
            </Panel>

            <Panel
              className="order-1 lg:order-3 lg:col-span-3"
              title={t("recentMovements")}
              action={<PanelLink to="/history">{t("viewAll")}</PanelLink>}
            >
              {showSkeleton ? (
                <div className="grid gap-3">
                  {Array.from({ length: 4 }, (_, index) => (
                    <PanelSkeleton key={index} className="h-12" />
                  ))}
                </div>
              ) : summary.recent.length ? (
                <ExpenseList movements={summary.recent} onEdit={openEdit} />
              ) : (
                <EmptyState message={t("emptyMovements")}>
                  <Button size="sm" onClick={openCreate}>
                    <PlusIcon data-icon="inline-start" />
                    {t("newMovement")}
                  </Button>
                </EmptyState>
              )}
            </Panel>

            <Panel
              className="order-2 lg:order-4 lg:col-span-2"
              title={t("budgetsTitle")}
              hint={t("budgetsPanelHint")}
              action={<PanelLink to="/budgets">{t("viewAll")}</PanelLink>}
            >
              {!budgets ? (
                <div className="grid gap-4">
                  {Array.from({ length: 3 }, (_, index) => (
                    <PanelSkeleton key={index} className="h-14" />
                  ))}
                </div>
              ) : budgets.items.length ? (
                <ul className="m-0 flex list-none flex-col gap-5 p-0">
                  {budgets.items.slice(0, DASHBOARD_BUDGETS).map((item) => (
                    <li key={item.category}>
                      <BudgetRow item={item} compact />
                    </li>
                  ))}
                </ul>
              ) : (
                <EmptyState message={t("budgetsEmptyShort")}>
                  <Button asChild size="sm" variant="outline">
                    <Link to="/budgets">{t("budgetsCreate")}</Link>
                  </Button>
                </EmptyState>
              )}
            </Panel>
          </div>
        </div>
      )}
    </div>
  );
}

export default Dashboard;
