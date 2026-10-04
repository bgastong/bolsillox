import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";
import { createApp } from "./app.js";
import { openDatabase } from "./db.js";
import { buildSeed } from "./seed.js";
import { currentMonthKey, monthRange } from "./summary.js";

let server;
let baseUrl;
let db;

before(async () => {
  db = openDatabase({ filename: ":memory:" });
  const app = createApp(db);
  await new Promise((resolve) => {
    server = app.listen(0, resolve);
  });
  baseUrl = `http://127.0.0.1:${server.address().port}/api`;
});

after(() => {
  server.closeAllConnections();
  server.close();
  db.close();
});

function request(path, { method = "GET", body } = {}) {
  return fetch(`${baseUrl}${path}`, {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
}

const validExpense = {
  type: "expense",
  title: "  Cafe  ",
  amount: "1500.555",
  date: "2026-02-10",
  category: "food",
  paymentMethod: "cash",
};

describe("health y seed", () => {
  test("GET /health", async () => {
    const res = await request("/health");
    assert.equal(res.status, 200);
    assert.deepEqual(await res.json(), { status: "ok" });
  });

  test("la base arranca con los datos de ejemplo", async () => {
    const res = await request("/movements");
    const rows = await res.json();
    assert.equal(rows.length, buildSeed().length);
    // Orden por defecto: fecha descendente
    const dates = rows.map((row) => row.date);
    assert.deepEqual(dates, [...dates].sort().reverse());
  });
});

describe("CRUD de movimientos", () => {
  let createdId;

  test("POST crea y normaliza", async () => {
    const res = await request("/movements", { method: "POST", body: validExpense });
    assert.equal(res.status, 201);
    const movement = await res.json();
    createdId = movement.id;
    assert.equal(movement.title, "Cafe");
    assert.equal(movement.amount, 1500.56);
    assert.equal(movement.paymentMethod, "cash");
    assert.equal(movement.note, "");
  });

  test("GET /:id devuelve el movimiento", async () => {
    const res = await request(`/movements/${createdId}`);
    assert.equal(res.status, 200);
    assert.equal((await res.json()).id, createdId);
  });

  test("PUT actualiza", async () => {
    const res = await request(`/movements/${createdId}`, {
      method: "PUT",
      body: { ...validExpense, title: "Cafe con leche", amount: 2000 },
    });
    assert.equal(res.status, 200);
    const movement = await res.json();
    assert.equal(movement.title, "Cafe con leche");
    assert.equal(movement.amount, 2000);
  });

  test("DELETE borra y luego da 404", async () => {
    const res = await request(`/movements/${createdId}`, { method: "DELETE" });
    assert.equal(res.status, 204);
    const again = await request(`/movements/${createdId}`, { method: "DELETE" });
    assert.equal(again.status, 404);
    const get = await request(`/movements/${createdId}`);
    assert.equal(get.status, 404);
  });

  test("PUT sobre un id inexistente da 404", async () => {
    const res = await request("/movements/999999", { method: "PUT", body: validExpense });
    assert.equal(res.status, 404);
  });

  test("id invalido da 400", async () => {
    const res = await request("/movements/abc");
    assert.equal(res.status, 400);
  });
});

describe("validaciones", () => {
  async function expectFieldError(body, field, message) {
    const res = await request("/movements", { method: "POST", body });
    assert.equal(res.status, 400);
    const json = await res.json();
    assert.equal(json.error, "validation_error");
    assert.equal(json.fields[field], message);
  }

  test("titulo requerido", () =>
    expectFieldError({ ...validExpense, title: "   " }, "title", "errorTitleRequired"));

  test("monto mayor a cero", () =>
    expectFieldError({ ...validExpense, amount: 0 }, "amount", "errorAmountPositive"));

  test("monto negativo", () =>
    expectFieldError({ ...validExpense, amount: -5 }, "amount", "errorAmountPositive"));

  test("monto no numerico", () =>
    expectFieldError({ ...validExpense, amount: "abc" }, "amount", "errorAmountInvalid"));

  test("fecha invalida", () =>
    expectFieldError({ ...validExpense, date: "2026-02-30" }, "date", "errorDateInvalid"));

  test("categoria que no corresponde al tipo", () =>
    expectFieldError({ ...validExpense, category: "salary" }, "category", "errorCategoryInvalid"));

  test("metodo de pago fuera de la lista", () =>
    expectFieldError({ ...validExpense, paymentMethod: "bitcoin" }, "paymentMethod", "errorMethodInvalid"));

  test("tipo invalido", () =>
    expectFieldError({ ...validExpense, type: "loan" }, "type", "errorTypeInvalid"));

  test("JSON mal formado", async () => {
    const res = await fetch(`${baseUrl}/movements`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{bad",
    });
    assert.equal(res.status, 400);
    assert.equal((await res.json()).error, "invalid_json");
  });
});

describe("filtros", () => {
  test("por tipo", async () => {
    const rows = await (await request("/movements?type=income")).json();
    assert.ok(rows.length > 0);
    assert.ok(rows.every((row) => row.type === "income"));
  });

  test("por categoria y metodo", async () => {
    const rows = await (await request("/movements?category=housing&paymentMethod=transfer")).json();
    assert.ok(rows.length > 0);
    assert.ok(rows.every((row) => row.category === "housing" && row.paymentMethod === "transfer"));
  });

  test("busqueda por texto (case insensitive)", async () => {
    const rows = await (await request("/movements?q=super")).json();
    assert.ok(rows.length > 0);
    assert.ok(rows.every((row) => row.title.toLowerCase().includes("super")));
  });

  test("rango de fechas", async () => {
    const { from, to } = monthRange(currentMonthKey());
    const rows = await (await request(`/movements?from=${from}&to=${to}`)).json();
    assert.ok(rows.every((row) => row.date >= from && row.date <= to));
  });

  test("rango invertido da 400", async () => {
    const res = await request("/movements?from=2026-05-01&to=2026-04-01");
    assert.equal(res.status, 400);
  });

  test("orden por monto ascendente", async () => {
    const rows = await (await request("/movements?sort=amount&order=asc")).json();
    const amounts = rows.map((row) => row.amount);
    assert.deepEqual(amounts, [...amounts].sort((a, b) => a - b));
  });

  test("parametros vacios se ignoran", async () => {
    const res = await request("/movements?type=&category=");
    assert.equal(res.status, 200);
  });
});

describe("resumen", () => {
  test("calcula totales del mes y saldo", async () => {
    const month = currentMonthKey();
    const summary = await (await request(`/summary?month=${month}`)).json();
    const { from, to } = monthRange(month);
    const rows = await (await request(`/movements?from=${from}&to=${to}`)).json();

    const income = rows.filter((r) => r.type === "income").reduce((s, r) => s + r.amount, 0);
    const expense = rows.filter((r) => r.type === "expense").reduce((s, r) => s + r.amount, 0);

    assert.equal(summary.month, month);
    assert.equal(summary.income, income);
    assert.equal(summary.expense, expense);
    assert.equal(summary.net, income - expense);
    assert.equal(summary.monthly.length, 6);
    assert.equal(summary.monthly.at(-1).month, month);
    assert.ok(summary.recent.length <= 5);
    assert.equal(
      summary.byCategory.reduce((s, c) => s + c.total, 0),
      expense,
    );
    assert.equal(typeof summary.variation.expense, "number");
  });

  test("mes invalido da 400", async () => {
    const res = await request("/summary?month=2026-13");
    assert.equal(res.status, 400);
  });

  test("ruta desconocida da 404", async () => {
    const res = await request("/nope");
    assert.equal(res.status, 404);
  });
});
