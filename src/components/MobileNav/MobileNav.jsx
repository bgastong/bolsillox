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
          "flex min-h-13 min-w-0 flex-1 touch-manipulation flex-col items-center justify-center gap-1 rounded-xl text-[10.5px] outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring",
          isActive || alsoActive
            ? "text-foreground"
            : "text-[color:var(--text-4)] active:text-foreground",
        )
      }
    >
      <Icon className="size-5" strokeWidth={1.75} aria-hidden="true" />
      <span className="max-w-full truncate">{label}</span>
    </NavLink>
  );
}

/*
Navegacion inferior para mobile: barra flotante de vidrio oscuro, al
alcance del pulgar. El boton central (blanco) abre el formulario de
nuevo movimiento desde cualquier pantalla.
*/
function MobileNav() {
  const { t } = useLanguage();
  const { openCreate } = useMovements();

  return (
    <nav
      aria-label={t("mainNavigation")}
      className="fixed inset-x-3 bottom-[calc(10px+env(safe-area-inset-bottom))] z-30 rounded-[20px] border border-white/10 bg-[rgba(18,19,21,0.82)] shadow-[0_10px_30px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.05)] backdrop-blur-xl md:hidden"
    >
      <div className="mx-auto flex max-w-md items-center gap-1 px-1.5 py-1.5">
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
          className="mx-1 flex size-12 shrink-0 touch-manipulation items-center justify-center rounded-[14px] bg-primary text-primary-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.6),0_4px_14px_rgba(0,0,0,0.5)] transition-transform outline-none active:scale-95 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          <PlusIcon className="size-[22px]" strokeWidth={2.25} aria-hidden="true" />
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
