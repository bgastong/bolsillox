// Utilidades compartidas por los tests de la API.
import { createApp } from "./app.js";
import { openDatabase } from "./db.js";

// Reloj fijo: 15 de octubre de 2026 al mediodia.
export const NOW = new Date(2026, 9, 15, 12);
export const MONTH = "2026-10";

// Cotizaciones simuladas con el formato de dolarapi.com.
export const FAKE_RATES = [
  { casa: "oficial", compra: 950, venta: 1000, fechaActualizacion: "2026-10-15T10:00:00Z" },
  { casa: "blue", compra: 1180, venta: 1200, fechaActualizacion: "2026-10-15T10:00:00Z" },
  { casa: "bolsa", compra: 1140, venta: 1150, fechaActualizacion: "2026-10-15T10:00:00Z" },
  { casa: "tarjeta", compra: 1500, venta: 1600, fechaActualizacion: "2026-10-15T10:00:00Z" },
];

export const fakeRates = {
  calls: 0,
  fail: false,
  async fetch() {
    fakeRates.calls++;
    if (fakeRates.fail) throw new Error("sin red");
    return { ok: true, status: 200, json: async () => FAKE_RATES };
  },
};

/*
Base para un test: PGlite en memoria o, si esta TEST_DATABASE_URL, una base
nueva en ese Postgres (asi el CI prueba tambien contra un Postgres real).
*/
async function openTestDatabase() {
  const adminUrl = process.env.TEST_DATABASE_URL;
  if (!adminUrl) return { db: await openDatabase({ dataDir: null }), drop: async () => {} };

  const { default: pg } = await import("pg");
  const name = `bx_test_${process.pid}_${Math.random().toString(36).slice(2, 8)}`;
  const admin = new pg.Client({ connectionString: adminUrl });
  await admin.connect();
  await admin.query(`CREATE DATABASE ${name}`);
  await admin.end();

  const url = new URL(adminUrl);
  url.pathname = `/${name}`;
  const db = await openDatabase({ url: url.toString() });
  async function drop() {
    const client = new pg.Client({ connectionString: adminUrl });
    await client.connect();
    await client.query(`DROP DATABASE IF EXISTS ${name} WITH (FORCE)`);
    await client.end();
  }
  return { db, drop };
}

/*
Levanta la API con una base vacia. Devuelve un cliente con:
- request(path, { method, body, cookie, headers })
- signup(name?) -> cookie de un usuario nuevo
*/
export async function startTestServer(options = {}) {
  const { db, drop } = await openTestDatabase();
  const app = createApp(db, {
    now: () => NOW,
    fetchImpl: fakeRates.fetch,
    // Muchos registros desde la misma IP (los tests); el login queda con el limite real.
    authLimits: { register: 1000 },
    ...options,
  });
  const server = await new Promise((resolve) => {
    const instance = app.listen(0, () => resolve(instance));
  });
  const baseUrl = `http://127.0.0.1:${server.address().port}/api`;
  let userCount = 0;

  function request(path, { method = "GET", body, cookie, headers = {}, redirect } = {}) {
    return fetch(`${baseUrl}${path}`, {
      method,
      redirect,
      headers: {
        ...(body !== undefined && { "Content-Type": "application/json" }),
        ...(cookie && { Cookie: cookie }),
        ...headers,
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  }

  async function signup({ name = "Test", seed = false } = {}) {
    userCount++;
    const email = `user${userCount}@test.com`;
    const res = await request("/auth/register", {
      method: "POST",
      body: { name, email, password: "contraseña-segura" },
    });
    if (res.status !== 201) throw new Error(`registro fallo: ${res.status}`);
    const cookie = sessionCookie(res);
    if (seed) await request("/demo-data", { method: "POST", cookie });
    return { cookie, email, user: await res.json() };
  }

  async function stop() {
    server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
    await db.close();
    await drop();
  }

  return { db, baseUrl, request, signup, stop };
}

// "bx_session=abc; Path=/; ..." -> "bx_session=abc"
export function sessionCookie(res) {
  const header = res.headers.getSetCookie().find((value) => value.startsWith("bx_session="));
  return header?.split(";")[0] ?? null;
}
