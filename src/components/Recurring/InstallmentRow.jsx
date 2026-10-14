import { CheckIcon, ChevronRightIcon, CreditCardIcon, PauseIcon } from "lucide-react";
import { AmountText, CategoryIcon } from "@/components/Movements/MovementBits";
import { cn } from "@/lib/utils";
import { formatCurrency, formatDate } from "@/lib/format";
import { useLanguage } from "@/hooks/useLanguage";

// Compra en cuotas: cuota que sigue, fecha, progreso y cuanto falta pagar.
function InstallmentRow({ rule, onEdit }) {
  const { t, locale } = useLanguage();
  const finished = !rule.nextDate;
  const overdue = (rule.pending ?? []).filter((item) => item.daysLeft < 0);
  const percent = Math.round((rule.installmentsPaid / rule.installmentsTotal) * 100);
  const status = !rule.active
    ? t("recurringPaused")
    : overdue.length
      ? t("installmentRowOverdue", { number: overdue[0].number, total: rule.installmentsTotal })
      : finished
      ? t("installmentsDone")
      : rule.installmentsTotal === 1
        ? t("installmentSinglePayment", {
            date: formatDate(rule.nextDate, locale, { day: "numeric", month: "short" }),
          })
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
      <div className="grid min-w-0 flex-1 grid-cols-1 gap-1.5">
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
            <span className={cn("truncate", overdue.length > 0 && rule.active && "text-expense")}>{status}</span>
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

export default InstallmentRow;
