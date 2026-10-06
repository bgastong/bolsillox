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
ChartJS.defaults.color = "#5d6168";

// Verde entra, rojo sale (los mismos tonos que los montos).
export const SERIES_COLORS = {
  income: "#3ecf8e",
  expense: "#f2555a",
};

export const GRID_COLOR = "rgba(255, 255, 255, 0.055)";

export const tooltipStyle = {
  backgroundColor: "rgba(20, 21, 24, 0.96)",
  borderColor: "rgba(255, 255, 255, 0.1)",
  borderWidth: 1,
  titleColor: "#8a8f98",
  titleFont: { family: '"Geist Variable", system-ui, sans-serif', weight: 400, size: 12 },
  bodyColor: "#f7f8f8",
  bodyFont: { family: '"Geist Mono Variable", ui-monospace, monospace', size: 12 },
  padding: 12,
  cornerRadius: 10,
  boxPadding: 6,
  boxWidth: 8,
  boxHeight: 2,
  usePointStyle: false,
};
