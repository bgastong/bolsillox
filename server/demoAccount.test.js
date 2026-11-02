import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";
import { sql } from "./sql.js";
import { NOW, sessionCookie, startTestServer } from "./testHelpers.js";

/*
Cuenta de prueba ("Probar sin registrarme"): entra sin email ni contraseña,
con datos de ejemplo, vence a las 12 horas y se puede pasar a una cuenta normal.
*/
const HOUR = 60 * 60 * 1000;
const account = { name: "Ana", email: "ana@prueba.com", password: "clave-segura-1", acceptTerms: true };

describe("cuenta de prueba sin envio de emails", () => {
  let api;
  let clock = NOW.getTime();
  before(async () => {
    api = await startTestServer({ now: () => new Date(clock), authLimits: { register: 1000, demo: 3 } });
  });
  after(() => api.stop());

  const post = (path, body, cookie) => api.request(path, { method: "POST", body, cookie });

  async function startDemo(language) {
    const res = await post("/auth/demo", { language });
    assert.equal(res.status, 201);
    return { cookie: sessionCookie(res), user: await res.json() };
  }

  test("entra con datos de ejemplo y vence a las 12 horas", async () => {
    const { cookie, user } = await startDemo("es");
    assert.ok(cookie);
    assert.equal(user.name, "Invitado");
    assert.match(user.email, /@demo\.invalid$/);
    assert.equal(new Date(user.demoExpiresAt).getTime(), clock + 12 * HOUR);
    const movements = await (await api.request("/movements", { cookie })).json();
    assert.ok(movements.length > 0);
  });

  test("en ingles se llama Guest", async () => {
    const { user } = await startDemo("en");
    assert.equal(user.name, "Guest");
  });

  test("con sesion iniciada no crea otra", async () => {
    const { cookie } = await startDemo();
    assert.equal((await post("/auth/demo", {}, cookie)).status, 409);
  });

  test("limita cuantas se crean por hora", async () => {
    // Ya se crearon 3 en los tests anteriores (el limite de este servidor es 3).
    const res = await post("/auth/demo", {});
    assert.equal(res.status, 429);
  });

  test("no puede cambiar email ni contraseña hasta convertirla", async () => {
    clock += 2 * HOUR; // pasa la hora del limite
    const { cookie } = await startDemo();
    const password = await post("/auth/change-password", { currentPassword: "x", newPassword: "clave-nueva-123" }, cookie);
    assert.equal(password.status, 403);
    assert.equal((await password.json()).error, "demo_account");
    const email = await post("/auth/change-email", { email: "otro@mail.com", password: "x" }, cookie);
    assert.equal(email.status, 403);
  });

  test("se convierte en cuenta normal y se queda con lo cargado", async () => {
    const { cookie } = await startDemo();
    const before = (await (await api.request("/movements", { cookie })).json()).length;
    const res = await post("/auth/demo/convert", account, cookie);
    assert.equal(res.status, 200);
    const user = await res.json();
    assert.equal(user.email, account.email);
    assert.equal(user.name, "Ana");
    assert.equal(user.demoExpiresAt, null);
    assert.equal(user.verificationRequired, false);
    assert.equal((await (await api.request("/movements", { cookie })).json()).length, before);
    // Y ya entra con email y contraseña.
    const login = await post("/auth/login", { email: account.email, password: account.password });
    assert.equal(login.status, 200);
  });

  test("no se convierte con un email que ya tiene cuenta", async () => {
    const { cookie } = await startDemo();
    const res = await post("/auth/demo/convert", account, cookie);
    assert.equal(res.status, 409);
  });

  test("una cuenta normal no usa la conversion", async () => {
    const { cookie } = await api.signup();
    const res = await post("/auth/demo/convert", { ...account, email: "otra@prueba.com" }, cookie);
    assert.equal(res.status, 400);
  });

  test("vencida no entra y la limpieza la borra con sus datos", async () => {
    clock += 2 * HOUR;
    const { cookie, user } = await startDemo();
    clock += 12 * HOUR + 1000;
    const session = await (await api.request("/auth/session", { cookie })).json();
    assert.equal(session.user, null);
    // La limpieza corre con el trafico de la API.
    await api.request("/health");
    const row = await api.db.one(sql`SELECT id FROM users WHERE id = ${user.id}`);
    assert.equal(row, null);
    const left = await api.db.one(sql`SELECT count(*)::int AS n FROM movements WHERE user_id = ${user.id}`);
    assert.equal(left.n, 0);
  });
});

describe("cuenta de prueba con envio de emails", () => {
  let api;
  const sent = [];
  const mailer = {
    enabled: true,
    async send(email) {
      sent.push(email);
    },
  };
  before(async () => {
    api = await startTestServer({ mailer, authLimits: { register: 1000, code: 1000, send: 1000 } });
  });
  after(() => api.stop());

  const post = (path, body, cookie) => api.request(path, { method: "POST", body, cookie });
  const lastCode = (to) => [...sent].reverse().find((item) => item.to === to)?.text.match(/\b\d{6}\b/)?.[0] ?? null;

  test("pide un codigo al email y al confirmarlo queda como cuenta normal", async () => {
    const start = await post("/auth/demo", {});
    const cookie = sessionCookie(start);
    const res = await post("/auth/demo/convert", account, cookie);
    assert.equal(res.status, 200);
    assert.deepEqual(await res.json(), { email: account.email, verificationRequired: true });
    // Hasta confirmar sigue siendo de prueba.
    const pending = await (await api.request("/auth/me", { cookie })).json();
    assert.ok(pending.demoExpiresAt);

    assert.equal((await post("/auth/demo/confirm", { code: "000000" }, cookie)).status, 400);
    const confirm = await post("/auth/demo/confirm", { code: lastCode(account.email) }, cookie);
    assert.equal(confirm.status, 200);
    const user = await confirm.json();
    assert.equal(user.email, account.email);
    assert.equal(user.demoExpiresAt, null);
    const login = await post("/auth/login", { email: account.email, password: account.password });
    assert.equal(login.status, 200);
  });

});
