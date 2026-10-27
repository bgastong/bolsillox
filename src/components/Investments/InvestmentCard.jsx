import { ArrowDownLeftIcon, ArrowUpRightIcon, ClockIcon, PencilIcon, TrendingDownIcon, TrendingUpIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatCompactCurrency, formatCurrency, formatPercent } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/hooks/useLanguage";
import TrendChart from "./TrendChart";

/*
Una inversion: lo que vale hoy, cuanto se gano o perdio (con icono y signo,
no solo color), lo aportado y el grafico de como fue cambiando contra lo aportado.
*/
function InvestmentCard({ item, indexName, onEdit, onEntry }) {
  const { t, locale } = useLanguage();
  const money = (value, options) => formatCurrency(value, locale, { currency: item.currency, ...options });
  const up = (item.gain ?? 0) >= 0;
  const TrendIcon = up ? TrendingUpIcon : TrendingDownIcon;
  const empty = !item.entries.length;

  return (
    <article aria-labelledby={`investment-${item.id}-name`} className="surface grid gap-4 rounded-2xl bg-card p-4 sm:p-5">
      <div className="flex items-start gap-3">
        <div className="grid min-w-0 flex-1 gap-0.5">
          <h3 id={`investment-${item.id}-name`} className="m-0 truncate text-[15px] font-medium">
            {item.name}
          </h3>
          <p className="m-0 text-xs text-muted-foreground">
            {t("investmentFollows", { index: indexName, currency: t(item.currency === "USD" ? "investmentInUsd" : "investmentInArs") })}
          </p>
        </div>
        <Button variant="ghost" size="icon-sm" onClick={() => onEdit(item)} aria-label={`${t("edit")}: ${item.name}`} className="-mt-1 -mr-1 text-muted-foreground">
          <PencilIcon aria-hidden="true" />
        </Button>
      </div>

      {empty ? (
        <p className="m-0 rounded-xl bg-fg/[0.04] px-4 py-5 text-center text-sm text-muted-foreground">{t("investmentEmpty")}</p>
      ) : item.pending ? (
        <p className="m-0 flex items-center justify-center gap-2 rounded-xl bg-fg/[0.04] px-4 py-5 text-sm text-muted-foreground">
          <ClockIcon className="size-4" aria-hidden="true" />
          {t("investmentPending", { amount: money(item.invested) })}
        </p>
      ) : (
        <>
          <dl className="m-0 grid grid-cols-2 gap-3">
            <div className="col-span-2 grid gap-1">
              <dt className="text-xs text-muted-foreground">{t("investmentValue")}</dt>
              <dd className="m-0 flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <span className="text-2xl font-medium tracking-[-0.03em] tabular-nums">{money(item.value)}</span>
                <span className={cn("inline-flex items-center gap-1 text-sm font-medium tabular-nums", up ? "text-income" : "text-danger")}>
                  <TrendIcon className="size-4" aria-hidden="true" />
                  {money(item.gain, { signed: true })}
                  {item.gainPercent !== null && <span className="font-normal">({formatPercent(item.gainPercent, locale)})</span>}
                </span>
              </dd>
            </div>
            <div className="grid gap-0.5">
              <dt className="text-xs text-muted-foreground">{t("investmentInvested")}</dt>
              <dd className="m-0 text-sm tabular-nums">{money(item.invested)}</dd>
            </div>
            <div className="grid gap-0.5">
              <dt className="text-xs text-muted-foreground">{t("investmentEntriesCount")}</dt>
              <dd className="m-0 text-sm tabular-nums">{item.entries.filter((entry) => entry.amount > 0).length}</dd>
            </div>
          </dl>
          {item.series?.length > 1 && (
            <TrendChart
              className="h-40"
              points={item.series.map((point) => ({ date: point.date, value: point.value, base: point.invested }))}
              valueLabel={t("investmentValue")}
              baseLabel={t("investmentInvested")}
              format={(value, options) => (options?.compact ? formatCompactCurrency(value, locale, item.currency) : money(value))}
            />
          )}
        </>
      )}

      <div className="grid grid-cols-2 gap-2">
        <Button onClick={() => onEntry(item, "deposit")} className="h-10">
          <ArrowDownLeftIcon data-icon="inline-start" />
          {t("investmentDeposit")}
        </Button>
        <Button variant="outline" onClick={() => onEntry(item, "withdraw")} disabled={empty || (item.value ?? item.invested) <= 0} className="h-10">
          <ArrowUpRightIcon data-icon="inline-start" />
          {t("investmentWithdraw")}
        </Button>
      </div>
    </article>
  );
}

export default InvestmentCard;
