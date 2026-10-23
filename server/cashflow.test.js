import assert from "node:assert/strict";
import { test } from "node:test";
import { buildCashflow, CASHFLOW_MAX_POINTS, rangeFrom } from "./cashflow.js";

// Repositorio de mentira: solo lo que buildCashflow necesita.
function fakeRepo({ before = 0, movements = [] }) {
  return {
    totalsBetween: async () => ({ income: before, expense: 0, count: 0, unconverted: 0 }),
    flowBetween: async (userId, from, to) => movements.filter((item) => item.date >= from && item.date <= to),
  };
}

test("cada rango arranca donde corresponde, contando el ultimo dia", () => {
  assert.equal(rangeFrom("7d", "2026-10-15"), "2026-10-09");
  assert.equal(rangeFrom("1m", "2026-10-15"), "2026-09-16");
  assert.equal(rangeFrom("1y", "2026-10-15"), "2025-10-16");
  // Fin de mes: marzo 31 menos un mes es fin de febrero.
  assert.equal(rangeFrom("1m", "2026-03-31"), "2026-03-01");
  assert.equal(rangeFrom("all", "2026-10-15"), null);
});

test("con pocos movimientos hay un punto por movimiento, desde el saldo de antes del rango", async () => {
  const movements = [
    { id: 1, date: "2026-10-01", type: "expense", title: "Viejo", change: -10 },
    { id: 2, date: "2026-10-10", type: "income", title: "Sueldo", change: 100 },
    { id: 3, date: "2026-10-12", type: "expense", title: "Super", change: -30 },
  ];
  const flow = await buildCashflow(fakeRepo({ before: 1000, movements }), 1, { range: "7d", to: "2026-10-15" });
  assert.equal(flow.bucket, "movement");
  assert.equal(flow.start, 1000);
  assert.deepEqual(flow.points.map((item) => [item.title, item.balance]), [["Sueldo", 1100], ["Super", 1070]]);
});

test("con muchos movimientos se agrupan por dia, y si siguen siendo muchos, por semana o mes", async () => {
  // 3 movimientos por dia durante 60 dias: 180 movimientos -> 60 dias.
  const movements = [];
  for (let day = 0; day < 60; day++) {
    const date = new Date(Date.UTC(2026, 7, 1 + day)).toISOString().slice(0, 10);
    for (let n = 0; n < 3; n++) movements.push({ id: movements.length + 1, date, type: "income", title: "x", change: 1 });
  }
  const byDay = await buildCashflow(fakeRepo({ movements }), 1, { range: "all", to: "2026-10-15" });
  assert.equal(byDay.bucket, "day");
  assert.equal(byDay.points.length, 60);
  assert.deepEqual(byDay.points[0], { date: "2026-08-01", change: 3, balance: 3, count: 3 });
  assert.equal(byDay.points.at(-1).balance, 180);

  // 1 por dia durante 400 dias: demasiados dias -> semanas.
  const many = Array.from({ length: 400 }, (_, day) => ({
    id: day + 1,
    date: new Date(Date.UTC(2025, 0, 1 + day)).toISOString().slice(0, 10),
    type: "expense",
    title: "x",
    change: -1,
  }));
  const byWeek = await buildCashflow(fakeRepo({ movements: many }), 1, { range: "all", to: "2026-10-15" });
  assert.equal(byWeek.bucket, "week");
  assert.ok(byWeek.points.length <= CASHFLOW_MAX_POINTS);
  assert.equal(byWeek.points.reduce((sum, item) => sum + item.count, 0), 400);
  assert.equal(byWeek.points.at(-1).balance, -400);
});
