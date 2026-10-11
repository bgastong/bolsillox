import { formatCurrency, formatPercent } from "@/lib/format";
import { useLanguage } from "@/hooks/useLanguage";
import { useCategories } from "@/hooks/useCategories";
import { cn } from "@/lib/utils";
import { CategoryIcon } from "../../Movements/MovementBits";

// Grises para la barra apilada (de la categoria mas grande a la mas chica).
// Son el color del texto con menos opacidad, asi funcionan en los dos temas.
const SHADES = [0.9, 0.68, 0.5, 0.34, 0.24, 0.16].map((alpha) => `rgb(var(--fg-rgb) / ${alpha})`);

// Variacion contra el mes anterior: gastar mas es malo (rojo), menos es bueno (verde).
function CategoryVariation({ value }) {
  const { t, locale } = useLanguage();
  if (value === null || value === undefined) {
    return <span className="w-14 text-right text-[11.5px] text-[color:var(--text-4)]">{t("newLabel")}</span>;
  }
  const arrow = value > 0 ? "▲" : value < 0 ? "▼" : "=";
  return (
    <span
      className={cn(
        "w-14 text-right text-[11.5px] tabular-nums whitespace-nowrap",
        value > 0 ? "text-expense" : value < 0 ? "text-income" : "text-[color:var(--text-4)]",
      )}
    >
      {arrow} {formatPercent(Math.abs(value), locale).replace("+", "")}
    </span>
  );
}

// Desglose de gastos por categoria: barra apilada en grises arriba y
// lista con icono, monto, barra relativa y variacion contra el mes anterior.
function CategoryBreakdown({ data, currency = "ARS" }) {
  const { locale } = useLanguage();
  const { nameOf } = useCategories();
  const total = data.reduce((sum, item) => sum + item.total, 0);
  const top = data[0]?.total || 1;
  const share = (value) => (total ? (value / total) * 100 : 0);

  return (
    <div className="grid gap-4">
      <div className="flex h-2 gap-[3px] overflow-hidden rounded-full" aria-hidden="true">
        {data.map((item, index) => (
          <span
            key={item.category}
            className="grow-x h-full rounded-[2px]"
            style={{
              width: `${share(item.total)}%`,
              background: SHADES[Math.min(index, SHADES.length - 1)],
              animationDelay: `${0.2 + index * 0.05}s`,
            }}
          />
        ))}
      </div>

      <ul className="-mx-2 m-0 flex list-none flex-col p-0">
        {data.map((item, index) => {
          const name = nameOf(item.category);
          return (
            <li
              key={item.category}
              className="flex items-center gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-fg/[0.03]"
            >
              <CategoryIcon category={item.category} className="size-8 rounded-lg" />
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-2 text-sm">
                  <span className="truncate">{name}</span>
                  <span className="text-[12.5px] text-[color:var(--text-2)] tabular-nums">
                    {formatCurrency(item.total, locale, { currency })}
                  </span>
                </div>
                <div className="mt-2 h-[3px] overflow-hidden rounded-full bg-fg/[0.06]">
                  <div
                    className="grow-x h-full rounded-full"
                    style={{
                      width: `${Math.max((item.total / top) * 100, 2)}%`,
                      background: item.variation > 0 ? "var(--expense)" : "var(--text-2)",
                      animationDelay: `${0.25 + index * 0.05}s`,
                    }}
                  />
                </div>
              </div>
              <span className="sr-only">{Math.round(share(item.total))}%</span>
              <CategoryVariation value={item.variation} />
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export default CategoryBreakdown;
