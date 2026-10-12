import { Link } from "react-router-dom";
import { TriangleAlertIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDateTime } from "@/lib/format";
import { useLanguage } from "@/hooks/useLanguage";
import { useSettings } from "@/hooks/useSettings";

const API_SOURCES = ["oficial", "blue", "mep"];

function formatRate(value, locale, { symbol = true } = {}) {
  return new Intl.NumberFormat(locale, {
    ...(symbol && { style: "currency", currency: "ARS", currencyDisplay: "narrowSymbol" }),
    maximumFractionDigits: 0,
  }).format(value);
}

function RateRow({ label, sell, buy, active }) {
  const { t, locale } = useLanguage();

  return (
    <li className="flex min-h-11 items-center justify-between gap-3 border-t border-fg/[0.065] py-2 first:border-t-0">
      <span className="flex items-center gap-2 text-sm">
        {label}
        {active && (
          <span className="rounded-[5px] border border-fg/10 px-1.5 py-px text-[10.5px] text-[color:var(--text-3)]">
            {t("rateInUseShort")}
          </span>
        )}
      </span>
      {sell ? (
        <span className="flex items-baseline gap-2.5 tabular-nums">
          {buy && (
            <span className="text-[11.5px] text-[color:var(--text-4)] max-[360px]:hidden">
              {t("rateBuyShort", { value: formatRate(buy, locale, { symbol: false }) })}
            </span>
          )}
          <span className="text-sm">{formatRate(sell, locale)}</span>
        </span>
      ) : (
        <span className="text-xs text-[color:var(--text-4)]">{t("rateNoData")}</span>
      )}
      {active && <span className="sr-only">{t("rateInUse")}</span>}
    </li>
  );
}

// Cotizaciones del dolar del dia; la que esta en uso queda marcada.
function DollarRates({ className }) {
  const { t, locale } = useLanguage();
  const { rates } = useSettings();

  if (!rates) return null;

  const hasData = Object.keys(rates.rates).length > 0;

  return (
    <section
      aria-labelledby="dollar-rates-title"
      className={cn("surface grid gap-3 rounded-[14px] p-4 sm:p-[18px]", className)}
    >
      <header className="flex items-start justify-between gap-3">
        <div className="grid gap-0.5">
          <h2 id="dollar-rates-title" className="m-0 text-[13.5px] font-medium tracking-[-0.01em]">
            {t("dollarTodayTitle")}
          </h2>
          {/* Sin cotizacion, el aviso de abajo ya lo explica */}
          {hasData && (
            <p className="m-0 flex items-center gap-1.5 text-xs text-[color:var(--text-4)]">
              <span className="live-dot" aria-hidden="true" />
              {rates.fetchedAt
                ? t("rateUpdatedShort", { date: formatDateTime(rates.fetchedAt, locale) })
                : t("rateNeverUpdated")}
            </p>
          )}
        </div>
        <Link
          to="/settings"
          className="-mt-1 -mr-2 inline-flex min-h-9 items-center rounded-lg px-2 text-[12.5px] text-[color:var(--text-3)] outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
          aria-label={t("rateChangeLabel")}
        >
          {t("rateChange")}
        </Link>
      </header>

      {hasData ? (
        <ul className="m-0 list-none p-0">
          {API_SOURCES.map((key) => (
            <RateRow
              key={key}
              label={t(`rate_${key}Short`)}
              sell={rates.rates[key]?.sell}
              buy={rates.rates[key]?.buy}
              active={rates.source === key}
            />
          ))}
        </ul>
      ) : (
        <p className="m-0 flex items-start gap-1.5 text-xs text-[color:var(--text-4)]">
          <TriangleAlertIcon className="mt-px size-3.5 shrink-0" aria-hidden="true" />
          {t("rateUnavailableShort")}
        </p>
      )}

      {rates.source === "manual" && rates.manualRate && (
        <p className="m-0 text-xs text-[color:var(--text-3)]">
          {t("rateManualInUse", { rate: formatRate(rates.manualRate, locale) })}
        </p>
      )}
    </section>
  );
}

export default DollarRates;
