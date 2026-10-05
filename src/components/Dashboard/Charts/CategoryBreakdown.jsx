import { formatCurrency } from "@/lib/format";
import { getCategoryMeta } from "@/lib/categories";
import { useLanguage } from "@/hooks/useLanguage";
import { CategoryIcon } from "../../Movements/MovementBits";

// Desglose de gastos por categoria: barra apilada arriba y lista con
// monto, porcentaje y barra de progreso en el color de cada categoria.
function CategoryBreakdown({ data, currency = "ARS" }) {
  const { t, locale } = useLanguage();
  const total = data.reduce((sum, item) => sum + item.total, 0);
  const share = (value) => (total ? (value / total) * 100 : 0);

  return (
    <div className="grid gap-5">
      <div
        className="flex h-2.5 gap-0.5 overflow-hidden rounded-full"
        aria-hidden="true"
      >
        {data.map((item) => (
          <span
            key={item.category}
            className="h-full first:rounded-l-full last:rounded-r-full"
            style={{
              width: `${share(item.total)}%`,
              background: getCategoryMeta(item.category).color,
            }}
          />
        ))}
      </div>

      <ul className="m-0 flex list-none flex-col gap-3.5 p-0">
        {data.map((item) => {
          const percent = share(item.total);
          const { color } = getCategoryMeta(item.category);
          return (
            <li key={item.category} className="flex items-center gap-3">
              <CategoryIcon category={item.category} className="size-9 rounded-lg" />
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-2 text-sm">
                  <span className="truncate font-medium">{t(`cat_${item.category}`)}</span>
                  <span className="font-semibold tabular-nums">
                    {formatCurrency(item.total, locale, { currency })}
                  </span>
                </div>
                <div className="mt-1.5 flex items-center gap-2">
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/[0.06]">
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${Math.max(percent, 2)}%`, background: color }}
                    />
                  </div>
                  <span className="w-10 text-right text-xs text-muted-foreground tabular-nums">
                    {Math.round(percent)}%
                  </span>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export default CategoryBreakdown;
