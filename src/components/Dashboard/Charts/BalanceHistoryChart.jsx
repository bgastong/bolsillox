import { useMemo } from "react";
import { Line } from "react-chartjs-2";
import { cn } from "@/lib/utils";
import { formatCurrency, formatDate, formatMonth } from "@/lib/format";
import { useLanguage } from "@/hooks/useLanguage";
import { useAppearance } from "@/hooks/useAppearance";
import { useTheme } from "@/hooks/useTheme";
import { chartColors, tooltipStyle } from "./chartSetup";

// "#f2555a" + 0.5 -> "rgba(242, 85, 90, 0.5)"
function withAlpha(hex, alpha) {
  const value = hex.replace("#", "");
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(value.slice(i, i + 2), 16));
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

// Un mes muy corto (pocos movimientos) no lleva etiqueta: no entraria.
const MIN_LABEL_SHARE = 0.06;

function prefersReducedMotion() {
  return typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
}

/*
Rango vertical. La linea arranca un poco por debajo del saldo mas bajo, asi
cada ingreso o gasto se nota aunque el saldo sea alto. Si el saldo pasa a
negativo, el cero queda a la vista.
*/
function verticalRange(balances) {
  const lowest = Math.min(...balances);
  const highest = Math.max(...balances);
  const span = highest - lowest || Math.abs(highest) || 1;
  const min = lowest >= 0 ? Math.max(0, lowest - span * 0.2) : lowest - span * 0.1;
  return { min, max: highest + span * 0.12 };
}

// Meses del grafico, cada uno con cuantas barras ocupa: [{ key, count }].
function monthsOf(movements) {
  const months = [];
  for (const item of movements) {
    const key = item.date.slice(0, 7);
    if (months.at(-1)?.key === key) months.at(-1).count += 1;
    else months.push({ key, count: 1 });
  }
  return months;
}

/*
Flujo de caja: el saldo despues de cada movimiento, como una linea con area y
un punto por movimiento. Si entra plata la linea sube (tramo en el color de
ingresos); si sale, baja (tramo en el color de gastos, si se eligio en Ajustes >
Colores). Los meses anteriores van mas suaves y el mes elegido, marcado. Abajo,
los meses en pastillas. Para lectores de pantalla hay una tabla con lo mismo.
history: { start, movements: [{ id, date, type, title, change, balance }] } (ver server/summary.js).
*/
function BalanceHistoryChart({ history, month, currency = "ARS" }) {
  const { t, locale } = useLanguage();
  const { resolvedTheme } = useTheme();
  const { appearance } = useAppearance();
  const { palette } = appearance;
  // Se recalculan al cambiar de tema o de paleta.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const colors = useMemo(() => chartColors(), [resolvedTheme, palette]);

  const { movements } = history;
  // El primer punto es el saldo con que se arranco; despues, uno por movimiento.
  const points = [{ balance: history.start, start: true, date: movements[0].date }, ...movements];
  const last = points.length - 1;
  const months = monthsOf(movements);
  const money = (value, signed = false) => formatCurrency(value, locale, { currency, signed });
  const { min, max } = verticalRange(points.map((item) => item.balance));
  // Con muchos movimientos los puntos se pisan: solo se marcan al pasar el mouse.
  const showPoints = points.length <= 60;

  const tintExpenses = appearance.expenseColor.cashflow;
  // Color de cada movimiento: ingresos en su color; gastos en el suyo o en gris.
  const colorOf = (item) => {
    if (item.start) return colors.soft;
    if (item.type === "income") return colors.income;
    return tintExpenses ? colors.expense : colors.soft;
  };
  // Los meses anteriores al elegido, mas suaves.
  const dim = (item, color) => (item.date.startsWith(month) ? color : withAlpha(color, 0.5));

  const chartData = {
    labels: points.map((_, index) => index),
    datasets: [
      {
        label: t("balanceAvailable"),
        data: points.map((item) => item.balance),
        borderWidth: 2,
        // Cada tramo toma el color del movimiento al que llega (sube o baja).
        segment: {
          borderColor: (context) => dim(points[context.p1DataIndex], colorOf(points[context.p1DataIndex])),
        },
        fill: "start",
        backgroundColor: (context) => {
          const { ctx, chartArea } = context.chart;
          if (!chartArea) return "transparent";
          const gradient = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
          gradient.addColorStop(0, colors.fg(0.1));
          gradient.addColorStop(1, colors.fg(0));
          return gradient;
        },
        tension: 0.25,
        cubicInterpolationMode: "monotone",
        pointRadius: (context) => (context.dataIndex === last ? 4.5 : showPoints ? 3 : 0),
        pointHoverRadius: 5,
        pointBackgroundColor: colors.base,
        pointBorderWidth: 2,
        pointBorderColor: (context) => colorOf(points[context.dataIndex]),
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    layout: { padding: { top: 8, left: 6, right: 6 } },
    interaction: { mode: "index", intersect: false },
    animation: prefersReducedMotion() ? false : { duration: 700, easing: "easeOutQuart" },
    plugins: {
      legend: { display: false },
      tooltip: {
        ...tooltipStyle(colors),
        displayColors: false,
        callbacks: {
          title: (items) => {
            const item = points[items[0].dataIndex];
            return item.start
              ? t("historyStart")
              : formatDate(item.date, locale, { weekday: "short", day: "numeric", month: "long" });
          },
          label: (context) => {
            const item = points[context.dataIndex];
            return item.start ? "" : ` ${item.title}  ${money(item.change, true)}`;
          },
          footer: (items) => `${t("balanceAvailable")}  ${money(points[items[0].dataIndex].balance)}`,
        },
      },
    },
    scales: {
      x: { display: false },
      y: { display: false, min, max },
    },
  };

  return (
    <>
      <div className="flex flex-col gap-3 xl:flex-1" aria-hidden="true">
        <div className="relative h-52 sm:h-56 xl:h-auto xl:min-h-56 xl:flex-1">
          <Line key={`${resolvedTheme}-${palette}`} data={chartData} options={options} />
        </div>
        {/* Meses: cada uno ocupa el ancho de sus puntos (el primero suma el saldo inicial) */}
        <div className="flex px-1.5">
          {months.map((item, index) => (
            <div key={item.key} className="min-w-0" style={{ flex: `${item.count + (index === 0 ? 1 : 0)} 1 0` }}>
              {item.count / movements.length >= MIN_LABEL_SHARE && (
                <span
                  className={cn(
                    "inline-block rounded-full px-2.5 py-1 font-mono text-[11px] leading-none whitespace-nowrap",
                    item.key === month
                      ? "bg-foreground text-background"
                      : "bg-fg/[0.06] text-[color:var(--text-3)]",
                  )}
                >
                  {formatMonth(item.key, locale, true).split(" ")[0].replace(".", "")}
                </span>
              )}
            </div>
          ))}
        </div>
      </div>
      {/* Version accesible para lectores de pantalla. El sr-only va en un div: una
          tabla no se achica a 1px y ensanchaba la pagina en el celular. */}
      <div className="sr-only">
        <table>
          <caption>{t("cashflowTitle")}</caption>
          <thead>
            <tr>
              <th scope="col">{t("date")}</th>
              <th scope="col">{t("cashflowMovement")}</th>
              <th scope="col">{t("amount")}</th>
              <th scope="col">{t("balanceAvailable")}</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <th scope="row">{t("historyStart")}</th>
              <td>—</td>
              <td>—</td>
              <td>{money(history.start)}</td>
            </tr>
            {movements.map((item) => (
              <tr key={item.id}>
                <th scope="row">{formatDate(item.date, locale)}</th>
                <td>{item.title}</td>
                <td>{money(item.change, true)}</td>
                <td>{money(item.balance)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

export default BalanceHistoryChart;
