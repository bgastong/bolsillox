import { Link } from "react-router-dom";
import { ChevronRightIcon, TriangleAlertIcon } from "lucide-react";
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

function RateTile({ label, sell, buy, active }) {
  const { t, locale } = useLanguage();

  return (
    <li
      className={cn(
        "relative flex min-w-0 flex-col gap-1 rounded-xl border px-2.5 py-2.5 sm:px-4 sm:py-3",
        active ? "border-primary/45 bg-primary/[0.07]" : "border-white/[0.07] bg-white/[0.02]",
      )}
    >
      <span className="flex items-center justify-between gap-1 text-xs text-muted-foreground">
        <span className={cn("truncate font-medium", active && "text-primary")}>{label}</span>
        {active && (
          <span className="size-1.5 shrink-0 rounded-full bg-primary" aria-hidden="true" />
        )}
      </span>
      {sell ? (
        <>
          <span className="font-display text-lg leading-tight font-bold tracking-[-0.03em] tabular-nums sm:text-xl">
            {formatRate(sell, locale)}
          </span>
          <span className="truncate text-[11px] tracking-tight text-muted-foreground tabular-nums">
            {buy ? t("rateBuyShort", { value: formatRate(buy, locale, { symbol: false }) }) : t("rateSellShort")}
          </span>
        </>
      ) : (
        <span className="py-1 text-xs text-muted-foreground">{t("rateNoData")}</span>
      )}
      {active && <span className="sr-only">{t("rateInUse")}</span>}
    </li>
  );
}

// Cotizaciones del dolar del dia; la que esta en uso queda resaltada.
function DollarRates() {
  const { t, locale } = useLanguage();
  const { rates } = useSettings();

  if (!rates) return null;

  const hasData = Object.keys(rates.rates).length > 0;

  return (
    <section
      aria-labelledby="dollar-rates-title"
      className="grid gap-3 rounded-2xl border bg-card p-3.5 sm:p-5"
    >
      <header className="flex items-center justify-between gap-3">
        <div className="grid gap-0.5">
          <h2
            id="dollar-rates-title"
            className="m-0 font-display text-base font-semibold tracking-[-0.02em]"
          >
            {t("dollarTodayTitle")}
          </h2>
          <p className="m-0 text-xs text-muted-foreground">
            {rates.fetchedAt
              ? t("rateUpdatedShort", { date: formatDateTime(rates.fetchedAt, locale) })
              : t("rateNeverUpdated")}
          </p>
        </div>
        <Link
          to="/settings"
          className="-mr-2 inline-flex min-h-11 items-center gap-0.5 rounded-lg px-2 text-sm font-medium text-primary outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring"
          aria-label={t("rateChangeLabel")}
        >
          {t("rateChange")}
          <ChevronRightIcon className="size-4" aria-hidden="true" />
        </Link>
      </header>

      {hasData ? (
        <ul className="m-0 grid list-none grid-cols-3 gap-1.5 p-0 sm:gap-2">
          {API_SOURCES.map((key) => (
            <RateTile
              key={key}
              label={t(`rate_${key}Short`)}
              sell={rates.rates[key]?.sell}
              buy={rates.rates[key]?.buy}
              active={rates.source === key}
            />
          ))}
        </ul>
      ) : (
        <p className="m-0 flex items-center gap-2 text-sm text-amber-200">
          <TriangleAlertIcon className="size-4 shrink-0" aria-hidden="true" />
          {t("rateUnavailableShort")}
        </p>
      )}

      {rates.source === "manual" && rates.manualRate && (
        <p className="m-0 text-xs text-muted-foreground">
          {t("rateManualInUse", { rate: formatRate(rates.manualRate, locale) })}
        </p>
      )}
    </section>
  );
}

export default DollarRates;
