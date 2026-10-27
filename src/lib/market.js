// Rangos de los graficos de mercado (los mismos que acepta /api/market).
export const MARKET_RANGES = ["1m", "6m", "1y", "5y", "max"];

// Puntos de un indice: 6.012,35 (no es plata, no se oculta en modo privado).
export function formatPoints(value, locale, { compact = false } = {}) {
  return new Intl.NumberFormat(
    locale,
    compact ? { notation: "compact", maximumFractionDigits: 1 } : { minimumFractionDigits: 2, maximumFractionDigits: 2 },
  ).format(value);
}

// Rango guardado en este navegador (o el de por defecto).
export function storedChoice(key, allowed, fallback) {
  try {
    const saved = localStorage.getItem(key);
    if (allowed.includes(saved)) return saved;
  } catch {
    // sin storage
  }
  return fallback;
}

export function storeChoice(key, value) {
  try {
    localStorage.setItem(key, value);
  } catch {
    // ignorado
  }
}

// Cuando se actualizo: "Actualizado hoy 16:00" o "Actualizado 24 oct 16:00".
export function updatedText(iso, locale, t) {
  if (!iso) return null;
  const date = new Date(iso);
  const sameDay = date.toDateString() === new Date().toDateString();
  const time = new Intl.DateTimeFormat(locale, { hour: "2-digit", minute: "2-digit" }).format(date);
  const day = sameDay
    ? t("today").toLowerCase()
    : new Intl.DateTimeFormat(locale, { day: "numeric", month: "short" }).format(date).replace(".", "");
  return t("marketUpdated", { when: `${day} ${time}` });
}
