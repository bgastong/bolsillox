import { DEFAULT_APPEARANCE, normalizeAppearance } from "../shared/appearance.js";
import { sql } from "./sql.js";

// Colores a eleccion de cada usuario, guardados en user_settings como JSON.
const KEY = "appearance";

export function createAppearance(db) {
  async function get(userId) {
    const row = await db.one(sql`SELECT value FROM user_settings WHERE user_id = ${userId} AND key = ${KEY}`);
    if (!row) return DEFAULT_APPEARANCE;
    try {
      return normalizeAppearance(JSON.parse(row.value));
    } catch {
      return DEFAULT_APPEARANCE;
    }
  }

  async function save(userId, appearance) {
    await db.run(sql`
      INSERT INTO user_settings (user_id, key, value) VALUES (${userId}, ${KEY}, ${JSON.stringify(appearance)})
      ON CONFLICT (user_id, key) DO UPDATE SET value = excluded.value
    `);
    return get(userId);
  }

  return { get, save };
}
