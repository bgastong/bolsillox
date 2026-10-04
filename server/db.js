import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { DatabaseSync } from "node:sqlite";
import { buildSeed } from "./seed.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const DEFAULT_DB_PATH = path.join(__dirname, "data", "bolsillox.db");

const SCHEMA = `
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

// Abre (o crea) la base. Con seed=true carga datos de ejemplo si esta vacia.
export function openDatabase({ filename = DEFAULT_DB_PATH, seed = true } = {}) {
  if (filename !== ":memory:") {
    fs.mkdirSync(path.dirname(filename), { recursive: true });
  }

  // SQLite nativo de Node (node:sqlite): no requiere compilar nada.
  const db = new DatabaseSync(filename);
  if (filename !== ":memory:") db.exec("PRAGMA journal_mode = WAL");
  db.exec(SCHEMA);

  if (seed) seedIfEmpty(db);

  return db;
}

export function seedIfEmpty(db) {
  const { count } = db.prepare("SELECT COUNT(*) AS count FROM movements").get();
  if (count > 0) return 0;

  const insert = db.prepare(`
    INSERT INTO movements (type, title, amount, date, category, payment_method, note)
    VALUES (@type, @title, @amount, @date, @category, @paymentMethod, @note)
  `);
  const rows = buildSeed();
  db.exec("BEGIN");
  try {
    for (const row of rows) insert.run(row);
    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
  return rows.length;
}
