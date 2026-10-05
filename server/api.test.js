import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { after, before, describe, test } from "node:test";
import { DatabaseSync } from "node:sqlite";
import { createApp } from "./app.js";
import { openDatabase } from "./db.js";
import { buildSeed } from "./seed.js";
import { monthRange } from "./summary.js";
import { occurrenceDate } from "./recurring.js";

// Reloj fijo: 15 de octubre de 2026 al mediodia.
const NOW = new Date(2026, 9, 15, 12);
const MONTH = "2026-10";

// Cotizaciones simuladas con el formato de dolarapi.com.
const FAKE_RATES = [
  { casa: "oficial", compra: 950, venta: 1000, fechaActualizacion: "2026-10-15T10:00:00Z" },
  { casa: "blue", compra: 1180, venta: 1200, fechaActualizacion: "2026-10-15T10:00:00Z" },
  { casa: "bolsa", compra: 1140, venta: 1150, fechaActualizacion: "2026-10-15T10:00:00Z" },
  { casa: "tarjeta", compra: 1500, venta: 1600, fechaActualizacion: "2026-10-15T10:00:00Z" },
];

let fetchCalls = 0;
let fetchShouldFail = false;
async function fakeFetch() {
  fetchCalls++;
  if (fetchShouldFail) throw new Error("sin red");
  return { ok: true, status: 200, json: async () => FAKE_RATES };
}

function startServer(db, options) {
  const app = createApp(db, { now: () => NOW, fetchImpl: fakeFetch, ...options });
  return new Promise((resolve) => {
    const server = app.listen(0, () => {
      resolve({ server, url: `http://127.0.0.1:${server.address().port}/api` });
    });
  });
}

function stopServer(server) {
  server.closeAllConnections();
  server.close();
}

let server;
let baseUrl;
let db;

before(async () => {
  db = openDatabase({ filename: ":memory:", today: NOW });
  ({ server, url: baseUrl } = await startServer(db));
});

after(() => {
  stopServer(server);
  db.close();
});

function request(path, { method = "GET", body } = {}) {
  return fetch(`${baseUrl}${path}`, {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
}

const json = async (path, options) => (await request(path, options)).json();

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
    const rows = await json("/movements");
    assert.equal(rows.length, buildSeed(NOW).movements.length);
    // Orden por defecto: fecha descendente
    const dates = rows.map((row) => row.date);
    assert.deepEqual(dates, [...dates].sort().reverse());
    // Incluye un movimiento en dolares y movimientos generados por recurrentes
    assert.ok(rows.some((row) => row.currency === "USD"));
    assert.ok(rows.some((row) => row.recurringId !== null));
  });
});

describe("CRUD de movimientos", () => {
  let createdId;

  test("POST crea y normaliza (moneda ARS por defecto)", async () => {
    const res = await request("/movements", { method: "POST", body: validExpense });
    assert.equal(res.status, 201);
    const movement = await res.json();
    createdId = movement.id;
    assert.equal(movement.title, "Cafe");
    assert.equal(movement.amount, 1500.56);
    assert.equal(movement.currency, "ARS");
    assert.equal(movement.paymentMethod, "cash");
    assert.equal(movement.note, "");
    assert.equal(movement.recurringId, null);
  });

  test("GET /:id devuelve el movimiento", async () => {
    const res = await request(`/movements/${createdId}`);
    assert.equal(res.status, 200);
    assert.equal((await res.json()).id, createdId);
  });

  test("PUT actualiza (incluida la moneda)", async () => {
    const res = await request(`/movements/${createdId}`, {
      method: "PUT",
      body: { ...validExpense, title: "Cafe con leche", amount: 20, currency: "USD" },
    });
    assert.equal(res.status, 200);
    const movement = await res.json();
    assert.equal(movement.title, "Cafe con leche");
    assert.equal(movement.amount, 20);
    assert.equal(movement.currency, "USD");
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
  async function expectFieldError(path, body, field, message) {
    const res = await request(path, { method: "POST", body });
    assert.equal(res.status, 400);
    const data = await res.json();
    assert.equal(data.error, "validation_error");
    assert.equal(data.fields[field], message);
  }

  const expectMovementError = (body, field, message) =>
    expectFieldError("/movements", body, field, message);

  test("titulo requerido", () =>
    expectMovementError({ ...validExpense, title: "   " }, "title", "errorTitleRequired"));

  test("monto mayor a cero", () =>
    expectMovementError({ ...validExpense, amount: 0 }, "amount", "errorAmountPositive"));

  test("monto negativo", () =>
    expectMovementError({ ...validExpense, amount: -5 }, "amount", "errorAmountPositive"));

  test("monto no numerico", () =>
    expectMovementError({ ...validExpense, amount: "abc" }, "amount", "errorAmountInvalid"));

  test("fecha invalida", () =>
    expectMovementError({ ...validExpense, date: "2026-02-30" }, "date", "errorDateInvalid"));

  test("categoria que no corresponde al tipo", () =>
    expectMovementError({ ...validExpense, category: "salary" }, "category", "errorCategoryInvalid"));

  test("metodo de pago fuera de la lista", () =>
    expectMovementError({ ...validExpense, paymentMethod: "bitcoin" }, "paymentMethod", "errorMethodInvalid"));

  test("tipo invalido", () =>
    expectMovementError({ ...validExpense, type: "loan" }, "type", "errorTypeInvalid"));

  test("moneda invalida", () =>
    expectMovementError({ ...validExpense, currency: "EUR" }, "currency", "errorCurrencyInvalid"));

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
    const rows = await json("/movements?type=income");
    assert.ok(rows.length > 0);
    assert.ok(rows.every((row) => row.type === "income"));
  });

  test("por categoria y metodo", async () => {
    const rows = await json("/movements?category=housing&paymentMethod=transfer");
    assert.ok(rows.length > 0);
    assert.ok(rows.every((row) => row.category === "housing" && row.paymentMethod === "transfer"));
  });

  test("por moneda", async () => {
    const rows = await json("/movements?currency=USD");
    assert.ok(rows.length > 0);
    assert.ok(rows.every((row) => row.currency === "USD"));
  });

  test("busqueda por texto (case insensitive)", async () => {
    const rows = await json("/movements?q=super");
    assert.ok(rows.length > 0);
    assert.ok(rows.every((row) => row.title.toLowerCase().includes("super")));
  });

  test("rango de fechas", async () => {
    const { from, to } = monthRange(MONTH);
    const rows = await json(`/movements?from=${from}&to=${to}`);
    assert.ok(rows.every((row) => row.date >= from && row.date <= to));
  });

  test("rango invertido da 400", async () => {
    const res = await request("/movements?from=2026-05-01&to=2026-04-01");
    assert.equal(res.status, 400);
  });

  test("orden por monto ascendente", async () => {
    const rows = await json("/movements?sort=amount&order=asc");
    const amounts = rows.map((row) => row.amount);
    assert.deepEqual(amounts, [...amounts].sort((a, b) => a - b));
  });

  test("parametros vacios se ignoran", async () => {
    const res = await request("/movements?type=&category=");
    assert.equal(res.status, 200);
  });
});

describe("cotizaciones", () => {
  test("GET /rates trae oficial, blue y MEP (ignora otras)", async () => {
    const status = await json("/rates");
    assert.deepEqual(Object.keys(status.rates).sort(), ["blue", "mep", "oficial"]);
    assert.equal(status.rates.blue.sell, 1200);
    assert.equal(status.rates.mep.sell, 1150);
    assert.equal(status.source, "blue");
    assert.equal(status.rate, 1200);
    assert.equal(status.stale, false);
  });

  test("usa la cache y no vuelve a consultar la API", async () => {
    const before = fetchCalls;
    await json("/rates");
    await json("/rates");
    assert.equal(fetchCalls, before);
  });

  test("cambiar la fuente cambia la cotizacion activa", async () => {
    const status = await json("/rates/settings", { method: "PUT", body: { source: "oficial" } });
    assert.equal(status.rate, 1000);
  });

  test("cotizacion manual", async () => {
    const status = await json("/rates/settings", {
      method: "PUT",
      body: { source: "manual", manualRate: 1300 },
    });
    assert.equal(status.rate, 1300);
    assert.equal(status.manualRate, 1300);
  });

  test("manual sin valor da 400", async () => {
    const res = await request("/rates/settings", { method: "PUT", body: { source: "manual" } });
    assert.equal(res.status, 400);
    assert.equal((await res.json()).fields.manualRate, "errorManualRateRequired");
  });

  test("fuente invalida da 400", async () => {
    const res = await request("/rates/settings", { method: "PUT", body: { source: "euro" } });
    assert.equal(res.status, 400);
  });

  test("vuelve a blue para el resto de los tests", async () => {
    const status = await json("/rates/settings", { method: "PUT", body: { source: "blue" } });
    assert.equal(status.rate, 1200);
    assert.equal(status.manualRate, null);
  });
});

describe("resumen y conversion de moneda", () => {
  async function monthRows() {
    const { from, to } = monthRange(MONTH);
    return json(`/movements?from=${from}&to=${to}`);
  }

  function sumIn(rows, type, toCurrency, rate) {
    return rows
      .filter((row) => row.type === type)
      .reduce((sum, row) => {
        if (row.currency === toCurrency) return sum + row.amount;
        return sum + (row.currency === "USD" ? row.amount * rate : row.amount / rate);
      }, 0);
  }

  test("totales del mes en ARS convierten los USD con la cotizacion activa", async () => {
    const summary = await json(`/summary?month=${MONTH}`);
    const rows = await monthRows();
    const income = sumIn(rows, "income", "ARS", 1200);
    const expense = sumIn(rows, "expense", "ARS", 1200);

    assert.equal(summary.month, MONTH);
    assert.equal(summary.currency, "ARS");
    assert.equal(summary.rate, 1200);
    assert.equal(summary.unconverted, 0);
    assert.equal(summary.income, Math.round(income * 100) / 100);
    assert.equal(summary.expense, Math.round(expense * 100) / 100);
    assert.equal(summary.monthly.length, 6);
    assert.equal(summary.monthly.at(-1).month, MONTH);
    assert.ok(summary.recent.length <= 5);
    assert.equal(
      Math.round(summary.byCategory.reduce((s, c) => s + c.total, 0) * 100) / 100,
      summary.expense,
    );
    assert.equal(typeof summary.variation.expense, "number");
  });

  test("el mismo resumen en USD", async () => {
    const summary = await json(`/summary?month=${MONTH}&currency=USD`);
    const rows = await monthRows();
    assert.equal(summary.currency, "USD");
    const expected = Math.round(sumIn(rows, "income", "USD", 1200) * 100) / 100;
    assert.ok(Math.abs(summary.income - expected) < 0.02);
  });

  test("moneda invalida da 400", async () => {
    const res = await request(`/summary?month=${MONTH}&currency=EUR`);
    assert.equal(res.status, 400);
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

describe("sin cotizacion disponible", () => {
  test("los montos en otra moneda se informan como no convertidos", async () => {
    const isolated = openDatabase({ filename: ":memory:", today: NOW });
    fetchShouldFail = true;
    const { server: s, url } = await startServer(isolated);
    try {
      const status = await (await fetch(`${url}/rates`)).json();
      assert.equal(status.rate, null);
      assert.equal(status.error, "sin red");

      const summary = await (await fetch(`${url}/summary?month=${MONTH}`)).json();
      assert.equal(summary.rate, null);
      assert.ok(summary.unconverted > 0);
    } finally {
      fetchShouldFail = false;
      stopServer(s);
      isolated.close();
    }
  });
});

describe("recurrentes", () => {
  const rule = {
    type: "expense",
    title: "Gimnasio",
    amount: 25000,
    category: "health",
    paymentMethod: "debit",
    startDate: "2026-08-10",
  };
  let ruleId;

  test("crear una regla genera los meses que ya pasaron", async () => {
    const res = await request("/recurring", { method: "POST", body: rule });
    assert.equal(res.status, 201);
    const created = await res.json();
    ruleId = created.id;
    assert.equal(created.dayOfMonth, 10);
    assert.equal(created.active, true);
    assert.equal(created.lastGeneratedMonth, "2026-10");
    assert.equal(created.nextDate, "2026-11-10");

    const rows = (await json("/movements?q=Gimnasio")).filter((r) => r.recurringId === ruleId);
    assert.deepEqual(rows.map((r) => r.date).sort(), ["2026-08-10", "2026-09-10", "2026-10-10"]);
  });

  test("es idempotente: leer otra vez no duplica", async () => {
    await json("/summary");
    await json("/movements");
    const rows = (await json("/movements?q=Gimnasio")).filter((r) => r.recurringId === ruleId);
    assert.equal(rows.length, 3);
  });

  test("un movimiento generado y borrado no se vuelve a crear", async () => {
    const [first] = (await json("/movements?q=Gimnasio")).filter((r) => r.recurringId === ruleId);
    await request(`/movements/${first.id}`, { method: "DELETE" });
    await json("/movements");
    const rows = (await json("/movements?q=Gimnasio")).filter((r) => r.recurringId === ruleId);
    assert.equal(rows.length, 2);
  });

  test("no genera fechas futuras", async () => {
    const res = await request("/recurring", {
      method: "POST",
      body: { ...rule, title: "Seguro", startDate: "2026-10-28" },
    });
    const created = await res.json();
    assert.equal(created.lastGeneratedMonth, null);
    assert.equal(created.nextDate, "2026-10-28");
    const rows = await json("/movements?q=Seguro");
    assert.equal(rows.length, 0);
  });

  test("dia 31 en meses cortos usa el ultimo dia", () => {
    assert.equal(occurrenceDate("2026-02", 31), "2026-02-28");
    assert.equal(occurrenceDate("2028-02", 31), "2028-02-29");
    assert.equal(occurrenceDate("2026-04", 31), "2026-04-30");
  });

  test("pausar una regla deja de generar", async () => {
    const res = await request(`/recurring/${ruleId}`, {
      method: "PUT",
      body: { ...rule, active: false },
    });
    const updated = await res.json();
    assert.equal(updated.active, false);
    assert.equal(updated.nextDate, null);
  });

  test("fecha de fin anterior al inicio da 400", async () => {
    const res = await request("/recurring", {
      method: "POST",
      body: { ...rule, endDate: "2026-01-01" },
    });
    assert.equal(res.status, 400);
    assert.equal((await res.json()).fields.endDate, "errorEndBeforeStart");
  });

  test("borrar la regla conserva los movimientos generados", async () => {
    const res = await request(`/recurring/${ruleId}`, { method: "DELETE" });
    assert.equal(res.status, 204);
    const rows = await json("/movements?q=Gimnasio");
    assert.equal(rows.length, 2);
    assert.ok(rows.every((r) => r.recurringId === null));
    assert.equal((await request(`/recurring/${ruleId}`)).status, 404);
  });

  test("las reglas de ejemplo existen", async () => {
    const rules = await json("/recurring");
    assert.ok(rules.some((r) => r.title === "Sueldo"));
  });
});

describe("presupuestos", () => {
  test("lista con gastado, porcentaje y estado", async () => {
    const data = await json(`/budgets?month=${MONTH}`);
    assert.equal(data.currency, "ARS");
    assert.ok(data.items.length > 0);
    for (const item of data.items) {
      assert.equal(item.percent, Math.round((item.spent / item.amount) * 1000) / 10);
      const expected = item.percent > 100 ? "over" : item.percent >= 80 ? "warning" : "ok";
      assert.equal(item.status, expected);
    }
    // Ordenados por porcentaje descendente
    const percents = data.items.map((item) => item.percent);
    assert.deepEqual(percents, [...percents].sort((a, b) => b - a));
  });

  test("crear, superar y borrar un presupuesto", async () => {
    const res = await request("/budgets/education", { method: "PUT", body: { amount: 1000 } });
    assert.equal(res.status, 200);
    await request("/movements", {
      method: "POST",
      body: { ...validExpense, title: "Libro", amount: 1500, date: "2026-10-05", category: "education" },
    });
    const item = (await json(`/budgets?month=${MONTH}`)).items.find((b) => b.category === "education");
    assert.equal(item.spent, 1500);
    assert.equal(item.status, "over");
    assert.equal(item.remaining, -500);

    assert.equal((await request("/budgets/education", { method: "DELETE" })).status, 204);
    assert.equal((await request("/budgets/education", { method: "DELETE" })).status, 404);
  });

  test("los gastos en USD se suman convertidos a ARS", async () => {
    await request("/budgets/shopping", { method: "PUT", body: { amount: 100000 } });
    await request("/movements", {
      method: "POST",
      body: { ...validExpense, title: "Auriculares", amount: 50, currency: "USD", date: "2026-10-06", category: "shopping" },
    });
    const item = (await json(`/budgets?month=${MONTH}`)).items.find((b) => b.category === "shopping");
    assert.equal(item.spent, 50 * 1200);
    assert.equal(item.percent, 60);
  });

  test("categoria de ingreso o inexistente da 400", async () => {
    assert.equal((await request("/budgets/salary", { method: "PUT", body: { amount: 10 } })).status, 400);
    assert.equal((await request("/budgets/nope", { method: "PUT", body: { amount: 10 } })).status, 400);
  });

  test("monto invalido da 400", async () => {
    const res = await request("/budgets/food", { method: "PUT", body: { amount: 0 } });
    assert.equal(res.status, 400);
  });
});

describe("migraciones", () => {
  test("una base v1 existente se actualiza sin perder datos", () => {
    const legacy = new DatabaseSync(":memory:");
    legacy.exec(`
      CREATE TABLE movements (
        id INTEGER PRIMARY KEY AUTOINCREMENT, type TEXT NOT NULL, title TEXT NOT NULL,
        amount REAL NOT NULL, date TEXT NOT NULL, category TEXT NOT NULL,
        payment_method TEXT NOT NULL, note TEXT NOT NULL DEFAULT '',
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
      INSERT INTO movements (type, title, amount, date, category, payment_method)
      VALUES ('expense', 'Viejo', 100, '2026-01-01', 'food', 'cash');
    `);
    // Simula abrir esa misma base con el codigo nuevo.
    const file = path.join(os.tmpdir(), `bolsillox-migration-${process.pid}.db`);
    fs.rmSync(file, { force: true });
    legacy.exec(`VACUUM INTO '${file.replaceAll("'", "''")}'`);
    legacy.close();

    const migrated = openDatabase({ filename: file, seed: false });
    try {
      const row = migrated.prepare("SELECT title, currency, recurring_id FROM movements").get();
      assert.equal(row.title, "Viejo");
      assert.equal(row.currency, "ARS");
      assert.equal(row.recurring_id, null);
      assert.equal(migrated.prepare("PRAGMA user_version").get().user_version, 2);
    } finally {
      migrated.close();
      for (const suffix of ["", "-wal", "-shm"]) fs.rmSync(file + suffix, { force: true });
    }
  });
});
