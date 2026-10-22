import { useRegisterSW } from "virtual:pwa-register/react";

/*
Registra el service worker (ver VitePWA en vite.config.js), que guarda la app en
el dispositivo para que abra al instante y sin señal. Se monta solo con sesion
iniciada: quien solo mira la pagina de inicio no descarga la app entera.
*/
function ServiceWorker() {
  useRegisterSW({ immediate: true });
  return null;
}

export default ServiceWorker;
