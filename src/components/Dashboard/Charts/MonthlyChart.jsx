import { useMemo } from "react";
import { Line } from "react-chartjs-2";
import { formatCompactCurrency, formatCurrency, formatMonth } from "@/lib/format";
import { useLanguage } from "@/hooks/useLanguage";
import { useTheme } from "@/hooks/useTheme";
import { chartColors, tooltipStyle } from "./chartSetup";

// Degradado vertical bajo cada linea (se calcula con el tamaño real del grafico).
function areaFill(color, alpha) {
  return (context) => {
    const { ctx, chartArea } = context.chart;
    if (!chartArea) return "transparent";
    const gradient = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
    gradient.addColorStop(0, `${color}${alpha}`);
    gradient.addColorStop(1, `${color}00`);
    return gradient;
  };
}

// Lineas con area: ingresos vs. gastos de los ultimos meses. El ultimo
// punto (el mes elegido) queda marcado.
function MonthlyChart({ data, currency = "ARS" }) {
  const { t, locale } = useLanguage();
  const { resolvedTheme } = useTheme();
  // Se recalculan al cambiar de tema.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const colors = useMemo(() => chartColors(), [resolvedTheme]);
  const last = data.length - 1;
  const pointRadius = (context) => (context.dataIndex === last ? 4.5 : 0);

  const series = (key, label, color, alpha) => ({
    label,
    data: data.map((item) => item[key]),
    borderColor: color,
    borderWidth: 2,
    backgroundColor: areaFill(color, alpha),
    fill: true,
    // Curva suave que no "inventa" picos ni baja de cero entre puntos.
    cubicInterpolationMode: "monotone",
    pointRadius,
    pointHoverRadius: 5,
    pointBackgroundColor: colors.base,
    pointBorderColor: color,
    pointBorderWidth: 2,
  });

  const chartData = {
    labels: data.map((item) => formatMonth(item.month, locale, true)),
    datasets: [
      series("income", t("incomes"), colors.income, "38"),
      series("expense", t("expenses"), colors.expense, "1f"),
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: "index", intersect: false },
    animation: { duration: 900, easing: "easeOutQuart" },
    plugins: {
      legend: { display: false },
      tooltip: {
        ...tooltipStyle(colors),
        callbacks: {
          title: (items) => formatMonth(data[items[0].dataIndex].month, locale),
          label: (ctx) => ` ${ctx.dataset.label}  ${formatCurrency(ctx.parsed.y, locale, { currency })}`,
          footer: (items) => {
            const item = data[items[0].dataIndex];
            return `${t("netLabel")}  ${formatCurrency(item.income - item.expense, locale, { currency, signed: true })}`;
          },
        },
      },
    },
    scales: {
      x: {
        grid: { display: false },
        border: { display: false },
        ticks: {
          maxRotation: 0,
          autoSkipPadding: 12,
          color: (context) => (context.index === last ? colors.text : colors.muted),
        },
      },
      y: {
        beginAtZero: true,
        grace: "8%",
        grid: { color: colors.grid, drawTicks: false },
        border: { display: false, dash: [2, 5] },
        ticks: {
          color: colors.muted,
          padding: 10,
          maxTicksLimit: 5,
          callback: (value) => formatCompactCurrency(value, locale, currency),
        },
      },
    },
  };

  return (
    <>
      <div className="relative h-60 sm:h-64 lg:h-auto lg:min-h-64 lg:flex-1" aria-hidden="true">
        <Line key={resolvedTheme} data={chartData} options={options} />
      </div>
      {/* Version accesible del grafico para lectores de pantalla */}
      <table className="sr-only">
        <caption>{t("cashflowTitle")}</caption>
        <thead>
          <tr>
            <th scope="col">{t("month")}</th>
            <th scope="col">{t("incomes")}</th>
            <th scope="col">{t("expenses")}</th>
          </tr>
        </thead>
        <tbody>
          {data.map((item) => (
            <tr key={item.month}>
              <th scope="row">{formatMonth(item.month, locale)}</th>
              <td>{formatCurrency(item.income, locale, { currency })}</td>
              <td>{formatCurrency(item.expense, locale, { currency })}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}

export default MonthlyChart;
