import { convertedAmountSql, roundMoney, unconvertedSql } from "./money.js";

// Acceso a datos de movimientos. Recibe una instancia de node:sqlite (DatabaseSync).
// node:sqlite rechaza parametros con nombre que no esten en la consulta,
// por eso se arman los objetos con los campos exactos.

const COLUMNS = `
  id, type, title, amount, currency, date, category,
  payment_method AS paymentMethod, note, recurring_id AS recurringId,
  created_at AS createdAt, updated_at AS updatedAt
`;

function movementParams(data) {
  return {
    type: data.type,
    title: data.title,
    amount: data.amount,
    currency: data.currency ?? "ARS",
    date: data.date,
    category: data.category,
    paymentMethod: data.paymentMethod,
    note: data.note ?? "",
  };
}

const SORT_COLUMNS = { date: "date", amount: "amount", title: "title COLLATE NOCASE" };

export function createRepository(db) {
  const getStmt = db.prepare(`SELECT ${COLUMNS} FROM movements WHERE id = ?`);
  const insertStmt = db.prepare(`
    INSERT INTO movements (type, title, amount, currency, date, category, payment_method, note)
    VALUES (@type, @title, @amount, @currency, @date, @category, @paymentMethod, @note)
  `);
  const updateStmt = db.prepare(`
    UPDATE movements
    SET type = @type, title = @title, amount = @amount, currency = @currency, date = @date,
        category = @category, payment_method = @paymentMethod, note = @note,
        updated_at = datetime('now')
    WHERE id = @id
  `);
  const deleteStmt = db.prepare("DELETE FROM movements WHERE id = ?");

  function list(filters = {}) {
    const where = [];
    const params = {};

    for (const [key, column] of [
      ["type", "type"],
      ["category", "category"],
      ["paymentMethod", "payment_method"],
      ["currency", "currency"],
    ]) {
      if (filters[key]) {
        where.push(`${column} = @${key}`);
        params[key] = filters[key];
      }
    }
    if (filters.from) {
      where.push("date >= @from");
      params.from = filters.from;
    }
    if (filters.to) {
      where.push("date <= @to");
      params.to = filters.to;
    }
    if (filters.q) {
      where.push("(title LIKE @q ESCAPE '\\' OR note LIKE @q ESCAPE '\\')");
      params.q = `%${filters.q.replace(/[\\%_]/g, (char) => `\\${char}`)}%`;
    }

    const sortColumn = SORT_COLUMNS[filters.sort] ?? SORT_COLUMNS.date;
    const order = filters.order === "asc" ? "ASC" : "DESC";
    const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";
    const limitSql = filters.limit ? "LIMIT @limit" : "";
    if (filters.limit) params.limit = filters.limit;

    return db
      .prepare(
        `SELECT ${COLUMNS} FROM movements ${whereSql}
         ORDER BY ${sortColumn} ${order}, id ${order} ${limitSql}`,
      )
      .all(params);
  }

  function get(id) {
    return getStmt.get(id) ?? null;
  }

  function create(data) {
    const { lastInsertRowid } = insertStmt.run(movementParams(data));
    return get(Number(lastInsertRowid));
  }

  function update(id, data) {
    const { changes } = updateStmt.run({ ...movementParams(data), id });
    return Number(changes) ? get(id) : null;
  }

  function remove(id) {
    return Number(deleteStmt.run(id).changes) > 0;
  }

  // Totales de ingresos y gastos en la moneda `target`.
  // from = null suma desde el principio (para el saldo acumulado).
  function totalsBetween(from, to, { target = "ARS", rate = null } = {}) {
    const row = db
      .prepare(
        `SELECT
           COALESCE(SUM(CASE WHEN type = 'income' THEN ${convertedAmountSql} END), 0) AS income,
           COALESCE(SUM(CASE WHEN type = 'expense' THEN ${convertedAmountSql} END), 0) AS expense,
           COUNT(*) AS count,
           COALESCE(${unconvertedSql}, 0) AS unconverted
         FROM movements
         WHERE (@from IS NULL OR date >= @from) AND date <= @to`,
      )
      .get({ from, to, target, rate });
    return {
      income: roundMoney(row.income),
      expense: roundMoney(row.expense),
      count: row.count,
      unconverted: row.unconverted,
    };
  }

  function expensesByCategory(from, to, { target = "ARS", rate = null } = {}) {
    return db
      .prepare(
        `SELECT category, SUM(${convertedAmountSql}) AS total, COUNT(*) AS count
         FROM movements
         WHERE type = 'expense' AND date BETWEEN @from AND @to
         GROUP BY category
         ORDER BY total DESC`,
      )
      .all({ from, to, target, rate })
      .map((row) => ({ ...row, total: roundMoney(row.total) }))
      .filter((row) => row.total > 0);
  }

  return { list, get, create, update, remove, totalsBetween, expensesByCategory };
}
