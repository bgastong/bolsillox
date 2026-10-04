import { NavLink } from "react-router-dom";
import { HistoryIcon, LayoutDashboardIcon } from "lucide-react";
import styles from "./Sidebar.module.css";
import { useLanguage } from "../../hooks/useLanguage";
import BrandLogo from "../Brand/BrandLogo";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";

const NAV_ITEMS = [
  { to: "/", labelKey: "home", icon: LayoutDashboardIcon, end: true },
  { to: "/history", labelKey: "history", icon: HistoryIcon },
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
      <SidebarHeader className={styles.header}>
        <NavLink to="/" onClick={handleNavigate} aria-label={t("home")}>
          <BrandLogo />
        </NavLink>
        <p className={styles.tagline}>{t("appTagline")}</p>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarMenu>
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
        <p className={styles.footerText}>{t("appName")}</p>
      </SidebarFooter>
    </Sidebar>
  );
}

export default AppSidebar;
