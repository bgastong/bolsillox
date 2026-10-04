import { PencilIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/format";
import { useLanguage } from "@/hooks/useLanguage";
import { AmountText, TypeIcon } from "../../Movements/MovementBits";

// Lista compacta de los ultimos movimientos (dashboard).
function ExpenseList({ movements, onEdit }) {
  const { t, locale } = useLanguage();

  return (
    <ul className="m-0 flex list-none flex-col gap-1 p-0">
      {movements.map((movement) => (
        <li
          key={movement.id}
          className="group flex items-center gap-3 rounded-lg px-2 py-2.5 transition-colors hover:bg-muted"
        >
          <TypeIcon type={movement.type} />
          <div className="min-w-0 flex-1">
            <p className="m-0 truncate text-sm font-medium">{movement.title}</p>
            <p className="m-0 truncate text-xs text-muted-foreground">
              {t(`cat_${movement.category}`)} · {formatDate(movement.date, locale)}
            </p>
          </div>
          <AmountText type={movement.type} amount={movement.amount} className="text-sm" />
          {onEdit && (
            <Button
              variant="ghost"
              size="icon-xs"
              className="opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:focus-visible:opacity-100"
              onClick={() => onEdit(movement)}
              aria-label={`${t("edit")}: ${movement.title}`}
            >
              <PencilIcon />
            </Button>
          )}
        </li>
      ))}
    </ul>
  );
}

export default ExpenseList;
