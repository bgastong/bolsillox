import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";
import { MONTH, startTestServer } from "./testHelpers.js";

let api;
let cookie;
let otherCookie;

before(async () => {
  api = await startTestServer();
  ({ cookie } = await api.signup());
  ({ cookie: otherCookie } = await api.signup());
});

after(() => api.stop());

const request = (path, options = {}) => api.request(path, { cookie, ...options });
const json = async (path, options) => (await request(path, options)).json();

const movement = {
  type: "expense",
  title: "Alimento balanceado",
  amount: 15000,
  currency: "ARS",
  date: "2026-10-05",
  paymentMethod: "debit",
  note: "",
};

const createCategory = (body, options = {}) =>
  request("/categories", { method: "POST", body: { type: "expense", icon: "dog", color: "#fbbf24", ...body }, ...options });

describe("categorias propias", () => {
  test("se crean, se listan con su clave y se usan en movimientos", async () => {
    const res = await createCategory({ name: "  Mascota " });
    assert.equal(res.status, 201);
    const category = await res.json();
    assert.equal(category.name, "Mascota");
    assert.equal(category.key, `custom_${category.id}`);

    const created = await request("/movements", { method: "POST", body: { ...movement, category: category.key } });
    assert.equal(created.status, 201);

    const list = await json("/categories");
    assert.deepEqual(list.map((item) => item.key), [category.key]);

    const filtered = await json(`/movements?category=${category.key}`);
    assert.equal(filtered.length, 1);
  });

  test("valida nombre, icono, color y nombres repetidos", async () => {
    const empty = await createCategory({ name: " " });
    assert.equal(empty.status, 400);
    assert.equal((await empty.json()).fields.name, "errorCategoryNameRequired");

    const badIcon = await createCategory({ name: "Auto", icon: "<script>" });
    assert.equal((await badIcon.json()).fields.icon, "errorCategoryIconInvalid");

    const badColor = await createCategory({ name: "Auto", color: "red" });
    assert.equal((await badColor.json()).fields.color, "errorCategoryColorInvalid");

    const repeated = await createCategory({ name: "MASCOTA" });
    assert.equal(repeated.status, 409);
    assert.equal((await repeated.json()).fields.name, "errorCategoryNameTaken");

    // El mismo nombre en ingresos si se puede.
    const income = await createCategory({ type: "income", name: "Mascota" });
    assert.equal(income.status, 201);
  });

  test("no se puede usar una categoria de otro tipo ni de otra persona", async () => {
    const [mine] = await json("/categories");
    const wrongType = await request("/movements", {
      method: "POST",
      body: { ...movement, type: "income", category: mine.key },
    });
    assert.equal(wrongType.status, 400);
    assert.equal((await wrongType.json()).fields.category, "errorCategoryInvalid");

    const foreign = await api.request("/movements", {
      method: "POST",
      cookie: otherCookie,
      body: { ...movement, category: mine.key },
    });
    assert.equal(foreign.status, 400);

    const inexistent = await request("/movements", { method: "POST", body: { ...movement, category: "custom_99999" } });
    assert.equal(inexistent.status, 400);

    // Tampoco se ve ni se edita desde otra cuenta.
    assert.deepEqual(await (await api.request("/categories", { cookie: otherCookie })).json(), []);
    const edit = await api.request(`/categories/${mine.id}`, {
      method: "PUT",
      cookie: otherCookie,
      body: { name: "Hackeada", icon: "tag", color: "#94a3b8" },
    });
    assert.equal(edit.status, 404);
  });

  test("se editan nombre, icono y color, pero no el tipo", async () => {
    const [mine] = await json("/categories");
    const res = await request(`/categories/${mine.id}`, {
      method: "PUT",
      body: { type: "income", name: "Perro", icon: "heart", color: "#f472b6" },
    });
    assert.equal(res.status, 200);
    const updated = await res.json();
    assert.deepEqual(
      [updated.type, updated.name, updated.icon, updated.color],
      ["expense", "Perro", "heart", "#f472b6"],
    );
  });

  test("acepta presupuestos y reglas recurrentes con categorias propias", async () => {
    const [mine] = await json("/categories");
    const budget = await request(`/budgets/${mine.key}`, { method: "PUT", body: { amount: 50000 } });
    assert.equal(budget.status, 200);
    const budgets = await json(`/budgets?month=${MONTH}`);
    const item = budgets.items.find((entry) => entry.category === mine.key);
    assert.equal(item.spent, 15000);

    const rule = await request("/recurring", {
      method: "POST",
      body: { ...movement, title: "Veterinaria", category: mine.key, startDate: "2026-11-01" },
    });
    assert.equal(rule.status, 201);
  });

  test("al borrarla, lo que la usaba pasa a Otros y se borra su presupuesto", async () => {
    const [mine] = await json("/categories");
    const res = await request(`/categories/${mine.id}`, { method: "DELETE" });
    assert.equal(res.status, 200);
    assert.deepEqual(await res.json(), { moved: 1, fallback: "other" });

    const movements = await json("/movements?q=Alimento");
    assert.equal(movements[0].category, "other");
    const rules = await json("/recurring");
    assert.equal(rules.find((rule) => rule.title === "Veterinaria").category, "other");
    const budgets = await json(`/budgets?month=${MONTH}`);
    assert.equal(budgets.items.some((entry) => entry.category === mine.key), false);

    assert.equal((await request(`/categories/${mine.id}`, { method: "DELETE" })).status, 404);
  });
});
