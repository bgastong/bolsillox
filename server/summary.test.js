import assert from "node:assert/strict";
import { test } from "node:test";
import { buildSummary, HISTORY_MAX_MOVEMENTS } from "./summary.js";

// Repositorio de mentira: solo lo que buildSummary necesita.
function fakeRepo({ before = 0, movements = [] }) {
  const zero = { income: 0, expense: 0, count: 0, unconverted: 0 };
  return {
    totalsBetween: async (userId, from) => (from === null ? { ...zero, income: before } : zero),
    expensesByCategory: async () => [],
    list: async () => [],
    netByDay: async () => [],
    flowBetween: async () => movements,
  };
}

test("con muchos movimientos el flujo de caja muestra los ultimos y arranca en el saldo de ese momento", async () => {
  // 200 ingresos de $10 a partir de un saldo de $1000.
  const movements = Array.from({ length: 200 }, (_, index) => ({
    id: index + 1,
    date: "2026-10-01",
    type: "income",
    title: `Ingreso ${index + 1}`,
    change: 10,
  }));
  const summary = await buildSummary(fakeRepo({ before: 1000, movements }), 1, "2026-10", { today: "2026-10-15" });
  const { start, movements: shown } = summary.history;
  assert.equal(shown.length, HISTORY_MAX_MOVEMENTS);
  assert.equal(shown[0].id, 200 - HISTORY_MAX_MOVEMENTS + 1);
  // Antes del primero que se muestra ya habian entrado 20 ingresos de $10.
  assert.equal(start, 1000 + (200 - HISTORY_MAX_MOVEMENTS) * 10);
  assert.equal(shown.at(-1).balance, 1000 + 200 * 10);
});

test("sin movimientos el flujo de caja queda vacio con el saldo de antes", async () => {
  const summary = await buildSummary(fakeRepo({ before: 500 }), 1, "2026-10", { today: "2026-10-15" });
  assert.deepEqual(summary.history, { start: 500, movements: [] });
});
