import { useLanguage } from "../../../hooks/useLanguage";
import styles from "./SummaryCards.module.css";

function SummaryCards() {
  const { t } = useLanguage();

  return (
    <article className={styles.card}>
      <div className={styles.cardHeader}>
        <span>{t("cardtotal")}</span>
        <span className={styles.percentage}>12%</span>
      </div>

      <h2 className={styles.value}>1.000.000</h2>

      <p className={styles.profit}>{t("cardprofit")}</p>
    </article>
  );
}

export default SummaryCards;
