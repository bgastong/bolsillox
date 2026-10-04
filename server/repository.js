// Acceso a datos de movimientos. Recibe la instancia de better-sqlite3.

const COLUMNS = `
  id, type, title, amount, date, category,
  payment_method AS paymentMethod, note,
  created_at AS createdAt, updated_at AS updatedAt
`;

const SORT_COLUMNS = { date: "date", amount: "amount", title: "title COLLATE NOCASE" };

export function createRepository(db) {
  const getStmt = db.prepare(`SELECT ${COLUMNS} FROM movements WHERE id = ?`);
  const insertStmt = db.prepare(`
    INSERT INTO movements (type, title, amount, date, category, payment_method, note)
    VALUES (@type, @title, @amount, @date, @category, @paymentMethod, @note)
  `);
  const updateStmt = db.prepare(`
    UPDATE movements
    SET type = @type, title = @title, amount = @amount, date = @date,
        category = @category, payment_method = @paymentMethod, note = @note,
        updated_at = datetime('now')
    WHERE id = @id
  `);
  const deleteStmt = db.prepare("DELETE FROM movements WHERE id = ?");

  function list(filters = {}) {
    const where = [];
    const params = {};

    if (filters.type) {
      where.push("type = @type");
      params.type = filters.type;
    }
    if (filters.category) {
      where.push("category = @category");
      params.category = filters.category;
    }
    if (filters.paymentMethod) {
      where.push("payment_method = @paymentMethod");
      params.paymentMethod = filters.paymentMethod;
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
    const { lastInsertRowid } = insertStmt.run(data);
    return get(lastInsertRowid);
  }

  function update(id, data) {
    const { changes } = updateStmt.run({ ...data, id });
    return changes ? get(id) : null;
  }

  function remove(id) {
    return deleteStmt.run(id).changes > 0;
  }

  function totalsBetween(from, to) {
    const row = db
      .prepare(
        `SELECT
           COALESCE(SUM(CASE WHEN type = 'income' THEN amount END), 0) AS income,
           COALESCE(SUM(CASE WHEN type = 'expense' THEN amount END), 0) AS expense,
           COUNT(*) AS count
         FROM movements
         WHERE (@from IS NULL OR date >= @from) AND date <= @to`,
      )
      .get({ from, to });
    return row;
  }

  function expensesByCategory(from, to) {
    return db
      .prepare(
        `SELECT category, SUM(amount) AS total, COUNT(*) AS count
         FROM movements
         WHERE type = 'expense' AND date BETWEEN @from AND @to
         GROUP BY category
         ORDER BY total DESC`,
      )
      .all({ from, to });
  }

  return { list, get, create, update, remove, totalsBetween, expensesByCategory };
}
