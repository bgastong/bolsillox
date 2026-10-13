import { useMemo } from "react";
import { Line } from "react-chartjs-2";
import { formatCompactCurrency, formatCurrency, formatMonth } from "@/lib/format";
import { useLanguage } from "@/hooks/useLanguage";
import { useTheme } from "@/hooks/useTheme";
import { chartColors, tooltipStyle } from "./chartSetup";

// Degradado bajo la linea, desde arriba hasta el cero (se calcula con el
// tamaño real del grafico).
function neutralFill(colors) {
  return (context) => {
    const { ctx, chartArea } = context.chart;
    if (!chartArea) return "transparent";
    const gradient = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
    gradient.addColorStop(0, colors.fg(0.12));
    gradient.addColorStop(1, colors.fg(0));
    return gradient;
  };
}

// Neto de cada mes (ingresos menos gastos) en una sola linea neutra. Los
// meses negativos se marcan con un punto rojo y el ultimo mes (el elegido)
// con un punto mas grande. Al pasar por un mes se ven ingresos, gastos y neto.
function MonthlyChart({ data, currency = "ARS" }) {
  const { t, locale } = useLanguage();
  const { resolvedTheme } = useTheme();
  // Se recalculan al cambiar de tema.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const colors = useMemo(() => chartColors(), [resolvedTheme]);
  const last = data.length - 1;
  const net = data.map((item) => item.income - item.expense);
  const negative = (index) => net[index] < 0;

  const chartData = {
    labels: data.map((item) => formatMonth(item.month, locale, true)),
    datasets: [
      {
        label: t("netLabel"),
        data: net,
        borderColor: colors.soft,
        borderWidth: 2,
        backgroundColor: neutralFill(colors),
        fill: "origin",
        // Curva suave que no "inventa" picos entre puntos.
        cubicInterpolationMode: "monotone",
        pointRadius: (context) => (context.dataIndex === last ? 4.5 : negative(context.dataIndex) ? 3.5 : 0),
        pointHoverRadius: 5,
        pointBackgroundColor: (context) => (negative(context.dataIndex) ? colors.expense : colors.base),
        pointBorderColor: (context) => (negative(context.dataIndex) ? colors.expense : colors.soft),
        pointBorderWidth: 2,
      },
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
        // Una sola serie: sin el cuadradito de color al lado de cada linea.
        displayColors: false,
        callbacks: {
          title: (items) => formatMonth(data[items[0].dataIndex].month, locale),
          label: (ctx) => {
            const item = data[ctx.dataIndex];
            return [
              ` ${t("incomes")}  ${formatCurrency(item.income, locale, { currency })}`,
              ` ${t("expenses")}  ${formatCurrency(item.expense, locale, { currency })}`,
            ];
          },
          footer: (items) =>
            `${t("netLabel")}  ${formatCurrency(net[items[0].dataIndex], locale, { currency, signed: true })}`,
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
        // La linea del cero se marca mas: arriba ahorraste, abajo gastaste de mas.
        grid: {
          color: (context) => (context.tick?.value === 0 ? colors.zero : colors.grid),
          drawTicks: false,
        },
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
            <th scope="col">{t("netLabel")}</th>
          </tr>
        </thead>
        <tbody>
          {data.map((item, index) => (
            <tr key={item.month}>
              <th scope="row">{formatMonth(item.month, locale)}</th>
              <td>{formatCurrency(item.income, locale, { currency })}</td>
              <td>{formatCurrency(item.expense, locale, { currency })}</td>
              <td>{formatCurrency(net[index], locale, { currency, signed: true })}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}

export default MonthlyChart;
