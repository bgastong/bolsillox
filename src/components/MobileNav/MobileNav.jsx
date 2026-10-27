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

// Base comun de cada opcion: ancho parejo, alto comodo para el pulgar (56 px) y foco visible.
const ITEM =
  "group flex min-h-14 min-w-0 flex-1 touch-manipulation flex-col items-center justify-center gap-1 rounded-2xl text-[11px] leading-none outline-none focus-visible:ring-2 focus-visible:ring-ring";

/*
Una seccion. La activa lleva una pastilla detras del icono y el texto en blanco
(no solo cambia el color, asi se distingue tambien sin verlo).
- also: rutas extra que tambien la marcan como activa (Historial cubre Recurrentes y
  Deudas; Presupuestos cubre Metas e Inversiones).
*/
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
          ITEM,
          isActive || alsoActive
            ? "is-active font-medium text-foreground"
            : "text-[color:var(--text-3)] active:text-foreground",
        )
      }
    >
      <span
        aria-hidden="true"
        className="flex h-8 w-14 items-center justify-center rounded-full transition-[background-color,transform] duration-200 ease-out group-[.is-active]:bg-fg/[0.1] motion-safe:group-active:scale-95"
      >
        <Icon className="size-[21px]" strokeWidth={1.75} />
      </span>
      <span className="max-w-full truncate px-0.5">{label}</span>
    </NavLink>
  );
}

/*
Navegacion inferior en el celular: una barra pegada abajo, al alcance del
pulgar, con las secciones principales y en el medio "Nuevo" (abre el
formulario de movimiento desde cualquier pantalla). Respeta la zona segura
del telefono (la rayita de inicio).
*/
function MobileNav() {
  const { t } = useLanguage();
  const { openCreate } = useMovements();

  return (
    <nav
      aria-label={t("mainNavigation")}
      className="fixed inset-x-0 bottom-0 z-30 rounded-t-[22px] border-t border-fg/[0.08] bg-[color:var(--elevated)] pb-[max(6px,env(safe-area-inset-bottom))] shadow-[0_-8px_24px_rgba(0,0,0,0.18)] backdrop-blur-xl md:hidden"
    >
      <div className="mx-auto flex max-w-md items-stretch px-2 pt-1.5">
        <NavItem to="/" end icon={LayoutDashboardIcon} label={t("home")} />
        <NavItem to="/history" also={["/recurring", "/debts"]} icon={HistoryIcon} label={t("history")} />

        {/* Accion principal: circulo blanco, con su texto debajo como las demas */}
        <button
          type="button"
          onClick={openCreate}
          aria-label={t("newMovement")}
          className={cn(ITEM, "font-medium text-foreground")}
        >
          <span
            aria-hidden="true"
            className="flex size-8 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-[var(--float-shadow)] transition-transform duration-150 ease-out motion-safe:group-active:scale-90"
          >
            <PlusIcon className="size-[18px]" strokeWidth={2.25} />
          </span>
          <span className="max-w-full truncate px-0.5">{t("mobileNavNew")}</span>
        </button>

        <NavItem to="/budgets" also={["/goals", "/investments"]} icon={PiggyBankIcon} label={t("budgetsTitle")} />
        <NavItem to="/settings" icon={SettingsIcon} label={t("settingsTitle")} />
      </div>
    </nav>
  );
}

export default MobileNav;
