// Avisa al servidor los errores de la pagina (el servidor los manda por email,
// ver server/alerts.js). Solo en produccion y como mucho 5 por carga de pagina.

const MAX_REPORTS = 5;
let reported = 0;
const seen = new Set();

// Errores que no son de bolsillox: extensiones del navegador, scripts de otros
// sitios ("Script error.") y avisos inofensivos del navegador.
const IGNORED = [/^Script error\.?$/, /ResizeObserver loop/, /extension:\/\//, /^Non-Error promise rejection/];

// Despues de publicar una version nueva, una pestaña vieja puede pedir archivos
// que ya no existen. Se recarga la pagina una vez y listo (no es un error de la app).
const STALE_CHUNK = /dynamically imported module|Importing a module script failed|error loading dynamically imported/i;
const RELOADED_KEY = "bolsillox.reloadedForUpdate";

function reloadOnceForUpdate() {
  try {
    if (sessionStorage.getItem(RELOADED_KEY)) return false;
    sessionStorage.setItem(RELOADED_KEY, "1");
  } catch {
    return false;
  }
  window.location.reload();
  return true;
}

export function reportError(error, extra = "") {
  const message = String(error?.message ?? error ?? "").slice(0, 1000);
  const stack = `${error?.stack ?? ""}${extra ? `\n${extra}` : ""}`.slice(0, 5000);
  if (!message) return;
  if (STALE_CHUNK.test(message) && reloadOnceForUpdate()) return;
  if (!import.meta.env.PROD) return;
  if (IGNORED.some((pattern) => pattern.test(message) || pattern.test(stack))) return;
  if (reported >= MAX_REPORTS || seen.has(message)) return;
  seen.add(message);
  reported++;

  fetch("/api/client-errors", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message, stack, url: window.location.pathname }),
    // Sigue aunque la persona cierre la pestaña.
    keepalive: true,
  }).catch(() => {});
}

// Errores que nadie atrapo (fuera de React o en promesas).
export function installErrorReporting() {
  window.addEventListener("error", (event) => reportError(event.error ?? event.message));
  window.addEventListener("unhandledrejection", (event) => reportError(event.reason));
  // Si la pagina cargo bien, se habilita de nuevo la recarga para la proxima version.
  window.setTimeout(() => {
    try {
      sessionStorage.removeItem(RELOADED_KEY);
    } catch {
      // Sin almacenamiento: nada que limpiar.
    }
  }, 10_000);
}
