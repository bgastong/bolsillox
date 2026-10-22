import { useCallback } from "react";
import Money from "@/components/Money/Money";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api";
import { currentMonthKey, todayISO } from "@/lib/format";
import { convertAmount } from "@/lib/money";
import { cn } from "@/lib/utils";
import { useApiData } from "@/hooks/useApiData";
import { useLanguage } from "@/hooks/useLanguage";
import { useMovements } from "@/hooks/useMovements";

// Ultimo dia del mes actual ("YYYY-MM-DD").
function monthEnd(monthKey) {
  const [year, month] = monthKey.split("-").map(Number);
  return `${monthKey}-${String(new Date(year, month, 0).getDate()).padStart(2, "0")}`;
}

function Row({ label, children, strong = false }) {
  return (
    <div className={cn("flex items-baseline justify-between gap-3", strong && "border-t border-fg/[0.07] pt-3")}>
      <dt className={cn("text-sm", strong ? "font-medium" : "text-muted-foreground")}>{label}</dt>
      <dd className="m-0 text-right">{children}</dd>
    </div>
  );
}

/*
Deudas > Debo: como cerras el mes pagando las cuotas. Parte del saldo de hoy,
suma lo que falta entrar este mes (movimientos con fecha futura, como un sueldo
cargado para dentro de unos dias, e ingresos recurrentes que todavia no se
generaron), resta los gastos programados y las cuotas que faltan pagar.
- rules: todas las reglas recurrentes (para los ingresos que faltan).
- installments: { amount, convertible } de las cuotas que faltan pagar este mes.
*/
function MonthOutlook({ rules, installments, currency, rate }) {
  const { t } = useLanguage();
  const { version } = useMovements();
  const month = currentMonthKey();

  const loadSummary = useCallback(
    (signal) => api.getSummary(month, currency, { signal }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [month, currency, version],
  );
  const { data: summary } = useApiData(loadSummary);

  if (!summary) return <Skeleton className="h-44 w-full rounded-2xl" aria-hidden="true" />;

  // Ingresos recurrentes del resto del mes (se cargan solos el dia que tocan).
  const today = todayISO();
  const end = monthEnd(month);
  let recurringIncome = 0;
  let convertible = installments.convertible;
  for (const rule of rules) {
    if (!rule.active || rule.kind === "installments" || rule.type !== "income") continue;
    if (!rule.nextDate || rule.nextDate <= today || rule.nextDate > end) continue;
    const value = convertAmount(rule.amount, rule.currency, currency, rate);
    if (value === null) convertible = false;
    else recurringIncome += value;
  }

  const incoming = (summary.scheduled?.income ?? 0) + recurringIncome;
  const scheduledExpense = summary.scheduled?.expense ?? 0;
  const left = summary.balance + incoming - scheduledExpense - installments.amount;

  // Sin nada por entrar ni cuotas este mes, no hay nada que comparar.
  if (!incoming && !installments.amount) return null;

  return (
    <section aria-labelledby="month-outlook-title" className="surface grid gap-4 rounded-2xl bg-card p-4 sm:p-5">
      <div className="grid gap-1">
        <h2 id="month-outlook-title" className="m-0 text-[15px] font-medium">
          {t("outlookTitle")}
        </h2>
        <p className="m-0 text-xs text-muted-foreground">{t("outlookHint")}</p>
      </div>
      <dl className="m-0 grid gap-2.5">
        <Row label={t("outlookBalance")}>
          <Money amount={summary.balance} type={summary.balance < 0 ? "expense" : "neutral"} currency={currency} />
        </Row>
        {incoming > 0 && (
          <Row label={t("outlookIncoming")}>
            <Money amount={incoming} type="income" currency={currency} />
          </Row>
        )}
        {scheduledExpense > 0 && (
          <Row label={t("outlookScheduledExpense")}>
            <Money amount={scheduledExpense} type="expense" currency={currency} />
          </Row>
        )}
        <Row label={t("outlookInstallments")}>
          <Money amount={installments.amount} type="expense" currency={currency} />
        </Row>
        <Row label={t("outlookLeft")} strong>
          <Money
            amount={left}
            type={left < 0 ? "expense" : "neutral"}
            alert={left < 0}
            currency={currency}
            className="text-lg tracking-[-0.03em]"
          />
        </Row>
      </dl>
      {left < 0 && <p className="m-0 text-xs text-danger">{t("outlookShort")}</p>}
      {!convertible && <p className="m-0 text-xs text-warn">{t("rateMissingShort")}</p>}
    </section>
  );
}

export default MonthOutlook;
