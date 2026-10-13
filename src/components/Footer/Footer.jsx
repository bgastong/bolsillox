import { Link } from "react-router-dom";
import { REPO_URL } from "@/lib/links";
import { useLanguage } from "../../hooks/useLanguage";
import styles from "./Footer.module.css";

function Footer() {
  const { t } = useLanguage();

  return (
    <footer className={styles.footer}>
      <p>{t("footerRights", { year: new Date().getFullYear() })}</p>
      <p>
        <Link to="/terminos">{t("footerTerms")}</Link> ·{" "}
        <Link to="/privacidad">{t("footerPrivacy")}</Link> ·{" "}
        <a href={REPO_URL} target="_blank" rel="noopener noreferrer">
          {t("footerOpenSource")}
        </a>
      </p>
    </footer>
  );
}

export default Footer;
