import { NavLink } from "react-router-dom";
import {
  HandCoinsIcon,
  HistoryIcon,
  LayoutDashboardIcon,
  PiggyBankIcon,
  RepeatIcon,
  SearchIcon,
  SettingsIcon,
} from "lucide-react";
import styles from "./Sidebar.module.css";
import { useLanguage } from "../../hooks/useLanguage";
import { useAuth } from "../../hooks/useAuth";
import { useCommandPalette } from "../../hooks/useCommandPalette";
import ProfileMenu from "./ProfileMenu";
import Wordmark from "../Brand/Wordmark";
import { ThemeSegmented } from "../Theme/ThemeControls";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";

const NAV_ITEMS = [
  { to: "/", labelKey: "home", icon: LayoutDashboardIcon, end: true },
  { to: "/history", labelKey: "history", icon: HistoryIcon },
  { to: "/recurring", labelKey: "recurringTitle", icon: RepeatIcon },
  { to: "/debts", labelKey: "debtsTitle", icon: HandCoinsIcon },
  { to: "/budgets", labelKey: "budgetsTitle", icon: PiggyBankIcon },
  { to: "/settings", labelKey: "settingsTitle", icon: SettingsIcon },
];

function AppSidebar() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const { isMobile, setOpenMobile } = useSidebar();
  const palette = useCommandPalette();
  const isMac = typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform);

  // En mobile el sidebar es un sheet: se cierra al navegar.
  function handleNavigate() {
    if (isMobile) setOpenMobile(false);
  }

  return (
    <Sidebar collapsible="offcanvas" className={styles.sidebar}>
      {/* Landmark de navegacion que envuelve todo el sidebar */}
      <nav
        aria-label={t("mainNavigation")}
        className="flex min-h-0 flex-1 flex-col"
      >
        <SidebarHeader className={styles.header}>
          <NavLink
            to="/"
            onClick={handleNavigate}
            aria-label={t("home")}
            className={styles.brand}
          >
            <Wordmark />
          </NavLink>
          <button
            type="button"
            className={styles.search}
            onClick={() => {
              handleNavigate();
              palette.open();
            }}
          >
            <SearchIcon aria-hidden="true" />
            <span>{t("searchOrCreate")}</span>
            <kbd className="kbd">{isMac ? "⌘K" : "Ctrl K"}</kbd>
          </button>
        </SidebarHeader>

        <SidebarContent>
          <SidebarGroup className="pt-0">
            <SidebarGroupLabel className="sr-only">{t("menu")}</SidebarGroupLabel>
            <SidebarMenu className="gap-0.5">
              {NAV_ITEMS.map(({ to, labelKey, icon: Icon, end }) => (
                <SidebarMenuItem key={to}>
                  <NavLink
                    to={to}
                    end={end}
                    onClick={handleNavigate}
                    className="block rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring"
                  >
                    {({ isActive }) => (
                      <SidebarMenuButton
                        asChild
                        isActive={isActive}
                        className={styles.menuButton}
                      >
                        <span>
                          <Icon />
                          <span>{t(labelKey)}</span>
                        </span>
                      </SidebarMenuButton>
                    )}
                  </NavLink>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroup>
        </SidebarContent>

        <SidebarFooter>
          <ThemeSegmented className="mx-1" />
          {user && <ProfileMenu onNavigate={handleNavigate} />}
        </SidebarFooter>
      </nav>
    </Sidebar>
  );
}

export default AppSidebar;
