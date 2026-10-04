import { PencilIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/format";
import { useLanguage } from "@/hooks/useLanguage";
import { AmountText, CategoryIcon } from "../../Movements/MovementBits";

// Lista compacta de los ultimos movimientos (dashboard).
function ExpenseList({ movements, onEdit }) {
  const { t, locale } = useLanguage();

  return (
    <ul className="-mx-2 m-0 flex list-none flex-col p-0">
      {movements.map((movement) => (
        <li
          key={movement.id}
          className="group flex items-center gap-3 rounded-xl px-2 py-2.5 transition-colors hover:bg-white/[0.03]"
        >
          <CategoryIcon category={movement.category} />
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
              className="text-muted-foreground opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:focus-visible:opacity-100"
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
