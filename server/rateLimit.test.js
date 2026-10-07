import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";
import { openDatabase } from "./db.js";
import { createRateLimiter } from "./rateLimit.js";
import { sql } from "./sql.js";

let db;
let clock = new Date("2026-05-01T12:00:00Z").getTime();
const now = () => new Date(clock);
const MINUTE = 60 * 1000;

before(async () => {
  db = await openDatabase({ dataDir: null });
});

after(() => db.close());

const limiter = (name, limit = 3) => createRateLimiter({ db, name, limit, windowMs: 15 * MINUTE, now });

async function status(fn) {
  try {
    await fn();
    return "ok";
  } catch (error) {
    return error.status;
  }
}

describe("limite de intentos en la base", () => {
  test("corta al pasarse del limite y se reinicia al terminar la ventana", async () => {
    const login = limiter("login-a");
    for (let index = 0; index < 3; index++) assert.equal(await status(() => login.consume("ip|ana")), "ok");
    assert.equal(await status(() => login.consume("ip|ana")), 429);
    // Otra clave tiene su propia cuenta.
    assert.equal(await status(() => login.consume("ip|leo")), "ok");

    clock += 16 * MINUTE;
    assert.equal(await status(() => login.consume("ip|ana")), "ok");
  });

  test("reset borra la cuenta de una clave", async () => {
    const login = limiter("login-b");
    for (let index = 0; index < 3; index++) await login.consume("ip|rosa");
    await login.reset("ip|rosa");
    assert.equal(await status(() => login.consume("ip|rosa")), "ok");
  });

  test("dos instancias del servidor comparten la misma cuenta", async () => {
    // Como en Vercel: cada instancia crea su propio limitador sobre la misma base.
    const first = limiter("login-c");
    const second = limiter("login-c");
    await first.consume("ip|sol");
    await second.consume("ip|sol");
    await first.consume("ip|sol");
    assert.equal(await status(() => second.consume("ip|sol")), 429);
  });

  test("no guarda la IP ni el email en claro", async () => {
    await limiter("login-d").consume("10.0.0.1|privado@mail.com");
    const rows = await db.all(sql`SELECT key FROM rate_limits`);
    assert.ok(rows.every((row) => /^[0-9a-f]{64}$/.test(row.key)));
  });
});
