import { BUDGET_WARNING_PERCENT } from "../shared/catalog.js";
import { convertedAmountSql, roundMoney } from "./money.js";

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
  const listStmt = db.prepare("SELECT category, amount FROM budgets ORDER BY category");
  const upsertStmt = db.prepare(`
    INSERT INTO budgets (category, amount) VALUES (@category, @amount)
    ON CONFLICT (category) DO UPDATE SET amount = excluded.amount, updated_at = datetime('now')
  `);
  const deleteStmt = db.prepare("DELETE FROM budgets WHERE category = ?");

  function spentByCategory(from, to, rate) {
    const rows = db
      .prepare(
        `SELECT category, SUM(${convertedAmountSql}) AS spent
         FROM movements
         WHERE type = 'expense' AND date BETWEEN @from AND @to
         GROUP BY category`,
      )
      .all({ from, to, target: "ARS", rate });
    return Object.fromEntries(rows.map((row) => [row.category, roundMoney(row.spent)]));
  }

  function list({ from, to, rate }) {
    const spent = spentByCategory(from, to, rate);
    const items = listStmt.all().map(({ category, amount }) => {
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

  function set(category, amount) {
    upsertStmt.run({ category, amount });
  }

  function remove(category) {
    return Number(deleteStmt.run(category).changes) > 0;
  }

  return { list, set, remove };
}
