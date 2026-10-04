import { useCallback, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronLeftIcon, ChevronRightIcon, PlusIcon } from "lucide-react";
import SummaryCards, {
  SummaryCardsSkeleton,
} from "@/components/Cards/SummaryCards/SummaryCards";
import CategoryBreakdown from "@/components/Dashboard/Charts/CategoryBreakdown";
import MonthlyChart from "@/components/Dashboard/Charts/MonthlyChart";
import ExpenseList from "@/components/Dashboard/ExpenseList/ExpenseList";
import Panel from "@/components/Dashboard/Panel";
import { PageHeader } from "@/components/Movements/MovementBits";
import { EmptyState, ErrorState } from "@/components/States/States";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api";
import { currentMonthKey, formatMonth, shiftMonth } from "@/lib/format";
import { useApiData } from "@/hooks/useApiData";
import { useLanguage } from "@/hooks/useLanguage";
import { useMovements } from "@/hooks/useMovements";
import "@/components/Dashboard/Charts/chartSetup";

function capitalize(text) {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function MonthPicker({ month, onChange }) {
  const { t, locale } = useLanguage();
  const isCurrent = month >= currentMonthKey();

  return (
    <div className="flex h-11 w-full items-center justify-between rounded-xl border border-input bg-white/[0.03] sm:h-10 sm:w-auto sm:rounded-lg sm:[&>button]:size-9">
      <Button
        variant="ghost"
        size="icon"
        className="rounded-l-xl sm:rounded-l-lg"
        onClick={() => onChange(shiftMonth(month, -1))}
        aria-label={t("previousMonth")}
      >
        <ChevronLeftIcon />
      </Button>
      <span
        className="min-w-32 px-2 text-center text-sm font-medium"
        aria-live="polite"
        aria-atomic="true"
      >
        {capitalize(formatMonth(month, locale))}
      </span>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => onChange(shiftMonth(month, 1))}
        disabled={isCurrent}
        aria-label={t("nextMonth")}
        className="rounded-r-xl sm:rounded-r-lg"
      >
        <ChevronRightIcon />
      </Button>
    </div>
  );
}

function PanelSkeleton({ className = "h-64" }) {
  return <Skeleton className={`w-full rounded-lg ${className}`} />;
}

function Dashboard() {
  const { t, locale } = useLanguage();
  const [month, setMonth] = useState(currentMonthKey);
  const { openCreate, openEdit, version } = useMovements();

  // `version` cambia al crear/editar/borrar: fuerza la recarga del resumen.
  const loadSummary = useCallback(
    (signal) => api.getSummary(month, { signal }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [month, version],
  );
  const { data: summary, error, loading, reload } = useApiData(loadSummary);

  const hasMonthlyData = summary?.monthly.some(
    (item) => item.income || item.expense,
  );
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

      {error && !summary ? (
        <ErrorState error={error} onRetry={reload} />
      ) : (
        <div
          className="grid gap-6 transition-opacity"
          style={{ opacity: loading && summary ? 0.6 : 1 }}
          aria-busy={loading}
        >
          {showSkeleton ? (
            <SummaryCardsSkeleton />
          ) : (
            <SummaryCards summary={summary} />
          )}

          {/* En mobile primero los ultimos movimientos, luego los graficos */}
          <div className="grid gap-6 lg:grid-cols-5">
            <Panel
              className="order-3 lg:order-1 lg:col-span-3"
              title={t("chartMonthly")}
              hint={t("chartMonthlyHint")}
            >
              {showSkeleton ? (
                <PanelSkeleton className="h-64 sm:h-72" />
              ) : hasMonthlyData ? (
                <MonthlyChart data={summary.monthly} />
              ) : (
                <EmptyState message={t("chartEmpty")} />
              )}
            </Panel>

            <Panel
              className="order-2 lg:col-span-2"
              title={t("chartByCategory")}
              hint={t("chartByCategoryHint")}
            >
              {showSkeleton ? (
                <PanelSkeleton />
              ) : summary.byCategory.length ? (
                <CategoryBreakdown data={summary.byCategory} />
              ) : (
                <EmptyState message={t("chartEmpty")} />
              )}
            </Panel>

            <Panel
              className="order-1 lg:order-3 lg:col-span-5"
              title={t("recentMovements")}
              action={
                <Button
                  asChild
                  variant="link"
                  className="-mt-2.5 -mr-3"
                >
                  <Link to="/history">{t("viewAll")}</Link>
                </Button>
              }
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
          </div>
        </div>
      )}
    </div>
  );
}

export default Dashboard;
