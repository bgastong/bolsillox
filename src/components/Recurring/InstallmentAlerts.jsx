import { useCallback, useState } from "react";
import { BellIcon, CheckIcon } from "lucide-react";
import { CategoryIcon } from "@/components/Movements/MovementBits";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { formatCurrency, formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useApiData } from "@/hooks/useApiData";
import { useLanguage } from "@/hooks/useLanguage";
import { useMovements } from "@/hooks/useMovements";
import { useToast } from "@/hooks/useToast";

// Texto y tono del vencimiento: vencida (rojo), hoy (aviso) o en 1-2 dias (gris).
function dueLabel(daysLeft, t) {
  if (daysLeft < 0) return { text: t("installmentOverdue", { count: -daysLeft }), tone: "text-expense" };
  if (daysLeft === 0) return { text: t("installmentDueToday"), tone: "text-warn" };
  return { text: t("installmentDueIn", { count: daysLeft }), tone: "text-muted-foreground" };
}

/*
Cuotas que vencen en los proximos 2 dias o que vencieron sin pagar, con el
boton "Ya la pagué" (carga el gasto con la fecha de hoy). Sin avisos no se
muestra nada. Va arriba en el Inicio y en Cuotas.
*/
function InstallmentAlerts({ className }) {
  const { t, locale } = useLanguage();
  const { toast } = useToast();
  const { version, notifyChange } = useMovements();
  const [paying, setPaying] = useState(null);

  const load = useCallback(
    (signal) => api.getInstallmentAlerts({ signal }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [version],
  );
  const { data: alerts } = useApiData(load);
  if (!alerts?.length) return null;

  const overdue = alerts.filter((item) => item.daysLeft < 0).length;

  async function pay(item) {
    const key = `${item.ruleId}-${item.month}`;
    setPaying(key);
    try {
      await api.payInstallment(item.ruleId, item.month);
      toast(t("installmentPaidToast"));
      notifyChange();
    } catch {
      toast(t("errorGeneric"), { variant: "error" });
    } finally {
      setPaying(null);
    }
  }

  return (
    <section
      aria-labelledby="installment-alerts-title"
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
            overdue > 0 ? "text-expense" : "text-[color:var(--text-2)]",
          )}
        >
          <BellIcon className="size-4" strokeWidth={1.75} />
        </span>
        <div className="grid min-w-0 gap-0.5">
          <h2 id="installment-alerts-title" className="m-0 text-[13.5px] font-medium tracking-[-0.01em]">
            {overdue > 0 ? t("installmentAlertsOverdueTitle", { count: overdue }) : t("installmentAlertsTitle")}
          </h2>
          <p className="m-0 text-xs text-[color:var(--text-4)]">{t("installmentAlertsHint")}</p>
        </div>
      </header>

      <ul className="m-0 grid list-none grid-cols-1 gap-1 p-0">
        {alerts.map((item) => {
          const key = `${item.ruleId}-${item.month}`;
          const due = dueLabel(item.daysLeft, t);
          const amount = formatCurrency(-item.amount, locale, { signed: true, currency: item.currency });
          return (
            <li key={key} className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-lg py-1.5 sm:flex-nowrap">
              <CategoryIcon category={item.category} className="size-9 rounded-lg" />
              <div className="min-w-0 flex-1">
                <p className="m-0 truncate text-sm">
                  {item.title}
                  {item.total > 1 && (
                    <span className="text-muted-foreground">
                      {" "}
                      ({item.number}/{item.total})
                    </span>
                  )}
                </p>
                <p className={cn("m-0 truncate text-xs", due.tone)}>
                  {due.text} · {formatDate(item.date, locale, { day: "numeric", month: "short" })}
                </p>
              </div>
              <span className="text-[13.5px] whitespace-nowrap text-expense tabular-nums">{amount}</span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => pay(item)}
                disabled={paying !== null}
                aria-label={`${t("markInstallmentPaid")}: ${item.title} ${item.number}/${item.total}`}
                className="h-9 max-sm:ml-12 max-sm:w-[calc(100%-3rem)]"
              >
                <CheckIcon data-icon="inline-start" />
                {paying === key ? t("saving") : t("markInstallmentPaid")}
              </Button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

export default InstallmentAlerts;
