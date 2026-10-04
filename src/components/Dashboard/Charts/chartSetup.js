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
  '"Satoshi", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
ChartJS.defaults.color = "#a8a8a8";

// Paleta categorica validada contra la superficie oscura (#161616).
export const SERIES_COLORS = {
  income: "#3987e5",
  expense: "#d95926",
};

export const GRID_COLOR = "rgba(255, 255, 255, 0.06)";

export const tooltipStyle = {
  backgroundColor: "#0d0d0d",
  borderColor: "#2e2e2e",
  borderWidth: 1,
  titleColor: "#ffffff",
  bodyColor: "#c7c7c7",
  padding: 10,
  cornerRadius: 8,
  boxPadding: 4,
};
