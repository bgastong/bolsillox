import { NavLink } from "react-router-dom";
import { HistoryIcon, RepeatIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/hooks/useLanguage";

// Pestanas Historial / Recurrentes (son dos vistas de los movimientos).
function MovementTabs() {
  const { t } = useLanguage();
  const tabs = [
    { to: "/history", label: t("history"), icon: HistoryIcon },
    { to: "/recurring", label: t("recurringTitle"), icon: RepeatIcon },
  ];

  return (
    <nav aria-label={t("movementViews")} className="grid grid-cols-2 gap-1 rounded-xl bg-fg/[0.04] p-1 sm:inline-grid sm:w-auto">
      {tabs.map(({ to, label, icon: Icon }) => (
        <NavLink
          key={to}
          to={to}
          className={({ isActive }) =>
            cn(
              "flex h-11 touch-manipulation items-center justify-center gap-2 rounded-lg px-4 text-sm font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring sm:h-9",
              isActive
                ? "bg-secondary text-foreground shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08)]"
                : "text-muted-foreground hover:text-foreground",
            )
          }
        >
          <Icon className="size-4" aria-hidden="true" />
          {label}
        </NavLink>
      ))}
    </nav>
  );
}

export default MovementTabs;
