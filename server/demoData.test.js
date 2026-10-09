import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";
import { LEGACY_DEMO_SQL } from "./db.js";
import { sql } from "./sql.js";
import { MONTH, startTestServer } from "./testHelpers.js";

let api;

before(async () => {
  api = await startTestServer();
});

after(() => api.stop());

async function account() {
  const { cookie, user } = await api.signup({ seed: true });
  const request = (path, options = {}) => api.request(path, { cookie, ...options });
  const json = async (path, options) => (await request(path, options)).json();
  return { request, json, userId: user.id };
}

const count = async (table, userId) =>
  (await api.db.one(sql([`SELECT COUNT(*) AS n FROM ${table} WHERE user_id = `, ""], userId))).n;

describe("borrar los datos de ejemplo", () => {
  test("borra solo los de ejemplo y deja lo que cargo la persona", async () => {
    const { request, json, userId } = await account();
    assert.equal((await json(`/summary?month=${MONTH}`)).hasDemoData, true);

    // Datos propios: un movimiento, un recurrente y un presupuesto de ejemplo modificado.
    await request("/movements", {
      method: "POST",
      body: { type: "expense", title: "Mío", amount: 100, currency: "ARS", date: `${MONTH}-05`, category: "food", paymentMethod: "cash", note: "" },
    });
    await request("/recurring", {
      method: "POST",
      body: { type: "expense", title: "Gimnasio", amount: 20000, currency: "ARS", category: "health", paymentMethod: "debit", note: "", startDate: `${MONTH}-01`, endDate: null, active: true },
    });
    await request("/budgets/food", { method: "PUT", body: { amount: 999 } });

    const res = await request("/demo-data", { method: "DELETE" });
    assert.equal(res.status, 200);
    const { deleted } = await res.json();
    assert.ok(deleted.movements > 20);
    assert.equal(deleted.recurring, 3);
    assert.equal(deleted.budgets, 3);

    const movements = await api.db.all(sql`SELECT title FROM movements WHERE user_id = ${userId}`);
    assert.deepEqual(movements.map((row) => row.title).sort(), ["Gimnasio", "Mío"]);
    assert.equal(await count("recurring", userId), 1);
    const budgets = await api.db.all(sql`SELECT category, amount FROM budgets WHERE user_id = ${userId}`);
    assert.deepEqual(budgets, [{ category: "food", amount: 999 }]);
    assert.equal((await json(`/summary?month=${MONTH}`)).hasDemoData, false);
  });

  test("sin datos de ejemplo no borra nada", async () => {
    const { cookie, user } = await api.signup();
    const res = await api.request("/demo-data", { method: "DELETE", cookie });
    assert.deepEqual((await res.json()).deleted, { movements: 0, recurring: 0, budgets: 0 });
    assert.equal(await count("movements", user.id), 0);
  });

  test("reconoce los datos de ejemplo cargados antes de la marca", async () => {
    const { request, json, userId } = await account();
    // Simula una cuenta vieja: los datos de ejemplo sin la marca, mas uno propio.
    await api.db.run(sql`UPDATE movements SET is_demo = FALSE WHERE user_id = ${userId}`);
    await api.db.run(sql`UPDATE recurring SET is_demo = FALSE WHERE user_id = ${userId}`);
    await api.db.run(sql`UPDATE budgets SET is_demo = FALSE WHERE user_id = ${userId}`);
    await request("/movements", {
      method: "POST",
      body: { type: "expense", title: "Supermercado", amount: 1234, currency: "ARS", date: `${MONTH}-05`, category: "food", paymentMethod: "cash", note: "" },
    });
    assert.equal((await json(`/summary?month=${MONTH}`)).hasDemoData, false);

    await api.db.exec(LEGACY_DEMO_SQL);
    assert.equal((await json(`/summary?month=${MONTH}`)).hasDemoData, true);
    await request("/demo-data", { method: "DELETE" });
    const left = await api.db.all(sql`SELECT title, amount FROM movements WHERE user_id = ${userId}`);
    assert.deepEqual(left, [{ title: "Supermercado", amount: 1234 }]);
    assert.equal(await count("budgets", userId), 0);
  });
});
