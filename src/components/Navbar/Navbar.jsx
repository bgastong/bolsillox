import { Link } from "react-router-dom";
import { CheckIcon, LanguagesIcon } from "lucide-react";
import { useLanguage } from "../../hooks/useLanguage";
import Wordmark from "../Brand/Wordmark";
import { GitHubIcon } from "../Brand/BrandIcons";
import { SidebarTrigger, useSidebar } from "@/components/ui/sidebar";
import styles from "./Navbar.module.css";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const LANGUAGES = [
  { code: "es", labelKey: "spanish" },
  { code: "en", labelKey: "english" },
];

function Navbar() {
  const { t, language, setLanguage } = useLanguage();
  const { isMobile, state } = useSidebar();
  // El logo se muestra en la barra solo cuando el sidebar no esta visible.
  const showBrand = isMobile || state === "collapsed";

  return (
    <nav className={styles.navbar}>
      <div className={styles.left}>
        {/* En mobile la navegacion esta abajo (MobileNav) */}
        {!isMobile && (
          <SidebarTrigger
            className={styles.sidebarButton}
            aria-label={t("toggleSidebar")}
          />
        )}
        {showBrand && (
          <Link to="/" className={styles.brand} aria-label={t("home")}>
            <Wordmark markClassName="size-7" />
          </Link>
        )}
      </div>

      <div className={styles.actions}>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className={styles.pillButton}
              type="button"
              aria-label={`${t("selectLanguage")}: ${t(LANGUAGES.find((l) => l.code === language)?.labelKey)}`}
            >
              <LanguagesIcon aria-hidden="true" />
              <span className={styles.langCode} aria-hidden="true">
                {language.toUpperCase()}
              </span>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className={styles.languageMenu}
            align="end"
            sideOffset={8}
          >
            {LANGUAGES.map(({ code, labelKey }) => (
              <DropdownMenuItem
                key={code}
                className={styles.languageItem}
                onSelect={(event) => {
                  event.preventDefault();
                  setLanguage(code);
                }}
              >
                <span className={styles.langBadge} aria-hidden="true">
                  {code.toUpperCase()}
                </span>
                {t(labelKey)}
                {language === code && (
                  <CheckIcon className="ml-auto text-primary" />
                )}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <a
          className={styles.iconButton}
          href="https://github.com/bgastong/bolsillox"
          target="_blank"
          rel="noreferrer"
          aria-label={t("githubLink")}
          title="GitHub"
        >
          <GitHubIcon />
        </a>
      </div>
    </nav>
  );
}
export default Navbar;
