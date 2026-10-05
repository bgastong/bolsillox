import { BUDGET_WARNING_PERCENT } from "../shared/catalog.js";
import { convertedAmountSql, roundMoney } from "./money.js";
import { sql } from "./sql.js";

/*
Presupuestos mensuales por categoria de gasto, en pesos (ARS).
Lo gastado se calcula en ARS convirtiendo los gastos en dolares con la
cotizacion activa.
*/

export function budgetStatus(percent) {
  if (percent > 100) return "over";
  if (percent >= BUDGET_WARNING_PERCENT) return "warning";
  return "ok";
}

export function createBudgetsService(db) {
  async function spentByCategory(userId, from, to, rate) {
    const rows = await db.all(sql`
      SELECT category, SUM(${convertedAmountSql({ target: "ARS", rate })}) AS spent
      FROM movements
      WHERE user_id = ${userId} AND type = 'expense' AND date BETWEEN ${from} AND ${to}
      GROUP BY category
    `);
    return Object.fromEntries(rows.map((row) => [row.category, roundMoney(row.spent)]));
  }

  async function list(userId, { from, to, rate }) {
    const [spent, budgets] = await Promise.all([
      spentByCategory(userId, from, to, rate),
      db.all(
        sql`SELECT category, amount FROM budgets WHERE user_id = ${userId} ORDER BY category`,
      ),
    ]);
    const items = budgets.map(({ category, amount }) => {
      const value = spent[category] ?? 0;
      const percent = Math.round((value / amount) * 1000) / 10;
      return {
        category,
        amount,
        spent: value,
        remaining: roundMoney(amount - value),
        percent,
        status: budgetStatus(percent),
      };
    });
    // Primero los que estan en riesgo.
    items.sort((a, b) => b.percent - a.percent);

    const totalBudget = roundMoney(items.reduce((sum, item) => sum + item.amount, 0));
    const totalSpent = roundMoney(items.reduce((sum, item) => sum + item.spent, 0));
    return {
      currency: "ARS",
      items,
      totals: {
        amount: totalBudget,
        spent: totalSpent,
        percent: totalBudget ? Math.round((totalSpent / totalBudget) * 1000) / 10 : 0,
      },
    };
  }

  function set(userId, category, amount) {
    return db.run(sql`
      INSERT INTO budgets (user_id, category, amount) VALUES (${userId}, ${category}, ${amount})
      ON CONFLICT (user_id, category) DO UPDATE SET amount = excluded.amount, updated_at = now()
    `);
  }

  async function remove(userId, category) {
    const count = await db.run(
      sql`DELETE FROM budgets WHERE user_id = ${userId} AND category = ${category}`,
    );
    return count > 0;
  }

  return { list, set, remove };
}
