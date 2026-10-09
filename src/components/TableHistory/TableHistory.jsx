import { CheckIcon, PencilIcon, Trash2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency, formatDate } from "@/lib/format";
import { movementLabel } from "@/lib/movementLabel";
import { netTotals } from "@/lib/money";
import { useSettings } from "@/hooks/useSettings";
import { cn } from "@/lib/utils";
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

// Casilla para elegir movimientos (accesible, con el color de la app).
function SelectBox({ checked, indeterminate = false, onChange, label }) {
  return (
    <input
      type="checkbox"
      checked={checked}
      ref={(node) => node && (node.indeterminate = indeterminate)}
      onChange={onChange}
      aria-label={label}
      className="size-[18px] shrink-0 cursor-pointer align-middle accent-[color:var(--primary)]"
    />
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

/*
selected: Set de ids elegidos; onToggle(id) y onToggleAll() para cambiarlos.
selecting: en el celular, tocar una tarjeta la elige en vez de editarla.
*/
function TableHistory({ movements, onEdit, onDelete, selected, onToggle, onToggleAll, selecting }) {
  const { t, locale } = useLanguage();
  const selectedCount = movements.filter((movement) => selected.has(movement.id)).length;
  const allSelected = selectedCount > 0 && selectedCount === movements.length;
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
      <div className="surface hidden overflow-hidden rounded-2xl bg-card md:block">
        <Table>
          <TableCaption className="sr-only">{t("footerhistory")}</TableCaption>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-12 pl-5">
                <SelectBox
                  checked={allSelected}
                  indeterminate={selectedCount > 0 && !allSelected}
                  onChange={onToggleAll}
                  label={t("selectAll")}
                />
              </TableHead>
              <TableHead className="h-11 text-xs font-medium text-muted-foreground">
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
              <TableRow
                key={movement.id}
                data-state={selected.has(movement.id) ? "selected" : undefined}
                className="group hover:bg-fg/[0.02] data-[state=selected]:bg-fg/[0.04]"
              >
                <TableCell className="w-12 pl-5">
                  <SelectBox
                    checked={selected.has(movement.id)}
                    onChange={() => onToggle(movement.id)}
                    label={t("selectMovement", { title: movement.title })}
                  />
                </TableCell>
                <TableCell className="max-w-72 py-3">
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
          <TableFooter className="bg-fg/[0.02]">
            <TableRow className="hover:bg-transparent">
              <TableCell colSpan={7} className="px-5 py-3 text-right text-sm text-muted-foreground">
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
          {movements.map((movement) => {
            const isSelected = selected.has(movement.id);
            return (
            <li key={movement.id}>
              <button
                type="button"
                onClick={() => (selecting ? onToggle(movement.id) : onEdit(movement))}
                aria-label={movementLabel(movement, t, locale)}
                aria-pressed={selecting ? isSelected : undefined}
                className={cn(
                  "flex w-full touch-manipulation items-center gap-3 rounded-2xl border bg-card p-3.5 text-left transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring active:bg-fg/[0.04]",
                  selecting && isSelected && "border-fg/30 bg-fg/[0.04]",
                )}
              >
                {selecting && (
                  <span
                    aria-hidden="true"
                    className={cn(
                      "flex size-6 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
                      isSelected ? "border-primary bg-primary text-primary-foreground" : "border-fg/25",
                    )}
                  >
                    {isSelected && <CheckIcon className="size-3.5" strokeWidth={3} />}
                  </span>
                )}
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
            );
          })}
        </ul>
      </div>
    </>
  );
}

export default TableHistory;
