import { NavLink } from "react-router-dom";
import {
  HistoryIcon,
  LayoutDashboardIcon,
  PiggyBankIcon,
  RepeatIcon,
  SettingsIcon,
} from "lucide-react";
import styles from "./Sidebar.module.css";
import { useLanguage } from "../../hooks/useLanguage";
import Wordmark from "../Brand/Wordmark";
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
  { to: "/budgets", labelKey: "budgetsTitle", icon: PiggyBankIcon },
  { to: "/settings", labelKey: "settingsTitle", icon: SettingsIcon },
];

function AppSidebar() {
  const { t } = useLanguage();
  const { isMobile, setOpenMobile } = useSidebar();

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
            className="flex min-h-11 w-fit items-center rounded-md outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring"
          >
            <Wordmark />
          </NavLink>
          <p className={styles.tagline}>{t("appTagline")}</p>
        </SidebarHeader>

        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel className={styles.groupLabel}>
              {t("menu")}
            </SidebarGroupLabel>
            <SidebarMenu className="gap-1">
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
          <div className={styles.footerCard}>
            <span className={styles.footerDot} aria-hidden="true" />
            <p className={styles.footerText}>{t("sidebarFooter")}</p>
          </div>
        </SidebarFooter>
      </nav>
    </Sidebar>
  );
}

export default AppSidebar;
