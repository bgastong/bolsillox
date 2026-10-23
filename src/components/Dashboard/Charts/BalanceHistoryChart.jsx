import { useMemo } from "react";
import { Line } from "react-chartjs-2";
import { cn } from "@/lib/utils";
import { formatCurrency, formatDate } from "@/lib/format";
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

// Un tramo muy corto del eje (pocos puntos) no lleva etiqueta: no entraria.
const MIN_LABEL_SHARE = 0.07;

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

// Lunes de la semana de una fecha "YYYY-MM-DD".
function weekOf(iso) {
  const date = new Date(`${iso}T12:00:00`);
  date.setDate(date.getDate() - ((date.getDay() + 6) % 7));
  return date.toISOString().slice(0, 10);
}

/*
Como se rotula el eje de abajo segun el rango: dias en 7 dias, semanas en un
mes, meses en 3, 6 y 12 meses, y en "todo" meses o años segun lo que abarque.
*/
function axisUnit(range, points) {
  if (range === "7d") return "day";
  if (range === "1m") return "week";
  if (range !== "all" || points.length < 2) return "month";
  const first = points[0].date;
  const last = points.at(-1).date;
  const months = (Number(last.slice(0, 4)) - Number(first.slice(0, 4))) * 12 + Number(last.slice(5, 7)) - Number(first.slice(5, 7));
  return months > 24 ? "year" : "month";
}

const UNIT_KEY = {
  day: (iso) => iso,
  week: weekOf,
  month: (iso) => iso.slice(0, 7),
  year: (iso) => iso.slice(0, 4),
};

// Tramos del eje, cada uno con cuantos puntos ocupa: [{ key, date, count }].
function axisGroups(points, unit) {
  const groups = [];
  for (const point of points) {
    const key = UNIT_KEY[unit](point.date);
    if (groups.at(-1)?.key === key) groups.at(-1).count += 1;
    else groups.push({ key, date: point.date, count: 1 });
  }
  return groups;
}

function axisLabel(group, unit, locale) {
  const date = new Date(`${group.date}T12:00:00`);
  if (unit === "day") return new Intl.DateTimeFormat(locale, { weekday: "short", day: "numeric" }).format(date).replace(".", "");
  if (unit === "week") return formatDate(weekOf(group.date), locale, { day: "numeric", month: "short" }).replace(".", "");
  if (unit === "year") return group.key;
  return new Intl.DateTimeFormat(locale, { month: "short" }).format(date).replace(".", "");
}

/*
Flujo de caja: el saldo como una linea con area y un punto por movimiento (o
por dia, semana o mes si son muchos; ver server/cashflow.js). Si entra plata la
linea sube (tramo y degradado en el color de ingresos); si sale, baja (en el
color de gastos, si se eligio en Ajustes > Colores). Abajo, el eje en pastillas
segun el rango; la ultima, resaltada. Para lectores de pantalla hay una tabla.
flow: { range, start, bucket, points: [{ date, change, balance, type?, title?, count? }] }.
*/
function BalanceHistoryChart({ flow, currency = "ARS" }) {
  const { t, locale } = useLanguage();
  const { resolvedTheme } = useTheme();
  const { appearance } = useAppearance();
  const { palette } = appearance;
  // Se recalculan al cambiar de tema o de paleta.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const colors = useMemo(() => chartColors(), [resolvedTheme, palette]);

  const grouped = flow.bucket !== "movement";
  // El primer punto es el saldo con que se arranco; despues, uno por movimiento o periodo.
  const points = [{ balance: flow.start, start: true, date: flow.points[0].date }, ...flow.points];
  const last = points.length - 1;
  const unit = axisUnit(flow.range, flow.points);
  const groups = axisGroups(flow.points, unit);
  const money = (value, signed = false) => formatCurrency(value, locale, { currency, signed });
  const { min, max } = verticalRange(points.map((item) => item.balance));
  // Con muchos puntos se pisan: solo se marcan al pasar el mouse.
  const showPoints = points.length <= 60;

  const tintExpenses = appearance.expenseColor.cashflow;
  // Color de cada punto: si sube, el de ingresos; si baja, el de gastos (o gris).
  const colorOf = (item) => {
    if (item.start) return colors.soft;
    if (item.change >= 0) return colors.income;
    return tintExpenses ? colors.expense : colors.soft;
  };
  // Area bajo cada tramo: degradado del color del tramo.
  const areaUnder = (chart, color) => {
    const { ctx, chartArea } = chart;
    if (!chartArea) return "transparent";
    const gradient = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
    gradient.addColorStop(0, withAlpha(color, 0.22));
    gradient.addColorStop(1, withAlpha(color, 0));
    return gradient;
  };

  // Titulo del tooltip: el dia del movimiento, o el periodo agrupado.
  const periodTitle = (item) => {
    if (item.start) return t("historyStart");
    if (flow.bucket === "week") return t("cashflowWeekOf", { date: formatDate(item.date, locale, { day: "numeric", month: "long" }) });
    if (flow.bucket === "month") return formatDate(item.date, locale, { month: "long", year: "numeric" });
    return formatDate(item.date, locale, { weekday: "short", day: "numeric", month: "long" });
  };
  const pointLabel = (item) =>
    grouped ? t("cashflowMovementsCount", { count: item.count }) : item.title;

  const chartData = {
    labels: points.map((_, index) => index),
    datasets: [
      {
        label: t("balanceAvailable"),
        data: points.map((item) => item.balance),
        borderWidth: 2,
        // Cada tramo toma el color del punto al que llega (sube o baja).
        segment: {
          borderColor: (context) => colorOf(points[context.p1DataIndex]),
          backgroundColor: (context) => areaUnder(context.chart, colorOf(points[context.p1DataIndex])),
        },
        fill: "start",
        backgroundColor: colors.fg(0.06),
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
    animation: prefersReducedMotion() ? false : { duration: 600, easing: "easeOutQuart" },
    plugins: {
      legend: { display: false },
      tooltip: {
        ...tooltipStyle(colors),
        displayColors: false,
        callbacks: {
          title: (items) => periodTitle(points[items[0].dataIndex]),
          label: (context) => {
            const item = points[context.dataIndex];
            return item.start ? "" : ` ${pointLabel(item)}  ${money(item.change, true)}`;
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
          <Line key={`${resolvedTheme}-${palette}-${flow.range}`} data={chartData} options={options} />
        </div>
        {/* Eje: cada tramo ocupa el ancho de sus puntos (el primero suma el saldo inicial) */}
        <div className="flex px-1.5">
          {groups.map((group, index) => (
            <div key={group.key} className="min-w-0" style={{ flex: `${group.count + (index === 0 ? 1 : 0)} 1 0` }}>
              {(group.count / flow.points.length >= MIN_LABEL_SHARE || index === groups.length - 1) && (
                <span
                  className={cn(
                    "inline-block rounded-full px-2.5 py-1 font-mono text-[11px] leading-none whitespace-nowrap",
                    index === groups.length - 1
                      ? "bg-foreground text-background"
                      : "bg-fg/[0.06] text-[color:var(--text-3)]",
                  )}
                >
                  {axisLabel(group, unit, locale)}
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
              <td>{money(flow.start)}</td>
            </tr>
            {flow.points.map((item, index) => (
              <tr key={item.id ?? `${item.date}-${index}`}>
                <th scope="row">{periodTitle(item)}</th>
                <td>{pointLabel(item)}</td>
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
