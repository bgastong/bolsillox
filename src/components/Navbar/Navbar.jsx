import { useState } from "react";
import { Link } from "react-router-dom";
import { SearchIcon } from "lucide-react";
import { useLanguage } from "../../hooks/useLanguage";
import { useHideOnScroll } from "../../hooks/useHideOnScroll";
import { useCommandPalette } from "../../hooks/useCommandPalette";
import { useAuth } from "../../hooks/useAuth";
import Wordmark from "../Brand/Wordmark";
import ProfileMenu from "../Sidebar/ProfileMenu";
import { SidebarTrigger, useSidebar } from "@/components/ui/sidebar";
import styles from "./Navbar.module.css";

function Navbar() {
  const { t } = useLanguage();
  const { isMobile, state } = useSidebar();
  const palette = useCommandPalette();
  const { user } = useAuth();
  // El logo se muestra en la barra solo cuando el sidebar no esta visible.
  const showBrand = isMobile || state === "collapsed";
  // En mobile la barra se oculta al bajar y vuelve al subir.
  const scrolledAway = useHideOnScroll(isMobile);
  // Si el foco del teclado esta en la barra, no se oculta.
  const [focused, setFocused] = useState(false);
  const hidden = scrolledAway && !focused;

  return (
    <header
      className={`${styles.navbar} ${hidden ? styles.hidden : ""}`}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
    >
      <div className={styles.left}>
        {/* En mobile la navegacion esta abajo (MobileNav) */}
        {!isMobile && (
          <SidebarTrigger className={styles.sidebarButton} aria-label={t("toggleSidebar")} />
        )}
        {showBrand && (
          <Link to="/" className={styles.brand} aria-label={t("home")}>
            <Wordmark />
          </Link>
        )}
      </div>
      {isMobile && (
        <div className="flex items-center gap-2">
          <button
            type="button"
            className={styles.iconButton}
            onClick={palette.open}
            aria-label={t("cmdLabel")}
          >
            <SearchIcon aria-hidden="true" />
          </button>
          {/* En el celular no hay menu lateral: el perfil va arriba */}
          {user && <ProfileMenu compact />}
        </div>
      )}
    </header>
  );
}

export default Navbar;
