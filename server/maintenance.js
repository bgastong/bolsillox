import { sql } from "./sql.js";

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

// Cuentas que se registraron pero nunca confirmaron el email: se borran a los 7 dias.
export const PENDING_ACCOUNT_DAYS = 7;
// Cada cuanto corre la limpieza (entre todas las instancias del servidor).
const CLEANUP_EVERY_MS = 6 * HOUR_MS;
// Cada cuanto una instancia se fija si ya toca (asi no consulta la base en cada pedido).
const CHECK_EVERY_MS = 10 * 60 * 1000;

/*
Limpieza periodica de la base. No hay un proceso aparte (en Vercel no hay
servidor siempre prendido): la dispara el trafico normal de la API.
- Cuentas sin confirmar de mas de 7 dias (con sus codigos, por cascada).
- Sesiones, codigos por email y limites de intentos vencidos.
*/
export function createMaintenance(db, { now = () => new Date() } = {}) {
  let nextCheck = 0;

  // Devuelve true si esta instancia gano el turno: el UPDATE ... WHERE es atomico,
  // asi que aunque varias instancias lleguen juntas, solo una limpia.
  async function claim(task, everyMs) {
    const time = now();
    const before = new Date(time.getTime() - everyMs);
    await db.run(sql`
      INSERT INTO maintenance_runs (task, ran_at) VALUES (${task}, ${new Date(0)})
      ON CONFLICT (task) DO NOTHING
    `);
    const updated = await db.run(sql`
      UPDATE maintenance_runs SET ran_at = ${time}
      WHERE task = ${task} AND ran_at <= ${before}
    `);
    return updated > 0;
  }

  async function cleanup() {
    const time = now();
    const pendingBefore = new Date(time.getTime() - PENDING_ACCOUNT_DAYS * DAY_MS);
    const deleted = {
      pendingAccounts: await db.run(sql`
        DELETE FROM users WHERE pending_verification AND created_at < ${pendingBefore}
      `),
      sessions: await db.run(sql`DELETE FROM sessions WHERE expires_at < ${time}`),
      codes: await db.run(sql`DELETE FROM email_codes WHERE expires_at < ${time}`),
      rateLimits: await db.run(sql`DELETE FROM rate_limits WHERE reset_at < ${time}`),
    };
    return deleted;
  }

  // Corre la limpieza si toca. Nunca tira: un error aca no debe romper el pedido.
  async function runIfDue() {
    const time = now().getTime();
    if (time < nextCheck) return null;
    nextCheck = time + CHECK_EVERY_MS;
    try {
      if (!(await claim("cleanup", CLEANUP_EVERY_MS))) return null;
      const deleted = await cleanup();
      const total = Object.values(deleted).reduce((sum, count) => sum + count, 0);
      if (total > 0) console.log("[mantenimiento] limpieza:", JSON.stringify(deleted));
      return deleted;
    } catch (error) {
      console.warn("[mantenimiento] no se pudo limpiar:", error.message);
      return null;
    }
  }

  return { runIfDue, cleanup };
}
