// Formateo de montos (ARS) y fechas segun el idioma elegido.

const currencyFormatters = new Map();

export function formatCurrency(amount, locale = "es-AR", { signed = false } = {}) {
  const key = `${locale}-${signed}`;
  if (!currencyFormatters.has(key)) {
    currencyFormatters.set(
      key,
      new Intl.NumberFormat(locale, {
        style: "currency",
        currency: "ARS",
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
        signDisplay: signed ? "exceptZero" : "auto",
      }),
    );
  }
  return currencyFormatters.get(key).format(amount ?? 0);
}

// Formato compacto para ejes de graficos ($ 1,2 M)
export function formatCompactCurrency(amount, locale = "es-AR") {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: "ARS",
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(amount ?? 0);
}

// Las fechas se guardan como "YYYY-MM-DD"; se parsean en hora local
// para evitar el corrimiento de un dia por zona horaria.
export function parseISODate(value) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day ?? 1);
}

export function formatDate(value, locale = "es-AR", options) {
  if (!value) return "";
  return new Intl.DateTimeFormat(
    locale,
    options ?? { day: "2-digit", month: "short", year: "numeric" },
  ).format(parseISODate(value));
}

// "2026-03" -> "marzo 2026"
export function formatMonth(monthKey, locale = "es-AR", short = false) {
  return new Intl.DateTimeFormat(locale, {
    month: short ? "short" : "long",
    year: short ? "2-digit" : "numeric",
  }).format(parseISODate(`${monthKey}-01`));
}

export function formatPercent(value, locale = "es-AR") {
  return new Intl.NumberFormat(locale, {
    maximumFractionDigits: 1,
    signDisplay: "exceptZero",
  }).format(value) + "%";
}

function pad(value) {
  return String(value).padStart(2, "0");
}

export function todayISO() {
  const now = new Date();
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

export function currentMonthKey() {
  return todayISO().slice(0, 7);
}

export function shiftMonth(monthKey, offset) {
  const date = parseISODate(`${monthKey}-01`);
  date.setMonth(date.getMonth() + offset);
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}`;
}
