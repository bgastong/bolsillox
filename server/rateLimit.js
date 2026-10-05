import { HttpError } from "./errors.js";

/*
Limite de intentos en memoria (ventana fija), para frenar a quien prueba
contraseñas al azar. Con una sola instancia del servidor alcanza.
*/
export function createRateLimiter({ limit, windowMs, now = () => Date.now() }) {
  const hits = new Map();

  function sweep(time) {
    for (const [key, entry] of hits) if (entry.resetAt <= time) hits.delete(key);
  }

  // Suma un intento; si se pasa del limite tira 429.
  function consume(key) {
    const time = now();
    if (hits.size > 10_000) sweep(time);
    let entry = hits.get(key);
    if (!entry || entry.resetAt <= time) {
      entry = { count: 0, resetAt: time + windowMs };
      hits.set(key, entry);
    }
    entry.count++;
    if (entry.count > limit) throw new HttpError(429, "too_many_attempts");
  }

  function reset(key) {
    hits.delete(key);
  }

  return { consume, reset };
}
