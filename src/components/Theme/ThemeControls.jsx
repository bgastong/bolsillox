import { MoonIcon, SunIcon } from "lucide-react";
import { THEME_OPTIONS } from "./themeOptions";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/hooks/useLanguage";
import { useTheme } from "@/hooks/useTheme";


// Boton sol / luna: alterna entre claro y oscuro (pagina de inicio, login).
export function ThemeToggle({ className }) {
  const { t } = useLanguage();
  const { resolvedTheme, setTheme } = useTheme();
  const toLight = resolvedTheme === "dark";
  const Icon = toLight ? SunIcon : MoonIcon;
  const label = t(toLight ? "themeToLight" : "themeToDark");

  return (
    <button
      type="button"
      onClick={() => setTheme(toLight ? "light" : "dark")}
      aria-label={label}
      title={label}
      className={cn(
        "inline-flex size-10 shrink-0 touch-manipulation items-center justify-center rounded-lg border text-[color:var(--text-2)] transition-colors outline-none hover:bg-fg/[0.05] hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring",
        className,
      )}
    >
      <Icon className="size-4 transition-transform duration-300 hover:rotate-12" aria-hidden="true" />
    </button>
  );
}

// Selector compacto de 3 opciones con iconos (menu lateral).
export function ThemeSegmented({ className }) {
  const { t } = useLanguage();
  const { theme, setTheme } = useTheme();

  return (
    <div
      role="radiogroup"
      aria-label={t("themeTitle")}
      className={cn("grid grid-cols-3 gap-0.5 rounded-lg border p-0.5", className)}
    >
      {THEME_OPTIONS.map(({ value, icon: Icon }) => (
        <button
          key={value}
          type="button"
          role="radio"
          aria-checked={theme === value}
          aria-label={t(`theme_${value}`)}
          title={t(`theme_${value}`)}
          onClick={() => setTheme(value)}
          className={cn(
            "inline-flex h-7 items-center justify-center rounded-md outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring",
            theme === value
              ? "bg-fg/[0.08] text-foreground"
              : "text-[color:var(--text-4)] hover:text-foreground",
          )}
        >
          <Icon className="size-3.5" aria-hidden="true" />
        </button>
      ))}
    </div>
  );
}
