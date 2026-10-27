import { useCallback, useState } from "react";
import { DOLLAR_HISTORY_SOURCES } from "@shared/governments.js";
import Panel from "@/components/Dashboard/Panel";
import { Segmented } from "@/components/Movements/MovementForm";
import { ErrorState } from "@/components/States/States";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { api } from "@/lib/api";
import { formatCompactCurrency, formatCurrency, formatDate, formatPercent } from "@/lib/format";
import { MARKET_RANGES, storeChoice, storedChoice, updatedText } from "@/lib/market";
import { cn } from "@/lib/utils";
import { useApiData } from "@/hooks/useApiData";
import { useLanguage } from "@/hooks/useLanguage";
import TrendChart from "./TrendChart";

const SOURCE_KEY = "bolsillox.dollarSource";
const RANGE_KEY = "bolsillox.dollarRange";
const LOG_KEY = "bolsillox.dollarLog";

// Precio del dolar en pesos (cotizacion publica: no se oculta en modo privado).
function pesos(value, locale, { compact = false } = {}) {
  if (compact) return formatCompactCurrency(value, locale, "ARS");
  return new Intl.NumberFormat(locale, { style: "currency", currency: "ARS", currencyDisplay: "narrowSymbol", maximumFractionDigits: 2 }).format(value);
}

/*
Cuanto subio el dolar en cada gobierno: valor al asumir, al irse (o hoy) y la
variacion, con una barra relativa a la mayor. Es una tabla para que se lea
tambien con lector de pantalla.
*/
function TermsTable({ terms }) {
  const { t, locale } = useLanguage();
  const top = Math.max(...terms.map((term) => Math.abs(term.changePercent ?? 0)), 1);
  return (
    <div className="-mx-1">
      <table className="w-full border-collapse text-sm">
        <caption className="sr-only">{t("dollarTermsCaption")}</caption>
        <thead>
          <tr className="text-left text-xs text-muted-foreground">
            <th scope="col" className="px-1 py-2 font-normal">{t("dollarTermGovernment")}</th>
            <th scope="col" className="hidden px-1 py-2 text-right font-normal sm:table-cell">{t("dollarTermFrom")}</th>
            <th scope="col" className="hidden px-1 py-2 text-right font-normal sm:table-cell">{t("dollarTermTo")}</th>
            <th scope="col" className="px-1 py-2 text-right font-normal sm:w-[34%]">{t("dollarTermChange")}</th>
          </tr>
        </thead>
        <tbody>
          {[...terms].reverse().map((term) => {
            const width = Math.max((Math.abs(term.changePercent ?? 0) / top) * 100, 2);
            const up = (term.changePercent ?? 0) >= 0;
            return (
              <tr key={term.key} className="border-t border-fg/[0.06]">
                <th scope="row" className="px-1 py-2.5 text-left font-normal">
                  <span className="block font-medium">{term.name}</span>
                  <span className="block text-xs text-muted-foreground">
                    {formatDate(term.start, locale, { month: "short", year: "numeric" })} –{" "}
                    {term.end ? formatDate(term.end, locale, { month: "short", year: "numeric" }) : t("dollarTermNow")}
                    {term.partial ? ` · ${t("dollarTermPartial")}` : ""}
                  </span>
                  {/* En el celular los valores van debajo del nombre */}
                  <span className="block text-xs text-muted-foreground tabular-nums sm:hidden">
                    {pesos(term.from, locale)} → {pesos(term.to, locale)}
                  </span>
                </th>
                <td className="hidden px-1 py-2.5 text-right tabular-nums sm:table-cell">{pesos(term.from, locale)}</td>
                <td className="hidden px-1 py-2.5 text-right tabular-nums sm:table-cell">{pesos(term.to, locale)}</td>
                <td className="px-1 py-2.5">
                  <span className="flex items-center justify-end gap-2">
                    <span className="hidden h-1.5 flex-1 overflow-hidden rounded-full bg-fg/[0.06] sm:block" aria-hidden="true">
                      <span className={cn("block h-full rounded-full", up ? "bg-[color:var(--danger)]" : "bg-income")} style={{ width: `${width}%` }} />
                    </span>
                    <span className={cn("w-20 text-right font-medium tabular-nums", up ? "text-danger" : "text-income")}>
                      {term.changePercent !== null ? formatPercent(term.changePercent, locale) : "—"}
                    </span>
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/*
Dolar historico (oficial, blue o MEP) con el fondo dividido por gobierno, tus
compras marcadas con el precio de ese dia y abajo cuanto subio en cada mandato.
*/
function DollarPanel({ className }) {
  const { t, locale } = useLanguage();
  const [source, setSource] = useState(() => storedChoice(SOURCE_KEY, DOLLAR_HISTORY_SOURCES, "blue"));
  const [range, setRange] = useState(() => storedChoice(RANGE_KEY, MARKET_RANGES, "max"));
  // Logaritmica por defecto: si no, los primeros años quedan planos al lado de los ultimos.
  const [log, setLog] = useState(() => storedChoice(LOG_KEY, ["on", "off"], "on") === "on");
  const load = useCallback((signal) => api.getDollarHistory(source, range, { signal }), [source, range]);
  const { data, error, loading, reload } = useApiData(load);

  const points = data?.points ?? [];
  const first = points[0]?.close;
  const last = points.at(-1)?.close;
  const rangeChange = first && last ? ((last - first) / first) * 100 : null;

  let body;
  if (error && !data) body = <ErrorState error={error} onRetry={reload} />;
  else if (!data) body = <Skeleton className="h-72 w-full rounded-xl" />;
  else if (!data.available || points.length < 2) {
    body = <p className="m-0 rounded-xl bg-fg/[0.04] px-4 py-6 text-center text-sm text-muted-foreground">{t("dollarUnavailable")}</p>;
  } else {
    body = (
      <div className="grid gap-4 transition-opacity" style={{ opacity: loading ? 0.55 : 1 }}>
        <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="grid gap-1">
          <p className="m-0 text-3xl font-medium tracking-[-0.03em] tabular-nums">{pesos(data.price, locale)}</p>
          <p className="m-0 flex flex-wrap gap-x-3 gap-y-1 text-xs">
            {rangeChange !== null && (
              <span className={cn("font-medium tabular-nums", rangeChange >= 0 ? "text-danger" : "text-income")}>
                {formatPercent(rangeChange, locale)} {t(`marketRangeText_${range}`)}
              </span>
            )}
            <span className="text-[color:var(--text-4)]">{updatedText(data.fetchedAt, locale, t)}</span>
          </p>
        </div>
        <label htmlFor="dollar-log" className="flex cursor-pointer items-center gap-2 text-xs text-muted-foreground">
          <Switch
            id="dollar-log"
            checked={log}
            onCheckedChange={(checked) => {
              setLog(checked);
              storeChoice(LOG_KEY, checked ? "on" : "off");
            }}
          />
          {t("dollarLogScale")}
        </label>
        </div>
        <TrendChart
          className="h-64 sm:h-72"
          points={points.map((point) => ({ date: point.date, value: point.close }))}
          valueLabel={t(`dollarSource_${source}`)}
          markerLabel={t("marketPurchases")}
          markers={(data.purchases ?? []).map((item) => ({
            date: item.date,
            value: item.price,
            label: t("dollarPurchaseAt", {
              amount: formatCurrency(item.amount, locale, { currency: item.currency }),
              price: pesos(item.price, locale),
            }),
          }))}
          bands={data.terms.map((term) => ({ start: term.start, end: term.end, label: term.short }))}
          zoomable
          neutral
          logScale={log}
          format={(value, options) => pesos(value, locale, options)}
        />
        {data.terms.length > 0 && <TermsTable terms={data.terms} />}
      </div>
    );
  }

  return (
    <Panel
      className={className}
      title={t("dollarHistoryTitle")}
      titleId="dollar-history"
      hint={t("dollarHistoryHint")}
      action={null}
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <Segmented
          label={t("dollarSourceLabel")}
          size="sm"
          className="w-full sm:w-auto sm:min-w-[15rem]"
          value={source}
          onChange={(next) => {
            setSource(next);
            storeChoice(SOURCE_KEY, next);
          }}
          options={DOLLAR_HISTORY_SOURCES.map((value) => ({ value, label: t(`dollarSource_${value}`) }))}
        />
        <Segmented
          label={t("marketRangeLabel")}
          size="sm"
          className="w-full sm:w-auto sm:min-w-[17rem]"
          value={range}
          onChange={(next) => {
            setRange(next);
            storeChoice(RANGE_KEY, next);
          }}
          options={MARKET_RANGES.map((value) => ({ value, label: t(`marketRange_${value}`) }))}
        />
      </div>
      {body}
    </Panel>
  );
}

export default DollarPanel;
