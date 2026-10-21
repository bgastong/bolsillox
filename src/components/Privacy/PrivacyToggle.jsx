import { EyeIcon, EyeOffIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/hooks/useLanguage";
import { PRIVACY_SHORTCUT, usePrivacyToggle } from "@/hooks/usePrivacyToggle";

/*
Boton del ojo: oculta o muestra todos los montos de la app. Es un boton de dos
estados (aria-pressed) con un nombre fijo, "Ocultar montos".
*/
function PrivacyToggle({ className }) {
  const { t, hideAmounts } = useLanguage();
  const toggle = usePrivacyToggle();
  const Icon = hideAmounts ? EyeOffIcon : EyeIcon;
  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={hideAmounts}
      aria-label={t("hideAmounts")}
      title={`${t(hideAmounts ? "showAmounts" : "hideAmounts")} (${PRIVACY_SHORTCUT})`}
      className={cn(className, hideAmounts && "text-foreground")}
    >
      <Icon aria-hidden="true" />
    </button>
  );
}

export default PrivacyToggle;
