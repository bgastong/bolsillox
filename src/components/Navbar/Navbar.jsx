import { Link } from "react-router-dom";
import { DollarSignIcon, TriangleAlertIcon } from "lucide-react";
import { useLanguage } from "../../hooks/useLanguage";
import { useSettings } from "../../hooks/useSettings";
import Wordmark from "../Brand/Wordmark";
import { SidebarTrigger, useSidebar } from "@/components/ui/sidebar";
import { formatCurrency } from "@/lib/format";
import styles from "./Navbar.module.css";

// Chip con la cotizacion activa; lleva a Ajustes para cambiar la fuente.
function RateChip() {
  const { t, locale } = useLanguage();
  const { rates } = useSettings();

  if (!rates) return null;

  const sourceLabel = t(`rate_${rates.source}Short`);
  const label = rates.rate
    ? t("rateChipLabel", { source: sourceLabel, rate: formatCurrency(rates.rate, locale) })
    : t("rateChipMissing");

  return (
    <Link to="/settings" className={styles.rateChip} aria-label={label} title={label}>
      {rates.rate ? (
        <>
          <span className={styles.rateIcon} aria-hidden="true">
            <DollarSignIcon />
          </span>
          <span className={styles.rateSource} aria-hidden="true">
            {sourceLabel}
          </span>
          <span className={styles.rateValue} aria-hidden="true">
            {formatCurrency(rates.rate, locale)}
          </span>
        </>
      ) : (
        <>
          <TriangleAlertIcon className={styles.rateWarning} aria-hidden="true" />
          <span aria-hidden="true">{t("rateChipShort")}</span>
        </>
      )}
    </Link>
  );
}

function Navbar() {
  const { t } = useLanguage();
  const { isMobile, state } = useSidebar();
  // El logo se muestra en la barra solo cuando el sidebar no esta visible.
  const showBrand = isMobile || state === "collapsed";

  return (
    <header className={styles.navbar}>
      <div className={styles.left}>
        {/* En mobile la navegacion esta abajo (MobileNav) */}
        {!isMobile && (
          <SidebarTrigger className={styles.sidebarButton} aria-label={t("toggleSidebar")} />
        )}
        {showBrand && (
          <Link to="/" className={styles.brand} aria-label={t("home")}>
            <Wordmark markClassName="size-7" />
          </Link>
        )}
      </div>

      <div className={styles.actions}>
        <RateChip />
      </div>
    </header>
  );
}

export default Navbar;
