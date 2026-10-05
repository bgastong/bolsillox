// Calculos del dashboard: saldo, totales del mes, variacion y series para graficos.

function pad(value) {
  return String(value).padStart(2, "0");
}

export function currentMonthKey(today = new Date()) {
  return `${today.getFullYear()}-${pad(today.getMonth() + 1)}`;
}

// "2026-03" -> { key, from: "2026-03-01", to: "2026-03-31" }
export function monthRange(key, offset = 0) {
  const [year, month] = key.split("-").map(Number);
  const start = new Date(Date.UTC(year, month - 1 + offset, 1));
  const end = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, 0));
  const monthKey = `${start.getUTCFullYear()}-${pad(start.getUTCMonth() + 1)}`;
  return {
    key: monthKey,
    from: `${monthKey}-01`,
    to: `${monthKey}-${pad(end.getUTCDate())}`,
  };
}

// Variacion porcentual; null si no hay base para comparar.
export function percentChange(current, previous) {
  if (!previous) return null;
  return Math.round(((current - previous) / Math.abs(previous)) * 1000) / 10;
}

// money: { target: "ARS" | "USD", rate: pesos por dolar o null }
export function buildSummary(
  repo,
  monthKey,
  { months = 6, recent = 5, target = "ARS", rate = null } = {},
) {
  const money = { target, rate };
  const current = monthRange(monthKey);
  const previous = monthRange(monthKey, -1);

  const currentTotals = repo.totalsBetween(current.from, current.to, money);
  const previousTotals = repo.totalsBetween(previous.from, previous.to, money);
  const allTime = repo.totalsBetween(null, current.to, money);
  const previousAllTime = repo.totalsBetween(null, previous.to, money);

  const round = (value) => Math.round(value * 100) / 100;
  const balance = round(allTime.income - allTime.expense);
  const previousBalance = round(previousAllTime.income - previousAllTime.expense);
  const net = round(currentTotals.income - currentTotals.expense);

  const monthly = [];
  for (let offset = months - 1; offset >= 0; offset--) {
    const range = monthRange(monthKey, -offset);
    const totals = repo.totalsBetween(range.from, range.to, money);
    monthly.push({ month: range.key, income: totals.income, expense: totals.expense });
  }

  return {
    month: current.key,
    currency: target,
    rate,
    // Movimientos en otra moneda que no se pudieron convertir (sin cotizacion).
    unconverted: allTime.unconverted,
    balance,
    income: currentTotals.income,
    expense: currentTotals.expense,
    net,
    count: currentTotals.count,
    savingsRate: currentTotals.income
      ? Math.round((net / currentTotals.income) * 1000) / 10
      : null,
    previous: {
      month: previous.key,
      income: previousTotals.income,
      expense: previousTotals.expense,
      balance: previousBalance,
    },
    variation: {
      income: percentChange(currentTotals.income, previousTotals.income),
      expense: percentChange(currentTotals.expense, previousTotals.expense),
      balance: percentChange(balance, previousBalance),
    },
    byCategory: repo.expensesByCategory(current.from, current.to, money),
    monthly,
    recent: repo.list({ to: current.to, sort: "date", order: "desc", limit: recent }),
  };
}
