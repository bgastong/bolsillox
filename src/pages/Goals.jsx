import { useCallback, useState } from "react";
import { PlusIcon } from "lucide-react";
import PlanTabs from "@/components/Budgets/PlanTabs";
import GoalCard from "@/components/Goals/GoalCard";
import GoalDialog from "@/components/Goals/GoalDialog";
import GoalEntryDialog from "@/components/Goals/GoalEntryDialog";
import { PageHeader } from "@/components/Movements/MovementBits";
import { EmptyState, ErrorState } from "@/components/States/States";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api";
import { formatCurrency } from "@/lib/format";
import { useApiData } from "@/hooks/useApiData";
import { useLanguage } from "@/hooks/useLanguage";
import { useMovements } from "@/hooks/useMovements";

// Suma por moneda: "$ 150.000 · US$ 200" (o $ 0 si no hay nada).
function byCurrency(goals, pick, locale) {
  const totals = new Map();
  for (const goal of goals) totals.set(goal.currency, (totals.get(goal.currency) ?? 0) + pick(goal));
  const parts = [...totals].filter(([, amount]) => amount > 0);
  if (!parts.length) return formatCurrency(0, locale);
  return parts.map(([currency, amount]) => formatCurrency(amount, locale, { currency })).join(" · ");
}

/*
Metas de ahorro: para que se junta plata, cuanto se lleva y cuanto apartar
por mes para llegar a tiempo. Arriba, lo ahorrado en total y lo que toca
apartar este mes entre todas.
*/
function Goals() {
  const { t, locale } = useLanguage();
  const { notifyChange } = useMovements();
  const [editing, setEditing] = useState(null);
  const [entry, setEntry] = useState(null);
  const [savedVersion, setSavedVersion] = useState(0);

  const load = useCallback(
    (signal) => api.listGoals({ signal }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [savedVersion],
  );
  const { data: goals, error, loading, reload } = useApiData(load);
  const refresh = () => setSavedVersion((value) => value + 1);

  const active = (goals ?? []).filter((goal) => goal.status !== "done");
  const done = (goals ?? []).filter((goal) => goal.status === "done");
  const behind = active.filter((goal) => goal.status === "behind").length;

  const newButton = (
    <Button onClick={() => setEditing({ goal: null })}>
      <PlusIcon data-icon="inline-start" />
      {t("newGoal")}
    </Button>
  );

  let content;
  if (error && !goals) content = <ErrorState error={error} onRetry={reload} />;
  else if (!goals) {
    content = (
      <div className="grid gap-3 md:grid-cols-2" aria-hidden="true">
        <Skeleton className="h-24 w-full rounded-2xl md:col-span-2" />
        {Array.from({ length: 2 }, (_, index) => (
          <Skeleton key={index} className="h-56 w-full rounded-2xl" />
        ))}
      </div>
    );
  } else if (!goals.length) {
    content = (
      <EmptyState message={t("goalsEmpty")}>
        {newButton}
      </EmptyState>
    );
  } else {
    const card = (goal) => (
      <li key={goal.id}>
        <GoalCard goal={goal} onEdit={(item) => setEditing({ goal: item })} onEntry={(item, type) => setEntry({ goal: item, type })} />
      </li>
    );
    content = (
      <div className="grid grid-cols-1 gap-5 transition-opacity" style={{ opacity: loading ? 0.6 : 1 }}>
        <section aria-label={t("goalsSummaryLabel")} className="surface grid gap-4 rounded-2xl bg-card p-4 sm:grid-cols-2 sm:p-5">
          <div className="grid gap-1">
            <p className="m-0 text-xs text-muted-foreground">{t("goalsSaved")}</p>
            <p className="m-0 text-xl font-medium tracking-[-0.03em] text-income tabular-nums">
              {byCurrency(goals, (goal) => Math.max(goal.saved, 0), locale)}
            </p>
          </div>
          <div className="grid gap-1">
            <p className="m-0 text-xs text-muted-foreground">{t("goalsThisMonth")}</p>
            <p className="m-0 text-xl font-medium tracking-[-0.03em] tabular-nums">
              {byCurrency(active, (goal) => goal.thisMonthLeft ?? 0, locale)}
            </p>
            <p className="m-0 text-xs text-muted-foreground">
              {behind ? t("goalsBehindCount", { count: behind }) : t("goalsAllOnTrack")}
            </p>
          </div>
        </section>

        {active.length > 0 && (
          <section aria-labelledby="goals-active" className="grid gap-3">
            <h2 id="goals-active" className="m-0 text-lg font-medium">
              {t("goalsActive")}
            </h2>
            <ul className="m-0 grid list-none grid-cols-1 gap-3 p-0 md:grid-cols-2 xl:grid-cols-3">{active.map(card)}</ul>
          </section>
        )}

        {done.length > 0 && (
          <section aria-labelledby="goals-done" className="grid gap-3">
            <h2 id="goals-done" className="m-0 text-lg font-medium">
              {t("goalsDone")}
            </h2>
            <ul className="m-0 grid list-none grid-cols-1 gap-3 p-0 md:grid-cols-2 xl:grid-cols-3">{done.map(card)}</ul>
          </section>
        )}

        <p className="m-0 px-1 text-xs text-muted-foreground">{t("goalsHowItWorks")}</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-5">
      <PageHeader title={t("goalsTitle")} subtitle={t("goalsSubtitle")} actions={goals?.length ? newButton : null} />
      <PlanTabs />
      {content}
      <GoalDialog target={editing} onClose={() => setEditing(null)} onDone={refresh} />
      <GoalEntryDialog
        target={entry}
        onClose={() => setEntry(null)}
        // Si el aporte se cargo como gasto (o el retiro como ingreso), cambian tambien el saldo y los movimientos.
        onChanged={(_goal, movementsChanged) => {
          refresh();
          if (movementsChanged) notifyChange();
        }}
      />
    </div>
  );
}

export default Goals;
