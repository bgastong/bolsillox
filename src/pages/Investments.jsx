import { useCallback, useState } from "react";
import { PlusIcon } from "lucide-react";
import PlanTabs from "@/components/Budgets/PlanTabs";
import DollarPanel from "@/components/Investments/DollarPanel";
import IndexPanel from "@/components/Investments/IndexPanel";
import InvestmentCard from "@/components/Investments/InvestmentCard";
import InvestmentDialog from "@/components/Investments/InvestmentDialog";
import InvestmentEntryDialog from "@/components/Investments/InvestmentEntryDialog";
import { PageHeader } from "@/components/Movements/MovementBits";
import { EmptyState, ErrorState } from "@/components/States/States";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api";
import { formatCurrency, formatPercent } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useApiData } from "@/hooks/useApiData";
import { useLanguage } from "@/hooks/useLanguage";
import { useMovements } from "@/hooks/useMovements";

const INDEX_NAMES = { sp500: "S&P 500" };

// Totales por moneda de las inversiones con precio: aportado, valor y ganancia.
function totalsByCurrency(items) {
  const totals = new Map();
  for (const item of items) {
    if (item.pending || !item.entries.length) continue;
    const current = totals.get(item.currency) ?? { invested: 0, value: 0 };
    totals.set(item.currency, { invested: current.invested + item.invested, value: current.value + item.value });
  }
  return [...totals].map(([currency, { invested, value }]) => ({
    currency,
    invested,
    value,
    gain: value - invested,
    gainPercent: invested > 0 ? ((value - invested) / invested) * 100 : null,
  }));
}

/*
Inversiones: aportes que siguen a un indice (por ahora, el S&P 500), cuanto
valen hoy y cuanto se gano; el historico del indice y el del dolar por
gobierno, con cada compra marcada.
*/
function Investments() {
  const { t, locale } = useLanguage();
  const { notifyChange } = useMovements();
  const [editing, setEditing] = useState(null);
  const [entry, setEntry] = useState(null);
  const [savedVersion, setSavedVersion] = useState(0);

  const load = useCallback(
    (signal) => api.listInvestments({ signal }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [savedVersion],
  );
  const { data: items, error, loading, reload } = useApiData(load);
  const refresh = () => setSavedVersion((value) => value + 1);
  const totals = totalsByCurrency(items ?? []);

  const newButton = (
    <Button onClick={() => setEditing({ item: null })}>
      <PlusIcon data-icon="inline-start" />
      {t("newInvestment")}
    </Button>
  );

  let content;
  if (error && !items) content = <ErrorState error={error} onRetry={reload} />;
  else if (!items) {
    content = (
      <div className="grid gap-3 md:grid-cols-2" aria-hidden="true">
        <Skeleton className="h-72 w-full rounded-2xl" />
        <Skeleton className="h-72 w-full rounded-2xl" />
      </div>
    );
  } else if (!items.length) {
    content = <EmptyState message={t("investmentsEmpty")}>{newButton}</EmptyState>;
  } else {
    content = (
      <div className="grid gap-5 transition-opacity" style={{ opacity: loading ? 0.6 : 1 }}>
        {totals.length > 0 && (
          <section aria-label={t("investmentsSummaryLabel")} className="surface grid gap-4 rounded-2xl bg-card p-4 sm:p-5">
            {totals.map((total) => {
              const money = (value, options) => formatCurrency(value, locale, { currency: total.currency, ...options });
              const up = total.gain >= 0;
              return (
                <dl key={total.currency} className="m-0 grid grid-cols-2 gap-3 sm:grid-cols-3">
                  <div className="grid gap-1">
                    <dt className="text-xs text-muted-foreground">{t("investmentsInvested")}</dt>
                    <dd className="m-0 text-lg font-medium tabular-nums">{money(total.invested)}</dd>
                  </div>
                  <div className="grid gap-1">
                    <dt className="text-xs text-muted-foreground">{t("investmentsValue")}</dt>
                    <dd className="m-0 text-lg font-medium tabular-nums">{money(total.value)}</dd>
                  </div>
                  <div className="col-span-2 grid gap-1 sm:col-span-1">
                    <dt className="text-xs text-muted-foreground">{t("investmentsGain")}</dt>
                    <dd className={cn("m-0 text-lg font-medium tabular-nums", up ? "text-income" : "text-danger")}>
                      {money(total.gain, { signed: true })}
                      {total.gainPercent !== null && (
                        <span className="ml-1.5 text-sm font-normal">({formatPercent(total.gainPercent, locale)})</span>
                      )}
                    </dd>
                  </div>
                </dl>
              );
            })}
          </section>
        )}
        <ul className="m-0 grid list-none grid-cols-1 gap-3 p-0 lg:grid-cols-2">
          {items.map((item) => (
            <li key={item.id}>
              <InvestmentCard
                item={item}
                indexName={INDEX_NAMES[item.index] ?? item.index}
                onEdit={(target) => setEditing({ item: target })}
                onEntry={(target, type) => setEntry({ item: target, type })}
              />
            </li>
          ))}
        </ul>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-5">
      <PageHeader title={t("investmentsTitle")} subtitle={t("investmentsSubtitle")} actions={items?.length ? newButton : null} />
      <PlanTabs />
      {content}
      {/* Graficos de mercado: cambian con el indice y con las compras */}
      <IndexPanel key={`index-${savedVersion}`} index="sp500" />
      <DollarPanel key={`dollar-${savedVersion}`} />
      <p className="m-0 px-1 text-xs text-muted-foreground">{t("investmentsHowItWorks")}</p>

      <InvestmentDialog target={editing} onClose={() => setEditing(null)} onDone={refresh} />
      <InvestmentEntryDialog
        target={entry}
        onClose={() => setEntry(null)}
        onChanged={(movementsChanged) => {
          refresh();
          if (movementsChanged) notifyChange();
        }}
      />
    </div>
  );
}

export default Investments;
