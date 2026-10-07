import { ArrowDownRightIcon, ArrowUpRightIcon, MinusIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency, formatMonth, formatPercent } from "@/lib/format";
import { useCountUp } from "@/hooks/useCountUp";
import { useLanguage } from "@/hooks/useLanguage";

// Chip de variacion. Para gastos subir es malo: `inverse` invierte el color.
export function VariationChip({ value, inverse = false, suffix }) {
  const { locale } = useLanguage();
  if (value === null || value === undefined) return null;
  const Icon = value > 0 ? ArrowUpRightIcon : value < 0 ? ArrowDownRightIcon : MinusIcon;
  const good = inverse ? value < 0 : value > 0;
  return (
    <span className={cn("chip", value === 0 ? undefined : good ? "chip-good" : "chip-bad")}>
      <Icon className="size-3" strokeWidth={2.25} aria-hidden="true" />
      {formatPercent(value, locale)}
      {suffix && <span className="text-[color:var(--text-3)]">{suffix}</span>}
    </span>
  );
}

// Monto grande que "cuenta" hasta el valor final; los decimales van en gris.
function BigAmount({ amount, currency }) {
  const { locale } = useLanguage();
  const animated = useCountUp(amount);
  const text = formatCurrency(Math.round(animated), locale, { currency });
  // "$ 1.284.350" -> simbolo en gris y numero en blanco
  const match = text.match(/^(-?)([^\d-]*?)\s?([\d.,\s]+)$/);
  return (
    <p
      className={cn(
        "m-0 mt-2 text-[40px] leading-none tracking-[-0.055em] whitespace-nowrap tabular-nums sm:text-[54px]",
        amount < 0 && "text-expense",
      )}
      aria-label={formatCurrency(amount, locale, { currency })}
    >
      {match ? (
        <span aria-hidden="true">
          {match[1]}
          <span className="mr-[0.1em] text-[color:var(--text-4)]">{match[2].trim()}</span>
          {match[3]}
        </span>
      ) : (
        <span aria-hidden="true">{text}</span>
      )}
    </p>
  );
}

// Saldo: el numero protagonista, su variacion y cuanto se gasto de lo que entro.
export function BalanceCard({ summary, className }) {
  const { t, locale } = useLanguage();
  const spent = summary.income ? Math.round((summary.expense / summary.income) * 100) : null;
  const previousMonth = formatMonth(summary.previous.month, locale).split(" ")[0];

  return (
    <section
      aria-labelledby="balance-title"
      className={cn("surface flex min-w-0 flex-col justify-between gap-6 rounded-[14px] p-5 sm:p-[22px]", className)}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 id="balance-title" className="m-0 text-[12.5px] font-normal text-[color:var(--text-3)]">
            {t("balanceAvailable")}
          </h2>
          <BigAmount amount={summary.balance} currency={summary.currency} />
        </div>
        <div className="flex flex-col items-start gap-1.5 sm:items-end">
          <VariationChip value={summary.variation.balance} suffix={` ${t("vsMonth", { month: previousMonth })}`} />
          <span className="text-xs text-[color:var(--text-4)]">{t("cardBalanceHint")}</span>
        </div>
      </div>

      {spent !== null && (
        <div className="grid gap-2.5">
          <div
            className="flex h-2 gap-[3px] overflow-hidden rounded-full"
            role="img"
            aria-label={spent <= 100 ? `${t("spentShare", { spent })}, ${t("savedShare", { saved: 100 - spent })}` : t("overspent")}
          >
            <span className="grow-x h-full rounded-[2px] bg-expense" style={{ width: `${Math.min(spent, 100)}%` }} />
            {spent < 100 && (
              <span
                className="grow-x h-full rounded-[2px] bg-income"
                style={{ width: `${100 - spent}%`, animationDelay: "0.35s" }}
              />
            )}
          </div>
          <p className="m-0 text-[12.5px] text-[color:var(--text-3)]">
            {spent <= 100 ? (
              <>
                {t("spentShare", { spent })} · <span className="text-income">{t("savedShare", { saved: 100 - spent })}</span>
              </>
            ) : (
              <span className="text-expense">{t("overspent")}</span>
            )}
          </p>
        </div>
      )}
    </section>
  );
}

// Mini grafico de linea (sparkline) con el ultimo punto marcado.
function Sparkline({ values, color }) {
  const width = 96;
  const height = 28;
  if (values.length < 2 || values.every((value) => !value)) return null;
  const lo = Math.min(...values);
  const hi = Math.max(...values);
  const points = values.map((value, index) => [
    (index * width) / (values.length - 1),
    height - 3 - ((value - lo) / (hi - lo || 1)) * (height - 6),
  ]);
  const d = points.map(([x, y], index) => `${index ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const [lastX, lastY] = points.at(-1);
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="shrink-0 overflow-visible" aria-hidden="true">
      <path d={d} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" className="draw-line" pathLength="1" />
      <circle cx={lastX} cy={lastY} r="2.2" fill={color} />
    </svg>
  );
}

function FlowRow({ label, amount, tone, series, variation, inverse, currency }) {
  const { locale } = useLanguage();
  const animated = useCountUp(amount);
  return (
    <div className="flex min-w-0 flex-col gap-2 p-4 sm:px-5 sm:py-[18px]">
      <span className="text-[12.5px] text-[color:var(--text-3)]">{label}</span>
      <div className="flex items-end justify-between gap-3">
        <span
          className={cn("text-[19px] tracking-[-0.04em] whitespace-nowrap tabular-nums sm:text-2xl", tone)}
          aria-label={formatCurrency(amount, locale, { currency })}
        >
          <span aria-hidden="true">
            {tone === "text-income" ? "+ " : "− "}
            {formatCurrency(Math.round(animated), locale, { currency })}
          </span>
        </span>
        <span className="max-sm:hidden">
          <Sparkline values={series} color={tone === "text-income" ? "var(--income)" : "var(--expense)"} />
        </span>
      </div>
      <span className="flex flex-wrap items-center gap-2 text-xs text-[color:var(--text-4)]">
        <VariationChip value={variation} inverse={inverse} />
      </span>
    </div>
  );
}

// Ingresos y gastos del mes, cada uno con su tendencia de 6 meses.
export function FlowCard({ summary, className }) {
  const { t } = useLanguage();
  return (
    <section
      aria-label={t("cashflowTitle")}
      className={cn(
        "surface grid min-w-0 grid-cols-2 rounded-[14px] lg:grid-cols-1 lg:grid-rows-2 [&>*+*]:border-l [&>*+*]:border-fg/[0.065] lg:[&>*+*]:border-t lg:[&>*+*]:border-l-0",
        className,
      )}
    >
      <FlowRow
        label={t("cardIncome")}
        amount={summary.income}
        currency={summary.currency}
        tone="text-income"
        series={summary.monthly.map((item) => item.income)}
        variation={summary.variation.income}
      />
      <FlowRow
        label={t("cardExpense")}
        amount={summary.expense}
        currency={summary.currency}
        tone="text-expense"
        series={summary.monthly.map((item) => item.expense)}
        variation={summary.variation.expense}
        inverse
      />
    </section>
  );
}

export function SummaryHeroSkeleton() {
  return (
    <>
      <Skeleton className="h-52 rounded-[14px] lg:col-span-8" />
      <Skeleton className="h-52 rounded-[14px] lg:col-span-4" />
    </>
  );
}
