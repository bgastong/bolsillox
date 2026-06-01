import { useState } from "react";
import { useLanguage } from "../../hooks/useLanguage";
import styles from "./Navbar.module.css";

function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { language, setLanguage } = useLanguage();

  function changeLanguage() {
    setLanguage(language === "es" ? "en" : "es");
  }

  return (
    <nav className={styles.navbar}>
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
          src="/menu.png"
          alt="Abrir menu"
          role="button"
          tabIndex="0"
          onClick={() => setIsMenuOpen((open) => !open)}
        />

        <img
          className={styles.icon}
          src={language === "es" ? "/es.png" : "/en.png"}
          alt="Cambiar idioma"
          role="button"
          tabIndex="0"
          onClick={changeLanguage}
        />
      </div>
      {isMenuOpen && <div className={styles.menu}></div>}
    </nav>
  );
}
export default Navbar;
