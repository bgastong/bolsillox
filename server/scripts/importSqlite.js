import { DatabaseSync } from "node:sqlite";
import { sql } from "../sql.js";

/*
Importa los datos de la version anterior de bolsillox (un archivo SQLite
local, server/data/bolsillox.db) a la cuenta de un usuario en la base nueva.
Copia movimientos, recurrentes (con los meses ya generados), presupuestos
y la fuente de cotizacion elegida. Todo en una transaccion: o entra todo o nada.
*/
export async function importSqlite(db, { file, userId }) {
  const source = new DatabaseSync(file, { readOnly: true });
  try {
    const tables = new Set(
      source.prepare("SELECT name FROM sqlite_master WHERE type = 'table'").all().map((t) => t.name),
    );
    if (!tables.has("movements")) throw new Error("El archivo no parece una base de bolsillox");
    const columns = new Set(source.prepare("PRAGMA table_info(movements)").all().map((c) => c.name));
    const all = (table) => (tables.has(table) ? source.prepare(`SELECT * FROM ${table}`).all() : []);

    const recurring = all("recurring");
    const occurrences = all("recurring_occurrences");
    const movements = all("movements");
    const budgets = all("budgets");
    const settings = all("settings");

    return await db.transaction(async (tx) => {
      // ids viejos de reglas -> ids nuevos
      const ruleIds = new Map();
      for (const rule of recurring) {
        const row = await tx.one(sql`
          INSERT INTO recurring (user_id, type, title, amount, currency, category, payment_method,
                                 note, day_of_month, start_date, end_date, active)
          VALUES (${userId}, ${rule.type}, ${rule.title}, ${rule.amount}, ${rule.currency},
                  ${rule.category}, ${rule.payment_method}, ${rule.note}, ${rule.day_of_month},
                  ${rule.start_date}, ${rule.end_date}, ${Boolean(rule.active)})
          RETURNING id
        `);
        ruleIds.set(Number(rule.id), row.id);
      }
      for (const occurrence of occurrences) {
        const ruleId = ruleIds.get(Number(occurrence.recurring_id));
        if (!ruleId) continue;
        await tx.run(sql`
          INSERT INTO recurring_occurrences (recurring_id, month)
          VALUES (${ruleId}, ${occurrence.month}) ON CONFLICT DO NOTHING
        `);
      }
      for (const movement of movements) {
        const recurringId = columns.has("recurring_id")
          ? (ruleIds.get(Number(movement.recurring_id)) ?? null)
          : null;
        await tx.run(sql`
          INSERT INTO movements (user_id, type, title, amount, currency, date, category,
                                 payment_method, note, recurring_id)
          VALUES (${userId}, ${movement.type}, ${movement.title}, ${movement.amount},
                  ${movement.currency ?? "ARS"}, ${movement.date}, ${movement.category},
                  ${movement.payment_method}, ${movement.note ?? ""}, ${recurringId})
        `);
      }
      for (const budget of budgets) {
        await tx.run(sql`
          INSERT INTO budgets (user_id, category, amount)
          VALUES (${userId}, ${budget.category}, ${budget.amount})
          ON CONFLICT (user_id, category) DO UPDATE SET amount = excluded.amount
        `);
      }
      for (const { key, value } of settings) {
        if (key !== "rateSource" && key !== "manualRate") continue;
        await tx.run(sql`
          INSERT INTO user_settings (user_id, key, value) VALUES (${userId}, ${key}, ${value})
          ON CONFLICT (user_id, key) DO UPDATE SET value = excluded.value
        `);
      }
      return {
        movements: movements.length,
        recurring: recurring.length,
        budgets: budgets.length,
      };
    });
  } finally {
    source.close();
  }
}
