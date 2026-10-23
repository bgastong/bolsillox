import { useCallback, useState } from "react";
import BalanceHistoryChart from "@/components/Dashboard/Charts/BalanceHistoryChart";
import Panel from "@/components/Dashboard/Panel";
import Money from "@/components/Money/Money";
import { Segmented } from "@/components/Movements/MovementForm";
import { EmptyState } from "@/components/States/States";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api";
import { formatCurrency } from "@/lib/format";
import { useApiData } from "@/hooks/useApiData";
import { useLanguage } from "@/hooks/useLanguage";
import { useMovements } from "@/hooks/useMovements";

const RANGES = ["7d", "1m", "3m", "6m", "1y", "all"];
const DEFAULT_RANGE = "6m";
// El rango elegido se recuerda en este navegador.
const RANGE_STORAGE_KEY = "bolsillox.cashflowRange";

function getStoredRange() {
  try {
    const saved = localStorage.getItem(RANGE_STORAGE_KEY);
    if (RANGES.includes(saved)) return saved;
  } catch {
    // sin storage
  }
  return DEFAULT_RANGE;
}

/*
Flujo de caja del Inicio con su filtro de rango (7 dias, 1 mes, 3 y 6 meses, 1 año
o todo). Arriba, cuanto cambio el saldo en ese rango; abajo, el grafico.
- to: ultimo dia del grafico (hoy, o el fin del mes elegido en el Inicio).
*/
function CashflowPanel({ to, currency, className }) {
  const { t, locale } = useLanguage();
  const { version } = useMovements();
  const [range, setRange] = useState(getStoredRange);

  const load = useCallback(
    (signal) => api.getCashflow({ range, to, currency }, { signal }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [range, to, currency, version],
  );
  const { data: flow, loading } = useApiData(load);

  function changeRange(next) {
    setRange(next);
    try {
      localStorage.setItem(RANGE_STORAGE_KEY, next);
    } catch {
      // ignorado
    }
  }

  // Mientras carga otro rango queda el anterior, mas tenue.
  const current = flow;
  const change = current?.points.length ? current.points.at(-1).balance - current.start : 0;

  return (
    <Panel className={className} title={t("cashflowTitle")} titleId="cashflow-title" hint={t("cashflowHint")}>
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
        {/* Cuanto cambio el saldo en el rango */}
        <p className="m-0 flex min-h-8 items-baseline gap-2 text-xs text-[color:var(--text-3)]" aria-live="polite">
          {current?.points.length ? (
            <>
              <Money
                amount={change}
                type={change > 0 ? "income" : change < 0 ? "expense" : "neutral"}
                currency={currency}
                // El lector de pantalla dice "Subio $ X" o "Bajo $ X", no "Ingreso de".
                label={t(change < 0 ? "cashflowChangeDown" : "cashflowChangeUp", {
                  amount: formatCurrency(Math.abs(change), locale, { currency }),
                })}
                className="text-base tracking-[-0.03em]"
              />
              <span>{t(`cashflowRangeText_${current.range}`)}</span>
            </>
          ) : null}
        </p>
        <Segmented
          label={t("cashflowRangeLabel")}
          size="sm"
          className="w-full sm:w-auto sm:min-w-[19rem]"
          value={range}
          onChange={changeRange}
          options={RANGES.map((value) => ({ value, label: t(`cashflowRange_${value}`) }))}
        />
      </div>

      {!flow ? (
        <Skeleton className="h-60 w-full rounded-lg sm:h-64" />
      ) : flow.points.length ? (
        <div
          className="flex flex-col transition-opacity xl:flex-1"
          style={{ opacity: loading || flow.range !== range ? 0.55 : 1 }}
          aria-busy={loading}
        >
          <BalanceHistoryChart flow={flow} currency={currency} />
        </div>
      ) : (
        <EmptyState message={t("cashflowEmpty")} />
      )}
    </Panel>
  );
}

export default CashflowPanel;
