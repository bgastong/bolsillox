import { formatCurrency, formatDate } from "./format";

// Texto completo de un movimiento para lectores de pantalla
// (los botones de fila muestran la info repartida visualmente).
export function movementLabel(movement, t, locale) {
  const amount = formatCurrency(
    movement.type === "expense" ? -movement.amount : movement.amount,
    locale,
    { signed: true, currency: movement.currency },
  );
  return `${movement.title}, ${amount}, ${t(`cat_${movement.category}`)}, ${formatDate(
    movement.date,
    locale,
  )}. ${t("tapToEdit")}`;
}
