import { useContext } from "react";
import { AppearanceContext } from "@/context/AppearanceContextValue";
import { getCachedAppearance } from "@/lib/appearance";

// Colores elegidos. Fuera de la app con sesion (sin provider) usa la copia del navegador.
export function useAppearance() {
  return useContext(AppearanceContext) ?? { appearance: getCachedAppearance(), setAppearance: async () => {} };
}
