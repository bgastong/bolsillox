import {
  ArrowDownRightIcon,
  ArrowUpRightIcon,
  MinusIcon,
  PiggyBankIcon,
  TrendingDownIcon,
  TrendingUpIcon,
  WalletIcon,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency, formatPercent } from "@/lib/format";
import { useLanguage } from "../../../hooks/useLanguage";
import styles from "./SummaryCards.module.css";

// Para gastos, subir es malo: `inverse` invierte el color de la variacion.
function Variation({ value, inverse = false }) {
  const { t, locale } = useLanguage();

  if (value === null || value === undefined) {
    return <span className={styles.muted}>{t("noComparison")}</span>;
  }

  const Icon = value > 0 ? ArrowUpRightIcon : value < 0 ? ArrowDownRightIcon : MinusIcon;
  const good = inverse ? value < 0 : value > 0;
  const tone = value === 0 ? styles.neutral : good ? styles.good : styles.bad;

  return (
    <span className={styles.variation}>
      <span className={`${styles.percentage} ${tone}`}>
        <Icon aria-hidden="true" />
        {formatPercent(value, locale)}
      </span>
      <span className={styles.muted}>{t("vsLastMonth")}</span>
    </span>
  );
}

// glow: color del brillo del icono (estilo "orbe de vidrio").
function StatCard({ label, value, icon: Icon, footer, valueClassName, glow, featured = false }) {
  return (
    <article className={`${styles.card} ${featured ? styles.featured : ""}`}>
      {/* Arco de luz decorativo en la tarjeta destacada */}
      {featured && <span className={`horizon ${styles.horizon}`} aria-hidden="true" />}
      <div className={styles.cardHeader}>
        <span>{label}</span>
        <span className={`glow-orb ${styles.icon}`} style={{ "--glow": glow }}>
          <Icon aria-hidden="true" />
        </span>
      </div>
      <p className={`${styles.value} ${valueClassName ?? ""}`}>{value}</p>
      <div className={styles.footer}>{footer}</div>
    </article>
  );
}

export function SummaryCardsSkeleton() {
  return (
    <div className={styles.grid} aria-hidden="true">
      {Array.from({ length: 4 }, (_, index) => (
        <div key={index} className={styles.card}>
          <Skeleton className="h-4 w-24 rounded" />
          <Skeleton className="mt-4 h-8 w-36 rounded" />
          <Skeleton className="mt-6 h-4 w-28 rounded" />
        </div>
      ))}
    </div>
  );
}

function SummaryCards({ summary }) {
  const { t, locale } = useLanguage();
  const money = (amount) => formatCurrency(amount, locale, { currency: summary.currency });

  return (
    <div className={styles.grid}>
      <StatCard
        featured
        glow="#d4f75c"
        label={t("cardtotal")}
        icon={WalletIcon}
        value={money(summary.balance)}
        valueClassName={summary.balance < 0 ? styles.negative : undefined}
        footer={<span className={styles.muted}>{t("cardBalanceHint")}</span>}
      />
      <StatCard
        label={t("cardIncome")}
        glow="#34d399"
        icon={TrendingUpIcon}
        value={money(summary.income)}
        footer={<Variation value={summary.variation.income} />}
      />
      <StatCard
        label={t("cardExpense")}
        glow="#8b6fe8"
        icon={TrendingDownIcon}
        value={money(summary.expense)}
        footer={<Variation value={summary.variation.expense} inverse />}
      />
      <StatCard
        label={t("cardSavings")}
        glow="#38bdf8"
        icon={PiggyBankIcon}
        value={money(summary.net)}
        valueClassName={summary.net < 0 ? styles.negative : undefined}
        footer={
          <span className={styles.muted}>
            {summary.savingsRate === null
              ? t("noComparison")
              : t("savingsRateLabel", {
                  rate: new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }).format(
                    summary.savingsRate,
                  ),
                })}
          </span>
        }
      />
    </div>
  );
}

export default SummaryCards;
