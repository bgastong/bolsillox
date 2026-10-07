/*
Envio de emails (codigos de verificacion y de recuperacion).
- Con RESEND_API_KEY se envian con Resend (https://resend.com) por HTTPS:
  funciona en Vercel y en el plan gratis de Render, que no deja salir por SMTP.
- En desarrollo, sin clave, el email se muestra en la consola.
- En produccion sin clave queda desactivado: las cuentas nuevas no piden
  codigo y "Olvide mi contraseña" no esta disponible (nadie queda bloqueado).
*/

export function createResendMailer({ apiKey, from, fetchImpl = globalThis.fetch }) {
  return {
    enabled: true,
    async send({ to, subject, text, html }) {
      const response = await fetchImpl("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({ from, to: [to], subject, text, html }),
      });
      if (!response.ok) {
        const detail = await response.text().catch(() => "");
        throw new Error(`Resend respondio ${response.status}: ${detail.slice(0, 200)}`);
      }
    },
  };
}

export function createConsoleMailer({ log = console.log } = {}) {
  return {
    enabled: true,
    async send({ to, subject, text }) {
      log(`\n[email] Para: ${to}\n[email] Asunto: ${subject}\n${text}\n`);
    },
  };
}

export const disabledMailer = {
  enabled: false,
  async send() {
    throw new Error("El envio de emails no esta configurado");
  },
};

// Elige el mailer segun las variables de entorno.
export function mailerFromEnv({ isProduction, env = process.env } = {}) {
  if (env.RESEND_API_KEY) {
    return createResendMailer({
      apiKey: env.RESEND_API_KEY,
      from: env.EMAIL_FROM || "bolsillox <onboarding@resend.dev>",
    });
  }
  if (!isProduction) return createConsoleMailer();
  console.warn("[email] Sin RESEND_API_KEY: la verificacion por email esta desactivada.");
  return disabledMailer;
}
