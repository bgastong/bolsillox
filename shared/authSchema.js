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

const nameSchema = z
  .string({ error: "errorNameRequired" })
  .trim()
  .min(1, { error: "errorNameRequired" })
  .max(NAME_MAX_LENGTH, { error: "errorNameTooLong" });

const passwordSchema = z
  .string({ error: "errorPasswordShort" })
  .min(PASSWORD_MIN_LENGTH, { error: "errorPasswordShort" })
  .max(PASSWORD_MAX_LENGTH, { error: "errorPasswordLong" });

// Codigo de 6 digitos que llega por email (se aceptan espacios al pegarlo).
export const CODE_LENGTH = 6;
const codeSchema = z
  .string({ error: "errorCodeInvalid" })
  .transform((value) => value.replace(/\s+/g, ""))
  .pipe(z.string().regex(/^\d{6}$/, { error: "errorCodeInvalid" }));

// Idioma de los emails (el de la app de quien los pide).
const languageSchema = z.enum(["es", "en"]).optional();

export const registerSchema = z.object({
  name: nameSchema,
  email: emailSchema,
  password: passwordSchema,
  // Hay que aceptar los Terminos y la Politica de privacidad para crear la cuenta.
  acceptTerms: z.literal(true, { error: "errorAcceptTerms" }),
  language: languageSchema,
});

// Confirmar el email con el codigo (al registrarse).
export const verifyEmailSchema = z.object({
  email: emailSchema,
  code: codeSchema,
});

// Pedir un codigo: reenviar la verificacion u olvidar la contraseña.
export const requestCodeSchema = z.object({
  email: emailSchema,
  language: languageSchema,
});

export const resetPasswordSchema = z.object({
  email: emailSchema,
  code: codeSchema,
  password: passwordSchema,
});

// Cambiar los datos de la cuenta (con sesion iniciada).
export const updateProfileSchema = z.object({
  name: nameSchema,
});

export const changePasswordSchema = z.object({
  // Si la cuenta no tiene contraseña (solo Google) no se pide la actual.
  currentPassword: z.string().optional(),
  newPassword: passwordSchema,
});

export const changeEmailSchema = z.object({
  email: emailSchema,
  password: z.string().optional(),
  language: languageSchema,
});

export const confirmCodeSchema = z.object({
  code: codeSchema,
});

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string({ error: "errorPasswordRequired" }).min(1, { error: "errorPasswordRequired" }),
});

// Para borrar la cuenta hay que escribir el email (confirmacion explicita).
export const deleteAccountSchema = z.object({
  email: emailSchema,
});
