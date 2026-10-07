import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";
import { openDatabase } from "./db.js";
import { createMaintenance } from "./maintenance.js";
import { sql } from "./sql.js";

let db;
let clock = new Date("2026-05-20T12:00:00Z").getTime();
const now = () => new Date(clock);
const DAY = 24 * 60 * 60 * 1000;
const at = (daysAgo) => new Date(clock - daysAgo * DAY);

before(async () => {
  db = await openDatabase({ dataDir: null });
});

after(() => db.close());

async function addUser(email, { pending, daysAgo }) {
  const row = await db.one(sql`
    INSERT INTO users (email, name, password_hash, pending_verification, created_at)
    VALUES (${email}, 'X', 'hash', ${pending}, ${at(daysAgo)})
    RETURNING id
  `);
  return row.id;
}

const emails = async () => (await db.all(sql`SELECT email FROM users ORDER BY email`)).map((row) => row.email);

describe("limpieza de la base", () => {
  test("borra cuentas sin confirmar viejas y lo vencido, y deja lo demas", async () => {
    await addUser("vieja-pendiente@mail.com", { pending: true, daysAgo: 8 });
    await addUser("nueva-pendiente@mail.com", { pending: true, daysAgo: 2 });
    const active = await addUser("activa-vieja@mail.com", { pending: false, daysAgo: 300 });
    await db.run(sql`INSERT INTO sessions (id, user_id, expires_at) VALUES ('vencida', ${active}, ${at(1)})`);
    await db.run(sql`INSERT INTO sessions (id, user_id, expires_at) VALUES ('vigente', ${active}, ${at(-10)})`);
    await db.run(sql`INSERT INTO rate_limits (key, count, reset_at) VALUES ('a', 3, ${at(1)}), ('b', 3, ${at(-1)})`);

    const maintenance = createMaintenance(db, { now });
    const deleted = await maintenance.runIfDue();
    assert.deepEqual(deleted, { pendingAccounts: 1, sessions: 1, codes: 0, rateLimits: 1 });
    assert.deepEqual(await emails(), ["activa-vieja@mail.com", "nueva-pendiente@mail.com"]);
    const sessions = await db.all(sql`SELECT id FROM sessions`);
    assert.deepEqual(sessions.map((row) => row.id), ["vigente"]);
  });

  test("corre como mucho cada 6 horas, aunque haya varias instancias", async () => {
    clock += 11 * 60 * 1000;
    // Otra instancia: ya corrio hace 11 minutos, no le toca.
    assert.equal(await createMaintenance(db, { now }).runIfDue(), null);
    clock += 6 * 60 * 60 * 1000;
    const first = createMaintenance(db, { now });
    const second = createMaintenance(db, { now });
    const results = await Promise.all([first.runIfDue(), second.runIfDue()]);
    assert.equal(results.filter(Boolean).length, 1);
  });
});
