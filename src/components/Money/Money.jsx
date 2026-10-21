import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/format";
import { useLanguage } from "@/hooks/useLanguage";

const SIGNS = { income: "+", expense: "−", neutral: "" };

/*
Un monto de plata. Criterio de color: el rojo es solo para alertas.
- income: verde, con "+".
- expense: color de texto normal, con el "−" en gris (gastar es lo normal, no una alarma).
- neutral: sin signo ni color (totales, saldos a pagar).
- alert: rojo, para lo que hay que mirar ya (vencido, excedido).
amount va siempre en positivo: el signo lo pone type.

El lector de pantalla no lee "menos 24.500" sino "Gasto de $ 24.500"
(o el texto de label, si se pasa).
*/
export function Money({ amount, type = "neutral", currency = "ARS", alert = false, label, className }) {
  const { t, locale, hideAmounts } = useLanguage();
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
        alert ? "text-expense" : type === "income" ? "text-income" : "text-foreground",
        className,
      )}
    >
      <span aria-hidden="true">
        {sign && (
          <span className={cn(type === "expense" && !alert && "text-[color:var(--text-3)]")}>{sign}</span>
        )}
        {value}
      </span>
      <span className="sr-only">{spoken}</span>
    </span>
  );
}

export default Money;
