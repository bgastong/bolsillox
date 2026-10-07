import { Line } from "react-chartjs-2";
import { formatCompactCurrency, formatCurrency, formatMonth } from "@/lib/format";
import { useLanguage } from "@/hooks/useLanguage";
import { GRID_COLOR, SERIES_COLORS, tooltipStyle } from "./chartSetup";

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
    pointBackgroundColor: "#08090a",
    pointBorderColor: color,
    pointBorderWidth: 2,
  });

  const chartData = {
    labels: data.map((item) => formatMonth(item.month, locale, true)),
    datasets: [
      series("income", t("incomes"), SERIES_COLORS.income, "38"),
      series("expense", t("expenses"), SERIES_COLORS.expense, "1f"),
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: "index", intersect: false },
    animation: { duration: 1100, easing: "easeOutQuart" },
    // Al abrirse, las lineas y el area suben desde cero.
    animations: {
      y: {
        duration: 1100,
        easing: "easeOutQuart",
        from: (context) =>
          context.type === "data" && context.mode === "default" && !context.dropped
            ? context.chart.scales.y.getPixelForValue(0)
            : undefined,
      },
    },
    plugins: {
      legend: { display: false },
      tooltip: {
        ...tooltipStyle,
        callbacks: {
          title: (items) => formatMonth(data[items[0].dataIndex].month, locale),
          label: (ctx) => ` ${ctx.dataset.label}  ${formatCurrency(ctx.parsed.y, locale, { currency })}`,
          footer: (items) => {
            const item = data[items[0].dataIndex];
            return `${t("netLabel")}  ${formatCurrency(item.income - item.expense, locale, { currency, signed: true })}`;
          },
        },
        footerColor: "#b4b9c2",
        footerFont: { family: '"Geist Mono Variable", ui-monospace, monospace', size: 12, weight: 400 },
        footerMarginTop: 8,
      },
    },
    scales: {
      x: {
        grid: { display: false },
        border: { display: false },
        ticks: {
          maxRotation: 0,
          autoSkipPadding: 12,
          color: (context) => (context.index === last ? "#f7f8f8" : "#5d6168"),
        },
      },
      y: {
        beginAtZero: true,
        grace: "8%",
        grid: { color: GRID_COLOR, drawTicks: false },
        border: { display: false, dash: [2, 5] },
        ticks: {
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
        <Line data={chartData} options={options} />
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
