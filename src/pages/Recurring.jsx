import { useCallback } from "react";
import {
  CheckIcon,
  ChevronRightIcon,
  CreditCardIcon,
  PauseIcon,
  PlusIcon,
  RepeatIcon,
} from "lucide-react";
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

// Compra en cuotas: cuota que sigue, fecha, progreso y cuanto falta pagar.
function InstallmentRow({ rule, onEdit }) {
  const { t, locale } = useLanguage();
  const finished = !rule.nextDate;
  const percent = Math.round((rule.installmentsPaid / rule.installmentsTotal) * 100);
  const status = !rule.active
    ? t("recurringPaused")
    : finished
      ? t("installmentsDone")
      : t("installmentNext", {
          number: rule.nextInstallment,
          total: rule.installmentsTotal,
          date: formatDate(rule.nextDate, locale, { day: "numeric", month: "short" }),
        });
  const remaining = formatCurrency(rule.remainingAmount, locale, { currency: rule.currency });

  return (
    <button
      type="button"
      onClick={() => onEdit(rule)}
      aria-label={`${rule.title}. ${t("installmentsProgress", { paid: rule.installmentsPaid, total: rule.installmentsTotal })}. ${status}. ${finished ? "" : t("installmentsRemaining", { amount: remaining })} ${t("tapToEdit")}`}
      className={cn(
        "group flex w-full touch-manipulation items-center gap-3 rounded-2xl border bg-card p-3.5 text-left transition-colors outline-none hover:bg-fg/[0.02] focus-visible:ring-2 focus-visible:ring-ring active:bg-fg/[0.04]",
        (finished || !rule.active) && "opacity-70",
      )}
    >
      <CategoryIcon category={rule.category} className="size-11" />
      <div className="grid min-w-0 flex-1 gap-1.5">
        <div className="flex items-baseline justify-between gap-2">
          <p className="m-0 truncate text-[15px] font-medium">{rule.title}</p>
          <AmountText type={rule.type} amount={rule.amount} currency={rule.currency} className="text-[15px]" />
        </div>
        <div
          className="h-1.5 overflow-hidden rounded-full bg-fg/[0.08]"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={rule.installmentsTotal}
          aria-valuenow={rule.installmentsPaid}
          aria-label={t("installmentsProgress", { paid: rule.installmentsPaid, total: rule.installmentsTotal })}
        >
          <div
            className={cn("h-full rounded-full", finished ? "bg-income" : "bg-foreground/70")}
            style={{ width: `${percent}%` }}
          />
        </div>
        <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
          <span className="inline-flex min-w-0 items-center gap-1.5">
            {finished ? (
              <CheckIcon className="size-3.5 shrink-0 text-income" aria-hidden="true" />
            ) : !rule.active ? (
              <PauseIcon className="size-3 shrink-0 text-warn" aria-hidden="true" />
            ) : (
              <CreditCardIcon className="size-3.5 shrink-0" aria-hidden="true" />
            )}
            <span className="truncate">{status}</span>
          </span>
          {!finished && (
            <span className="shrink-0 whitespace-nowrap tabular-nums">
              {t("installmentsRemaining", { amount: remaining })}
            </span>
          )}
        </div>
      </div>
      <ChevronRightIcon
        aria-hidden="true"
        className="size-4 shrink-0 text-muted-foreground/60 transition-transform group-hover:translate-x-0.5"
      />
    </button>
  );
}

function SectionTitle({ id, icon: Icon, children, action }) {
  return (
    <div className="flex items-center justify-between gap-3 px-1">
      <h2 id={id} className="m-0 inline-flex items-center gap-2 text-sm font-medium">
        <Icon className="size-4 text-muted-foreground" aria-hidden="true" />
        {children}
      </h2>
      {action}
    </div>
  );
}

function Recurring() {
  const { t, locale } = useLanguage();
  const { openCreateRecurring, openCreateInstallments, openEditRecurring, version } = useMovements();
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

  // Cuotas: las que faltan pagar primero; las terminadas al final.
  const installments = (rules ?? [])
    .filter((rule) => rule.kind === "installments")
    .sort((a, b) => Boolean(!a.nextDate) - Boolean(!b.nextDate) || (a.nextDate ?? "").localeCompare(b.nextDate ?? ""));
  const recurring = (rules ?? []).filter((rule) => rule.kind !== "installments");

  // Lo que falta pagar de todas las cuotas, en la moneda elegida.
  const pending = { amount: 0, convertible: true };
  for (const rule of installments.filter((item) => item.active && item.nextDate && item.type === "expense")) {
    const value = convertAmount(rule.remainingAmount, rule.currency, currency, rate);
    if (value === null) pending.convertible = false;
    else pending.amount += value;
  }

  // En el celular, textos cortos y los dos botones en una fila.
  const addButton = (
    <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto">
      <Button variant="outline" onClick={openCreateInstallments} className="max-sm:h-11">
        <CreditCardIcon data-icon="inline-start" />
        <span className="sm:hidden">{t("kindInstallments")}</span>
        <span className="max-sm:hidden">{t("newInstallments")}</span>
      </Button>
      <Button onClick={openCreateRecurring} className="max-sm:h-11">
        <PlusIcon data-icon="inline-start" />
        <span className="sm:hidden">{t("kindRecurring")}</span>
        <span className="max-sm:hidden">{t("newRecurring")}</span>
      </Button>
    </div>
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
            {installments.length > 0 && (
              <div className="col-span-2 grid gap-1 border-t pt-3">
                <p className="m-0 text-xs text-muted-foreground">{t("installmentsPendingTotal")}</p>
                <p className="m-0 text-xl font-medium tracking-[-0.03em] tabular-nums">
                  {formatCurrency(pending.amount, locale, { currency })}
                </p>
              </div>
            )}
            {!(monthly.convertible && pending.convertible) && (
              <p className="col-span-2 m-0 text-xs text-warn">{t("rateMissingShort")}</p>
            )}
          </section>

          <section aria-labelledby="installments-title" className="grid gap-2">
            <SectionTitle
              id="installments-title"
              icon={CreditCardIcon}
              action={
                installments.length > 0 && (
                  <Button size="sm" variant="ghost" onClick={openCreateInstallments}>
                    <PlusIcon data-icon="inline-start" />
                    {t("addInstallments")}
                  </Button>
                )
              }
            >
              {t("installmentsTitle")}
            </SectionTitle>
            {installments.length === 0 ? (
              <button
                type="button"
                onClick={openCreateInstallments}
                className="flex w-full items-center gap-3 rounded-2xl border border-dashed p-4 text-left text-sm text-muted-foreground transition-colors outline-none hover:border-fg/20 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
              >
                <PlusIcon className="size-4 shrink-0" aria-hidden="true" />
                {t("installmentsEmpty")}
              </button>
            ) : (
              <ul className="m-0 flex list-none flex-col gap-2 p-0">
                {installments.map((rule) => (
                  <li key={rule.id}>
                    <InstallmentRow rule={rule} onEdit={openEditRecurring} />
                  </li>
                ))}
              </ul>
            )}
          </section>

          {recurring.length > 0 && (
            <section aria-labelledby="recurring-list-title" className="grid gap-2">
              <SectionTitle id="recurring-list-title" icon={RepeatIcon}>
                {t("recurringListTitle")}
              </SectionTitle>
              <ul className="m-0 flex list-none flex-col gap-2 p-0">
                {recurring.map((rule) => (
                  <li key={rule.id}>
                    <RecurringRow rule={rule} onEdit={openEditRecurring} />
                  </li>
                ))}
              </ul>
            </section>
          )}
          <p className="m-0 px-1 text-xs text-muted-foreground">{t("recurringHowItWorks")}</p>
        </div>
      )}
    </div>
  );
}

export default Recurring;
