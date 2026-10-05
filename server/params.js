import { z } from "zod";
import { CURRENCIES } from "../shared/catalog.js";
import { currentMonthKey } from "./summary.js";

const monthSchema = z
  .string()
  .regex(/^\d{4}-(0[1-9]|1[0-2])$/, { error: "errorMonthInvalid" });

const currencySchema = z.enum(CURRENCIES, { error: "errorCurrencyInvalid" });

// ?month=YYYY-MM (por defecto el mes actual).
export function parseMonth(raw) {
  return raw ? monthSchema.parse(raw) : currentMonthKey();
}

// ?currency=ARS|USD (por defecto ARS).
export function parseCurrency(raw) {
  return raw ? currencySchema.parse(raw) : "ARS";
}
