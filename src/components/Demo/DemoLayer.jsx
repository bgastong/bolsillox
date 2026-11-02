import { useEffect, useState } from "react";
import { ArrowRightIcon, FlaskConicalIcon, MapIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/hooks/useLanguage";
import ConvertDemoDialog from "./ConvertDemoDialog";
import { hoursLeft, OPEN_CONVERT_EVENT, openConvertDialog, startTour } from "./demoEvents";

// Horas que le quedan a la cuenta de prueba; se actualiza cada minuto.
function useHoursLeft(expiresAt) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 60 * 1000);
    return () => clearInterval(timer);
  }, []);
  return hoursLeft(expiresAt, now);
}

function DemoBanner({ expiresAt }) {
  const { t } = useLanguage();
  const hours = useHoursLeft(expiresAt);
  return (
    <div
      role="region"
      aria-label={t("demoBannerLabel")}
      className="demo-banner mx-auto mb-4 flex w-full flex-wrap items-center gap-x-4 gap-y-2 rounded-xl px-3.5 py-2.5 text-sm"
    >
      <span className="flex min-w-0 flex-1 items-center gap-2">
        <FlaskConicalIcon className="size-4 shrink-0 text-income" aria-hidden="true" />
        <span className="min-w-0">
          <span className="font-medium">{t("demoBannerText")}</span>
          <span className="text-[color:var(--text-3)]">
            {" · "}
            {hours ? t("demoBannerHours", { count: hours }) : t("demoBannerSoon")}
          </span>
        </span>
      </span>
      <span className="flex items-center gap-2 max-sm:w-full">
        <Button variant="ghost" size="sm" onClick={startTour} className="max-sm:flex-1">
          <MapIcon data-icon="inline-start" />
          {t("demoTourButton")}
        </Button>
        <Button size="sm" onClick={openConvertDialog} className="max-sm:flex-1">
          {t("demoCreateAccount")}
          <ArrowRightIcon data-icon="inline-end" />
        </Button>
      </span>
    </div>
  );
}

/*
Todo lo de la cuenta de prueba dentro de la app: el aviso de arriba (cuanto
falta para que se borre), el dialogo para crear la cuenta y el recorrido
guiado. Solo aparece si la cuenta es de prueba.
*/
function DemoLayer() {
  const { user } = useAuth();
  const [converting, setConverting] = useState(false);
  const isDemo = Boolean(user?.demoExpiresAt);

  useEffect(() => {
    const open = () => setConverting(true);
    window.addEventListener(OPEN_CONVERT_EVENT, open);
    return () => window.removeEventListener(OPEN_CONVERT_EVENT, open);
  }, []);

  return (
    <>
      {isDemo && <DemoBanner expiresAt={user.demoExpiresAt} />}
      {/* Queda montado mientras termina la conversion (ahi la cuenta ya no es de prueba). */}
      {(isDemo || converting) && <ConvertDemoDialog open={converting} onOpenChange={setConverting} />}
    </>
  );
}

export default DemoLayer;
