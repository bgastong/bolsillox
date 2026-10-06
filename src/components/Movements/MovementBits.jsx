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
        "font-medium tabular-nums whitespace-nowrap",
        type === "income" ? "text-income" : "text-expense",
        className,
      )}
    >
      {formatCurrency(value, locale, { signed: true, currency })}
    </span>
  );
}

// Icono de la categoria en una ficha neutra: en este estilo el color se
// reserva para el dinero (verde entra, rojo sale).
export function CategoryIcon({ category, className }) {
  const { t } = useLanguage();
  const { icon: Icon } = getCategoryMeta(category);
  return (
    <span
      title={t(`cat_${category}`)}
      className={cn(
        "inline-flex size-9 shrink-0 items-center justify-center rounded-[9px] border border-white/[0.07] bg-white/[0.04] text-[color:var(--text-2)]",
        className,
      )}
    >
      <Icon className="size-4" strokeWidth={1.75} aria-hidden="true" />
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
        color: "var(--text-2)",
        background: "rgba(255, 255, 255, 0.04)",
        boxShadow: "inset 0 0 0 1px rgba(255, 255, 255, 0.07)",
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
        <h1 className="m-0 text-[26px] font-medium tracking-[-0.035em] sm:text-[30px]">
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
