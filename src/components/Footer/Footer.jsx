import { Link } from "react-router-dom";
import { useLanguage } from "../../hooks/useLanguage";
import styles from "./Footer.module.css";

function Footer() {
  const { t } = useLanguage();

  return (
    <footer className={styles.footer}>
      <p>{t("footerRights", { year: new Date().getFullYear() })}</p>
      <p>
        <Link to="/terminos">{t("footerTerms")}</Link> ·{" "}
        <Link to="/privacidad">{t("footerPrivacy")}</Link> · {t("footerText")}
      </p>
    </footer>
  );
}

export default Footer;
