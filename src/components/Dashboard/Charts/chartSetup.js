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
ChartJS.defaults.color = "#8b8b94";

// Paleta validada para daltonismo contra la superficie de las tarjetas (#111113).
export const SERIES_COLORS = {
  income: "#199e70",
  expense: "#8b6fe8",
};

export const GRID_COLOR = "rgba(255, 255, 255, 0.05)";

export const tooltipStyle = {
  backgroundColor: "#18181b",
  borderColor: "rgba(255, 255, 255, 0.1)",
  borderWidth: 1,
  titleColor: "#ffffff",
  bodyColor: "#c7c7c7",
  padding: 10,
  cornerRadius: 10,
  boxPadding: 4,
};
