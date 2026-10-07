import { useCallback } from "react";
import { ChevronRightIcon, PauseIcon, PlusIcon, RepeatIcon } from "lucide-react";
import { AmountText, CategoryIcon, PageHeader } from "@/components/Movements/MovementBits";
import MovementTabs from "@/components/Recurring/MovementTabs";
import { EmptyState, ErrorState } from "@/components/States/States";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api";
import { formatCurrency, formatDate } from "@/lib/format";
import { convertAmount } from "@/lib/money";
import { useApiData } from "@/hooks/useApiData";
import { useLanguage } from "@/hooks/useLanguage";
import { useMovements } from "@/hooks/useMovements";
import { useSettings } from "@/hooks/useSettings";

function ruleSchedule(rule, t, locale) {
  if (!rule.active) return t("recurringPaused");
  if (!rule.nextDate) return t("recurringFinished");
  return t("recurringNext", { date: formatDate(rule.nextDate, locale, { day: "numeric", month: "short" }) });
}

function RecurringRow({ rule, onEdit }) {
  const { t, locale } = useLanguage();
  const schedule = ruleSchedule(rule, t, locale);
  const amount = formatCurrency(rule.type === "expense" ? -rule.amount : rule.amount, locale, {
    signed: true,
    currency: rule.currency,
  });

  return (
    <button
      type="button"
      onClick={() => onEdit(rule)}
      aria-label={`${rule.title}, ${amount}, ${t("recurringEveryMonth", { day: rule.dayOfMonth })}. ${schedule}. ${t("tapToEdit")}`}
      className={cn(
        "group flex w-full touch-manipulation items-center gap-3 rounded-2xl border bg-card p-3.5 text-left transition-colors outline-none hover:bg-fg/[0.02] focus-visible:ring-2 focus-visible:ring-ring active:bg-fg/[0.04]",
        !rule.active && "opacity-70",
      )}
    >
      <CategoryIcon category={rule.category} className="size-11" />
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-2">
          <p className="m-0 truncate text-[15px] font-medium">{rule.title}</p>
          <AmountText
            type={rule.type}
            amount={rule.amount}
            currency={rule.currency}
            className="text-[15px]"
          />
        </div>
        <div className="mt-1 flex items-center justify-between gap-2 text-xs text-muted-foreground">
          <span className="inline-flex min-w-0 items-center gap-1.5">
            <RepeatIcon className="size-3.5 shrink-0" aria-hidden="true" />
            <span className="truncate">{t("recurringDayShort", { day: rule.dayOfMonth })}</span>
          </span>
          <span
            className={cn(
              "inline-flex shrink-0 items-center gap-1 whitespace-nowrap",
              !rule.active && "text-warn",
            )}
          >
            {!rule.active && <PauseIcon className="size-3" aria-hidden="true" />}
            {schedule}
          </span>
        </div>
      </div>
      <ChevronRightIcon
        aria-hidden="true"
        className="size-4 shrink-0 text-muted-foreground/60 transition-transform group-hover:translate-x-0.5"
      />
    </button>
  );
}

function Recurring() {
  const { t, locale } = useLanguage();
  const { openCreateRecurring, openEditRecurring, version } = useMovements();
  const { currency, rate } = useSettings();

  const loadRules = useCallback(
    (signal) => api.listRecurring({ signal }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [version],
  );
  const { data: rules, error, loading, reload } = useApiData(loadRules);

  // Total fijo por mes de las reglas activas, en la moneda elegida.
  const monthly = { income: 0, expense: 0, convertible: true };
  for (const rule of rules?.filter((item) => item.active && item.nextDate) ?? []) {
    const value = convertAmount(rule.amount, rule.currency, currency, rate);
    if (value === null) monthly.convertible = false;
    else monthly[rule.type] += value;
  }

  const addButton = (
    <Button onClick={openCreateRecurring}>
      <PlusIcon data-icon="inline-start" />
      {t("newRecurring")}
    </Button>
  );

  return (
    <div className="grid gap-5">
      <PageHeader title={t("recurringTitle")} subtitle={t("recurringSubtitle")} actions={addButton} />
      <MovementTabs />

      {error && !rules ? (
        <ErrorState error={error} onRetry={reload} />
      ) : !rules ? (
        <div className="grid gap-2" aria-hidden="true">
          {Array.from({ length: 4 }, (_, index) => (
            <Skeleton key={index} className="h-20 w-full rounded-2xl" />
          ))}
        </div>
      ) : rules.length === 0 ? (
        <EmptyState message={t("recurringEmpty")}>{addButton}</EmptyState>
      ) : (
        <div className="grid gap-4 transition-opacity" style={{ opacity: loading ? 0.6 : 1 }}>
          <section
            aria-label={t("recurringMonthlyTotal")}
            className="surface grid grid-cols-2 gap-3 rounded-2xl bg-card p-4 sm:p-5"
          >
            <div className="grid gap-1">
              <p className="m-0 text-xs text-muted-foreground">{t("recurringFixedIncome")}</p>
              <p className="m-0 text-xl font-medium tracking-[-0.03em] text-income tabular-nums">
                {formatCurrency(monthly.income, locale, { currency })}
              </p>
            </div>
            <div className="grid gap-1">
              <p className="m-0 text-xs text-muted-foreground">{t("recurringFixedExpense")}</p>
              <p className="m-0 text-xl font-medium tracking-[-0.03em] text-expense tabular-nums">
                {formatCurrency(monthly.expense, locale, { currency })}
              </p>
            </div>
            {!monthly.convertible && (
              <p className="col-span-2 m-0 text-xs text-warn">{t("rateMissingShort")}</p>
            )}
          </section>

          <ul className="m-0 flex list-none flex-col gap-2 p-0">
            {rules.map((rule) => (
              <li key={rule.id}>
                <RecurringRow rule={rule} onEdit={openEditRecurring} />
              </li>
            ))}
          </ul>
          <p className="m-0 px-1 text-xs text-muted-foreground">{t("recurringHowItWorks")}</p>
        </div>
      )}
    </div>
  );
}

export default Recurring;
