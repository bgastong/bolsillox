import { useRegisterSW } from "virtual:pwa-register/react";
import { RefreshCwIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/hooks/useLanguage";

// Con la app abierta, cada cuanto se fija si hay una version nueva.
const UPDATE_CHECK_MS = 60 * 60 * 1000;

/*
Registra el service worker (ver VitePWA en vite.config.js), que guarda la app en
el dispositivo para que abra al instante y sin señal. Se monta solo con sesion
iniciada: quien solo mira la pagina de inicio no descarga la app entera.

Cuando hay una version nueva no se cambia sola en medio de lo que la persona
esta haciendo: aparece un aviso con "Actualizar" (recarga con la nueva) y
"Despues" (se aplica la proxima vez que abra la app).
*/
function ServiceWorker() {
  const { t } = useLanguage();
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    immediate: true,
    onRegisteredSW(_url, registration) {
      if (!registration) return;
      setInterval(() => {
        if (navigator.onLine && !document.hidden) registration.update().catch(() => {});
      }, UPDATE_CHECK_MS);
    },
  });

  if (!needRefresh) return null;

  return (
    <div
      role="status"
      className="page-enter fixed inset-x-3 bottom-[calc(92px+env(safe-area-inset-bottom))] z-50 mx-auto flex max-w-md items-center gap-3 rounded-2xl border border-fg/10 bg-[color:var(--elevated)] p-3 pl-4 shadow-[var(--float-shadow)] backdrop-blur-xl md:inset-x-auto md:right-6 md:bottom-6"
    >
      <RefreshCwIcon className="size-4 shrink-0 text-[color:var(--text-3)]" aria-hidden="true" />
      <p className="m-0 min-w-0 flex-1 text-sm">{t("updateAvailable")}</p>
      <Button variant="ghost" size="sm" className="h-10 sm:h-8" onClick={() => setNeedRefresh(false)}>
        {t("updateLater")}
      </Button>
      <Button size="sm" className="h-10 sm:h-8" onClick={() => updateServiceWorker(true)}>
        {t("updateNow")}
      </Button>
    </div>
  );
}

export default ServiceWorker;
