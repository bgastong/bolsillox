import { useCallback, useState } from "react";
import { CheckIcon, ChevronRightIcon, HandCoinsIcon } from "lucide-react";
import { EmptyState, ErrorState } from "@/components/States/States";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api";
import { formatCurrency, formatDate, todayISO } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useApiData } from "@/hooks/useApiData";
import { useLanguage } from "@/hooks/useLanguage";
import { useMovements } from "@/hooks/useMovements";
import CollectDialog from "./CollectDialog";
import ReceivableDialog from "./ReceivableDialog";

// Estado de una deuda: cobrada, vencida, con vencimiento o sin fecha.
function receivableStatus(item, t, locale) {
  if (item.status === "paid") return { text: t("receivablePaid"), tone: "text-income" };
  const short = (iso) => formatDate(iso, locale, { day: "numeric", month: "short" });
  if (item.dueDate && item.dueDate < todayISO()) {
    return { text: t("receivableOverdue", { date: short(item.dueDate) }), tone: "text-danger" };
  }
  if (item.dueDate) return { text: t("receivableDue", { date: short(item.dueDate) }), tone: "text-muted-foreground" };
  return { text: t("receivableSince", { date: short(item.date) }), tone: "text-muted-foreground" };
}

function ReceivableRow({ item, onEdit, onCollect }) {
  const { t, locale } = useLanguage();
  const status = receivableStatus(item, t, locale);
  const money = (value) => formatCurrency(value, locale, { currency: item.currency });
  const percent = Math.min(100, Math.round((item.paid / item.amount) * 100));
  const paid = item.status === "paid";

  return (
    // En el celular el boton "Cobrar" va abajo, a todo el ancho, para que la fila respire.
    <div className={cn("grid gap-1 rounded-2xl border bg-card p-1.5 sm:flex sm:items-center sm:gap-2 sm:pr-3", paid && "opacity-70")}>
      <button
        type="button"
        onClick={() => onEdit(item)}
        aria-label={`${t("edit")}: ${item.person}${item.concept ? `, ${item.concept}` : ""}. ${status.text}. ${t("receivableRemaining", { amount: money(item.remaining) })}`}
        className="flex min-w-0 flex-1 touch-manipulation items-center gap-3 rounded-xl p-2 text-left transition-colors outline-none hover:bg-fg/[0.02] focus-visible:ring-2 focus-visible:ring-ring"
      >
        <span
          aria-hidden="true"
          className="flex size-11 shrink-0 items-center justify-center rounded-[9px] border border-fg/[0.07] bg-fg/[0.04] text-[15px] font-medium uppercase"
        >
          {item.person.trim().charAt(0)}
        </span>
        <span className="grid min-w-0 flex-1 grid-cols-1 gap-1.5">
          <span className="flex items-baseline justify-between gap-2">
            <span className="min-w-0 truncate text-[15px] font-medium">
              {item.person}
              {item.concept && <span className="font-normal text-muted-foreground"> · {item.concept}</span>}
            </span>
            <span className="shrink-0 text-[15px] whitespace-nowrap text-income tabular-nums">{money(item.remaining || item.amount)}</span>
          </span>
          {item.paid > 0 && !paid && (
            <span className="h-1.5 overflow-hidden rounded-full bg-fg/[0.08]" aria-hidden="true">
              <span className="block h-full rounded-full bg-income" style={{ width: `${percent}%` }} />
            </span>
          )}
          <span className="flex items-center justify-between gap-2 text-xs">
            <span className={cn("truncate", status.tone)}>{status.text}</span>
            {item.paid > 0 && !paid && (
              <span className="shrink-0 text-muted-foreground tabular-nums">
                {t("receivablePaidOf", { paid: money(item.paid), total: money(item.amount) })}
              </span>
            )}
          </span>
        </span>
        <ChevronRightIcon aria-hidden="true" className="size-4 shrink-0 text-muted-foreground/60 max-sm:hidden" />
      </button>
      {!paid && (
        <Button
          variant="outline"
          size="sm"
          onClick={() => onCollect(item)}
          className="h-10 shrink-0 max-sm:mx-2 max-sm:mb-1.5 sm:h-9"
          aria-label={`${t("collect")}: ${item.person}`}
        >
          <CheckIcon data-icon="inline-start" />
          {t("collect")}
        </Button>
      )}
    </div>
  );
}

// Suma de lo que falta cobrar por moneda: "$ 150.000 · US$ 200".
function totalsByCurrency(items, locale) {
  const totals = new Map();
  for (const item of items) totals.set(item.currency, (totals.get(item.currency) ?? 0) + item.remaining);
  return [...totals].map(([currency, amount]) => formatCurrency(amount, locale, { currency })).join(" · ");
}

/*
Deudas > Me deben: quien te debe, cuanto falta cobrar y cuando vence.
target/setTarget: el dialogo para cargar o editar una deuda (lo abre tambien
el boton de la pagina).
*/
function ReceivablesPanel({ target, setTarget }) {
  const { t, locale } = useLanguage();
  const { version, notifyChange } = useMovements();
  const [collecting, setCollecting] = useState(null);
  const [savedVersion, setSavedVersion] = useState(0);

  const load = useCallback(
    (signal) => api.listReceivables({ signal }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [version, savedVersion],
  );
  const { data: items, error, loading, reload } = useApiData(load);
  const refresh = () => setSavedVersion((value) => value + 1);

  const open = (items ?? []).filter((item) => item.status === "open");
  const paid = (items ?? []).filter((item) => item.status === "paid");
  const overdue = open.filter((item) => item.dueDate && item.dueDate < todayISO()).length;

  let content;
  if (error && !items) content = <ErrorState error={error} onRetry={reload} />;
  else if (!items) {
    content = (
      <div className="grid gap-2" aria-hidden="true">
        {Array.from({ length: 3 }, (_, index) => (
          <Skeleton key={index} className="h-20 w-full rounded-2xl" />
        ))}
      </div>
    );
  } else if (!items.length) {
    content = (
      <EmptyState message={t("receivablesEmpty")}>
        <Button onClick={() => setTarget({ item: null })}>
          <HandCoinsIcon data-icon="inline-start" />
          {t("newReceivable")}
        </Button>
      </EmptyState>
    );
  } else {
    content = (
      <div className="grid grid-cols-1 gap-4 transition-opacity" style={{ opacity: loading ? 0.6 : 1 }}>
        <section aria-label={t("receivablesSummaryLabel")} className="surface grid grid-cols-2 gap-3 rounded-2xl bg-card p-4 sm:p-5">
          <div className="col-span-2 grid gap-1 sm:col-span-1">
            <p className="m-0 text-xs text-muted-foreground">{t("receivablesTotal")}</p>
            <p className="m-0 text-xl font-medium tracking-[-0.03em] text-income tabular-nums">
              {open.length ? totalsByCurrency(open, locale) : formatCurrency(0, locale)}
            </p>
          </div>
          <div className="col-span-2 grid gap-1 sm:col-span-1">
            <p className="m-0 text-xs text-muted-foreground">{t("receivablesOpenCount", { count: open.length })}</p>
            <p className={cn("m-0 text-sm", overdue ? "text-danger" : "text-muted-foreground")}>
              {overdue ? t("receivablesOverdueCount", { count: overdue }) : t("receivablesNoneOverdue")}
            </p>
          </div>
        </section>

        {open.length > 0 && (
          <ul aria-label={t("receivablesOpen")} className="m-0 grid list-none grid-cols-1 gap-2 p-0">
            {open.map((item) => (
              <li key={item.id}>
                <ReceivableRow item={item} onEdit={(entry) => setTarget({ item: entry })} onCollect={setCollecting} />
              </li>
            ))}
          </ul>
        )}

        {paid.length > 0 && (
          <section aria-labelledby="receivables-paid" className="grid gap-2">
            <h2 id="receivables-paid" className="m-0 px-1 text-sm font-medium text-muted-foreground">
              {t("receivablesPaidTitle")}
            </h2>
            <ul className="m-0 grid list-none grid-cols-1 gap-2 p-0">
              {paid.map((item) => (
                <li key={item.id}>
                  <ReceivableRow item={item} onEdit={(entry) => setTarget({ item: entry })} onCollect={setCollecting} />
                </li>
              ))}
            </ul>
          </section>
        )}

        <p className="m-0 px-1 text-xs text-muted-foreground">{t("receivablesHowItWorks")}</p>
      </div>
    );
  }

  return (
    <>
      {content}
      <ReceivableDialog target={target} onClose={() => setTarget(null)} onDone={refresh} />
      <CollectDialog
        item={collecting}
        onClose={() => setCollecting(null)}
        // Si se cargo como ingreso, cambian tambien los movimientos y el resumen.
        onDone={() => {
          refresh();
          notifyChange();
        }}
      />
    </>
  );
}

export default ReceivablesPanel;
