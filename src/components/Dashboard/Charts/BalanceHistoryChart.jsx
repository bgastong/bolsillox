import { useMemo } from "react";
import { Line } from "react-chartjs-2";
import { formatCompactCurrency, formatCurrency, formatDate } from "@/lib/format";
import { useLanguage } from "@/hooks/useLanguage";
import { useTheme } from "@/hooks/useTheme";
import { chartColors, tooltipStyle } from "./chartSetup";

// Degradado bajo la linea (se calcula con el tamaño real del grafico).
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

// "YYYY-MM-DD" del dia anterior (para ubicar el saldo inicial).
function previousDay(iso) {
  const [year, month, day] = iso.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day - 1));
  return date.toISOString().slice(0, 10);
}

/*
Flujo de caja: el saldo despues de cada dia con movimientos, en una sola
linea neutra. Sube con cada ingreso y baja con cada gasto. El primer punto es
el saldo con que se arranco; el ultimo (hoy) queda marcado.
history: { start, days: [{ date, change, balance }] } (ver server/summary.js).
*/
function BalanceHistoryChart({ history, currency = "ARS" }) {
  const { t, locale } = useLanguage();
  const { resolvedTheme } = useTheme();
  // Se recalculan al cambiar de tema.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const colors = useMemo(() => chartColors(), [resolvedTheme]);

  const points = [
    { date: previousDay(history.days[0].date), change: null, balance: history.start },
    ...history.days,
  ];
  const last = points.length - 1;
  // Margen de 8% arriba y abajo, sin bajar de $0 si el saldo nunca fue negativo.
  const balances = points.map((point) => point.balance);
  const lowest = Math.min(...balances);
  const highest = Math.max(...balances);
  const margin = (highest - lowest || Math.abs(highest) || 1) * 0.08;
  const yMin = lowest >= 0 ? Math.max(0, lowest - margin) : lowest - margin;
  const shortDate = (iso) => formatDate(iso, locale, { day: "numeric", month: "short" });
  const money = (value, signed = false) => formatCurrency(value, locale, { currency, signed });

  const chartData = {
    labels: points.map((point) => shortDate(point.date)),
    datasets: [
      {
        label: t("balanceAvailable"),
        data: balances,
        borderColor: colors.soft,
        borderWidth: 2,
        backgroundColor: neutralFill(colors),
        fill: "start",
        // Rectas entre movimientos: cada subida o bajada es un movimiento real.
        tension: 0,
        pointRadius: (context) => (context.dataIndex === last ? 4.5 : 0),
        pointHoverRadius: 5,
        pointBackgroundColor: colors.base,
        pointBorderColor: colors.soft,
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
        displayColors: false,
        callbacks: {
          title: (items) => {
            const point = points[items[0].dataIndex];
            return point.change === null
              ? t("historyStart")
              : formatDate(point.date, locale, { weekday: "short", day: "numeric", month: "long" });
          },
          label: (ctx) => {
            const { change } = points[ctx.dataIndex];
            return change === null ? "" : ` ${t("historyDayChange")}  ${money(change, true)}`;
          },
          footer: (items) => `${t("balanceAvailable")}  ${money(points[items[0].dataIndex].balance)}`,
        },
      },
    },
    scales: {
      x: {
        grid: { display: false },
        border: { display: false },
        ticks: {
          maxRotation: 0,
          autoSkipPadding: 16,
          maxTicksLimit: 7,
          color: colors.muted,
        },
      },
      y: {
        min: yMin,
        max: highest + margin,
        // Si el saldo pasa por debajo de cero, la linea del cero se marca mas.
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
      {/* Version accesible del grafico para lectores de pantalla. El sr-only va en
          un div: una tabla no se achica a 1px y ensanchaba la pagina en el celular. */}
      <div className="sr-only">
      <table>
        <caption>{t("cashflowTitle")}</caption>
        <thead>
          <tr>
            <th scope="col">{t("date")}</th>
            <th scope="col">{t("historyDayChange")}</th>
            <th scope="col">{t("balanceAvailable")}</th>
          </tr>
        </thead>
        <tbody>
          {points.map((point) => (
            <tr key={point.date}>
              <th scope="row">{point.change === null ? t("historyStart") : formatDate(point.date, locale)}</th>
              <td>{point.change === null ? "—" : money(point.change, true)}</td>
              <td>{money(point.balance)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>
    </>
  );
}

export default BalanceHistoryChart;
