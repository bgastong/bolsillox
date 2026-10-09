import { convertedAmountSql, roundMoney, unconvertedSql } from "./money.js";
import { join, raw, sql } from "./sql.js";

// Acceso a los movimientos de un usuario. Todas las consultas filtran por
// user_id: un usuario nunca ve ni toca datos de otro.

const COLUMNS = raw(`
  id, type, title, amount, currency, date, category,
  payment_method AS "paymentMethod", note, recurring_id AS "recurringId",
  created_at AS "createdAt", updated_at AS "updatedAt"
`);

// Columnas de orden permitidas (lista cerrada: se insertan como texto fijo).
const SORT_COLUMNS = { date: "date", amount: "amount", title: "lower(title)" };

// Escapa los comodines de LIKE en el texto buscado.
function likePattern(text) {
  return `%${text.replace(/[\\%_]/g, (char) => `\\${char}`)}%`;
}

export function createRepository(db) {
  async function list(userId, filters = {}) {
    const where = [sql`user_id = ${userId}`];

    for (const [key, column] of [
      ["type", "type"],
      ["category", "category"],
      ["paymentMethod", "payment_method"],
      ["currency", "currency"],
    ]) {
      if (filters[key]) where.push(sql`${raw(column)} = ${filters[key]}`);
    }
    if (filters.from) where.push(sql`date >= ${filters.from}`);
    if (filters.to) where.push(sql`date <= ${filters.to}`);
    if (filters.q) {
      const pattern = likePattern(filters.q);
      where.push(sql`(title ILIKE ${pattern} OR note ILIKE ${pattern})`);
    }

    const sortColumn = raw(SORT_COLUMNS[filters.sort] ?? SORT_COLUMNS.date);
    const order = raw(filters.order === "asc" ? "ASC" : "DESC");
    const limit = filters.limit ? sql`LIMIT ${filters.limit}` : sql``;

    return db.all(sql`
      SELECT ${COLUMNS} FROM movements
      WHERE ${join(where, " AND ")}
      ORDER BY ${sortColumn} ${order}, id ${order}
      ${limit}
    `);
  }

  function get(userId, id) {
    return db.one(sql`SELECT ${COLUMNS} FROM movements WHERE id = ${id} AND user_id = ${userId}`);
  }

  function create(userId, data) {
    return db.one(sql`
      INSERT INTO movements (user_id, type, title, amount, currency, date, category,
                             payment_method, note)
      VALUES (${userId}, ${data.type}, ${data.title}, ${data.amount}, ${data.currency ?? "ARS"},
              ${data.date}, ${data.category}, ${data.paymentMethod}, ${data.note ?? ""})
      RETURNING ${COLUMNS}
    `);
  }

  function update(userId, id, data) {
    return db.one(sql`
      UPDATE movements
      SET type = ${data.type}, title = ${data.title}, amount = ${data.amount},
          currency = ${data.currency ?? "ARS"}, date = ${data.date}, category = ${data.category},
          payment_method = ${data.paymentMethod}, note = ${data.note ?? ""}, updated_at = now()
      WHERE id = ${id} AND user_id = ${userId}
      RETURNING ${COLUMNS}
    `);
  }

  async function remove(userId, id) {
    return (await db.run(sql`DELETE FROM movements WHERE id = ${id} AND user_id = ${userId}`)) > 0;
  }

  // Borra varios de una vez (solo los de este usuario). Devuelve cuantos borro.
  async function removeMany(userId, ids) {
    return db.run(sql`DELETE FROM movements WHERE user_id = ${userId} AND id = ANY(${ids}::int[])`);
  }

  // Totales de ingresos y gastos en la moneda `target`.
  // from = null suma desde el principio (para el saldo acumulado).
  async function totalsBetween(userId, from, to, money = {}) {
    const amount = convertedAmountSql(money);
    const fromFilter = from ? sql`AND date >= ${from}` : sql``;
    const row = await db.one(sql`
      SELECT
        COALESCE(SUM(CASE WHEN type = 'income' THEN ${amount} END), 0) AS income,
        COALESCE(SUM(CASE WHEN type = 'expense' THEN ${amount} END), 0) AS expense,
        COUNT(*) AS count,
        COALESCE(${unconvertedSql(money)}, 0) AS unconverted
      FROM movements
      WHERE user_id = ${userId} AND date <= ${to} ${fromFilter}
    `);
    return {
      income: roundMoney(row.income),
      expense: roundMoney(row.expense),
      count: row.count,
      unconverted: row.unconverted,
    };
  }

  async function expensesByCategory(userId, from, to, money = {}) {
    const rows = await db.all(sql`
      SELECT category, SUM(${convertedAmountSql(money)}) AS total, COUNT(*) AS count
      FROM movements
      WHERE user_id = ${userId} AND type = 'expense' AND date BETWEEN ${from} AND ${to}
      GROUP BY category
      ORDER BY total DESC
    `);
    return rows
      .map((row) => ({ ...row, total: roundMoney(row.total) }))
      .filter((row) => row.total > 0);
  }

  return { list, get, create, update, remove, removeMany, totalsBetween, expensesByCategory };
}
