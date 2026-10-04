import { z } from "zod";
import {
  AMOUNT_MAX,
  CATEGORIES_BY_TYPE,
  MOVEMENT_TYPES,
  NOTE_MAX_LENGTH,
  PAYMENT_METHODS,
  TITLE_MAX_LENGTH,
} from "./catalog.js";

// Los mensajes son claves de traduccion (ver src/i18n/translations.js),
// asi el front puede mostrarlos en el idioma elegido.

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

export function isValidISODate(value) {
  if (typeof value !== "string" || !DATE_REGEX.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    year >= 1900 &&
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

export const movementSchema = z
  .object({
    type: z.enum(MOVEMENT_TYPES, { error: "errorTypeInvalid" }),
    title: z
      .string({ error: "errorTitleRequired" })
      .trim()
      .min(1, { error: "errorTitleRequired" })
      .max(TITLE_MAX_LENGTH, { error: "errorTitleTooLong" }),
    amount: z.coerce
      .number({ error: "errorAmountInvalid" })
      .refine((value) => Number.isFinite(value), { error: "errorAmountInvalid" })
      .refine((value) => value > 0, { error: "errorAmountPositive" })
      .refine((value) => value <= AMOUNT_MAX, { error: "errorAmountTooLarge" })
      .transform((value) => Math.round(value * 100) / 100),
    date: z
      .string({ error: "errorDateInvalid" })
      .refine(isValidISODate, { error: "errorDateInvalid" }),
    category: z
      .string({ error: "errorCategoryInvalid" })
      .min(1, { error: "errorCategoryInvalid" }),
    paymentMethod: z.enum(PAYMENT_METHODS, { error: "errorMethodInvalid" }),
    note: z
      .string()
      .trim()
      .max(NOTE_MAX_LENGTH, { error: "errorNoteTooLong" })
      .optional()
      .default(""),
  })
  .superRefine((data, ctx) => {
    const allowed = CATEGORIES_BY_TYPE[data.type];
    if (allowed && !allowed.includes(data.category)) {
      ctx.addIssue({
        code: "custom",
        path: ["category"],
        message: "errorCategoryInvalid",
      });
    }
  });

// Convierte los issues de zod en { campo: claveDeError } (el primero por campo).
export function issuesToFieldErrors(issues) {
  const errors = {};
  for (const issue of issues) {
    const field = issue.path[0] ?? "form";
    if (!errors[field]) errors[field] = issue.message;
  }
  return errors;
}
