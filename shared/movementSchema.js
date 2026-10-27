import { z } from "zod";
import {
  AMOUNT_MAX,
  CATEGORIES_BY_TYPE,
  CATEGORY_COLORS,
  CATEGORY_ICONS,
  CATEGORY_NAME_MAX_LENGTH,
  CURRENCIES,
  DEFAULT_CURRENCY,
  EXPENSE_CATEGORIES,
  GOAL_ICONS,
  GOAL_NAME_MAX_LENGTH,
  INVESTMENT_INDICES,
  INVESTMENT_NAME_MAX_LENGTH,
  isCustomCategory,
  MOVEMENT_TYPES,
  NOTE_MAX_LENGTH,
  PAYMENT_METHODS,
  RATE_SOURCES,
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

const amountSchema = z.coerce
  .number({ error: "errorAmountInvalid" })
  .refine((value) => Number.isFinite(value), { error: "errorAmountInvalid" })
  .refine((value) => value > 0, { error: "errorAmountPositive" })
  .refine((value) => value <= AMOUNT_MAX, { error: "errorAmountTooLarge" })
  .transform((value) => Math.round(value * 100) / 100);

const isoDateSchema = z
  .string({ error: "errorDateInvalid" })
  .refine(isValidISODate, { error: "errorDateInvalid" });

// Campos comunes a un movimiento y a una regla recurrente.
const movementFields = {
  type: z.enum(MOVEMENT_TYPES, { error: "errorTypeInvalid" }),
  title: z
    .string({ error: "errorTitleRequired" })
    .trim()
    .min(1, { error: "errorTitleRequired" })
    .max(TITLE_MAX_LENGTH, { error: "errorTitleTooLong" }),
  amount: amountSchema,
  currency: z.enum(CURRENCIES, { error: "errorCurrencyInvalid" }).default(DEFAULT_CURRENCY),
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
};

// Las categorias propias ("custom_<id>") las valida el servidor contra la
// base (que existan, sean de la persona y del mismo tipo).
function checkCategoryMatchesType(data, ctx) {
  if (isCustomCategory(data.category)) return;
  const allowed = CATEGORIES_BY_TYPE[data.type];
  if (allowed && !allowed.includes(data.category)) {
    ctx.addIssue({
      code: "custom",
      path: ["category"],
      message: "errorCategoryInvalid",
    });
  }
}

export const movementSchema = z
  .object({ ...movementFields, date: isoDateSchema })
  .superRefine(checkCategoryMatchesType);

export const RECURRING_KINDS = ["recurring", "installments"];
export const INSTALLMENTS_MAX = 360;

// Numero entero que puede llegar como texto (desde un input) o como numero.
const integerSchema = (error) =>
  z.preprocess(
    (value) => (value === "" || value === null || value === undefined ? undefined : Number(value)),
    z.number({ error }).int({ error }),
  );

/*
Regla que genera un movimiento todos los meses, el mismo dia que startDate.
kind "installments": compra en cuotas. amount es lo que vale cada cuota,
installmentFirst el numero de la cuota de startDate (1 si arranca ahora) e
installmentsTotal la cantidad de cuotas. La fecha de fin se calcula sola.
*/
export const recurringSchema = z
  .object({
    ...movementFields,
    kind: z.enum(RECURRING_KINDS).optional().default("recurring"),
    startDate: isoDateSchema,
    endDate: z
      .union([isoDateSchema, z.literal(""), z.null()])
      .optional()
      .transform((value) => value || null),
    installmentsTotal: integerSchema("errorInstallmentsTotal").optional(),
    installmentFirst: integerSchema("errorInstallmentFirst").optional(),
    active: z.boolean({ error: "errorActiveInvalid" }).optional().default(true),
  })
  .superRefine((data, ctx) => {
    checkCategoryMatchesType(data, ctx);
    if (data.kind === "installments") {
      const total = data.installmentsTotal;
      if (!total || total < 1 || total > INSTALLMENTS_MAX) {
        ctx.addIssue({ code: "custom", path: ["installmentsTotal"], message: "errorInstallmentsTotal" });
      } else if (!data.installmentFirst || data.installmentFirst < 1 || data.installmentFirst > total) {
        ctx.addIssue({ code: "custom", path: ["installmentFirst"], message: "errorInstallmentFirst" });
      }
      return;
    }
    if (data.endDate && data.endDate < data.startDate) {
      ctx.addIssue({ code: "custom", path: ["endDate"], message: "errorEndBeforeStart" });
    }
  });

// Presupuesto mensual (en ARS) para una categoria de gasto.
export const budgetSchema = z.object({ amount: amountSchema });
export const budgetCategorySchema = z
  .string()
  .refine((value) => EXPENSE_CATEGORIES.includes(value) || isCustomCategory(value), {
    error: "errorCategoryInvalid",
  });

// Categoria propia. El tipo no se puede cambiar despues (los movimientos ya la usan).
export const categorySchema = z.object({
  type: z.enum(MOVEMENT_TYPES, { error: "errorTypeInvalid" }),
  name: z
    .string({ error: "errorCategoryNameRequired" })
    .trim()
    .min(1, { error: "errorCategoryNameRequired" })
    .max(CATEGORY_NAME_MAX_LENGTH, { error: "errorCategoryNameTooLong" }),
  icon: z.enum(CATEGORY_ICONS, { error: "errorCategoryIconInvalid" }),
  color: z.enum(CATEGORY_COLORS, { error: "errorCategoryColorInvalid" }),
});
export const categoryUpdateSchema = categorySchema.omit({ type: true });

// Deuda que le deben a la persona: quien, cuanto, por que y desde/hasta cuando.
export const RECEIVABLE_PERSON_MAX_LENGTH = 60;
export const RECEIVABLE_CONCEPT_MAX_LENGTH = 120;

export const receivableSchema = z
  .object({
    person: z
      .string({ error: "errorPersonRequired" })
      .trim()
      .min(1, { error: "errorPersonRequired" })
      .max(RECEIVABLE_PERSON_MAX_LENGTH, { error: "errorPersonTooLong" }),
    concept: z
      .string()
      .trim()
      .max(RECEIVABLE_CONCEPT_MAX_LENGTH, { error: "errorConceptTooLong" })
      .optional()
      .default(""),
    amount: amountSchema,
    currency: z.enum(CURRENCIES, { error: "errorCurrencyInvalid" }).default(DEFAULT_CURRENCY),
    date: isoDateSchema,
    dueDate: z
      .union([isoDateSchema, z.literal(""), z.null()])
      .optional()
      .transform((value) => value || null),
  })
  .superRefine((data, ctx) => {
    if (data.dueDate && data.dueDate < data.date) {
      ctx.addIssue({ code: "custom", path: ["dueDate"], message: "errorDueBeforeDate" });
    }
  });

// Cobro (total o parcial) de una deuda. Si registerIncome, se carga como ingreso.
export const receivablePaymentSchema = z.object({
  amount: amountSchema,
  date: isoDateSchema,
  registerIncome: z.boolean().optional().default(true),
  paymentMethod: z.enum(PAYMENT_METHODS, { error: "errorMethodInvalid" }).optional().default("transfer"),
});

// Meta de ahorro: nombre, cuanto se quiere juntar, en que moneda y para cuando (opcional).
export const goalSchema = z.object({
  name: z
    .string({ error: "errorGoalNameRequired" })
    .trim()
    .min(1, { error: "errorGoalNameRequired" })
    .max(GOAL_NAME_MAX_LENGTH, { error: "errorGoalNameTooLong" }),
  target: amountSchema,
  currency: z.enum(CURRENCIES, { error: "errorCurrencyInvalid" }).default(DEFAULT_CURRENCY),
  deadline: z
    .union([isoDateSchema, z.literal(""), z.null()])
    .optional()
    .transform((value) => value || null),
  icon: z.enum(GOAL_ICONS, { error: "errorGoalIconInvalid" }).default("piggyBank"),
});

/*
Movimiento de una meta: aportar (deposit) o sacar plata (withdraw). Si
registerMovement, se carga tambien en los movimientos (un gasto al aportar,
un ingreso al sacar), asi el saldo disponible refleja lo que se aparto.
*/
export const GOAL_ENTRY_TYPES = ["deposit", "withdraw"];
export const goalEntrySchema = z.object({
  type: z.enum(GOAL_ENTRY_TYPES, { error: "errorTypeInvalid" }).default("deposit"),
  amount: amountSchema,
  date: isoDateSchema,
  registerMovement: z.boolean().optional().default(true),
  paymentMethod: z.enum(PAYMENT_METHODS, { error: "errorMethodInvalid" }).optional().default("transfer"),
});
/*
Gasto compartido: un gasto que pago la persona y que se divide con otros.
split.people: con quien y cuanto pone cada uno (lo que no ponen ellos es la
parte de la persona). Cada parte queda como una deuda en "Me deben".
*/
export const SHARED_PEOPLE_MAX = 20;
export const sharedExpenseSchema = z
  .object({
    ...movementFields,
    date: isoDateSchema,
    split: z.object({
      people: z
        .array(
          z.object({
            person: z
              .string({ error: "errorPersonRequired" })
              .trim()
              .min(1, { error: "errorPersonRequired" })
              .max(RECEIVABLE_PERSON_MAX_LENGTH, { error: "errorPersonTooLong" }),
            amount: amountSchema,
          }),
          { error: "errorSplitPeople" },
        )
        .min(1, { error: "errorSplitPeople" })
        .max(SHARED_PEOPLE_MAX, { error: "errorSplitTooManyPeople" }),
    }),
  })
  .superRefine((data, ctx) => {
    checkCategoryMatchesType(data, ctx);
    if (data.type !== "expense") {
      ctx.addIssue({ code: "custom", path: ["type"], message: "errorSplitOnlyExpenses" });
    }
    const shares = data.split.people.reduce((sum, item) => sum + item.amount, 0);
    if (shares > data.amount + 0.001) {
      ctx.addIssue({ code: "custom", path: ["split"], message: "errorSplitTooLarge" });
    }
  });

// Inversion indexada: nombre, indice que sigue y moneda en que se aporta.
export const investmentSchema = z.object({
  name: z
    .string({ error: "errorInvestmentNameRequired" })
    .trim()
    .min(1, { error: "errorInvestmentNameRequired" })
    .max(INVESTMENT_NAME_MAX_LENGTH, { error: "errorInvestmentNameTooLong" }),
  index: z.enum(INVESTMENT_INDICES, { error: "errorInvestmentIndexInvalid" }).default("sp500"),
  currency: z.enum(CURRENCIES, { error: "errorCurrencyInvalid" }).default(DEFAULT_CURRENCY),
});

/*
Aporte (deposit) o rescate (withdraw) de una inversion. Si registerMovement,
se carga tambien en los movimientos: un gasto al aportar, un ingreso al rescatar.
*/
export const INVESTMENT_ENTRY_TYPES = ["deposit", "withdraw"];
export const investmentEntrySchema = z.object({
  type: z.enum(INVESTMENT_ENTRY_TYPES, { error: "errorTypeInvalid" }).default("deposit"),
  amount: amountSchema,
  date: isoDateSchema,
  registerMovement: z.boolean().optional().default(true),
  paymentMethod: z.enum(PAYMENT_METHODS, { error: "errorMethodInvalid" }).optional().default("transfer"),
});

// Avisos por email: recordatorios de cuotas e idioma en que llegan.
export const notificationSettingsSchema = z.object({
  installmentEmails: z.boolean().optional(),
  receivableEmails: z.boolean().optional(),
  language: z.enum(["es", "en"]).optional(),
});

// Preferencia de cotizacion del dolar.
export const rateSettingsSchema = z
  .object({
    source: z.enum(RATE_SOURCES, { error: "errorRateSourceInvalid" }),
    manualRate: z
      .union([amountSchema, z.literal(""), z.null()])
      .optional()
      .transform((value) => (value === "" || value === undefined ? null : value)),
  })
  .superRefine((data, ctx) => {
    if (data.source === "manual" && !data.manualRate) {
      ctx.addIssue({ code: "custom", path: ["manualRate"], message: "errorManualRateRequired" });
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
