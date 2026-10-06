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
// Las consultas van en paralelo (con una base remota, cada una tarda).
export async function buildSummary(
  repo,
  userId,
  monthKey,
  { months = 6, recent = 7, target = "ARS", rate = null } = {},
) {
  const money = { target, rate };
  const current = monthRange(monthKey);
  const previous = monthRange(monthKey, -1);
  const ranges = [];
  for (let offset = months - 1; offset >= 0; offset--) ranges.push(monthRange(monthKey, -offset));

  const [
    currentTotals,
    previousTotals,
    allTime,
    previousAllTime,
    currentByCategory,
    previousByCategory,
    recentRows,
    ...series
  ] = await Promise.all([
    repo.totalsBetween(userId, current.from, current.to, money),
    repo.totalsBetween(userId, previous.from, previous.to, money),
    repo.totalsBetween(userId, null, current.to, money),
    repo.totalsBetween(userId, null, previous.to, money),
    repo.expensesByCategory(userId, current.from, current.to, money),
    repo.expensesByCategory(userId, previous.from, previous.to, money),
    repo.list(userId, { to: current.to, sort: "date", order: "desc", limit: recent }),
    ...ranges.map((range) => repo.totalsBetween(userId, range.from, range.to, money)),
  ]);

  const round = (value) => Math.round(value * 100) / 100;
  const balance = round(allTime.income - allTime.expense);
  const previousBalance = round(previousAllTime.income - previousAllTime.expense);
  const net = round(currentTotals.income - currentTotals.expense);

  // Gasto de cada categoria este mes y el anterior (para mostrar la variacion).
  const previousByKey = new Map(previousByCategory.map((item) => [item.category, item.total]));
  const byCategory = currentByCategory.map((item) => ({
    ...item,
    previous: previousByKey.get(item.category) ?? 0,
    variation: percentChange(item.total, previousByKey.get(item.category) ?? 0),
  }));

  const monthly = ranges.map((range, index) => ({
    month: range.key,
    income: series[index].income,
    expense: series[index].expense,
  }));

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
    byCategory,
    monthly,
    recent: recentRows,
  };
}
