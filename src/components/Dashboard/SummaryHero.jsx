import { ArrowDownRightIcon, ArrowUpRightIcon, MinusIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import Money from "@/components/Money/Money";
import { formatCurrency, formatDate, formatMonth, formatPercent, todayISO } from "@/lib/format";
import { useCountUp } from "@/hooks/useCountUp";
import { useLanguage } from "@/hooks/useLanguage";

// Chip de variacion. Para gastos subir es malo: `inverse` invierte el color.
// suffixClassName: por ejemplo, ocultar el "vs. mes" a la vista donde no entra (sigue para el lector de pantalla).
export function VariationChip({ value, inverse = false, suffix, suffixClassName }) {
  const { locale } = useLanguage();
  if (value === null || value === undefined) return null;
  const Icon = value > 0 ? ArrowUpRightIcon : value < 0 ? ArrowDownRightIcon : MinusIcon;
  const good = inverse ? value < 0 : value > 0;
  return (
    <span className={cn("chip", value === 0 ? undefined : good ? "chip-good" : "chip-bad")}>
      <Icon className="size-3" strokeWidth={2.25} aria-hidden="true" />
      {formatPercent(value, locale)}
      {suffix && <span className={cn("text-[color:var(--text-3)]", suffixClassName)}>{suffix}</span>}
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

// Evolucion del saldo en el mes, dia por dia (llena el espacio libre de la tarjeta).
// Arranca en el saldo con que cerro el mes anterior.
function BalanceTrend({ start, daily, currency }) {
  const { t, locale } = useLanguage();
  if (daily.length < 2) return null;
  const values = [start, ...daily.map((item) => item.balance)];
  const lo = Math.min(...values);
  const hi = Math.max(...values);
  const width = 100;
  const height = 40;
  const points = values.map((value, index) => [
    (index * width) / (values.length - 1),
    height - 2 - ((value - lo) / (hi - lo || 1)) * (height - 4),
  ]);
  const line = points.map(([x, y], index) => `${index ? "L" : "M"}${x.toFixed(2)},${y.toFixed(2)}`).join(" ");
  // Rojo si en el mes se perdio plata (termina mas bajo que como arranco) o si el saldo es negativo.
  const loss = values.at(-1) < values[0] || values.at(-1) < 0;
  const color = loss ? "var(--expense)" : "var(--income)";
  const format = (value) => formatCurrency(value, locale, { currency });

  return (
    <figure className="m-0 flex flex-1 flex-col justify-end gap-1.5">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="none"
        className="h-14 w-full overflow-visible"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="balance-trend-fill" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.16" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={`${line} L${width},${height} L0,${height} Z`} fill="url(#balance-trend-fill)" />
        <path
          d={line}
          fill="none"
          stroke={color}
          strokeWidth="1.5"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
      <figcaption className="flex justify-between text-[11px] text-[color:var(--text-4)] tabular-nums">
        <span className="sr-only">
          {t("balanceTrendLabel", { from: format(values[0]), to: format(values.at(-1)) })}
        </span>
        <span aria-hidden="true">{formatDate(daily[0].date, locale, { day: "numeric", month: "short" })}</span>
        <span aria-hidden="true">{formatDate(daily.at(-1).date, locale, { day: "numeric", month: "short" })}</span>
      </figcaption>
    </figure>
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
      className={cn("surface flex min-w-0 flex-col gap-5 rounded-[14px] p-5 sm:p-[22px]", className)}
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
          {/* Hasta cuando cuenta el saldo: hoy, o el cierre si el mes ya paso */}
          <span className="text-xs text-[color:var(--text-4)]">
            {summary.balanceDate && summary.balanceDate < todayISO() ? t("cardBalanceClosed") : t("cardBalanceHint")}
          </span>
          {/* Movimientos con fecha futura: todavia no estan en el saldo */}
          {summary.scheduled && (
            <span className="text-xs text-[color:var(--text-3)]">
              {t("balanceProjected")}{" "}
              <Money
                amount={summary.scheduled.projected}
                type={summary.scheduled.projected < 0 ? "expense" : "neutral"}
                currency={summary.currency}
                className="font-normal"
              />
            </span>
          )}
        </div>
      </div>

      <BalanceTrend start={summary.previous.balance} daily={summary.daily ?? []} currency={summary.currency} />

      {spent !== null && (
        <div className="grid gap-2.5">
          <div
            className="flex h-2 gap-[3px] overflow-hidden rounded-full"
            role="img"
            aria-label={spent <= 100 ? `${t("spentShare", { spent })}, ${t("savedShare", { saved: 100 - spent })}` : t("overspent")}
          >
            {/* Gastar es lo normal: la parte gastada va en gris y solo se pone roja si se gasto de mas */}
            <span
              className={cn("grow-x h-full rounded-[2px]", spent > 100 ? "bg-expense" : "bg-[color:var(--text-4)]")}
              style={{ width: `${Math.min(spent, 100)}%` }}
            />
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

/*
Ingresos o gastos del mes. Los ingresos van en verde; los gastos en el color del
texto con el signo en gris (el rojo queda para las alertas). El punto de color
acompaña al titulo y el chip compara con el mes anterior.
*/
const FLOW_TONES = {
  income: { sign: "+", amount: "text-income", dot: "bg-income", line: "var(--income)" },
  expense: { sign: "−", amount: "text-foreground", dot: "bg-[color:var(--text-3)]", line: "var(--text-3)" },
};

function FlowRow({ id, label, amount, kind, series, variation, previousMonth, currency }) {
  const { t, locale } = useLanguage();
  const animated = useCountUp(amount);
  const tone = FLOW_TONES[kind];
  return (
    <div role="group" aria-labelledby={id} className="flex min-w-0 flex-col gap-2 p-4 sm:px-5 sm:py-[18px]">
      <span id={id} className="flex items-center gap-2 text-[12.5px] text-[color:var(--text-3)]">
        <span aria-hidden="true" className={cn("size-[7px] shrink-0 rounded-full", tone.dot)} />
        {label}
      </span>
      <div className="flex items-end justify-between gap-3">
        <span
          className={cn("text-[19px] tracking-[-0.04em] whitespace-nowrap tabular-nums sm:text-2xl", tone.amount)}
          aria-label={formatCurrency(amount, locale, { currency })}
        >
          <span aria-hidden="true">
            <span className={kind === "expense" ? "text-[color:var(--text-3)]" : undefined}>{tone.sign} </span>
            {formatCurrency(Math.round(animated), locale, { currency })}
          </span>
        </span>
        {/* Solo con lugar: en celular y tablet el monto ocupa todo el ancho */}
        <span className="hidden xl:inline">
          <Sparkline values={series} color={tone.line} />
        </span>
      </div>
      {/* Sin variacion (0% o sin mes anterior) no se muestra el chip. Para gastos, bajar es bueno. */}
      {Boolean(variation) && (
        <span className="flex flex-wrap items-center gap-2 text-xs">
          <VariationChip
            value={variation}
            inverse={kind === "expense"}
            suffix={` ${t("vsMonth", { month: previousMonth })}`}
            suffixClassName="max-sm:sr-only"
          />
        </span>
      )}
    </div>
  );
}

// Ingresos y gastos del mes, cada uno con su tendencia de 6 meses.
export function FlowCard({ summary, className }) {
  const { t, locale } = useLanguage();
  const previousMonth = formatMonth(summary.previous.month, locale).split(" ")[0];
  // Los meses sin movimientos del principio no se dibujan (si no, parece que se arranco de cero).
  const first = summary.monthly.findIndex((item) => item.income || item.expense);
  const monthly = first === -1 ? [] : summary.monthly.slice(first);
  return (
    <section
      aria-label={t("cashflowTitle")}
      className={cn(
        "surface grid min-w-0 grid-cols-2 rounded-[14px] xl:grid-cols-1 xl:grid-rows-2 [&>*+*]:border-l [&>*+*]:border-fg/[0.065] xl:[&>*+*]:border-t xl:[&>*+*]:border-l-0",
        className,
      )}
    >
      <FlowRow
        id="flow-income"
        kind="income"
        label={t("cardIncome")}
        amount={summary.income}
        currency={summary.currency}
        series={monthly.map((item) => item.income)}
        variation={summary.variation.income}
        previousMonth={previousMonth}
      />
      <FlowRow
        id="flow-expense"
        kind="expense"
        label={t("cardExpense")}
        amount={summary.expense}
        currency={summary.currency}
        series={monthly.map((item) => item.expense)}
        variation={summary.variation.expense}
        previousMonth={previousMonth}
      />
    </section>
  );
}

export function SummaryHeroSkeleton() {
  return (
    <>
      <Skeleton className="h-52 rounded-[14px] xl:col-span-8" />
      <Skeleton className="h-52 rounded-[14px] xl:col-span-4" />
    </>
  );
}
