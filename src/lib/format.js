// Formateo de montos (ARS / USD) y fechas segun el idioma elegido.

const currencyFormatters = new Map();

/*
Modo privado: con los montos ocultos, cada numero de plata se muestra como
"$ ••••" (se conservan el signo y la moneda). Lo prende LanguageProvider,
que ademas hace que se vuelva a dibujar todo lo que muestra montos.
*/
export const HIDDEN_DIGITS = "••••";
let amountsHidden = false;

export function setAmountsHidden(value) {
  amountsHidden = Boolean(value);
}

export function areAmountsHidden() {
  return amountsHidden;
}

const NUMBER_PARTS = new Set(["integer", "group", "decimal", "fraction", "compact"]);

// Une las partes de un formato: dolares como "US$" y, en modo privado, los numeros tapados.
function joinParts(parts, currency) {
  let masked = false;
  return parts
    .map((part) => {
      if (part.type === "currency" && currency === "USD") return "US$";
      if (amountsHidden && NUMBER_PARTS.has(part.type)) {
        if (masked) return "";
        masked = true;
        return HIDDEN_DIGITS;
      }
      return part.value;
    })
    .join("")
    // "$1,2 M" tapado queda "$•••• ": sin el espacio que separaba la "M".
    .trimEnd();
}

// currency: "ARS" | "USD" (los dolares se muestran como US$).
export function formatCurrency(
  amount,
  locale = "es-AR",
  { signed = false, currency = "ARS" } = {},
) {
  const key = `${locale}-${signed}-${currency}`;
  if (!currencyFormatters.has(key)) {
    currencyFormatters.set(
      key,
      new Intl.NumberFormat(locale, {
        style: "currency",
        currency,
        currencyDisplay: "narrowSymbol",
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
        signDisplay: signed ? "exceptZero" : "auto",
      }),
    );
  }
  const formatter = currencyFormatters.get(key);
  if (currency !== "USD" && !amountsHidden) return formatter.format(amount ?? 0);
  // Dolares siempre como "US$", para no confundirlos con pesos en ningun idioma.
  return joinParts(formatter.formatToParts(amount ?? 0), currency);
}

// Formato compacto para ejes de graficos ($ 1,2 M / US$ 1,2 K)
export function formatCompactCurrency(amount, locale = "es-AR", currency = "ARS") {
  const parts = new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    currencyDisplay: "narrowSymbol",
    notation: "compact",
    maximumFractionDigits: 1,
  }).formatToParts(amount ?? 0);
  return joinParts(parts, currency);
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

// "2026-10-15T10:00:00Z" -> "15 oct, 10:00"
export function formatDateTime(value, locale = "es-AR") {
  if (!value) return "";
  return new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}
