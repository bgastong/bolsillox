import { useRef } from "react";
import { EllipsisIcon } from "lucide-react";
import { formatCurrency, formatPercent } from "@/lib/format";
import { groupTop, OTHER_KEY } from "@/lib/pie";
import { useAppearance } from "@/hooks/useAppearance";
import { useLanguage } from "@/hooks/useLanguage";
import { useCategories } from "@/hooks/useCategories";
import { cn } from "@/lib/utils";
import { CategoryIcon } from "../../Movements/MovementBits";
import CategoryBars from "./CategoryBars";
import CategoryPie from "./CategoryPie";

// Color de "Otras" (las categorias mas chicas juntas): gris, se ve en los dos temas.
const OTHER_COLOR = "#8a8f98";

function OtherIcon() {
  return (
    <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-lg border border-fg/[0.07] bg-fg/[0.04] text-[color:var(--text-2)]">
      <EllipsisIcon className="size-4" strokeWidth={1.75} aria-hidden="true" />
    </span>
  );
}

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

/*
Desglose de gastos por categoria: arriba el grafico elegido (torta, dona o
barras contra el mes anterior, ver CategoryChartMenu) y abajo la lista con
icono, monto, porcentaje, barra relativa y variacion contra el mes anterior.
Al pasar por una fila se resalta su parte del grafico.
*/
function CategoryBreakdown({ data, currency = "ARS" }) {
  const { t, locale } = useLanguage();
  const { metaOf, nameOf } = useCategories();
  const { appearance } = useAppearance();
  const config = appearance.categoryChart;
  const items = groupTop(data, config.top).map((item) =>
    item.category === OTHER_KEY
      ? { ...item, name: t("categoryOthers", { count: item.count }), color: OTHER_COLOR }
      : { ...item, name: nameOf(item.category), color: metaOf(item.category).color },
  );
  const total = items.reduce((sum, item) => sum + item.total, 0);
  const top = Math.max(...items.map((item) => item.total), 1);
  const share = (value) => (total ? (value / total) * 100 : 0);
  const chartRef = useRef(null);

  return (
    <div className="grid gap-4">
      {config.type === "bars" ? (
        <CategoryBars ref={chartRef} items={items} currency={currency} labels={config.labels} />
      ) : (
        <CategoryPie ref={chartRef} items={items} currency={currency} donut={config.type === "donut"} labels={config.labels} />
      )}

      <ul className="-mx-2 m-0 flex list-none flex-col p-0">
        {items.map((item, index) => {
          const { name, color } = item;
          return (
            <li
              key={item.category}
              className="flex items-center gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-fg/[0.03]"
              onMouseEnter={() => chartRef.current?.highlight(index)}
              onMouseLeave={() => chartRef.current?.highlight(null)}
            >
              {item.category === OTHER_KEY ? <OtherIcon /> : <CategoryIcon category={item.category} className="size-8 rounded-lg" />}
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-2 text-sm">
                  <span className="flex min-w-0 items-center gap-1.5">
                    <span className="size-1.5 shrink-0 rounded-full" style={{ background: color }} aria-hidden="true" />
                    <span className="truncate">{name}</span>
                    <span className="text-[11.5px] text-[color:var(--text-4)] tabular-nums">
                      {/* Con gasto pero menos del 1%: "<1%" en vez de "0%" */}
                      {share(item.total) > 0 && share(item.total) < 1 ? "<1" : Math.round(share(item.total))}%
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
