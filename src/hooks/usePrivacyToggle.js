import { useCallback } from "react";
import { useLanguage } from "@/hooks/useLanguage";
import { useToast } from "@/hooks/useToast";

// Atajo de teclado del modo privado (lo escucha el buscador global).
export const PRIVACY_SHORTCUT = "P";

// Prende o apaga el modo privado y lo avisa (el aviso tambien lo lee el lector de pantalla).
export function usePrivacyToggle() {
  const { t, hideAmounts, setHideAmounts } = useLanguage();
  const { toast } = useToast();
  return useCallback(() => {
    const next = !hideAmounts;
    setHideAmounts(next);
    toast(t(next ? "amountsHiddenToast" : "amountsShownToast"));
  }, [hideAmounts, setHideAmounts, toast, t]);
}
