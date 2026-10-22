import { useCallback, useSyncExternalStore } from "react";
import { getInstallSnapshot, promptInstall, subscribeInstall } from "@/lib/installPrompt";
import { useLanguage } from "@/hooks/useLanguage";
import { useToast } from "@/hooks/useToast";

// La app abierta como app instalada (no en una pestaña del navegador).
function isStandalone() {
  return window.matchMedia?.("(display-mode: standalone)").matches || window.navigator.standalone === true;
}

// iPhone y iPad (los iPad nuevos dicen ser una Mac con pantalla tactil).
function isIOS() {
  const { userAgent, maxTouchPoints } = window.navigator;
  return /iphone|ipad|ipod/i.test(userAgent) || (/macintosh/i.test(userAgent) && maxTouchPoints > 1);
}

let snapshot = getInstallSnapshot();
function getSnapshot() {
  const next = getInstallSnapshot();
  if (next.prompt !== snapshot.prompt || next.installed !== snapshot.installed) snapshot = next;
  return snapshot;
}

/*
Estado de la instalacion en este dispositivo:
- "installed": ya esta instalada (o se esta usando como app).
- "available": el navegador permite instalarla con un boton (Android, Chrome, Edge).
- "ios": en iPhone/iPad se instala a mano desde Compartir.
- "manual": el navegador no ofrece el boton (Firefox, por ejemplo): desde su menu.
*/
export function useInstallApp() {
  const { prompt, installed } = useSyncExternalStore(subscribeInstall, getSnapshot);
  if (installed || isStandalone()) return "installed";
  if (prompt) return "available";
  if (isIOS()) return "ios";
  return "manual";
}

// Abre la instalacion del navegador y avisa si quedo instalada.
export function useInstallAction() {
  const { t } = useLanguage();
  const { toast } = useToast();
  return useCallback(async () => {
    if (await promptInstall()) toast(t("installDone"));
  }, [t, toast]);
}
