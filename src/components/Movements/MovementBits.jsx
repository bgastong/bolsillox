import { RepeatIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/format";
import { getCategoryMeta } from "@/lib/categories";
import { useLanguage } from "@/hooks/useLanguage";

// Monto con signo: + ingreso (verde) / - gasto (neutro), en su moneda.
export function AmountText({ type, amount, currency = "ARS", className }) {
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
      {formatCurrency(value, locale, { signed: true, currency })}
    </span>
  );
}

// Icono de la categoria sobre un fondo tintado con su color.
export function CategoryIcon({ category, className }) {
  const { t } = useLanguage();
  const { color, icon: Icon } = getCategoryMeta(category);
  return (
    <span
      title={t(`cat_${category}`)}
      className={cn(
        "inline-flex size-10 shrink-0 items-center justify-center rounded-xl",
        className,
      )}
      style={{
        color,
        background: `color-mix(in srgb, ${color} 14%, transparent)`,
        boxShadow: `inset 0 0 0 1px color-mix(in srgb, ${color} 22%, transparent)`,
      }}
    >
      <Icon className="size-[18px]" aria-hidden="true" />
    </span>
  );
}

// Etiqueta de categoria con punto de color.
export function CategoryBadge({ category, className }) {
  const { t } = useLanguage();
  const { color } = getCategoryMeta(category);
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium whitespace-nowrap",
        className,
      )}
      style={{
        color: `color-mix(in srgb, ${color} 85%, white)`,
        background: `color-mix(in srgb, ${color} 12%, transparent)`,
      }}
    >
      <span className="size-1.5 rounded-full" style={{ background: color }} aria-hidden="true" />
      {t(`cat_${category}`)}
    </span>
  );
}

export function PageHeader({ title, subtitle, actions }) {
  return (
    <header className="mb-2 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="grid gap-1.5">
        <h1 className="m-0 font-display text-3xl font-bold tracking-[-0.035em] sm:text-4xl">
          {title}
        </h1>
        {subtitle && <p className="m-0 text-sm text-muted-foreground">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
}

// Icono chico que marca un movimiento generado por una regla recurrente.
export function RecurringMark({ className }) {
  const { t } = useLanguage();
  return (
    <RepeatIcon
      className={cn("size-3.5 shrink-0 text-muted-foreground", className)}
      aria-label={t("generatedByRecurring")}
      role="img"
    />
  );
}
