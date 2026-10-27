import { useCallback, useState } from "react";
import { ArrowDownRightIcon, ArrowUpRightIcon } from "lucide-react";
import Panel from "@/components/Dashboard/Panel";
import { Segmented } from "@/components/Movements/MovementForm";
import { ErrorState } from "@/components/States/States";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api";
import { formatCurrency, formatPercent } from "@/lib/format";
import { formatPoints, MARKET_RANGES, storeChoice, storedChoice, updatedText } from "@/lib/market";
import { cn } from "@/lib/utils";
import { useApiData } from "@/hooks/useApiData";
import { useLanguage } from "@/hooks/useLanguage";
import TrendChart from "./TrendChart";

const RANGE_KEY = "bolsillox.marketRange";

/*
Historico del indice (por ahora, el S&P 500): valor de hoy, cuanto se movio
en el dia y en el rango elegido, y el grafico.
*/
function IndexPanel({ index = "sp500", className }) {
  const { t, locale } = useLanguage();
  const [range, setRange] = useState(() => storedChoice(RANGE_KEY, MARKET_RANGES, "1y"));
  const load = useCallback((signal) => api.getMarket(index, range, { signal }), [index, range]);
  const { data, error, loading, reload } = useApiData(load);

  function changeRange(next) {
    setRange(next);
    storeChoice(RANGE_KEY, next);
  }

  const points = data?.points ?? [];
  const first = points[0]?.close;
  const last = points.at(-1)?.close;
  const rangeChange = first && last ? ((last - first) / first) * 100 : null;
  const dayUp = (data?.change ?? 0) >= 0;
  const DayIcon = dayUp ? ArrowUpRightIcon : ArrowDownRightIcon;

  let body;
  if (error && !data) body = <ErrorState error={error} onRetry={reload} />;
  else if (!data) body = <Skeleton className="h-64 w-full rounded-xl" />;
  else if (!data.available || !points.length) {
    body = <p className="m-0 rounded-xl bg-fg/[0.04] px-4 py-6 text-center text-sm text-muted-foreground">{t("marketUnavailable")}</p>;
  } else {
    body = (
      <div className="grid gap-4 transition-opacity" style={{ opacity: loading ? 0.55 : 1 }}>
        <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
          <div className="grid gap-1">
            <p className="m-0 text-3xl font-medium tracking-[-0.03em] tabular-nums">{formatPoints(data.price, locale)}</p>
            <p className="m-0 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
              {data.changePercent !== null && (
                <span className={cn("inline-flex items-center gap-1 font-medium tabular-nums", dayUp ? "text-income" : "text-danger")}>
                  <DayIcon className="size-3.5" aria-hidden="true" />
                  {formatPercent(data.changePercent, locale)} {t("marketToday")}
                </span>
              )}
              {rangeChange !== null && (
                <span className="text-muted-foreground tabular-nums">
                  {formatPercent(rangeChange, locale)} {t(`marketRangeText_${range}`)}
                </span>
              )}
              <span className="text-[color:var(--text-4)]">{updatedText(data.marketTime ?? data.fetchedAt, locale, t)}</span>
            </p>
          </div>
          <Segmented
            label={t("marketRangeLabel")}
            size="sm"
            className="w-full sm:w-auto sm:min-w-[17rem]"
            value={range}
            onChange={changeRange}
            options={MARKET_RANGES.map((value) => ({ value, label: t(`marketRange_${value}`) }))}
          />
        </div>
        <TrendChart
          className="h-56 sm:h-64"
          points={points.map((point) => ({ date: point.date, value: point.close }))}
          valueLabel={data.name}
          markerLabel={t("marketPurchases")}
          markers={(data.purchases ?? []).map((item) => ({
            date: item.date,
            value: item.price,
            label: t("marketPurchaseAt", {
              amount: formatCurrency(item.amount, locale, { currency: item.currency }),
              price: formatPoints(item.price, locale),
            }),
          }))}
          zoomable
          format={(value, options) => formatPoints(value, locale, options)}
        />
        <p className="sr-only">
          {t("marketSummary", { name: data.name, price: formatPoints(data.price, locale), change: rangeChange !== null ? formatPercent(rangeChange, locale) : "—" })}
        </p>
      </div>
    );
  }

  return (
    <Panel className={className} title={data?.name ?? "S&P 500"} titleId={`market-${index}`} hint={t("marketHint")}>
      {body}
    </Panel>
  );
}

export default IndexPanel;
