import { ArrowDownLeftIcon, ArrowUpRightIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/format";
import { useLanguage } from "@/hooks/useLanguage";

// Monto con signo y color (+ ingreso / - gasto). El signo evita depender solo del color.
export function AmountText({ type, amount, className }) {
  const { locale } = useLanguage();
  const value = type === "expense" ? -amount : amount;
  return (
    <span
      className={cn(
        "font-semibold tabular-nums whitespace-nowrap",
        type === "income" ? "text-income" : "text-expense",
        className,
      )}
    >
      {formatCurrency(value, locale, { signed: true })}
    </span>
  );
}

export function TypeIcon({ type, className }) {
  const { t } = useLanguage();
  const Icon = type === "income" ? ArrowDownLeftIcon : ArrowUpRightIcon;
  return (
    <span
      title={t(type)}
      className={cn(
        "inline-flex size-9 shrink-0 items-center justify-center rounded-full",
        type === "income" ? "bg-income/10 text-income" : "bg-expense/10 text-expense",
        className,
      )}
    >
      <Icon className="size-4" aria-hidden="true" />
      <span className="sr-only">{t(type)}</span>
    </span>
  );
}

export function PageHeader({ title, subtitle, actions }) {
  return (
    <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="grid gap-1">
        <h1 className="m-0 text-2xl font-bold tracking-tight sm:text-3xl">{title}</h1>
        {subtitle && <p className="m-0 text-sm text-muted-foreground">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
}
