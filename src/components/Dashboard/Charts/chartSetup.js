import {
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LinearScale,
  Tooltip,
} from "chart.js";

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

ChartJS.defaults.font.family =
  '"Geist Variable", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
ChartJS.defaults.color = "#a69c8c";

// Paleta validada para daltonismo contra la superficie de las tarjetas (#1b1816):
// contraste 5.2:1 (ingresos) y 4.7:1 (gastos).
export const SERIES_COLORS = {
  income: "#199e70",
  expense: "#8b6fe8",
};

export const GRID_COLOR = "rgba(246, 236, 217, 0.06)";

export const tooltipStyle = {
  backgroundColor: "#221e1a",
  borderColor: "rgba(246, 236, 217, 0.18)",
  borderWidth: 2,
  titleColor: "#f6ecd9",
  bodyColor: "#d9cfbd",
  padding: 10,
  cornerRadius: 10,
  boxPadding: 4,
};
