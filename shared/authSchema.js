import { z } from "zod";

// Validaciones de registro e inicio de sesion (compartidas por el front y la API).
// Los mensajes son claves de traduccion.

export const NAME_MAX_LENGTH = 60;
export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 128;

const emailSchema = z
  .string({ error: "errorEmailInvalid" })
  .trim()
  .toLowerCase()
  .max(254, { error: "errorEmailInvalid" })
  .pipe(z.email({ error: "errorEmailInvalid" }));

export const registerSchema = z.object({
  name: z
    .string({ error: "errorNameRequired" })
    .trim()
    .min(1, { error: "errorNameRequired" })
    .max(NAME_MAX_LENGTH, { error: "errorNameTooLong" }),
  email: emailSchema,
  password: z
    .string({ error: "errorPasswordShort" })
    .min(PASSWORD_MIN_LENGTH, { error: "errorPasswordShort" })
    .max(PASSWORD_MAX_LENGTH, { error: "errorPasswordLong" }),
});

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string({ error: "errorPasswordRequired" }).min(1, { error: "errorPasswordRequired" }),
});

// Para borrar la cuenta hay que escribir el email (confirmacion explicita).
export const deleteAccountSchema = z.object({
  email: emailSchema,
});
