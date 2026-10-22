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

// "YYYY-MM-DD" del dia siguiente.
function nextDay(iso) {
  const [year, month, day] = iso.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day + 1)).toISOString().slice(0, 10);
}

// Variacion porcentual; null si no hay base para comparar.
export function percentChange(current, previous) {
  if (!previous) return null;
  return Math.round(((current - previous) / Math.abs(previous)) * 1000) / 10;
}

// Maximo de movimientos en el flujo de caja: con mas, las barras quedan demasiado finas.
export const HISTORY_MAX_MOVEMENTS = 180;

// money: { target: "ARS" | "USD", rate: pesos por dolar o null }
// Las consultas van en paralelo (con una base remota, cada una tarda).
export async function buildSummary(
  repo,
  userId,
  monthKey,
  { months = 6, recent = 7, target = "ARS", rate = null, today = null } = {},
) {
  const money = { target, rate };
  const current = monthRange(monthKey);
  const previous = monthRange(monthKey, -1);
  // El saldo y su evolucion llegan hasta hoy (o hasta fin de mes si el mes ya paso):
  // un movimiento con fecha futura se suma recien cuando llega su dia.
  const dailyTo = today && today < current.to ? today : current.to;
  const previousTo = today && today < previous.to ? today : previous.to;
  // Lo programado: movimientos despues de hoy y hasta fin del mes elegido.
  const scheduledFrom = dailyTo < current.to ? nextDay(dailyTo) : null;
  const ranges = [];
  for (let offset = months - 1; offset >= 0; offset--) ranges.push(monthRange(monthKey, -offset));
  // Historial del saldo (flujo de caja): desde el primer mes del grafico hasta hoy.
  const historyFrom = ranges[0].from;
  const beforeHistory = monthRange(monthKey, -months).to;

  const [
    currentTotals,
    previousTotals,
    allTime,
    previousAllTime,
    scheduledTotals,
    currentByCategory,
    previousByCategory,
    recentRows,
    latestRows,
    netByDay,
    historyStart,
    historyMovements,
    ...series
  ] = await Promise.all([
    repo.totalsBetween(userId, current.from, current.to, money),
    repo.totalsBetween(userId, previous.from, previous.to, money),
    repo.totalsBetween(userId, null, dailyTo, money),
    repo.totalsBetween(userId, null, previousTo, money),
    scheduledFrom ? repo.totalsBetween(userId, scheduledFrom, current.to, money) : null,
    repo.expensesByCategory(userId, current.from, current.to, money),
    repo.expensesByCategory(userId, previous.from, previous.to, money),
    repo.list(userId, { to: current.to, sort: "date", order: "desc", limit: recent }),
    // El movimiento mas reciente de toda la cuenta (sin importar el mes elegido).
    repo.list(userId, { sort: "date", order: "desc", limit: 1 }),
    dailyTo >= current.from ? repo.netByDay(userId, current.from, dailyTo, money) : [],
    repo.totalsBetween(userId, null, beforeHistory, money),
    dailyTo >= historyFrom ? repo.flowBetween(userId, historyFrom, dailyTo, money) : [],
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

  // Saldo al final de cada dia del mes, arrancando del saldo con que cerro el anterior.
  const netOn = new Map(netByDay.map((item) => [item.date, item.net]));
  const daily = [];
  let running = previousBalance;
  const lastDay = dailyTo >= current.from ? Number(dailyTo.slice(8, 10)) : 0;
  for (let day = 1; day <= lastDay; day++) {
    const date = `${current.key}-${pad(day)}`;
    running = round(running + (netOn.get(date) ?? 0));
    daily.push({ date, balance: running });
  }

  // Flujo de caja: el saldo despues de cada movimiento (sube con los ingresos y
  // baja con los gastos). start es el saldo antes del primero que se muestra.
  let historyBalance = round(historyStart.income - historyStart.expense);
  const allMovements = historyMovements.map((item) => {
    historyBalance = round(historyBalance + item.change);
    return { ...item, balance: historyBalance };
  });
  const shown = allMovements.slice(-HISTORY_MAX_MOVEMENTS);
  const history = {
    start: shown.length ? round(shown[0].balance - shown[0].change) : historyBalance,
    movements: shown,
  };

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
    // Fecha hasta la que cuenta el saldo (hoy, o el fin del mes si ya paso).
    balanceDate: dailyTo,
    // Movimientos con fecha futura en el mes: todavia no estan en el saldo.
    // projected = como quedaria el saldo a fin de mes con ellos.
    scheduled:
      scheduledTotals && scheduledTotals.count > 0
        ? {
            income: scheduledTotals.income,
            expense: scheduledTotals.expense,
            count: scheduledTotals.count,
            projected: round(balance + scheduledTotals.income - scheduledTotals.expense),
          }
        : null,
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
    daily,
    history,
    recent: recentRows,
    // Si la cuenta tiene algun movimiento y el ultimo mes con datos: sirven
    // para distinguir una cuenta nueva de un mes que quedo vacio.
    hasMovements: latestRows.length > 0,
    latestMonth: latestRows[0]?.date.slice(0, 7) ?? null,
  };
}
