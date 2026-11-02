// Eventos para abrir, desde cualquier parte de la app, el dialogo de crear la
// cuenta y el recorrido guiado de la cuenta de prueba (los escucha DemoLayer).
export const OPEN_CONVERT_EVENT = "bolsillox:demo-convert";
export const START_TOUR_EVENT = "bolsillox:demo-tour";

export const openConvertDialog = () => window.dispatchEvent(new Event(OPEN_CONVERT_EVENT));
export const startTour = () => window.dispatchEvent(new Event(START_TOUR_EVENT));

// Horas enteras que le quedan a la cuenta de prueba (0 si falta menos de una).
export function hoursLeft(expiresAt, now = Date.now()) {
  return Math.max(0, Math.floor((new Date(expiresAt).getTime() - now) / (60 * 60 * 1000)));
}
