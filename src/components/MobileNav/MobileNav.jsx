import { NavLink } from "react-router-dom";
import { HistoryIcon, LayoutDashboardIcon, PlusIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/hooks/useLanguage";
import { useMovements } from "@/hooks/useMovements";

function NavItem({ to, end, icon: Icon, label }) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        cn(
          "flex min-h-14 flex-1 touch-manipulation flex-col items-center justify-center gap-1 rounded-2xl text-[11px] font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring",
          isActive ? "text-foreground" : "text-muted-foreground active:text-foreground",
        )
      }
    >
      {({ isActive }) => (
        <>
          <span
            className={cn(
              "flex h-8 w-14 items-center justify-center rounded-full transition-colors",
              isActive && "bg-primary/15 text-primary",
            )}
          >
            <Icon className="size-5" aria-hidden="true" />
          </span>
          {label}
        </>
      )}
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
      <div className="mx-auto flex max-w-md items-center gap-2 px-4 py-1.5">
        <NavItem to="/" end icon={LayoutDashboardIcon} label={t("home")} />

        <button
          type="button"
          onClick={openCreate}
          aria-label={t("newMovement")}
          className="flex size-14 shrink-0 touch-manipulation items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-[0_8px_24px_-6px_rgba(212,247,92,0.55)] transition-transform outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background active:scale-95"
        >
          <PlusIcon className="size-6" strokeWidth={2.5} aria-hidden="true" />
        </button>

        <NavItem to="/history" icon={HistoryIcon} label={t("history")} />
      </div>
    </nav>
  );
}

export default MobileNav;
