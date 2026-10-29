import { forwardRef, useImperativeHandle, useMemo, useRef } from "react";
import { Bar } from "react-chartjs-2";
import { formatCompactCurrency, formatCurrency } from "@/lib/format";
import { useAppearance } from "@/hooks/useAppearance";
import { useLanguage } from "@/hooks/useLanguage";
import { useTheme } from "@/hooks/useTheme";
import { chartColors, tooltipStyle } from "./chartSetup";

function prefersReducedMotion() {
  return typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
}

// Etiqueta al final de cada barra de este mes (porcentaje del total o monto).
function barLabelsPlugin({ colors, text }) {
  return {
    id: "barLabels",
    afterDatasetsDraw(chart) {
      const meta = chart.getDatasetMeta(0);
      if (meta.hidden) return;
      const { ctx } = chart;
      ctx.save();
      ctx.font = '500 11px "Geist Mono Variable", ui-monospace, monospace';
      ctx.fillStyle = colors.soft;
      ctx.textBaseline = "middle";
      meta.data.forEach((bar, index) => {
        const label = text(index);
        const width = ctx.measureText(label).width;
        // Si no entra a la derecha de la barra, va adentro.
        const inside = bar.x + 6 + width > chart.chartArea.right;
        ctx.textAlign = inside ? "right" : "left";
        ctx.fillStyle = inside ? colors.base : colors.soft;
        ctx.fillText(label, inside ? bar.x - 6 : bar.x + 6, bar.y);
      });
      ctx.restore();
    },
  };
}

/*
Barras horizontales de gastos por categoria: este mes (en el color de cada
categoria) y, debajo, el mes anterior en gris para comparar.
items: [{ name, color, total, previous }]. labels: "percent", "amount" o "none".
Ocupa lo mismo que la torta: asi, al cambiar de grafico el panel no cambia de
alto (ni el flujo de caja de al lado, que se estira para emparejarlo).
Decorativo para lectores de pantalla (la lista de abajo dice lo mismo); con
ref se resalta una categoria desde afuera.
*/
const CategoryBars = forwardRef(function CategoryBars({ items, currency = "ARS", labels = "percent" }, ref) {
  const { t, locale } = useLanguage();
  const { resolvedTheme } = useTheme();
  const { appearance } = useAppearance();
  const chartRef = useRef(null);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const colors = useMemo(() => chartColors(), [resolvedTheme, appearance.palette]);
  const total = items.reduce((sum, item) => sum + item.total, 0);

  useImperativeHandle(ref, () => ({
    highlight(index) {
      const chart = chartRef.current;
      if (!chart) return;
      chart.setActiveElements(index === null ? [] : [{ datasetIndex: 0, index }]);
      chart.update();
    },
  }));

  const text = (index) => {
    const value = items[index].total;
    if (labels === "amount") return formatCurrency(value, locale, { currency });
    const share = total ? (value / total) * 100 : 0;
    return share > 0 && share < 1 ? "<1%" : `${Math.round(share)}%`;
  };

  const data = {
    labels: items.map((item) => item.name),
    datasets: [
      {
        label: t("chartThisMonth"),
        data: items.map((item) => item.total),
        backgroundColor: items.map((item) => item.color),
        hoverBackgroundColor: items.map((item) => item.color),
        borderRadius: 4,
        barPercentage: 0.9,
        categoryPercentage: 0.78,
        maxBarThickness: 14,
      },
      {
        label: t("chartPreviousMonth"),
        data: items.map((item) => item.previous ?? 0),
        backgroundColor: colors.fg(0.14),
        hoverBackgroundColor: colors.fg(0.22),
        borderRadius: 4,
        barPercentage: 0.9,
        categoryPercentage: 0.78,
        maxBarThickness: 14,
      },
    ],
  };

  const options = {
    indexAxis: "y",
    responsive: true,
    maintainAspectRatio: false,
    // Lugar a la derecha para la etiqueta de la barra mas larga.
    layout: { padding: { right: labels === "none" ? 4 : labels === "amount" ? 74 : 34 } },
    animation: prefersReducedMotion() ? false : { duration: 700, easing: "easeOutQuart" },
    interaction: { mode: "index", axis: "y", intersect: false },
    scales: {
      x: {
        beginAtZero: true,
        grid: { color: colors.grid },
        border: { display: false },
        ticks: { maxTicksLimit: 4, callback: (value) => formatCompactCurrency(value, locale, currency) },
      },
      y: {
        grid: { display: false },
        border: { display: false },
        ticks: { color: colors.soft, font: { family: '"Geist Variable", system-ui, sans-serif', size: 11.5 } },
      },
    },
    plugins: {
      legend: { display: false },
      tooltip: {
        ...tooltipStyle(colors),
        displayColors: true,
        boxWidth: 8,
        boxHeight: 8,
        callbacks: {
          label: (context) => ` ${context.dataset.label}  ${formatCurrency(context.parsed.x, locale, { currency })}`,
        },
      },
    },
  };

  return (
    <div className="grid h-56 grid-rows-[auto_minmax(0,1fr)] gap-2 sm:h-60" aria-hidden="true">
      <div className="flex items-center gap-4 text-[11px] text-[color:var(--text-4)]">
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-3 rounded-sm bg-[linear-gradient(90deg,#a78bfa,#fbbf24,#38bdf8)]" />
          {t("chartThisMonth")}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-3 rounded-sm bg-fg/15" />
          {t("chartPreviousMonth")}
        </span>
      </div>
      <div className="relative min-h-0">
        <Bar
          ref={chartRef}
          key={`${resolvedTheme}-${appearance.palette}-${labels}`}
          data={data}
          options={options}
          plugins={labels === "none" ? [] : [barLabelsPlugin({ colors, text })]}
        />
      </div>
    </div>
  );
});

export default CategoryBars;
