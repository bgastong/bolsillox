import { useCallback, useEffect, useMemo, useState } from "react";
import { normalizeAppearance } from "@shared/appearance.js";
import { api } from "@/lib/api";
import { applyPalette, cacheAppearance, getCachedAppearance } from "@/lib/appearance";
import { AppearanceContext } from "./AppearanceContextValue";

/*
Colores a eleccion (Ajustes > Colores): la paleta y donde se ve el color de los
gastos. Arranca con la copia del navegador y despues trae lo guardado en la
cuenta. Los cambios se ven al instante y se guardan en el servidor.
*/
export function AppearanceProvider({ children }) {
  const [appearance, setAppearanceState] = useState(getCachedAppearance);

  const apply = useCallback((next) => {
    const value = normalizeAppearance(next);
    applyPalette(value.palette);
    cacheAppearance(value);
    setAppearanceState(value);
    return value;
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    api.getAppearance({ signal: controller.signal }).then(apply, () => {});
    return () => controller.abort();
  }, [apply]);

  // Cambia al instante y lo guarda; si falla, vuelve a lo anterior.
  const setAppearance = useCallback(
    async (next) => {
      const previous = appearance;
      apply(next);
      try {
        apply(await api.saveAppearance(next));
      } catch (error) {
        apply(previous);
        throw error;
      }
    },
    [appearance, apply],
  );

  const value = useMemo(() => ({ appearance, setAppearance }), [appearance, setAppearance]);
  return <AppearanceContext.Provider value={value}>{children}</AppearanceContext.Provider>;
}
