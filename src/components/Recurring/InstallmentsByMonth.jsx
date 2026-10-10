import { formatCurrency, formatMonth } from "@/lib/format";
import { installmentsSchedule } from "@/lib/installments";
import { useLanguage } from "@/hooks/useLanguage";

// Cuanto hay que pagar de cuotas en cada mes: solo mes y monto.
function InstallmentsByMonth({ plans, currency, rate }) {
  const { t, locale } = useLanguage();
  const { months, convertible } = installmentsSchedule(plans, currency, rate);
  if (months.length === 0) return null;

  return (
    <section aria-labelledby="installments-by-month" className="surface grid gap-3 rounded-2xl bg-card p-4 sm:p-5">
      <h2 id="installments-by-month" className="m-0 text-sm font-medium">
        {t("installmentsByMonth")}
      </h2>

      <ul className="m-0 grid list-none gap-2 p-0">
        {months.map(({ month, amount }) => (
          <li key={month} className="flex items-baseline justify-between gap-3 text-sm">
            <span className="min-w-0 truncate first-letter:uppercase">{formatMonth(month, locale)}</span>
            <span className="font-medium tabular-nums">{formatCurrency(amount, locale, { currency })}</span>
          </li>
        ))}
      </ul>

      {!convertible && <p className="m-0 text-xs text-warn">{t("rateMissingShort")}</p>}
    </section>
  );
}

export default InstallmentsByMonth;
