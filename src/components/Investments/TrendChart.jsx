import { useMemo, useRef, useState } from "react";
import { Chart as ChartJS, LogarithmicScale } from "chart.js";
import zoomPlugin from "chartjs-plugin-zoom";
import { ZoomOutIcon } from "lucide-react";
import { Line } from "react-chartjs-2";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/format";
import { useAppearance } from "@/hooks/useAppearance";
import { useLanguage } from "@/hooks/useLanguage";
import { useTheme } from "@/hooks/useTheme";
import { chartColors, tooltipStyle } from "@/components/Dashboard/Charts/chartSetup";

ChartJS.register(zoomPlugin, LogarithmicScale);

// "#22c55e" + 0.3 -> "rgba(34, 197, 94, 0.3)"
function withAlpha(hex, alpha) {
  const value = hex.replace("#", "");
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(value.slice(i, i + 2), 16));
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function prefersReducedMotion() {
  return typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
}

// Posicion (indice) del ultimo punto con fecha <= date, o -1.
function indexOn(points, date) {
  let found = -1;
  for (let index = 0; index < points.length && points[index].date <= date; index++) found = index;
  return found;
}

// Colores pastel de las bandas (uno por tramo, se repiten).
const BAND_COLORS = ["#a5b4fc", "#fda4af", "#86efac", "#fcd34d", "#93c5fd", "#f0abfc", "#5eead4"];

/*
Bandas de fondo por tramo (por ejemplo, cada gobierno) con su nombre arriba.
bands: [{ start, end, label }] con fechas "YYYY-MM-DD" (end null = hasta el final).
*/
function bandsPlugin(points, bands, colors) {
  return {
    id: "bands",
    beforeDatasetsDraw(chart) {
      if (!bands?.length) return;
      const { ctx, chartArea, scales } = chart;
      ctx.save();
      bands.forEach((band, index) => {
        const from = Math.max(indexOn(points, band.start), 0);
        const to = band.end ? indexOn(points, band.end) : points.length - 1;
        if (to < 0 || from > points.length - 1) return;
        const left = Math.max(scales.x.getPixelForValue(from), chartArea.left);
        const right = Math.min(scales.x.getPixelForValue(Math.max(to, from)), chartArea.right);
        if (right <= chartArea.left || left >= chartArea.right || right - left < 1) return;
        const color = BAND_COLORS[index % BAND_COLORS.length];
        ctx.fillStyle = withAlpha(color, 0.1);
        ctx.fillRect(left, chartArea.top, right - left, chartArea.bottom - chartArea.top);
        // Linea de inicio del tramo y el nombre, si entra.
        ctx.strokeStyle = withAlpha(color, 0.5);
        ctx.setLineDash([3, 3]);
        ctx.beginPath();
        ctx.moveTo(left, chartArea.top);
        ctx.lineTo(left, chartArea.bottom);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.font = '500 10.5px "Geist Variable", system-ui, sans-serif';
        const width = ctx.measureText(band.label).width;
        if (right - left > width + 10) {
          ctx.fillStyle = colors.soft;
          ctx.textBaseline = "top";
          ctx.fillText(band.label, left + 5, chartArea.top + 4);
        }
      });
      ctx.restore();
    },
  };
}

/*
Linea con degradado debajo: verde si termino arriba de donde empezo (o de lo
aportado), roja si termino abajo.
- points: [{ date, value, base? }]. base: segunda linea punteada (lo aportado).
- markers: [{ date, value, label }]: compras marcadas con un punto (y su texto en el tooltip).
- bands: tramos de fondo (ver bandsPlugin). zoomable: arrastrar o pellizcar para acercar.
- neutral: linea en gris (sin verde ni rojo), por ejemplo para el dolar.
- format(value, { compact }): texto de los valores.
Es decorativo para lectores de pantalla: quien lo usa da el resumen en texto.
*/
function TrendChart({ points, format, valueLabel, baseLabel, markerLabel, markers = [], bands, zoomable = false, neutral = false, logScale = false, className = "h-48" }) {
  const { t, locale } = useLanguage();
  const { resolvedTheme } = useTheme();
  const { appearance } = useAppearance();
  const chartRef = useRef(null);
  // Tramo visible cuando se acerco ({ min, max } en indices), o null para todo.
  // Va en el estado: si no, cada render del componente volvia a mostrar todo.
  const [view, setView] = useState(null);
  const keepView = ({ chart }) => setView({ min: Math.round(chart.scales.x.min), max: Math.round(chart.scales.x.max) });
  // En pantallas angostas, menos fechas en el eje.
  const narrow = typeof window !== "undefined" && window.innerWidth < 640;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const colors = useMemo(() => chartColors(), [resolvedTheme, appearance.palette]);

  const hasBase = points.some((point) => point.base !== undefined);
  const first = points[0];
  const last = points.at(-1);
  const up = hasBase ? last.value >= last.base : last.value >= first.value;
  const color = neutral ? colors.soft : up ? colors.income : colors.expense || colors.danger;
  const long = points.length > 1 && points[0].date.slice(0, 4) !== last.date.slice(0, 4);

  // Cada compra va en el punto de su fecha (o el anterior con datos).
  const markerAt = new Map();
  for (const marker of markers) {
    const index = indexOn(points, marker.date);
    if (index < 0) continue;
    if (!markerAt.has(index)) markerAt.set(index, []);
    markerAt.get(index).push(marker);
  }

  const data = {
    labels: points.map((point) => point.date),
    datasets: [
      {
        label: valueLabel,
        data: points.map((point) => point.value),
        borderColor: color,
        borderWidth: 2,
        pointRadius: 0,
        pointHoverRadius: 4,
        pointHoverBackgroundColor: colors.base,
        pointHoverBorderColor: color,
        pointHoverBorderWidth: 2,
        tension: 0.2,
        fill: "start",
        backgroundColor: (context) => {
          const { ctx, chartArea } = context.chart;
          if (!chartArea) return "transparent";
          const gradient = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
          gradient.addColorStop(0, withAlpha(color, 0.24));
          gradient.addColorStop(1, withAlpha(color, 0));
          return gradient;
        },
      },
      ...(hasBase
        ? [
            {
              label: baseLabel,
              data: points.map((point) => point.base),
              borderColor: colors.fg(0.45),
              borderWidth: 1.5,
              borderDash: [4, 4],
              pointRadius: 0,
              pointHoverRadius: 0,
              stepped: "before",
              fill: false,
            },
          ]
        : []),
      ...(markerAt.size
        ? [
            {
              label: markerLabel,
              // El punto va a la altura del precio de compra.
              data: points.map((_, index) => markerAt.get(index)?.[0].value ?? null),
              showLine: false,
              pointRadius: 5.5,
              pointHoverRadius: 7,
              pointBackgroundColor: colors.text,
              pointBorderColor: colors.base,
              pointBorderWidth: 2,
              pointStyle: "circle",
            },
          ]
        : []),
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: "index", intersect: false },
    animation: prefersReducedMotion() ? false : { duration: 500, easing: "easeOutQuart" },
    layout: { padding: { top: 6, bottom: 2 } },
    plugins: {
      legend: { display: false },
      tooltip: {
        ...tooltipStyle(colors),
        displayColors: hasBase,
        filter: (item) => item.raw !== null,
        callbacks: {
          title: (items) =>
            formatDate(points[items[0].dataIndex].date, locale, { day: "numeric", month: "short", year: "numeric" }),
          label: (context) => {
            const bought = context.datasetIndex === data.datasets.length - 1 && markerAt.size ? markerAt.get(context.dataIndex) : null;
            if (bought) return bought.map((marker) => ` ${marker.label}`);
            return ` ${context.dataset.label}  ${format(context.parsed.y)}`;
          },
        },
      },
      zoom: zoomable
        ? {
            limits: { x: { minRange: 5 } },
            zoom: {
              drag: { enabled: true, backgroundColor: colors.fg(0.08), borderColor: colors.fg(0.3), borderWidth: 1 },
              pinch: { enabled: true },
              mode: "x",
              onZoomComplete: keepView,
            },
            pan: { enabled: true, mode: "x", modifierKey: "shift", onPanComplete: keepView },
          }
        : false,
    },
    scales: {
      x: {
        min: view?.min,
        max: view?.max,
        grid: { display: false },
        border: { display: false },
        ticks: {
          maxTicksLimit: narrow ? 4 : 6,
          maxRotation: 0,
          color: colors.muted,
          // value es la posicion del punto (con zoom, no coincide con el numero de rotulo).
          callback: (value) =>
            formatDate(points[value].date, locale, long ? { month: "short", year: "2-digit" } : { day: "numeric", month: "short" }).replace(".", ""),
        },
      },
      y: {
        // Logaritmica: una suba del 10% ocupa lo mismo en cualquier momento.
        type: logScale ? "logarithmic" : "linear",
        // Aire arriba: la linea no toca el borde ni los nombres de las bandas.
        suggestedMax: Math.max(...points.map((point) => point.value)) * (logScale ? 1.35 : 1.04),
        position: "right",
        grid: { color: colors.grid },
        border: { display: false },
        ticks: {
          maxTicksLimit: 5,
          color: colors.muted,
          // En logaritmica solo se rotulan los "redondos" (1, 2, 5, 10, 20...).
          callback: (value) => (logScale && !/^[125]0*$/.test(String(Math.round(value))) ? "" : format(value, { compact: true })),
        },
      },
    },
  };

  return (
    <div className="grid gap-2">
      <div className={`relative ${className}`} aria-hidden="true">
        <Line
          ref={chartRef}
          key={`${resolvedTheme}-${appearance.palette}-${points.length}-${first.date}`}
          data={data}
          options={options}
          plugins={bands?.length ? [bandsPlugin(points, bands, colors)] : []}
        />
      </div>
      {zoomable && (
        <div className="flex min-h-8 items-center justify-between gap-3 text-xs text-[color:var(--text-4)]">
          <span>{t("chartZoomHint")}</span>
          {view && (
            <Button
              variant="outline"
              size="xs"
              onClick={() => {
                chartRef.current?.resetZoom();
                setView(null);
              }}
            >
              <ZoomOutIcon data-icon="inline-start" />
              {t("chartZoomReset")}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

export default TrendChart;
