import { useContext } from "react";
import { SettingsContext } from "../context/SettingsContextValue";

// Moneda en la que se ven los totales y estado de la cotizacion del dolar.
export function useSettings() {
  const context = useContext(SettingsContext);

  if (!context) {
    throw new Error("useSettings must be used inside SettingsProvider");
  }

  return context;
}
