import { Bar } from "react-chartjs-2";
import { formatCompactCurrency, formatCurrency } from "@/lib/format";
import { useLanguage } from "@/hooks/useLanguage";
import { GRID_COLOR, SERIES_COLORS, tooltipStyle } from "./chartSetup";

// Barras horizontales: comparar magnitudes entre categorias (una sola serie).
function CategoryChart({ data }) {
  const { t, locale } = useLanguage();
  const total = data.reduce((sum, item) => sum + item.total, 0);

  const chartData = {
    labels: data.map((item) => t(`cat_${item.category}`)),
    datasets: [
      {
        label: t("expenses"),
        data: data.map((item) => item.total),
        backgroundColor: SERIES_COLORS.expense,
        hoverBackgroundColor: "#ec7445",
        borderRadius: 4,
        borderSkipped: "start",
        barThickness: 18,
      },
    ],
  };

  const options = {
    indexAxis: "y",
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        ...tooltipStyle,
        callbacks: {
          label: (ctx) => {
            const share = total ? Math.round((ctx.parsed.x / total) * 100) : 0;
            return ` ${formatCurrency(ctx.parsed.x, locale)} · ${share}%`;
          },
        },
      },
    },
    scales: {
      x: {
        beginAtZero: true,
        grid: { color: GRID_COLOR },
        border: { display: false },
        ticks: { callback: (value) => formatCompactCurrency(value, locale), maxTicksLimit: 5 },
      },
      y: {
        grid: { display: false },
        border: { display: false },
        ticks: { color: "#e5e5e5" },
      },
    },
  };

  const height = Math.max(160, data.length * 36 + 40);

  return (
    <div style={{ height }} role="img" aria-label={t("chartByCategory")}>
      <Bar data={chartData} options={options} />
    </div>
  );
}

export default CategoryChart;
