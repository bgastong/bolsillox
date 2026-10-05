import { NavLink, useLocation } from "react-router-dom";
import {
  HistoryIcon,
  LayoutDashboardIcon,
  PiggyBankIcon,
  PlusIcon,
  SettingsIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/hooks/useLanguage";
import { useMovements } from "@/hooks/useMovements";

// also: rutas extra que tambien marcan el item como activo.
function NavItem({ to, end, also = [], icon: Icon, label }) {
  const { pathname } = useLocation();
  const alsoActive = also.some((path) => pathname.startsWith(path));

  return (
    <NavLink
      to={to}
      end={end}
      aria-current={alsoActive ? "page" : undefined}
      className={({ isActive }) =>
        cn(
          "flex min-h-14 min-w-0 flex-1 touch-manipulation flex-col items-center justify-center gap-1 rounded-2xl text-[10.5px] font-medium tracking-[-0.01em] transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring",
          isActive || alsoActive
            ? "text-foreground"
            : "text-muted-foreground active:text-foreground",
        )
      }
    >
      {({ isActive: linkActive }) => {
        const isActive = linkActive || alsoActive;
        return (
          <>
            <span
              className={cn(
                "flex h-8 w-12 items-center justify-center rounded-full transition-colors",
                isActive && "bg-primary/15 text-primary",
              )}
            >
              <Icon className="size-5" aria-hidden="true" />
            </span>
            <span className="max-w-full truncate">{label}</span>
          </>
        );
      }}
    </NavLink>
  );
}

/*
Navegacion inferior para mobile: queda al alcance del pulgar y el boton
central abre el formulario de nuevo movimiento desde cualquier pantalla.
*/
function MobileNav() {
  const { t } = useLanguage();
  const { openCreate } = useMovements();

  return (
    <nav
      aria-label={t("mainNavigation")}
      className="fixed inset-x-0 bottom-0 z-30 border-t bg-background/85 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl md:hidden"
    >
      <div className="mx-auto flex max-w-md items-center gap-1 px-2 py-1.5">
        <NavItem to="/" end icon={LayoutDashboardIcon} label={t("home")} />
        <NavItem
          to="/history"
          also={["/recurring"]}
          icon={HistoryIcon}
          label={t("history")}
        />

        <button
          type="button"
          onClick={openCreate}
          aria-label={t("newMovement")}
          className="glow-orb glow-orb-strong mx-1 size-14 shrink-0 touch-manipulation outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          <PlusIcon className="size-6" strokeWidth={2.5} aria-hidden="true" />
        </button>

        <NavItem to="/budgets" icon={PiggyBankIcon} label={t("budgetsTitle")} />
        <NavItem
          to="/settings"
          icon={SettingsIcon}
          label={t("settingsTitle")}
        />
      </div>
    </nav>
  );
}

export default MobileNav;
