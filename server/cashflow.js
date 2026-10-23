/*
Flujo de caja del Inicio: el saldo despues de cada movimiento en un rango de
fechas que elige la persona (7 dias, 1 mes, 3 meses, 6 meses, 1 año o todo).
Con muchos movimientos los puntos se agrupan (por dia, semana o mes) para que el
grafico se pueda leer: cada punto es el saldo al final de ese periodo.
*/

export const CASHFLOW_RANGES = ["7d", "1m", "3m", "6m", "1y", "all"];

// Mas puntos que estos y se agrupan (con 180 una linea con puntos ya se amontona).
export const CASHFLOW_MAX_POINTS = 120;

const RANGE_SPAN = { "7d": { days: 7 }, "1m": { months: 1 }, "3m": { months: 3 }, "6m": { months: 6 }, "1y": { months: 12 } };

function toUtc(iso) {
  return new Date(Date.UTC(Number(iso.slice(0, 4)), Number(iso.slice(5, 7)) - 1, Number(iso.slice(8, 10))));
}

function toIso(date) {
  return date.toISOString().slice(0, 10);
}

// Primer dia del rango que termina en `to` (incluido): 7 dias -> to - 6.
export function rangeFrom(range, to) {
  const span = RANGE_SPAN[range];
  if (!span) return null;
  const date = toUtc(to);
  if (span.days) date.setUTCDate(date.getUTCDate() - span.days + 1);
  else {
    const day = date.getUTCDate();
    date.setUTCDate(1);
    date.setUTCMonth(date.getUTCMonth() - span.months);
    // El mismo dia del mes (o el ultimo, si ese mes es mas corto) y uno mas.
    const lastDay = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0)).getUTCDate();
    date.setUTCDate(Math.min(day, lastDay) + 1);
  }
  return toIso(date);
}

// Lunes de la semana de una fecha "YYYY-MM-DD".
function weekStart(iso) {
  const date = toUtc(iso);
  date.setUTCDate(date.getUTCDate() - ((date.getUTCDay() + 6) % 7));
  return toIso(date);
}

const BUCKETS = {
  day: (iso) => iso,
  week: weekStart,
  month: (iso) => `${iso.slice(0, 7)}-01`,
};

// Agrupa los movimientos en periodos: un punto por periodo con lo que cambio el saldo.
function groupBy(points, bucket) {
  const keyOf = BUCKETS[bucket];
  const groups = [];
  for (const point of points) {
    const key = keyOf(point.date);
    const last = groups.at(-1);
    if (last && last.date === key) {
      last.change += point.change;
      last.balance = point.balance;
      last.count += 1;
    } else {
      groups.push({ date: key, change: point.change, balance: point.balance, count: 1 });
    }
  }
  return groups.map((group) => ({ ...group, change: Math.round(group.change * 100) / 100 }));
}

/*
range: uno de CASHFLOW_RANGES; to: ultimo dia ("YYYY-MM-DD", hoy o el fin del
mes elegido). Devuelve { range, from, to, start, bucket, points }:
- start: el saldo antes del primer punto.
- bucket: "movement" (un punto por movimiento) o "day" | "week" | "month".
- points: [{ date, change, balance }] y, por movimiento, id, type y title; agrupados, count.
*/
export async function buildCashflow(repo, userId, { range, to, target = "ARS", rate = null }) {
  const money = { target, rate };
  const from = rangeFrom(range, to);
  const round = (value) => Math.round(value * 100) / 100;

  const [before, movements] = await Promise.all([
    from ? repo.totalsBetween(userId, null, toIso(new Date(toUtc(from).getTime() - 86_400_000)), money) : null,
    repo.flowBetween(userId, from ?? "0001-01-01", to, money),
  ]);

  const start = before ? round(before.income - before.expense) : 0;
  let balance = start;
  const points = movements.map((item) => {
    balance = round(balance + item.change);
    return { ...item, balance };
  });

  let bucket = "movement";
  let shown = points;
  for (const next of ["day", "week", "month"]) {
    if (shown.length <= CASHFLOW_MAX_POINTS) break;
    bucket = next;
    shown = groupBy(points, next);
  }

  return { range, from: from ?? points[0]?.date ?? to, to, start, bucket, points: shown };
}
