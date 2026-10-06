import { PencilIcon, Trash2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency, formatDate } from "@/lib/format";
import { movementLabel } from "@/lib/movementLabel";
import { netTotals } from "@/lib/money";
import { useSettings } from "@/hooks/useSettings";
import { useLanguage } from "../../hooks/useLanguage";
import { AmountText, CategoryBadge, CategoryIcon, RecurringMark } from "../Movements/MovementBits";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

function RowActions({ movement, onEdit, onDelete }) {
  const { t } = useLanguage();
  return (
    <div className="flex justify-end gap-1">
      <Button
        variant="ghost"
        size="icon-sm"
        className="text-muted-foreground hover:text-foreground"
        onClick={() => onEdit(movement)}
        aria-label={`${t("edit")}: ${movement.title}`}
        title={t("edit")}
      >
        <PencilIcon />
      </Button>
      <Button
        variant="ghost"
        size="icon-sm"
        className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
        onClick={() => onDelete(movement)}
        aria-label={`${t("delete")}: ${movement.title}`}
        title={t("delete")}
      >
        <Trash2Icon />
      </Button>
    </div>
  );
}

export function TableHistorySkeleton() {
  return (
    <div className="grid gap-2" aria-hidden="true">
      {Array.from({ length: 6 }, (_, index) => (
        <Skeleton key={index} className="h-16 w-full rounded-xl" />
      ))}
    </div>
  );
}

function TableHistory({ movements, onEdit, onDelete }) {
  const { t, locale } = useLanguage();
  const { currency, rate } = useSettings();
  const net = netTotals(movements, currency, rate)
    .map((item) => formatCurrency(item.amount, locale, { signed: true, currency: item.currency }))
    .join(" · ");
  const summaryText = `${t("resultsCount", { count: movements.length })} · ${t("resultsTotal", {
    total: net,
  })}`;

  return (
    <>
      {/* Escritorio: tabla */}
      <div className="sticker hidden overflow-hidden rounded-2xl bg-card md:block">
        <Table>
          <TableCaption className="sr-only">{t("footerhistory")}</TableCaption>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="h-11 pl-5 text-xs font-medium text-muted-foreground">
                {t("titleLabel")}
              </TableHead>
              <TableHead className="text-xs font-medium text-muted-foreground">{t("category")}</TableHead>
              <TableHead className="text-xs font-medium text-muted-foreground">{t("date")}</TableHead>
              <TableHead className="text-xs font-medium text-muted-foreground">{t("method")}</TableHead>
              <TableHead className="text-right text-xs font-medium text-muted-foreground">
                {t("amount")}
              </TableHead>
              <TableHead className="w-24 pr-5 text-right">
                <span className="sr-only">{t("actions")}</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {movements.map((movement) => (
              <TableRow key={movement.id} className="group hover:bg-white/[0.02]">
                <TableCell className="max-w-72 py-3 pl-5">
                  <div className="flex items-center gap-3">
                    <CategoryIcon category={movement.category} className="size-9 rounded-lg" />
                    <div className="min-w-0">
                      <p className="m-0 flex min-w-0 items-center gap-1.5 font-medium">
                        <span className="truncate">{movement.title}</span>
                        {movement.recurringId && <RecurringMark />}
                      </p>
                      {movement.note && (
                        <p className="m-0 truncate text-xs text-muted-foreground">{movement.note}</p>
                      )}
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <CategoryBadge category={movement.category} />
                </TableCell>
                <TableCell className="text-muted-foreground tabular-nums">
                  {formatDate(movement.date, locale)}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {t(`pm_${movement.paymentMethod}`)}
                </TableCell>
                <TableCell className="text-right">
                  <AmountText type={movement.type} amount={movement.amount} currency={movement.currency} />
                </TableCell>
                <TableCell className="pr-5">
                  <div className="opacity-60 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
                    <RowActions movement={movement} onEdit={onEdit} onDelete={onDelete} />
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
          <TableFooter className="bg-white/[0.02]">
            <TableRow className="hover:bg-transparent">
              <TableCell colSpan={6} className="px-5 py-3 text-right text-sm text-muted-foreground">
                {summaryText}
              </TableCell>
            </TableRow>
          </TableFooter>
        </Table>
      </div>

      {/* Mobile: tarjetas; toda la tarjeta es un boton para editar */}
      <div className="grid gap-3 md:hidden">
        <p className="m-0 px-1 text-sm text-muted-foreground">{summaryText}</p>
        <ul className="m-0 flex list-none flex-col gap-2 p-0">
          {movements.map((movement) => (
            <li key={movement.id}>
              <button
                type="button"
                onClick={() => onEdit(movement)}
                aria-label={movementLabel(movement, t, locale)}
                className="flex w-full touch-manipulation items-center gap-3 rounded-2xl border bg-card p-3.5 text-left transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring active:bg-white/[0.04]"
              >
                <CategoryIcon category={movement.category} className="size-11" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="m-0 flex min-w-0 items-center gap-1.5 text-[15px] font-medium">
                      <span className="truncate">{movement.title}</span>
                      {movement.recurringId && <RecurringMark />}
                    </p>
                    <AmountText type={movement.type} amount={movement.amount} currency={movement.currency} className="text-[15px]" />
                  </div>
                  <div className="mt-1 flex items-center justify-between gap-2">
                    <CategoryBadge category={movement.category} className="min-w-0" />
                    <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
                      {formatDate(movement.date, locale, { day: "numeric", month: "short" })}
                    </span>
                  </div>
                  {movement.note && (
                    <p className="m-0 mt-1.5 truncate text-xs text-muted-foreground">{movement.note}</p>
                  )}
                </div>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </>
  );
}

export default TableHistory;
