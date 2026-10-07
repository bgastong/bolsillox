import { useCallback, useEffect, useMemo, useState } from "react";
import { THEME_STORAGE_KEY, THEMES, applyTheme, getStoredTheme, resolveTheme } from "@/lib/theme";
import { ThemeContext } from "./ThemeContextValue";

// Guarda el tema elegido y lo aplica; con "system" sigue los cambios del sistema.
export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(getStoredTheme);
  const [resolved, setResolved] = useState(() => resolveTheme(getStoredTheme()));

  useEffect(() => {
    const update = () => {
      const next = resolveTheme(theme);
      setResolved(next);
      applyTheme(next);
    };
    update();
    if (theme !== "system") return undefined;
    const media = window.matchMedia("(prefers-color-scheme: light)");
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, [theme]);

  const setTheme = useCallback((next) => {
    if (!THEMES.includes(next)) return;
    setThemeState(next);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      // ignorado
    }
  }, []);

  const value = useMemo(() => ({ theme, resolvedTheme: resolved, setTheme }), [theme, resolved, setTheme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
