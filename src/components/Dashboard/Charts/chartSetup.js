import {
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Filler,
  Legend,
  LinearScale,
  LineElement,
  PointElement,
  Tooltip,
} from "chart.js";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Filler,
  Tooltip,
  Legend,
);

ChartJS.defaults.font.family =
  '"Geist Mono Variable", ui-monospace, "Geist Variable", system-ui, sans-serif';
ChartJS.defaults.font.size = 11;
ChartJS.defaults.color = "#82878f";

// Colores del grafico segun el tema activo (leidos de las variables CSS).
// Verde entra, rojo sale: los mismos tonos que los montos.
export function chartColors() {
  const styles = getComputedStyle(document.documentElement);
  const read = (name) => styles.getPropertyValue(name).trim();
  const fgRgb = read("--fg-rgb").split(/\s+/).join(", ");
  return {
    income: read("--income"),
    expense: read("--expense"),
    danger: read("--danger"),
    text: read("--foreground"),
    muted: read("--text-4"),
    soft: read("--text-2"),
    base: read("--surface-base"),
    grid: `rgba(${fgRgb}, 0.06)`,
    // Linea del cero (referencia para el neto) y tinta neutra con transparencia.
    zero: `rgba(${fgRgb}, 0.28)`,
    fg: (alpha) => `rgba(${fgRgb}, ${alpha})`,
    tooltipBg: read("--elevated"),
    tooltipBorder: read("--border-strong"),
  };
}

const MONO = '"Geist Mono Variable", ui-monospace, monospace';

export function tooltipStyle(colors) {
  return {
    backgroundColor: colors.tooltipBg,
    borderColor: colors.tooltipBorder,
    borderWidth: 1,
    titleColor: colors.muted,
    titleFont: { family: '"Geist Variable", system-ui, sans-serif', weight: 400, size: 12 },
    bodyColor: colors.text,
    bodyFont: { family: MONO, size: 12 },
    footerColor: colors.soft,
    footerFont: { family: MONO, size: 12, weight: 400 },
    footerMarginTop: 8,
    padding: 12,
    cornerRadius: 10,
    boxPadding: 6,
    boxWidth: 8,
    boxHeight: 2,
    usePointStyle: false,
  };
}
