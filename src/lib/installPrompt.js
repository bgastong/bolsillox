/*
Instalacion de la app. El navegador avisa que se puede instalar
("beforeinstallprompt") apenas carga la pagina, a veces antes de que aparezca
la pantalla de Ajustes: por eso se escucha desde main.jsx y se guarda aca.
*/
let deferredPrompt = null;
let installed = false;
const listeners = new Set();

function notify() {
  listeners.forEach((listener) => listener());
}

export function listenForInstallPrompt() {
  window.addEventListener("beforeinstallprompt", (event) => {
    // Sin el cartel automatico del navegador: se instala desde el boton propio.
    event.preventDefault();
    deferredPrompt = event;
    notify();
  });
  window.addEventListener("appinstalled", () => {
    deferredPrompt = null;
    installed = true;
    notify();
  });
}

export function subscribeInstall(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getInstallSnapshot() {
  return { prompt: deferredPrompt, installed };
}

// Abre la ventana de instalacion del navegador. Devuelve true si la persona acepto.
export async function promptInstall() {
  const event = deferredPrompt;
  if (!event) return false;
  deferredPrompt = null;
  notify();
  event.prompt();
  const { outcome } = await event.userChoice;
  return outcome === "accepted";
}
