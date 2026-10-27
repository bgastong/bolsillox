// Listas compartidas entre el front y el back.
// Se guardan las claves en la DB y el front las traduce con i18n.

export const MOVEMENT_TYPES = ["income", "expense"];

export const EXPENSE_CATEGORIES = [
  "food",
  "transport",
  "housing",
  "services",
  "subscriptions",
  "health",
  "entertainment",
  "education",
  "shopping",
  "other",
];

export const INCOME_CATEGORIES = [
  "salary",
  "freelance",
  "investments",
  "gift",
  "otherIncome",
];

export const CATEGORIES_BY_TYPE = {
  income: INCOME_CATEGORIES,
  expense: EXPENSE_CATEGORIES,
};

export const ALL_CATEGORIES = [...EXPENSE_CATEGORIES, ...INCOME_CATEGORIES];

export const PAYMENT_METHODS = [
  "cash",
  "debit",
  "credit",
  "transfer",
  "wallet",
  "sube",
];

export const SORT_FIELDS = ["date", "amount", "title"];
export const SORT_ORDERS = ["asc", "desc"];

export const TITLE_MAX_LENGTH = 80;
export const NOTE_MAX_LENGTH = 300;
export const AMOUNT_MAX = 1_000_000_000;

export const CURRENCIES = ["ARS", "USD"];
export const DEFAULT_CURRENCY = "ARS";

// Fuentes de cotizacion del dolar. "manual" usa un valor cargado por el usuario.
export const RATE_SOURCES = ["oficial", "blue", "mep", "manual"];
export const DEFAULT_RATE_SOURCE = "blue";

// Umbral (en %) a partir del cual un presupuesto se marca "cerca del limite".
export const BUDGET_WARNING_PERCENT = 80;

// Categorias propias: se guardan en la tabla categories y los movimientos
// usan la clave "custom_<id>". Las de la lista de arriba no se pueden cambiar.
export const CUSTOM_CATEGORY_PREFIX = "custom_";
export const CUSTOM_CATEGORIES_MAX = 50;
export const CATEGORY_NAME_MAX_LENGTH = 30;

export function isCustomCategory(key) {
  return typeof key === "string" && /^custom_[1-9]\d*$/.test(key);
}

export function customCategoryKey(id) {
  return `${CUSTOM_CATEGORY_PREFIX}${id}`;
}

// A donde pasan los movimientos cuando se borra una categoria propia.
export const FALLBACK_CATEGORY = { expense: "other", income: "otherIncome" };

// Iconos y colores que se pueden elegir (el front traduce el nombre a un icono).
export const CATEGORY_ICONS = [
  "tag",
  "car",
  "fuel",
  "plane",
  "dog",
  "baby",
  "shirt",
  "dumbbell",
  "gamepad",
  "music",
  "book",
  "coffee",
  "pizza",
  "beer",
  "pill",
  "scissors",
  "wrench",
  "phone",
  "wifi",
  "gift",
  "heart",
  "piggyBank",
  "briefcase",
  "home",
];

export const CATEGORY_COLORS = [
  "#fbbf24",
  "#fb923c",
  "#f87171",
  "#f472b6",
  "#e879f9",
  "#a78bfa",
  "#818cf8",
  "#38bdf8",
  "#22d3ee",
  "#2dd4bf",
  "#34d399",
  "#a3e635",
  "#94a3b8",
];

// Metas de ahorro: iconos que se pueden elegir y largo del nombre.
export const GOAL_ICONS = ["piggyBank", "plane", "home", "car", "gift", "heart", "book", "phone", "briefcase", "baby", "dog", "music"];
export const GOAL_NAME_MAX_LENGTH = 40;
export const GOALS_MAX = 30;

// Inversiones indexadas: a que indice sigue cada una (se pueden sumar mas).
export const INVESTMENT_INDICES = ["sp500"];
export const INVESTMENT_NAME_MAX_LENGTH = 40;
export const INVESTMENTS_MAX = 20;
// Hasta cuantos años atras se puede cargar un aporte (el historial que se guarda).
export const INVESTMENT_HISTORY_YEARS = 10;
