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
