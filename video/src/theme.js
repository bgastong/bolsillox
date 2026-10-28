// Colores del tema oscuro de bolsillox (src/index.css de la app).
export const C = {
  bg: "#08090a",
  card: "#0e0f11",
  popover: "#121315",
  fg: "#f7f8f8",
  text2: "#b4b9c2",
  text3: "#8a8f98",
  text4: "#82878f",
  border: "rgba(255,255,255,0.07)",
  borderStrong: "rgba(255,255,255,0.16)",
  soft: "rgba(255,255,255,0.04)",
  income: "#3ecf8e",
  expense: "#f2555a",
  warn: "#fbbf24",
};

export const SANS = '"Geist", system-ui, sans-serif';
export const MONO = '"Geist Mono", ui-monospace, monospace';

// Colores de las categorias (los mismos de la app).
export const CAT = {
  housing: "#a78bfa",
  food: "#fbbf24",
  shopping: "#e879f9",
  transport: "#38bdf8",
  services: "#2dd4bf",
  entertainment: "#fb923c",
  health: "#f87171",
};

// "#3ecf8e" + 0.2 -> rgba
export function alpha(hex, a) {
  const v = hex.replace("#", "");
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(v.slice(i, i + 2), 16));
  return `rgba(${r}, ${g}, ${b}, ${a})`;
}

// 1250000 -> "1.250.000"
export function money(value, { sign = "" } = {}) {
  const text = new Intl.NumberFormat("es-AR", { maximumFractionDigits: 0 }).format(Math.round(Math.abs(value)));
  return `${sign}$ ${text}`;
}
