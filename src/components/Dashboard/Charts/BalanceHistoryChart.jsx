import { useMemo } from "react";
import { Bar } from "react-chartjs-2";
import { cn } from "@/lib/utils";
import { formatCurrency, formatDate, formatMonth } from "@/lib/format";
import { useLanguage } from "@/hooks/useLanguage";
import { useAppearance } from "@/hooks/useAppearance";
import { useTheme } from "@/hooks/useTheme";
import { chartColors, tooltipStyle } from "./chartSetup";

// Un mes muy corto (pocos movimientos) no lleva etiqueta: no entraria.
const MIN_LABEL_SHARE = 0.06;

function prefersReducedMotion() {
  return typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
}

/*
Rango vertical. Las barras arrancan bastante por debajo del saldo mas bajo, asi
cada ingreso o gasto se nota (si arrancaran de $0, con un saldo alto todas se
verian iguales). Si el saldo pasa a negativo, el cero queda a la vista.
*/
function verticalRange(balances) {
  const lowest = Math.min(...balances);
  const highest = Math.max(...balances);
  const span = highest - lowest || Math.abs(highest) || 1;
  const min = lowest >= 0 ? Math.max(0, lowest - span * 0.45) : lowest - span * 0.1;
  return { min, max: highest + span * 0.06 };
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
Flujo de caja: una barra por movimiento, con la altura del saldo que quedo
despues. Si entra plata la barra siguiente sube; si sale, baja. Los meses van
abajo en pastillas y el mes elegido se resalta. Para lectores de pantalla hay
una tabla con lo mismo.
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
  const last = movements.length - 1;
  const months = monthsOf(movements);
  const money = (value, signed = false) => formatCurrency(value, locale, { currency, signed });
  const { min, max } = verticalRange(movements.map((item) => item.balance));

  // Meses anteriores mas suaves, el mes elegido mas marcado y la ultima barra (hoy) en primer plano.
  const barColor = (index) => {
    if (index === last) return colors.soft;
    return movements[index].date.startsWith(month) ? colors.fg(0.42) : colors.fg(0.16);
  };

  const chartData = {
    labels: movements.map((item) => item.id),
    datasets: [
      {
        label: t("balanceAvailable"),
        data: movements.map((item) => item.balance),
        backgroundColor: movements.map((_, index) => barColor(index)),
        hoverBackgroundColor: colors.text,
        borderRadius: { topLeft: 2, topRight: 2 },
        borderSkipped: "bottom",
        barPercentage: 0.62,
        // Barras finas, como lineas, aunque haya pocos movimientos.
        maxBarThickness: 8,
        categoryPercentage: 1,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    layout: { padding: 0 },
    interaction: { mode: "index", intersect: false },
    // Las barras crecen de izquierda a derecha, salvo que se haya pedido menos movimiento.
    animation: prefersReducedMotion()
      ? false
      : {
          duration: 600,
          easing: "easeOutQuart",
          delay: (context) => (context.type === "data" && context.mode === "default" ? context.dataIndex * 4 : 0),
        },
    plugins: {
      legend: { display: false },
      tooltip: {
        ...tooltipStyle(colors),
        displayColors: false,
        callbacks: {
          title: (items) =>
            formatDate(movements[items[0].dataIndex].date, locale, { weekday: "short", day: "numeric", month: "long" }),
          label: (context) => {
            const item = movements[context.dataIndex];
            return ` ${item.title}  ${money(item.change, true)}`;
          },
          footer: (items) => `${t("balanceAvailable")}  ${money(movements[items[0].dataIndex].balance)}`,
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
          <Bar key={`${resolvedTheme}-${palette}`} data={chartData} options={options} />
        </div>
        {/* Meses: cada uno ocupa el ancho de sus barras */}
        <div className="flex">
          {months.map((item) => (
            <div key={item.key} className="min-w-0" style={{ flex: `${item.count} 1 0` }}>
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
