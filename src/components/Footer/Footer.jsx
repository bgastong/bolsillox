import { useLanguage } from "../../hooks/useLanguage";
import styles from "./Footer.module.css";

function Footer() {
  const { t } = useLanguage();

  return (
    <footer className={styles.footer}>
      <p>{t("footerRights", { year: new Date().getFullYear() })}</p>
      <p>
        {t("footerText")} ·{" "}
        <a href="https://github.com/bgastong/bolsillox" target="_blank" rel="noreferrer">
          GitHub
        </a>
      </p>
    </footer>
  );
}

export default Footer;
