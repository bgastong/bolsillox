import { PencilIcon, Trash2Icon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency, formatDate } from "@/lib/format";
import { useLanguage } from "../../hooks/useLanguage";
import { AmountText, TypeIcon } from "../Movements/MovementBits";
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
        onClick={() => onEdit(movement)}
        aria-label={`${t("edit")}: ${movement.title}`}
        title={t("edit")}
      >
        <PencilIcon />
      </Button>
      <Button
        variant="ghost"
        size="icon-sm"
        className="text-muted-foreground hover:text-destructive"
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
        <Skeleton key={index} className="h-14 w-full rounded-lg" />
      ))}
    </div>
  );
}

function TableHistory({ movements, onEdit, onDelete }) {
  const { t, locale } = useLanguage();
  const net = movements.reduce(
    (sum, movement) => sum + (movement.type === "income" ? movement.amount : -movement.amount),
    0,
  );
  const summaryText = `${t("resultsCount", { count: movements.length })} · ${t("resultsTotal", {
    total: formatCurrency(net, locale, { signed: true }),
  })}`;

  return (
    <>
      {/* Escritorio: tabla */}
      <div className="hidden rounded-xl border bg-card md:block">
        <Table>
          <TableCaption className="pb-4">{t("footerhistory")}</TableCaption>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12 pl-4">
                <span className="sr-only">{t("type")}</span>
              </TableHead>
              <TableHead>{t("titleLabel")}</TableHead>
              <TableHead>{t("date")}</TableHead>
              <TableHead>{t("category")}</TableHead>
              <TableHead>{t("method")}</TableHead>
              <TableHead className="text-right">{t("amount")}</TableHead>
              <TableHead className="w-24 pr-4 text-right">
                <span className="sr-only">{t("actions")}</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {movements.map((movement) => (
              <TableRow key={movement.id}>
                <TableCell className="pl-4">
                  <TypeIcon type={movement.type} className="size-8" />
                </TableCell>
                <TableCell className="max-w-64">
                  <p className="m-0 truncate font-medium">{movement.title}</p>
                  {movement.note && (
                    <p className="m-0 truncate text-xs text-muted-foreground">{movement.note}</p>
                  )}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {formatDate(movement.date, locale)}
                </TableCell>
                <TableCell>
                  <Badge variant="secondary">{t(`cat_${movement.category}`)}</Badge>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {t(`pm_${movement.paymentMethod}`)}
                </TableCell>
                <TableCell className="text-right">
                  <AmountText type={movement.type} amount={movement.amount} />
                </TableCell>
                <TableCell className="pr-4">
                  <RowActions movement={movement} onEdit={onEdit} onDelete={onDelete} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
          <TableFooter>
            <TableRow>
              <TableCell colSpan={7} className="px-4 text-right text-sm text-muted-foreground">
                {summaryText}
              </TableCell>
            </TableRow>
          </TableFooter>
        </Table>
      </div>

      {/* Mobile: tarjetas */}
      <div className="grid gap-2 md:hidden">
        <p className="m-0 text-xs text-muted-foreground">{summaryText}</p>
        <ul className="m-0 flex list-none flex-col gap-2 p-0">
          {movements.map((movement) => (
            <li key={movement.id} className="flex items-start gap-3 rounded-xl border bg-card p-3">
              <TypeIcon type={movement.type} />
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <p className="m-0 truncate font-medium">{movement.title}</p>
                  <AmountText type={movement.type} amount={movement.amount} className="text-sm" />
                </div>
                <p className="m-0 text-xs text-muted-foreground">
                  {formatDate(movement.date, locale)} · {t(`cat_${movement.category}`)} ·{" "}
                  {t(`pm_${movement.paymentMethod}`)}
                </p>
                {movement.note && (
                  <p className="m-0 mt-1 truncate text-xs text-muted-foreground">{movement.note}</p>
                )}
                <div className="mt-1 -mb-1">
                  <RowActions movement={movement} onEdit={onEdit} onDelete={onDelete} />
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </>
  );
}

export default TableHistory;
