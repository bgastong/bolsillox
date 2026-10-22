import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/format";
import { useAppearance } from "@/hooks/useAppearance";
import { useLanguage } from "@/hooks/useLanguage";

const SIGNS = { income: "+", expense: "−", neutral: "" };

/*
Un monto de plata, con los colores de la paleta elegida (Ajustes > Colores).
- income: color de ingresos, con "+".
- expense: color de texto normal, con el "−" en gris (gastar es lo normal, no
  una alarma). Si es un movimiento de una lista (listItem) y la persona eligio
  ver el color de los gastos en las listas, va en el color de gastos.
- neutral: sin signo ni color (totales, saldos a pagar).
- alert: color de alertas, para lo que hay que mirar ya (vencido, excedido).
amount va siempre en positivo: el signo lo pone type.

El lector de pantalla no lee "menos 24.500" sino "Gasto de $ 24.500"
(o el texto de label, si se pasa).
*/
export function Money({ amount, type = "neutral", currency = "ARS", alert = false, listItem = false, label, className }) {
  const { t, locale, hideAmounts } = useLanguage();
  const { appearance } = useAppearance();
  const tinted = type === "expense" && listItem && appearance.expenseColor.list;
  const value = formatCurrency(Math.abs(amount ?? 0), locale, { currency });
  const sign = SIGNS[type] ?? "";
  // En modo privado el lector de pantalla tampoco dice el numero.
  const spoken = hideAmounts
    ? t("amountHidden")
    : (label ??
    (type === "income"
      ? t("moneyIncome", { amount: value })
      : type === "expense"
        ? t("moneyExpense", { amount: value })
        : value));

  return (
    <span
      className={cn(
        "font-medium whitespace-nowrap tabular-nums",
        alert ? "text-danger" : type === "income" ? "text-income" : tinted ? "text-expense" : "text-foreground",
        className,
      )}
    >
      <span aria-hidden="true">
        {sign && (
          <span className={cn(type === "expense" && !alert && !tinted && "text-[color:var(--text-3)]")}>{sign}</span>
        )}
        {value}
      </span>
      <span className="sr-only">{spoken}</span>
    </span>
  );
}

export default Money;
