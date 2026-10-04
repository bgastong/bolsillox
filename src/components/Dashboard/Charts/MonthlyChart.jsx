import { Bar } from "react-chartjs-2";
import { formatCompactCurrency, formatCurrency, formatMonth } from "@/lib/format";
import { useLanguage } from "@/hooks/useLanguage";
import { GRID_COLOR, SERIES_COLORS, tooltipStyle } from "./chartSetup";

// Barras agrupadas: ingresos vs. gastos de los ultimos meses (un solo eje).
function MonthlyChart({ data }) {
  const { t, locale } = useLanguage();

  const chartData = {
    labels: data.map((item) => formatMonth(item.month, locale, true)),
    datasets: [
      {
        label: t("incomes"),
        data: data.map((item) => item.income),
        backgroundColor: SERIES_COLORS.income,
        borderRadius: 6,
        borderSkipped: "start",
        maxBarThickness: 22,
        categoryPercentage: 0.6,
        barPercentage: 0.9,
      },
      {
        label: t("expenses"),
        data: data.map((item) => item.expense),
        backgroundColor: SERIES_COLORS.expense,
        borderRadius: 6,
        borderSkipped: "start",
        maxBarThickness: 22,
        categoryPercentage: 0.6,
        barPercentage: 0.9,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: "index", intersect: false },
    plugins: {
      legend: {
        position: "top",
        align: "end",
        labels: { boxWidth: 8, boxHeight: 8, useBorderRadius: true, borderRadius: 4, color: "#d4d4d8" },
      },
      tooltip: {
        ...tooltipStyle,
        callbacks: {
          title: (items) => formatMonth(data[items[0].dataIndex].month, locale),
          label: (ctx) => ` ${ctx.dataset.label}: ${formatCurrency(ctx.parsed.y, locale)}`,
        },
      },
    },
    scales: {
      x: { grid: { display: false }, border: { display: false } },
      y: {
        beginAtZero: true,
        grid: { color: GRID_COLOR },
        border: { display: false },
        ticks: { callback: (value) => formatCompactCurrency(value, locale), maxTicksLimit: 5 },
      },
    },
  };

  return (
    <div className="relative h-64 sm:h-72 lg:h-auto lg:min-h-72 lg:flex-1" role="img" aria-label={t("chartMonthly")}>
      <Bar data={chartData} options={options} />
    </div>
  );
}

export default MonthlyChart;
