// Ejecuta `task` cuando el navegador esta libre. Devuelve la funcion para cancelarlo.
export function whenIdle(task, timeout = 2000) {
  if (typeof window.requestIdleCallback === "function") {
    const id = window.requestIdleCallback(() => task(), { timeout });
    return () => window.cancelIdleCallback(id);
  }
  const id = setTimeout(task, 300);
  return () => clearTimeout(id);
}
