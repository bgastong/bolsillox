import { CheckCircle2Icon, DownloadIcon, ShareIcon, SquarePlusIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useInstallAction, useInstallApp } from "@/hooks/useInstallApp";
import { useLanguage } from "@/hooks/useLanguage";

/*
Ajustes > Instalar la app. Cada caso muestra lo que se puede hacer en ese
dispositivo: el boton del navegador, los pasos en iPhone, el menu del
navegador o que ya esta instalada.
*/
function InstallSection({ Section }) {
  const { t } = useLanguage();
  const status = useInstallApp();
  const install = useInstallAction();

  return (
    <Section id="settings-app" title={t("installTitle")} description={t("installDescription")}>
      {status === "installed" && (
        <p className="m-0 flex items-center gap-2 text-sm">
          <CheckCircle2Icon className="size-4 shrink-0 text-income" aria-hidden="true" />
          {t("installInstalled")}
        </p>
      )}

      {status === "available" && (
        <div>
          <Button onClick={install} className="h-11 sm:h-9">
            <DownloadIcon data-icon="inline-start" />
            {t("installButton")}
          </Button>
        </div>
      )}

      {status === "ios" && (
        <ol className="m-0 grid list-none gap-2 p-0 text-sm" aria-label={t("installIosSteps")}>
          <li className="flex items-center gap-3">
            <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-fg/[0.06] text-xs font-medium">1</span>
            <span>
              {t("installIosStep1")} <ShareIcon className="inline size-4 align-[-3px]" aria-hidden="true" />
            </span>
          </li>
          <li className="flex items-center gap-3">
            <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-fg/[0.06] text-xs font-medium">2</span>
            <span>
              {t("installIosStep2")} <SquarePlusIcon className="inline size-4 align-[-3px]" aria-hidden="true" />
            </span>
          </li>
          <li className="flex items-center gap-3">
            <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-fg/[0.06] text-xs font-medium">3</span>
            <span>{t("installIosStep3")}</span>
          </li>
        </ol>
      )}

      {status === "manual" && <p className="m-0 text-sm text-muted-foreground">{t("installManual")}</p>}
    </Section>
  );
}

export default InstallSection;
