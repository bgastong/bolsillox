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
          "flex min-h-14 min-w-0 flex-1 touch-manipulation flex-col items-center justify-center gap-1 rounded-2xl text-[10.5px] tracking-[-0.01em] outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--ink)]",
          isActive || alsoActive
            ? "font-extrabold text-[color:var(--ink)]"
            : "font-semibold text-[#5c5246] active:text-[color:var(--ink)]",
        )
      }
    >
      {({ isActive: linkActive }) => {
        const isActive = linkActive || alsoActive;
        return (
          <>
            <span
              className={cn(
                "flex h-8 w-13 items-center justify-center rounded-full transition-colors",
                isActive && "bg-primary text-[color:var(--ink)] shadow-[0_2px_0_var(--primary-deep)]",
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
Navegacion inferior para mobile: barra crema que contrasta con la app
oscura, al alcance del pulgar. El boton central abre el formulario de
nuevo movimiento desde cualquier pantalla.
*/
function MobileNav() {
  const { t } = useLanguage();
  const { openCreate } = useMovements();

  return (
    <nav
      aria-label={t("mainNavigation")}
      className="fixed inset-x-0 bottom-0 z-30 rounded-t-3xl bg-[color:var(--cream)] pb-[env(safe-area-inset-bottom)] shadow-[0_-4px_0_var(--primary)] md:hidden"
    >
      <div className="mx-auto flex max-w-md items-center gap-1 px-2 pt-2 pb-2">
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
          className="mx-1 flex size-14 shrink-0 touch-manipulation items-center justify-center rounded-[18px] bg-[color:var(--ink)] text-primary shadow-[3px_3px_0_var(--primary)] transition-transform outline-none active:translate-x-[2px] active:translate-y-[2px] active:shadow-[1px_1px_0_var(--primary)] focus-visible:ring-2 focus-visible:ring-[color:var(--ink)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--cream)]"
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
