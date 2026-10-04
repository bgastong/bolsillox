import { ChevronRightIcon } from "lucide-react";
import { formatDate } from "@/lib/format";
import { movementLabel } from "@/lib/movementLabel";
import { useLanguage } from "@/hooks/useLanguage";
import { AmountText, CategoryIcon } from "../../Movements/MovementBits";

// Lista compacta de los ultimos movimientos (dashboard).
// Cada fila es un boton grande (comodo para el pulgar) que abre la edicion.
function ExpenseList({ movements, onEdit }) {
  const { t, locale } = useLanguage();

  return (
    <ul className="-mx-2 m-0 flex list-none flex-col p-0">
      {movements.map((movement) => (
        <li key={movement.id}>
          <button
            type="button"
            onClick={() => onEdit(movement)}
            aria-label={movementLabel(movement, t, locale)}
            className="group flex min-h-16 w-full touch-manipulation items-center gap-3 rounded-xl px-2 py-2.5 text-left transition-colors outline-none hover:bg-white/[0.03] focus-visible:ring-2 focus-visible:ring-ring active:bg-white/[0.05]"
          >
            <CategoryIcon category={movement.category} />
            <div className="min-w-0 flex-1">
              <p className="m-0 truncate text-[15px] font-medium sm:text-sm">{movement.title}</p>
              <p className="m-0 truncate text-xs text-muted-foreground">
                {t(`cat_${movement.category}`)} · {formatDate(movement.date, locale)}
              </p>
            </div>
            <AmountText type={movement.type} amount={movement.amount} className="text-[15px] sm:text-sm" />
            <ChevronRightIcon
              aria-hidden="true"
              className="size-4 shrink-0 text-muted-foreground/60 transition-transform group-hover:translate-x-0.5"
            />
          </button>
        </li>
      ))}
    </ul>
  );
}

export default ExpenseList;
