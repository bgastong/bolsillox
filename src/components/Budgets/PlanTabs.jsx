import { NavLink } from "react-router-dom";
import { PiggyBankIcon, TargetIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/hooks/useLanguage";

// Pestanas Presupuestos / Metas (lo que se planea gastar y lo que se quiere juntar).
function PlanTabs() {
  const { t } = useLanguage();
  const tabs = [
    { to: "/budgets", label: t("budgetsTitle"), icon: PiggyBankIcon },
    { to: "/goals", label: t("goalsTitle"), icon: TargetIcon },
  ];

  return (
    <nav aria-label={t("planViews")} className="grid grid-cols-2 gap-1 rounded-xl bg-fg/[0.04] p-1 sm:inline-grid sm:w-auto">
      {tabs.map(({ to, label, icon: Icon }) => (
        <NavLink
          key={to}
          to={to}
          className={({ isActive }) =>
            cn(
              "flex h-11 min-w-0 touch-manipulation items-center justify-center gap-2 rounded-lg px-2 text-sm font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring sm:h-9 sm:px-4",
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

export default PlanTabs;
