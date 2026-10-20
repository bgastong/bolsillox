import { useCallback, useState } from "react";
import { CheckIcon, HandCoinsIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { formatCurrency, formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useApiData } from "@/hooks/useApiData";
import { useLanguage } from "@/hooks/useLanguage";
import { useMovements } from "@/hooks/useMovements";
import CollectDialog from "./CollectDialog";

// Texto y tono del vencimiento: vencida (rojo), hoy (aviso) o en 1-2 dias (gris).
function dueLabel(daysLeft, t) {
  if (daysLeft < 0) return { text: t("receivableOverdueDays", { count: -daysLeft }), tone: "text-expense" };
  if (daysLeft === 0) return { text: t("receivableDueToday"), tone: "text-warn" };
  return { text: t("receivableDueIn", { count: daysLeft }), tone: "text-muted-foreground" };
}

/*
Lo que te tienen que pagar en los proximos 2 dias, hoy o que ya vencio, con el
boton "Cobrar" (abre el mismo dialogo que en Deudas). Sin avisos no se muestra.
*/
function ReceivableAlerts({ className }) {
  const { t, locale } = useLanguage();
  const { version, notifyChange } = useMovements();
  const [collecting, setCollecting] = useState(null);

  const load = useCallback(
    (signal) => api.getReceivableAlerts({ signal }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [version],
  );
  const { data: alerts } = useApiData(load);

  const dialog = (
    <CollectDialog item={collecting} onClose={() => setCollecting(null)} onDone={notifyChange} />
  );
  if (!alerts?.length) return dialog;

  const overdue = alerts.filter((item) => item.daysLeft < 0).length;

  return (
    <>
      <section
        aria-labelledby="receivable-alerts-title"
        className={cn(
          "surface grid gap-3 rounded-[14px] p-4 sm:p-5",
          overdue > 0 && "border-[color:var(--expense)]/40",
          className,
        )}
      >
        <header className="flex items-start gap-3">
          <span
            aria-hidden="true"
            className={cn(
              "flex size-9 shrink-0 items-center justify-center rounded-[9px] border border-fg/[0.07] bg-fg/[0.04]",
              overdue > 0 ? "text-expense" : "text-income",
            )}
          >
            <HandCoinsIcon className="size-4" strokeWidth={1.75} />
          </span>
          <div className="grid min-w-0 gap-0.5">
            <h2 id="receivable-alerts-title" className="m-0 text-[13.5px] font-medium tracking-[-0.01em]">
              {overdue > 0 ? t("receivableAlertsOverdueTitle", { count: overdue }) : t("receivableAlertsTitle")}
            </h2>
            <p className="m-0 text-xs text-[color:var(--text-4)]">{t("receivableAlertsHint")}</p>
          </div>
        </header>

        <ul className="m-0 grid list-none grid-cols-1 gap-1 p-0">
          {alerts.map((item) => {
            const due = dueLabel(item.daysLeft, t);
            const amount = formatCurrency(item.remaining, locale, { signed: true, currency: item.currency });
            return (
              <li key={item.id} className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-lg py-1.5 sm:flex-nowrap">
                <span
                  aria-hidden="true"
                  className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-fg/[0.07] bg-fg/[0.04] text-sm font-medium uppercase"
                >
                  {item.person.trim().charAt(0)}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="m-0 truncate text-sm">
                    {item.person}
                    {item.concept && <span className="text-muted-foreground"> · {item.concept}</span>}
                  </p>
                  <p className={cn("m-0 truncate text-xs", due.tone)}>
                    {due.text} · {formatDate(item.dueDate, locale, { day: "numeric", month: "short" })}
                  </p>
                </div>
                <span className="text-[13.5px] whitespace-nowrap text-income tabular-nums">{amount}</span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCollecting(item)}
                  aria-label={`${t("collect")}: ${item.person}`}
                  className="h-9 max-sm:ml-12 max-sm:w-[calc(100%-3rem)]"
                >
                  <CheckIcon data-icon="inline-start" />
                  {t("collect")}
                </Button>
              </li>
            );
          })}
        </ul>
      </section>
      {dialog}
    </>
  );
}

export default ReceivableAlerts;
