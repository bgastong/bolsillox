import { useLanguage } from "../../hooks/useLanguage";
import { SidebarTrigger } from "@/components/ui/sidebar";
import styles from "./Navbar.module.css";

function Navbar() {
  const { language, setLanguage } = useLanguage();

  function changeLanguage() {
    setLanguage(language === "es" ? "en" : "es");
  }

  return (
    <nav className={styles.navbar}>
      <div className={styles.left}>
        <SidebarTrigger className={styles.sidebarButton} />
      </div>

      <a href="/" className={styles.brand}>
        <img
          className={styles.logo}
          src="/bolsillox-blanco2.png"
          alt="Logo bolsilloX"
        />
      </a>

      <div className={styles.actions}>
        <img
          className={styles.icon}
          src={language === "es" ? "/es.png" : "/en.png"}
          alt="Cambiar idioma"
          role="button"
          tabIndex="0"
          onClick={changeLanguage}
        />
      </div>
    </nav>
  );
}
export default Navbar;
