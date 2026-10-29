import { z } from "zod";

/*
Colores a eleccion (Ajustes > Colores), compartido entre la app y el servidor.
- palette: colores de ingresos y gastos.
- expenseColor: donde se muestra el color de los gastos. Las alertas (vencido,
  presupuesto excedido, no alcanza) lo usan siempre.
- categoryChart: el grafico de gastos por categoria del inicio (se elige desde
  el mismo grafico): tipo, que dicen las etiquetas y cuantas categorias muestra
  (0 = todas; si no, las principales y el resto junto en "Otras").
*/
export const PALETTES = ["clasica", "suave", "sobria", "contraste"];

export const EXPENSE_COLOR_PLACES = ["list", "balanceBar", "cashflow", "due", "monthTotal"];

export const CATEGORY_CHART_TYPES = ["pie", "donut", "bars"];
export const CATEGORY_CHART_LABELS = ["percent", "amount", "none"];
export const CATEGORY_CHART_TOPS = [0, 5];

export const DEFAULT_CATEGORY_CHART = { type: "pie", labels: "percent", top: 0 };

export const DEFAULT_APPEARANCE = {
  palette: "clasica",
  expenseColor: { list: false, balanceBar: true, cashflow: true, due: true, monthTotal: false },
  categoryChart: DEFAULT_CATEGORY_CHART,
};

export const appearanceSchema = z.object({
  palette: z.enum(PALETTES),
  expenseColor: z.object(Object.fromEntries(EXPENSE_COLOR_PLACES.map((place) => [place, z.boolean()]))),
  // Opcional: las versiones anteriores de la app no lo mandan.
  categoryChart: z
    .object({
      type: z.enum(CATEGORY_CHART_TYPES),
      labels: z.enum(CATEGORY_CHART_LABELS),
      top: z.union(CATEGORY_CHART_TOPS.map((value) => z.literal(value))),
    })
    .default(DEFAULT_CATEGORY_CHART),
});

// Lo guardado mas los valores por defecto para lo que falte (o si esta roto).
export function normalizeAppearance(value) {
  const palette = PALETTES.includes(value?.palette) ? value.palette : DEFAULT_APPEARANCE.palette;
  const expenseColor = { ...DEFAULT_APPEARANCE.expenseColor };
  for (const place of EXPENSE_COLOR_PLACES) {
    if (typeof value?.expenseColor?.[place] === "boolean") expenseColor[place] = value.expenseColor[place];
  }
  const chart = value?.categoryChart;
  const categoryChart = {
    type: CATEGORY_CHART_TYPES.includes(chart?.type) ? chart.type : DEFAULT_CATEGORY_CHART.type,
    labels: CATEGORY_CHART_LABELS.includes(chart?.labels) ? chart.labels : DEFAULT_CATEGORY_CHART.labels,
    top: CATEGORY_CHART_TOPS.includes(chart?.top) ? chart.top : DEFAULT_CATEGORY_CHART.top,
  };
  return { palette, expenseColor, categoryChart };
}
