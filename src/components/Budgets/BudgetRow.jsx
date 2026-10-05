import { ChevronRightIcon, CircleAlertIcon, CircleCheckIcon, TriangleAlertIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/format";
import { getCategoryMeta } from "@/lib/categories";
import { useLanguage } from "@/hooks/useLanguage";
import { CategoryIcon } from "../Movements/MovementBits";

// Estados del presupuesto: siempre icono + texto, nunca solo color.
const STATUS = {
  ok: { icon: CircleCheckIcon, className: "text-muted-foreground", labelKey: "budgetOk" },
  warning: { icon: TriangleAlertIcon, className: "text-amber-400", labelKey: "budgetWarning" },
  over: { icon: CircleAlertIcon, className: "text-destructive", labelKey: "budgetOver" },
};

export function BudgetStatus({ item, className }) {
  const { t, locale } = useLanguage();
  const { icon: Icon, className: tone, labelKey } = STATUS[item.status] ?? STATUS.ok;
  const label =
    item.status === "over"
      ? t(labelKey, { amount: formatCurrency(-item.remaining, locale) })
      : item.status === "ok"
        ? t(labelKey, { amount: formatCurrency(item.remaining, locale) })
        : t(labelKey);
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-xs font-medium", tone, className)}>
      <Icon className="size-3.5 shrink-0" aria-hidden="true" />
      {label}
    </span>
  );
}

// Barra de progreso accesible (role="progressbar").
export function BudgetBar({ item, label }) {
  const { color } = getCategoryMeta(item.category);
  const barColor =
    item.status === "over" ? "var(--destructive)" : item.status === "warning" ? "#fbbf24" : color;
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.min(Math.round(item.percent), 100)}
      aria-valuetext={`${Math.round(item.percent)}%`}
      className="h-2 overflow-hidden rounded-full bg-white/[0.06]"
    >
      <div
        className="h-full rounded-full transition-[width] duration-500"
        style={{ width: `${Math.max(Math.min(item.percent, 100), 2)}%`, background: barColor }}
      />
    </div>
  );
}

// Fila de presupuesto: categoria, gastado / tope, barra y estado.
function BudgetRow({ item, onClick, compact = false }) {
  const { t, locale } = useLanguage();
  const name = t(`cat_${item.category}`);

  const content = (
    <>
      <CategoryIcon category={item.category} className={compact ? "size-9 rounded-lg" : undefined} />
      <div className="grid min-w-0 flex-1 gap-1.5">
        <div className="flex items-baseline justify-between gap-2">
          <span className="truncate text-[15px] font-medium sm:text-sm">{name}</span>
          <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
            {Math.round(item.percent)}%
          </span>
        </div>
        <BudgetBar item={item} label={t("budgetOf", { category: name })} />
        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
          <BudgetStatus item={item} />
          <span className="text-xs tabular-nums">
            <span className="font-semibold">{formatCurrency(item.spent, locale)}</span>
            <span className="text-muted-foreground"> / {formatCurrency(item.amount, locale)}</span>
          </span>
        </div>
      </div>
    </>
  );

  if (!onClick) return <div className="flex items-center gap-3">{content}</div>;

  return (
    <button
      type="button"
      onClick={() => onClick(item)}
      aria-label={`${name}: ${formatCurrency(item.spent, locale)} / ${formatCurrency(item.amount, locale)}, ${Math.round(item.percent)}%. ${t("tapToEdit")}`}
      className="group flex w-full touch-manipulation items-center gap-3 rounded-2xl border bg-card p-4 text-left transition-colors outline-none hover:bg-white/[0.02] focus-visible:ring-2 focus-visible:ring-ring active:bg-white/[0.04]"
    >
      {content}
      <ChevronRightIcon
        aria-hidden="true"
        className="size-4 shrink-0 text-muted-foreground/60 transition-transform group-hover:translate-x-0.5"
      />
    </button>
  );
}

export default BudgetRow;
