import { z } from "zod";
import { CURRENCIES } from "../shared/catalog.js";
import { CASHFLOW_RANGES } from "./cashflow.js";
import { currentMonthKey } from "./summary.js";

const monthSchema = z
  .string()
  .regex(/^\d{4}-(0[1-9]|1[0-2])$/, { error: "errorMonthInvalid" });

const currencySchema = z.enum(CURRENCIES, { error: "errorCurrencyInvalid" });

const dateSchema = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/, { error: "errorDateInvalid" });
const rangeSchema = z.enum(CASHFLOW_RANGES, { error: "errorRangeInvalid" });

// ?to=YYYY-MM-DD (por defecto, el dia que se pasa: hoy).
export function parseDate(raw, fallback) {
  return raw ? dateSchema.parse(raw) : fallback;
}

// ?range=7d|1m|3m|6m|1y|all (por defecto 6 meses).
export function parseRange(raw) {
  return raw ? rangeSchema.parse(raw) : "6m";
}

// ?month=YYYY-MM (por defecto el mes actual).
export function parseMonth(raw) {
  return raw ? monthSchema.parse(raw) : currentMonthKey();
}

// ?currency=ARS|USD (por defecto ARS).
export function parseCurrency(raw) {
  return raw ? currencySchema.parse(raw) : "ARS";
}
