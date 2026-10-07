import { createHash } from "node:crypto";
import { HttpError } from "./errors.js";
import { sql } from "./sql.js";

/*
Limite de intentos (ventana fija) guardado en la base, para frenar a quien
prueba contraseñas o codigos al azar. Vive en Postgres y no en memoria porque
en Vercel hay varias instancias del servidor a la vez: asi todas comparten la
misma cuenta.
- name: nombre del limite ("login", "code"...), para separar sus claves.
- now: reloj (Date); los tests lo fijan.
*/
export function createRateLimiter({ db, name, limit, windowMs, now = () => new Date() }) {
  // La clave tiene IP y email: se guarda solo su hash.
  const keyOf = (key) => createHash("sha256").update(`${name}:${key}`).digest("hex");

  // Suma un intento; si se pasa del limite tira 429. Es una sola consulta
  // atomica: dos pedidos simultaneos no pueden contar el mismo intento.
  async function consume(key) {
    const time = now();
    const resetAt = new Date(time.getTime() + windowMs);
    const row = await db.one(sql`
      INSERT INTO rate_limits (key, count, reset_at)
      VALUES (${keyOf(key)}, 1, ${resetAt})
      ON CONFLICT (key) DO UPDATE SET
        count = CASE WHEN rate_limits.reset_at <= ${time} THEN 1 ELSE rate_limits.count + 1 END,
        reset_at = CASE WHEN rate_limits.reset_at <= ${time} THEN ${resetAt} ELSE rate_limits.reset_at END
      RETURNING count
    `);
    if (row.count > limit) throw new HttpError(429, "too_many_attempts");
  }

  async function reset(key) {
    await db.run(sql`DELETE FROM rate_limits WHERE key = ${keyOf(key)}`);
  }

  return { consume, reset };
}
