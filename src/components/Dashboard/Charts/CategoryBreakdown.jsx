import { useRef } from "react";
import { formatCurrency, formatPercent } from "@/lib/format";
import { useLanguage } from "@/hooks/useLanguage";
import { useCategories } from "@/hooks/useCategories";
import { cn } from "@/lib/utils";
import { CategoryIcon } from "../../Movements/MovementBits";
import CategoryPie from "./CategoryPie";

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
        value > 0 ? "text-danger" : value < 0 ? "text-income" : "text-[color:var(--text-4)]",
      )}
    >
      {arrow} {formatPercent(Math.abs(value), locale).replace("+", "")}
    </span>
  );
}

// Desglose de gastos por categoria: torta con el color de cada categoria
// arriba y lista con icono, monto, porcentaje, barra relativa y variacion
// contra el mes anterior. Al pasar por una fila se resalta su porcion.
function CategoryBreakdown({ data, currency = "ARS" }) {
  const { locale } = useLanguage();
  const { metaOf, nameOf } = useCategories();
  const total = data.reduce((sum, item) => sum + item.total, 0);
  const top = data[0]?.total || 1;
  const share = (value) => (total ? (value / total) * 100 : 0);
  const pieRef = useRef(null);

  return (
    <div className="grid gap-4">
      <CategoryPie ref={pieRef} data={data} currency={currency} />

      <ul className="-mx-2 m-0 flex list-none flex-col p-0">
        {data.map((item, index) => {
          const name = nameOf(item.category);
          const { color } = metaOf(item.category);
          return (
            <li
              key={item.category}
              className="flex items-center gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-fg/[0.03]"
              onMouseEnter={() => pieRef.current?.highlight(index)}
              onMouseLeave={() => pieRef.current?.highlight(null)}
            >
              <CategoryIcon category={item.category} className="size-8 rounded-lg" />
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-2 text-sm">
                  <span className="flex min-w-0 items-center gap-1.5">
                    <span className="size-1.5 shrink-0 rounded-full" style={{ background: color }} aria-hidden="true" />
                    <span className="truncate">{name}</span>
                    <span className="text-[11.5px] text-[color:var(--text-4)] tabular-nums">
                      {Math.round(share(item.total))}%
                    </span>
                  </span>
                  <span className="text-[12.5px] text-[color:var(--text-2)] tabular-nums">
                    {formatCurrency(item.total, locale, { currency })}
                  </span>
                </div>
                <div className="mt-2 h-[3px] overflow-hidden rounded-full bg-fg/[0.06]">
                  <div
                    className="grow-x h-full rounded-full"
                    style={{
                      width: `${Math.max((item.total / top) * 100, 2)}%`,
                      background: color,
                      animationDelay: `${0.25 + index * 0.05}s`,
                    }}
                  />
                </div>
              </div>
              <CategoryVariation value={item.variation} />
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export default CategoryBreakdown;
