import { forwardRef, useImperativeHandle, useMemo, useRef } from "react";
import { ArcElement, Chart as ChartJS } from "chart.js";
import { Doughnut } from "react-chartjs-2";
import { formatCurrency } from "@/lib/format";
import { sliceSizes } from "@/lib/pie";
import { useAppearance } from "@/hooks/useAppearance";
import { useLanguage } from "@/hooks/useLanguage";
import { useTheme } from "@/hooks/useTheme";
import { chartColors, tooltipStyle } from "./chartSetup";

ChartJS.register(ArcElement);

// Las porciones mas chicas que esto no llevan etiqueta afuera (se pisarian).
const MIN_LABEL_SHARE = 0.06;
// Cuanto sale la porcion al pasar el mouse.
const HOVER_OFFSET = 10;

function prefersReducedMotion() {
  return typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
}

/*
Etiquetas afuera de la torta, como en amCharts: una linea que sale del borde
de la porcion, quiebra hacia el costado y termina en el nombre y el porcentaje.
Las de cada lado se separan para que no se encimen.
*/
function outsideLabelsPlugin({ names, colors, values, text }) {
  return {
    id: "outsideLabels",
    afterDatasetsDraw(chart) {
      const meta = chart.getDatasetMeta(0);
      // Los porcentajes salen de los montos reales, no del tamaño dibujado.
      const total = values.reduce((sum, value) => sum + value, 0);
      if (!total) return;
      const { ctx, chartArea } = chart;
      const items = [];
      meta.data.forEach((arc, index) => {
        const value = values[index];
        if (value / total < MIN_LABEL_SHARE || !arc.circumference) return;
        const angle = arc.startAngle + arc.circumference / 2;
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);
        const radius = arc.outerRadius;
        items.push({
          index,
          right: cos >= 0,
          from: { x: arc.x + cos * radius, y: arc.y + sin * radius },
          elbow: { x: arc.x + cos * (radius + 12), y: arc.y + sin * (radius + 12) },
          label: text(value, total),
          color: chart.data.datasets[0].backgroundColor[index],
        });
      });

      // Cada etiqueta ocupa dos lineas (nombre arriba de la linea guia y
      // porcentaje abajo): las del mismo lado se separan al menos eso.
      const GAP = 36;
      const top = chartArea.top + 16;
      const bottom = chartArea.bottom - 16;
      for (const side of [true, false]) {
        const group = items.filter((item) => item.right === side).sort((a, b) => a.elbow.y - b.elbow.y);
        let last = -Infinity;
        for (const item of group) {
          item.y = Math.max(item.elbow.y, last + GAP, top);
          last = item.y;
        }
        // Si se pasaron de abajo, se corren para arriba (sin pisarse).
        let limit = bottom;
        for (const item of [...group].reverse()) {
          item.y = Math.min(item.y, limit);
          limit = item.y - GAP;
        }
      }

      ctx.save();
      ctx.lineWidth = 1;
      for (const item of items) {
        const endX = item.right ? chartArea.right - 2 : chartArea.left + 2;
        const lineEnd = item.right ? Math.max(item.elbow.x + 8, endX - 70) : Math.min(item.elbow.x - 8, endX + 70);
        ctx.strokeStyle = colors.fg(0.28);
        ctx.beginPath();
        ctx.moveTo(item.from.x, item.from.y);
        ctx.lineTo(item.elbow.x, item.y);
        ctx.lineTo(lineEnd, item.y);
        ctx.stroke();

        ctx.fillStyle = item.color;
        ctx.beginPath();
        ctx.arc(lineEnd, item.y, 2, 0, Math.PI * 2);
        ctx.fill();

        ctx.textAlign = item.right ? "right" : "left";
        ctx.textBaseline = "bottom";
        ctx.fillStyle = colors.soft;
        ctx.font = '400 11.5px "Geist Variable", system-ui, sans-serif';
        ctx.fillText(names[item.index], endX, item.y - 3);
        ctx.textBaseline = "top";
        ctx.fillStyle = colors.text;
        ctx.font = '500 11.5px "Geist Mono Variable", ui-monospace, monospace';
        ctx.fillText(item.label, endX, item.y + 3);
      }
      ctx.restore();
    },
  };
}

/*
Torta (o dona, con el total en el centro) de gastos por categoria, cada porcion
en el color de su categoria. items: [{ name, color, total }].
labels: que dice la etiqueta de afuera ("percent", "amount" o "none").
Es decorativa para lectores de pantalla: la lista de abajo dice lo mismo.
Con ref se puede resaltar una porcion desde afuera (al pasar por la lista).
*/
const CategoryPie = forwardRef(function CategoryPie({ items, currency = "ARS", donut = false, labels = "percent" }, ref) {
  const { t, locale } = useLanguage();
  const { resolvedTheme } = useTheme();
  const { appearance } = useAppearance();
  const chartRef = useRef(null);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const colors = useMemo(() => chartColors(), [resolvedTheme, appearance.palette]);

  const names = items.map((item) => item.name);
  const values = items.map((item) => item.total);
  const total = values.reduce((sum, value) => sum + value, 0);
  const labelText = (value, sum) =>
    labels === "amount" ? formatCurrency(value, locale, { currency }) : `${Math.round((value / sum) * 100)}%`;

  useImperativeHandle(ref, () => ({
    highlight(index) {
      const chart = chartRef.current;
      if (!chart) return;
      const active = index === null ? [] : [{ datasetIndex: 0, index }];
      // Solo se separa la porcion: la fila ya muestra el monto.
      chart.setActiveElements(active);
      chart.tooltip?.setActiveElements([], { x: 0, y: 0 });
      chart.update();
    },
  }));

  const chartData = {
    labels: names,
    datasets: [
      {
        data: sliceSizes(values),
        backgroundColor: items.map((item) => item.color),
        // Borde del color del panel: separa las porciones como en amCharts.
        borderColor: colors.base,
        borderWidth: 2,
        hoverOffset: HOVER_OFFSET,
        hoverBorderColor: colors.base,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    // Lugar a los costados para las etiquetas y arriba/abajo para la porcion que sale.
    layout: { padding: { top: HOVER_OFFSET + 4, bottom: HOVER_OFFSET + 4, left: 4, right: 4 } },
    radius: "72%",
    cutout: donut ? "62%" : 0,
    // Arranca a la izquierda y entra girando hasta completar la vuelta.
    rotation: -90,
    animation: prefersReducedMotion() ? false : { animateRotate: true, animateScale: false, duration: 900, easing: "easeOutQuart" },
    plugins: {
      legend: { display: false },
      tooltip: {
        ...tooltipStyle(colors),
        displayColors: true,
        boxWidth: 8,
        boxHeight: 8,
        callbacks: {
          title: () => "",
          label: (context) => {
            // El monto real (la porcion puede estar agrandada para que se vea).
            const amount = values[context.dataIndex];
            const share = total ? Math.round((amount / total) * 100) : 0;
            return ` ${context.label}  ${formatCurrency(amount, locale, { currency })} · ${share}%`;
          },
        },
      },
    },
  };

  return (
    <div className="relative h-56 sm:h-60" aria-hidden="true">
      <Doughnut
        ref={chartRef}
        key={`${resolvedTheme}-${appearance.palette}-${donut}-${labels}`}
        data={chartData}
        options={options}
        plugins={labels === "none" ? [] : [outsideLabelsPlugin({ names, colors, values, text: labelText })]}
      />
      {donut && (
        <div className="pointer-events-none absolute inset-0 grid place-content-center text-center">
          <span className="text-[11px] text-[color:var(--text-4)]">{t("chartTotal")}</span>
          <span className="text-[15px] font-medium tracking-[-0.02em] tabular-nums">{formatCurrency(total, locale, { currency })}</span>
        </div>
      )}
    </div>
  );
});

export default CategoryPie;
