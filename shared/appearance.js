import { z } from "zod";

/*
Colores a eleccion (Ajustes > Colores), compartido entre la app y el servidor.
- palette: colores de ingresos y gastos.
- expenseColor: donde se muestra el color de los gastos. Las alertas (vencido,
  presupuesto excedido, no alcanza) lo usan siempre.
*/
export const PALETTES = ["clasica", "suave", "sobria", "contraste"];

export const EXPENSE_COLOR_PLACES = ["list", "balanceBar", "cashflow", "due", "monthTotal"];

export const DEFAULT_APPEARANCE = {
  palette: "clasica",
  expenseColor: { list: false, balanceBar: true, cashflow: true, due: true, monthTotal: false },
};

export const appearanceSchema = z.object({
  palette: z.enum(PALETTES),
  expenseColor: z.object(Object.fromEntries(EXPENSE_COLOR_PLACES.map((place) => [place, z.boolean()]))),
});

// Lo guardado mas los valores por defecto para lo que falte (o si esta roto).
export function normalizeAppearance(value) {
  const palette = PALETTES.includes(value?.palette) ? value.palette : DEFAULT_APPEARANCE.palette;
  const expenseColor = { ...DEFAULT_APPEARANCE.expenseColor };
  for (const place of EXPENSE_COLOR_PLACES) {
    if (typeof value?.expenseColor?.[place] === "boolean") expenseColor[place] = value.expenseColor[place];
  }
  return { palette, expenseColor };
}
