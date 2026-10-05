import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { DatabaseSync } from "node:sqlite";
import { buildSeed } from "./seed.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const DEFAULT_DB_PATH = path.join(__dirname, "data", "bolsillox.db");

// Esquema inicial (version 1). Los cambios posteriores van en MIGRATIONS.
const BASE_SCHEMA = `
  CREATE TABLE IF NOT EXISTS movements (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    type           TEXT    NOT NULL CHECK (type IN ('income', 'expense')),
    title          TEXT    NOT NULL,
    amount         REAL    NOT NULL CHECK (amount > 0),
    date           TEXT    NOT NULL,
    category       TEXT    NOT NULL,
    payment_method TEXT    NOT NULL,
    note           TEXT    NOT NULL DEFAULT '',
    created_at     TEXT    NOT NULL DEFAULT (datetime('now')),
    updated_at     TEXT    NOT NULL DEFAULT (datetime('now'))
  );
  CREATE INDEX IF NOT EXISTS idx_movements_date ON movements (date);
  CREATE INDEX IF NOT EXISTS idx_movements_type ON movements (type);
`;

/*
Migraciones en orden. Cada base guarda su version en PRAGMA user_version,
asi una base existente se actualiza sola sin perder datos.
*/
const MIGRATIONS = [
  // v2: moneda por movimiento, recurrentes, presupuestos y cotizaciones.
  `
  CREATE TABLE recurring (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    type           TEXT    NOT NULL CHECK (type IN ('income', 'expense')),
    title          TEXT    NOT NULL,
    amount         REAL    NOT NULL CHECK (amount > 0),
    currency       TEXT    NOT NULL DEFAULT 'ARS' CHECK (currency IN ('ARS', 'USD')),
    category       TEXT    NOT NULL,
    payment_method TEXT    NOT NULL,
    note           TEXT    NOT NULL DEFAULT '',
    day_of_month   INTEGER NOT NULL CHECK (day_of_month BETWEEN 1 AND 31),
    start_date     TEXT    NOT NULL,
    end_date       TEXT,
    active         INTEGER NOT NULL DEFAULT 1,
    created_at     TEXT    NOT NULL DEFAULT (datetime('now')),
    updated_at     TEXT    NOT NULL DEFAULT (datetime('now'))
  );

  -- Meses ya generados por cada regla. Si se borra el movimiento generado,
  -- la ocurrencia queda registrada y no se vuelve a crear.
  CREATE TABLE recurring_occurrences (
    recurring_id INTEGER NOT NULL REFERENCES recurring (id) ON DELETE CASCADE,
    month        TEXT    NOT NULL,
    PRIMARY KEY (recurring_id, month)
  );

  ALTER TABLE movements ADD COLUMN currency TEXT NOT NULL DEFAULT 'ARS'
    CHECK (currency IN ('ARS', 'USD'));
  ALTER TABLE movements ADD COLUMN recurring_id INTEGER
    REFERENCES recurring (id) ON DELETE SET NULL;

  CREATE TABLE budgets (
    category   TEXT PRIMARY KEY,
    amount     REAL NOT NULL CHECK (amount > 0),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE settings (
    key   TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );

  CREATE TABLE exchange_rates (
    source     TEXT PRIMARY KEY,
    buy        REAL,
    sell       REAL NOT NULL,
    updated_at TEXT NOT NULL,
    fetched_at TEXT NOT NULL
  );
  `,
];

export function transaction(db, fn) {
  db.exec("BEGIN");
  try {
    const result = fn();
    db.exec("COMMIT");
    return result;
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
}

function migrate(db) {
  db.exec(BASE_SCHEMA);
  const { user_version: current } = db.prepare("PRAGMA user_version").get();
  // La version 1 es el esquema base; MIGRATIONS[0] lleva a la 2, etc.
  const version = Math.max(current, 1);
  for (let index = version - 1; index < MIGRATIONS.length; index++) {
    transaction(db, () => {
      db.exec(MIGRATIONS[index]);
      db.exec(`PRAGMA user_version = ${index + 2}`);
    });
  }
}

// Abre (o crea) la base. Con seed=true carga datos de ejemplo si esta vacia.
// today: fecha de referencia para los datos de ejemplo (los tests la fijan).
export function openDatabase({ filename = DEFAULT_DB_PATH, seed = true, today = new Date() } = {}) {
  if (filename !== ":memory:") {
    fs.mkdirSync(path.dirname(filename), { recursive: true });
  }

  // SQLite nativo de Node (node:sqlite): no requiere compilar nada.
  const db = new DatabaseSync(filename);
  if (filename !== ":memory:") db.exec("PRAGMA journal_mode = WAL");
  db.exec("PRAGMA foreign_keys = ON");
  migrate(db);

  if (seed) seedIfEmpty(db, today);

  return db;
}

export function seedIfEmpty(db, today = new Date()) {
  const { count } = db.prepare("SELECT COUNT(*) AS count FROM movements").get();
  if (count > 0) return 0;

  const { movements, recurring, budgets } = buildSeed(today);

  const insertRecurring = db.prepare(`
    INSERT INTO recurring (type, title, amount, currency, category, payment_method, note,
                           day_of_month, start_date)
    VALUES (@type, @title, @amount, @currency, @category, @paymentMethod, @note,
            @dayOfMonth, @startDate)
  `);
  const insertOccurrence = db.prepare(
    "INSERT INTO recurring_occurrences (recurring_id, month) VALUES (?, ?)",
  );
  const insertMovement = db.prepare(`
    INSERT INTO movements (type, title, amount, currency, date, category, payment_method,
                           note, recurring_id)
    VALUES (@type, @title, @amount, @currency, @date, @category, @paymentMethod,
            @note, @recurringId)
  `);
  const insertBudget = db.prepare("INSERT INTO budgets (category, amount) VALUES (?, ?)");

  transaction(db, () => {
    const ruleIds = {};
    for (const { key, ...rule } of recurring) {
      ruleIds[key] = Number(insertRecurring.run(rule).lastInsertRowid);
    }
    for (const { recurringKey, ...movement } of movements) {
      const recurringId = recurringKey ? ruleIds[recurringKey] : null;
      insertMovement.run({ ...movement, recurringId });
      if (recurringId) insertOccurrence.run(recurringId, movement.date.slice(0, 7));
    }
    for (const budget of budgets) insertBudget.run(budget.category, budget.amount);
  });

  return movements.length;
}
