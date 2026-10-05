import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { after, before, test } from "node:test";
import { DatabaseSync } from "node:sqlite";
import { importSqlite } from "./scripts/importSqlite.js";
import { startTestServer } from "./testHelpers.js";

let api;
const files = [];

before(async () => {
  api = await startTestServer();
});

after(async () => {
  await api.stop();
  for (const file of files) fs.rmSync(file, { force: true });
});

function tempFile(name) {
  const file = path.join(os.tmpdir(), `bolsillox-${name}-${process.pid}.db`);
  fs.rmSync(file, { force: true });
  files.push(file);
  return file;
}

// Base con el formato de la version anterior (SQLite, esquema v2).
function legacyV2() {
  const file = tempFile("v2");
  const db = new DatabaseSync(file);
  db.exec(`
    CREATE TABLE recurring (id INTEGER PRIMARY KEY, type TEXT, title TEXT, amount REAL,
      currency TEXT, category TEXT, payment_method TEXT, note TEXT, day_of_month INTEGER,
      start_date TEXT, end_date TEXT, active INTEGER);
    CREATE TABLE recurring_occurrences (recurring_id INTEGER, month TEXT);
    CREATE TABLE movements (id INTEGER PRIMARY KEY, type TEXT, title TEXT, amount REAL,
      date TEXT, category TEXT, payment_method TEXT, note TEXT, currency TEXT, recurring_id INTEGER);
    CREATE TABLE budgets (category TEXT PRIMARY KEY, amount REAL);
    CREATE TABLE settings (key TEXT PRIMARY KEY, value TEXT);

    INSERT INTO recurring VALUES (7, 'expense', 'Alquiler', 300000, 'ARS', 'housing', 'transfer',
      '', 2, '2026-10-02', NULL, 1);
    INSERT INTO recurring_occurrences VALUES (7, '2026-10');
    INSERT INTO movements VALUES
      (1, 'expense', 'Alquiler', 300000, '2026-10-02', 'housing', 'transfer', '', 'ARS', 7),
      (2, 'income', 'Cliente', 100, '2026-10-05', 'freelance', 'transfer', 'nota', 'USD', NULL);
    INSERT INTO budgets VALUES ('food', 90000);
    INSERT INTO settings VALUES ('rateSource', 'mep');
  `);
  db.close();
  return file;
}

// Version 1: sin moneda ni recurrentes.
function legacyV1() {
  const file = tempFile("v1");
  const db = new DatabaseSync(file);
  db.exec(`
    CREATE TABLE movements (id INTEGER PRIMARY KEY, type TEXT, title TEXT, amount REAL,
      date TEXT, category TEXT, payment_method TEXT, note TEXT);
    INSERT INTO movements VALUES (1, 'expense', 'Viejo', 100, '2026-01-01', 'food', 'cash', '');
  `);
  db.close();
  return file;
}

test("importa movimientos, recurrentes, presupuestos y ajustes", async () => {
  const { cookie, user } = await api.signup();
  const result = await importSqlite(api.db, { file: legacyV2(), userId: user.id });
  assert.deepEqual(result, { movements: 2, recurring: 1, budgets: 1 });

  const get = async (p) => (await api.request(p, { cookie })).json();
  const rows = await get("/movements");
  assert.equal(rows.length, 2);
  const usd = rows.find((row) => row.currency === "USD");
  assert.equal(usd.note, "nota");

  const [rule] = await get("/recurring");
  assert.equal(rule.title, "Alquiler");
  assert.equal(rows.find((row) => row.title === "Alquiler").recurringId, rule.id);
  // El mes ya generado no se vuelve a crear.
  assert.equal(rule.lastGeneratedMonth, "2026-10");
  assert.equal((await get("/movements?q=Alquiler")).length, 1);

  assert.equal((await get("/budgets")).items[0].amount, 90000);
  assert.equal((await get("/rates")).source, "mep");
});

test("una base v1 (sin moneda) se importa en pesos", async () => {
  const { cookie, user } = await api.signup();
  await importSqlite(api.db, { file: legacyV1(), userId: user.id });
  const [row] = await (await api.request("/movements", { cookie })).json();
  assert.equal(row.title, "Viejo");
  assert.equal(row.currency, "ARS");
  assert.equal(row.recurringId, null);
});
