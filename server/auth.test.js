import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";
import { hashPassword, verifyPassword } from "./auth.js";
import { sql } from "./sql.js";
import { NOW, sessionCookie, startTestServer } from "./testHelpers.js";

const GOOGLE = { clientId: "client-123", clientSecret: "secret-456" };

// Simula el endpoint de tokens de Google devolviendo un id_token con `claims`.
let googleClaims = null;
let lastTokenRequest = null;
async function fakeFetch(url, init) {
  if (String(url).startsWith("https://oauth2.googleapis.com/token")) {
    lastTokenRequest = Object.fromEntries(new URLSearchParams(String(init.body)));
    const payload = Buffer.from(JSON.stringify(googleClaims)).toString("base64url");
    return { ok: true, status: 200, json: async () => ({ id_token: `x.${payload}.y` }) };
  }
  return { ok: true, status: 200, json: async () => [] };
}

let api;

before(async () => {
  api = await startTestServer({ google: GOOGLE, fetchImpl: fakeFetch });
});

after(() => api.stop());

const register = (body) => api.request("/auth/register", { method: "POST", body });
const login = (body) => api.request("/auth/login", { method: "POST", body });

const expense = {
  type: "expense",
  title: "Cafe",
  amount: 1500,
  date: "2026-10-10",
  category: "food",
  paymentMethod: "cash",
};

describe("contraseñas", () => {
  test("se guardan con hash y sal distinta cada vez", async () => {
    const a = await hashPassword("secreto123");
    const b = await hashPassword("secreto123");
    assert.notEqual(a, b);
    assert.ok(!a.includes("secreto123"));
    assert.equal(await verifyPassword("secreto123", a), true);
    assert.equal(await verifyPassword("otra-cosa", a), false);
    assert.equal(await verifyPassword("secreto123", "basura"), false);
  });
});

describe("registro e inicio de sesion", () => {
  test("registrarse crea la cuenta e inicia sesion", async () => {
    const res = await register({ name: " Ana ", email: " Ana@Mail.com ", password: "12345678" });
    assert.equal(res.status, 201);
    const user = await res.json();
    assert.equal(user.name, "Ana");
    assert.equal(user.email, "ana@mail.com");
    assert.equal(user.hasPassword, true);
    assert.equal("password_hash" in user || "passwordHash" in user, false);

    const setCookie = res.headers.getSetCookie().join(";");
    assert.match(setCookie, /bx_session=/);
    assert.match(setCookie, /HttpOnly/i);
    assert.match(setCookie, /SameSite=Lax/i);

    const me = await api.request("/auth/me", { cookie: sessionCookie(res) });
    assert.equal((await me.json()).email, "ana@mail.com");
  });

  test("validaciones del registro", async () => {
    const res = await register({ name: "", email: "no-es-email", password: "123" });
    assert.equal(res.status, 400);
    const { fields } = await res.json();
    assert.equal(fields.name, "errorNameRequired");
    assert.equal(fields.email, "errorEmailInvalid");
    assert.equal(fields.password, "errorPasswordShort");
  });

  test("email repetido da 409 (sin importar mayusculas)", async () => {
    const res = await register({ name: "Otra", email: "ANA@mail.com", password: "12345678" });
    assert.equal(res.status, 409);
    assert.equal((await res.json()).error, "email_taken");
  });

  test("login correcto e incorrecto", async () => {
    const ok = await login({ email: "ana@mail.com", password: "12345678" });
    assert.equal(ok.status, 200);
    assert.ok(sessionCookie(ok));

    const wrong = await login({ email: "ana@mail.com", password: "equivocada" });
    assert.equal(wrong.status, 401);
    assert.equal((await wrong.json()).error, "invalid_credentials");

    // Mismo error si el email no existe (no revela que cuentas hay).
    const missing = await login({ email: "nadie@mail.com", password: "12345678" });
    assert.equal(missing.status, 401);
    assert.equal((await missing.json()).error, "invalid_credentials");
  });

  test("demasiados intentos fallidos dan 429", async () => {
    let last;
    for (let index = 0; index < 11; index++) {
      last = await login({ email: "fuerza@bruta.com", password: "x" });
    }
    assert.equal(last.status, 429);
    assert.equal((await last.json()).error, "too_many_attempts");
  });

  test("logout invalida la sesion", async () => {
    const res = await login({ email: "ana@mail.com", password: "12345678" });
    const cookie = sessionCookie(res);
    assert.equal((await api.request("/auth/me", { cookie })).status, 200);
    assert.equal((await api.request("/auth/logout", { method: "POST", cookie })).status, 204);
    assert.equal((await api.request("/auth/me", { cookie })).status, 401);
  });

  test("una cookie inventada no sirve", async () => {
    const res = await api.request("/movements", { cookie: "bx_session=inventada" });
    assert.equal(res.status, 401);
  });
});

describe("proteccion de los datos", () => {
  test("sin sesion la API responde 401", async () => {
    for (const path of ["/movements", "/summary", "/recurring", "/budgets", "/rates"]) {
      const res = await api.request(path);
      assert.equal(res.status, 401, path);
      assert.equal((await res.json()).error, "unauthorized");
    }
  });

  test("cada usuario ve solo sus datos", async () => {
    const alice = await api.signup({ name: "Alice" });
    const bob = await api.signup({ name: "Bob" });

    const created = await (
      await api.request("/movements", { method: "POST", body: expense, cookie: alice.cookie })
    ).json();
    await api.request("/budgets/food", {
      method: "PUT",
      body: { amount: 5000 },
      cookie: alice.cookie,
    });

    const bobRows = await (await api.request("/movements", { cookie: bob.cookie })).json();
    assert.equal(bobRows.length, 0);
    const bobBudgets = await (await api.request("/budgets", { cookie: bob.cookie })).json();
    assert.equal(bobBudgets.items.length, 0);
    const bobSummary = await (await api.request("/summary", { cookie: bob.cookie })).json();
    assert.equal(bobSummary.expense, 0);

    // Bob no puede leer, editar ni borrar el movimiento de Alice.
    const path = `/movements/${created.id}`;
    assert.equal((await api.request(path, { cookie: bob.cookie })).status, 404);
    const put = await api.request(path, { method: "PUT", body: expense, cookie: bob.cookie });
    assert.equal(put.status, 404);
    assert.equal((await api.request(path, { method: "DELETE", cookie: bob.cookie })).status, 404);
    assert.equal((await api.request(path, { cookie: alice.cookie })).status, 200);
  });

  test("las reglas recurrentes tambien son por usuario", async () => {
    const alice = await api.signup();
    const bob = await api.signup();
    const rule = await (
      await api.request("/recurring", {
        method: "POST",
        cookie: alice.cookie,
        body: { ...expense, title: "Gym", startDate: "2026-09-05" },
      })
    ).json();
    assert.equal((await api.request(`/recurring/${rule.id}`, { cookie: bob.cookie })).status, 404);
    const bobRows = await (await api.request("/movements", { cookie: bob.cookie })).json();
    assert.equal(bobRows.length, 0);
  });

  test("la fuente de cotizacion es de cada usuario", async () => {
    const alice = await api.signup();
    const bob = await api.signup();
    await api.request("/rates/settings", {
      method: "PUT",
      cookie: alice.cookie,
      body: { source: "manual", manualRate: 1234 },
    });
    const bobStatus = await (await api.request("/rates", { cookie: bob.cookie })).json();
    assert.equal(bobStatus.source, "blue");
    assert.equal(bobStatus.manualRate, null);
  });

  test("un pedido desde otro sitio se rechaza (CSRF)", async () => {
    const { cookie } = await api.signup();
    const res = await api.request("/movements", {
      method: "POST",
      body: expense,
      cookie,
      headers: { Origin: "https://sitio-malicioso.com" },
    });
    assert.equal(res.status, 403);
    assert.equal((await res.json()).error, "forbidden_origin");
  });

  test("cuentas nuevas arrancan vacias y pueden cargar datos de ejemplo", async () => {
    const { cookie } = await api.signup();
    assert.equal((await (await api.request("/movements", { cookie })).json()).length, 0);
    const res = await api.request("/demo-data", { method: "POST", cookie });
    assert.equal(res.status, 201);
    assert.ok((await (await api.request("/movements", { cookie })).json()).length > 0);
  });
});

describe("borrar la cuenta", () => {
  test("pide confirmar el email y borra todos los datos", async () => {
    const { cookie, email } = await api.signup({ seed: true });

    const wrong = await api.request("/auth/account", {
      method: "DELETE",
      cookie,
      body: { email: "otro@mail.com" },
    });
    assert.equal(wrong.status, 400);
    assert.equal((await wrong.json()).error, "email_mismatch");

    const res = await api.request("/auth/account", { method: "DELETE", cookie, body: { email } });
    assert.equal(res.status, 204);
    assert.equal((await api.request("/auth/me", { cookie })).status, 401);

    // No quedan movimientos huerfanos: se borraron en cascada.
    const { count } = await api.db.one(sql`
      SELECT COUNT(*) AS count FROM movements m
      LEFT JOIN users u ON u.id = m.user_id WHERE u.id IS NULL
    `);
    assert.equal(count, 0);
  });
});

describe("login con Google", () => {
  const validClaims = (overrides = {}) => ({
    iss: "https://accounts.google.com",
    aud: GOOGLE.clientId,
    sub: "google-1",
    email: "gaston@gmail.com",
    email_verified: true,
    name: "Gaston",
    exp: Math.floor(NOW.getTime() / 1000) + 3600,
    ...overrides,
  });

  // Hace el viaje completo: /google -> (Google) -> /google/callback.
  async function googleLogin(claims, { tamperState = false } = {}) {
    googleClaims = claims;
    const start = await api.request("/auth/google", { redirect: "manual" });
    assert.equal(start.status, 302);
    const location = new URL(start.headers.get("location"));
    assert.equal(location.origin + location.pathname, "https://accounts.google.com/o/oauth2/v2/auth");
    assert.equal(location.searchParams.get("client_id"), GOOGLE.clientId);
    assert.equal(location.searchParams.get("code_challenge_method"), "S256");

    const oauthCookie = start.headers.getSetCookie().find((c) => c.startsWith("bx_oauth="));
    const state = tamperState ? "otro-state" : location.searchParams.get("state");
    return api.request(`/auth/google/callback?code=abc&state=${state}`, {
      redirect: "manual",
      cookie: oauthCookie.split(";")[0],
    });
  }

  test("la config avisa que Google esta disponible", async () => {
    assert.deepEqual(await (await api.request("/auth/config")).json(), { google: true });
  });

  test("crea la cuenta y la sesion", async () => {
    const res = await googleLogin(validClaims());
    assert.equal(res.status, 302);
    assert.equal(res.headers.get("location"), "/");
    assert.equal(lastTokenRequest.code_verifier.length > 20, true);
    const me = await (await api.request("/auth/me", { cookie: sessionCookie(res) })).json();
    assert.equal(me.email, "gaston@gmail.com");
    assert.equal(me.hasGoogle, true);
    assert.equal(me.hasPassword, false);
  });

  test("volver a entrar usa la misma cuenta", async () => {
    const first = await (await api.request("/auth/me", {
      cookie: sessionCookie(await googleLogin(validClaims())),
    })).json();
    const second = await (await api.request("/auth/me", {
      cookie: sessionCookie(await googleLogin(validClaims({ name: "Otro nombre" }))),
    })).json();
    assert.equal(first.id, second.id);
  });

  test("un state distinto se rechaza", async () => {
    const res = await googleLogin(validClaims(), { tamperState: true });
    assert.equal(res.headers.get("location"), "/login?error=google");
    assert.equal(sessionCookie(res), null);
  });

  test("token de otra app, vencido o sin email verificado se rechaza", async () => {
    for (const claims of [
      validClaims({ aud: "otra-app" }),
      validClaims({ iss: "https://evil.com" }),
      validClaims({ exp: Math.floor(NOW.getTime() / 1000) - 10 }),
      validClaims({ email_verified: false, sub: "google-x", email: "x@gmail.com" }),
    ]) {
      const res = await googleLogin(claims);
      assert.equal(res.headers.get("location"), "/login?error=google");
    }
  });

  test("vincula una cuenta existente con el mismo email y corta el acceso con contraseña", async () => {
    const created = await register({ name: "Usurpador", email: "lu@gmail.com", password: "12345678" });
    const oldCookie = sessionCookie(created);

    const res = await googleLogin(validClaims({ sub: "google-lu", email: "lu@gmail.com" }));
    const me = await (await api.request("/auth/me", { cookie: sessionCookie(res) })).json();
    assert.equal(me.id, (await created.json()).id);
    assert.equal(me.hasGoogle, true);
    assert.equal(me.hasPassword, false);

    // La sesion y la contraseña anteriores ya no sirven.
    assert.equal((await api.request("/auth/me", { cookie: oldCookie })).status, 401);
    assert.equal((await login({ email: "lu@gmail.com", password: "12345678" })).status, 401);
  });

  test("sin credenciales de Google, la opcion no esta", async () => {
    const plain = await startTestServer();
    try {
      assert.deepEqual(await (await plain.request("/auth/config")).json(), { google: false });
      assert.equal((await plain.request("/auth/google", { redirect: "manual" })).status, 404);
    } finally {
      await plain.stop();
    }
  });
});
