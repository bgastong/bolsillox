import {
  CUSTOM_CATEGORIES_MAX,
  customCategoryKey,
  FALLBACK_CATEGORY,
  isCustomCategory,
} from "../shared/catalog.js";
import { HttpError } from "./errors.js";
import { raw, sql } from "./sql.js";

/*
Categorias propias de cada persona. Los movimientos, las reglas recurrentes y
los presupuestos guardan la clave "custom_<id>". Al borrar una categoria, lo
que la usaba pasa a "Otros" (o "Otros ingresos") y su presupuesto se borra.
*/

const COLUMNS = raw(`id, type, name, icon, color`);

function withKey(row) {
  return row && { ...row, key: customCategoryKey(row.id) };
}

function idFromKey(key) {
  return Number(key.slice(key.indexOf("_") + 1));
}

export function createCategoriesService(db) {
  async function list(userId) {
    const rows = await db.all(
      sql`SELECT ${COLUMNS} FROM categories WHERE user_id = ${userId} ORDER BY type, lower(name), id`,
    );
    return rows.map(withKey);
  }

  async function get(userId, id) {
    return withKey(
      await db.one(sql`SELECT ${COLUMNS} FROM categories WHERE user_id = ${userId} AND id = ${id}`),
    );
  }

  // Dos categorias propias del mismo tipo no pueden llamarse igual.
  async function assertNameFree(userId, type, name, exceptId = 0) {
    const taken = await db.one(sql`
      SELECT 1 AS taken FROM categories
      WHERE user_id = ${userId} AND type = ${type} AND lower(name) = lower(${name}) AND id <> ${exceptId}
    `);
    if (taken) throw new HttpError(409, "validation_error", { name: "errorCategoryNameTaken" });
  }

  async function create(userId, data) {
    const { count } = await db.one(sql`SELECT COUNT(*) AS count FROM categories WHERE user_id = ${userId}`);
    if (count >= CUSTOM_CATEGORIES_MAX) throw new HttpError(409, "too_many_categories");
    await assertNameFree(userId, data.type, data.name);
    const row = await db.one(sql`
      INSERT INTO categories (user_id, type, name, icon, color)
      VALUES (${userId}, ${data.type}, ${data.name}, ${data.icon}, ${data.color})
      RETURNING ${COLUMNS}
    `);
    return withKey(row);
  }

  async function update(userId, id, data) {
    const current = await get(userId, id);
    if (!current) return null;
    await assertNameFree(userId, current.type, data.name, id);
    const row = await db.one(sql`
      UPDATE categories SET name = ${data.name}, icon = ${data.icon}, color = ${data.color}
      WHERE user_id = ${userId} AND id = ${id}
      RETURNING ${COLUMNS}
    `);
    return withKey(row);
  }

  async function remove(userId, id) {
    return db.transaction(async (tx) => {
      const category = await tx.one(
        sql`SELECT type FROM categories WHERE user_id = ${userId} AND id = ${id}`,
      );
      if (!category) return null;
      const key = customCategoryKey(id);
      const fallback = FALLBACK_CATEGORY[category.type];
      const moved = await tx.run(
        sql`UPDATE movements SET category = ${fallback} WHERE user_id = ${userId} AND category = ${key}`,
      );
      await tx.run(
        sql`UPDATE recurring SET category = ${fallback} WHERE user_id = ${userId} AND category = ${key}`,
      );
      await tx.run(sql`DELETE FROM budgets WHERE user_id = ${userId} AND category = ${key}`);
      await tx.run(sql`DELETE FROM categories WHERE user_id = ${userId} AND id = ${id}`);
      return { moved, fallback };
    });
  }

  // Una categoria propia en un movimiento tiene que ser de la persona y del mismo tipo.
  async function assertUsable(userId, type, key) {
    if (!isCustomCategory(key)) return;
    const row = await db.one(sql`
      SELECT 1 AS ok FROM categories WHERE user_id = ${userId} AND id = ${idFromKey(key)} AND type = ${type}
    `);
    if (!row) throw new HttpError(400, "validation_error", { category: "errorCategoryInvalid" });
  }

  return { list, get, create, update, remove, assertUsable };
}
