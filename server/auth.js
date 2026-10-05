import crypto from "node:crypto";
import { promisify } from "node:util";
import { HttpError } from "./errors.js";
import { sql } from "./sql.js";

const scrypt = promisify(crypto.scrypt);

export const SESSION_COOKIE = "bx_session";
const SESSION_DAYS = 30;
const DAY_MS = 24 * 60 * 60 * 1000;
// Si a la sesion le quedan menos dias que esto, se extiende (sesion "deslizante").
const RENEW_BELOW_DAYS = 15;

/*
Contraseñas con scrypt (incluido en Node): sal aleatoria por usuario y
comparacion en tiempo constante. Formato: scrypt$N$r$p$sal$hash (base64).
*/
const SCRYPT = { N: 16384, r: 8, p: 1, keylen: 64 };

export async function hashPassword(password) {
  const salt = crypto.randomBytes(16);
  const hash = await scrypt(password, salt, SCRYPT.keylen, SCRYPT);
  return ["scrypt", SCRYPT.N, SCRYPT.r, SCRYPT.p, salt.toString("base64"), hash.toString("base64")].join("$");
}

export async function verifyPassword(password, stored) {
  const [scheme, N, r, p, salt, hash] = String(stored ?? "").split("$");
  if (scheme !== "scrypt" || !hash) return false;
  const expected = Buffer.from(hash, "base64");
  const actual = await scrypt(password, Buffer.from(salt, "base64"), expected.length, {
    N: Number(N),
    r: Number(r),
    p: Number(p),
  });
  return crypto.timingSafeEqual(expected, actual);
}

// Hash con el que se compara cuando el email no existe: asi la respuesta
// tarda lo mismo y no revela que cuentas estan registradas.
const DUMMY_HASH = await hashPassword(crypto.randomBytes(16).toString("hex"));

// En la base se guarda el hash del token, no el token de la cookie.
function tokenId(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

const USER_COLUMNS = sql`
  id, email, name, google_id IS NOT NULL AS "hasGoogle",
  password_hash IS NOT NULL AS "hasPassword", created_at AS "createdAt"
`;

export function createAuthService(db, { now = () => new Date() } = {}) {
  function getUser(id) {
    return db.one(sql`SELECT ${USER_COLUMNS} FROM users WHERE id = ${id}`);
  }

  async function register({ name, email, password }) {
    const passwordHash = await hashPassword(password);
    const user = await db.one(sql`
      INSERT INTO users (email, name, password_hash)
      VALUES (${email}, ${name}, ${passwordHash})
      ON CONFLICT (email) DO NOTHING
      RETURNING ${USER_COLUMNS}
    `);
    if (!user) throw new HttpError(409, "email_taken");
    return user;
  }

  async function login({ email, password }) {
    const row = await db.one(
      sql`SELECT id, password_hash AS "passwordHash" FROM users WHERE email = ${email}`,
    );
    const valid = await verifyPassword(password, row?.passwordHash ?? DUMMY_HASH);
    if (!row?.passwordHash || !valid) throw new HttpError(401, "invalid_credentials");
    return getUser(row.id);
  }

  /*
  Inicio de sesion con Google (el perfil ya viene verificado por google.js).
  - Si la cuenta de Google ya esta vinculada, entra.
  - Si hay una cuenta con ese email, se vincula. Como nadie habia confirmado
    ese email, se borran su contraseña y sus sesiones: si otra persona la
    habia registrado con un email ajeno, pierde el acceso.
  - Si no, se crea la cuenta.
  */
  async function loginWithGoogle({ googleId, email, name }) {
    return db.transaction(async (tx) => {
      const linked = await tx.one(sql`SELECT id FROM users WHERE google_id = ${googleId}`);
      if (linked) return linked.id;

      const existing = await tx.one(
        sql`SELECT id, email_verified AS "emailVerified" FROM users WHERE email = ${email}`,
      );
      if (existing) {
        if (!existing.emailVerified) {
          await tx.run(sql`UPDATE users SET password_hash = NULL WHERE id = ${existing.id}`);
          await tx.run(sql`DELETE FROM sessions WHERE user_id = ${existing.id}`);
        }
        await tx.run(sql`
          UPDATE users SET google_id = ${googleId}, email_verified = TRUE
          WHERE id = ${existing.id}
        `);
        return existing.id;
      }

      const created = await tx.one(sql`
        INSERT INTO users (email, name, google_id, email_verified)
        VALUES (${email}, ${name}, ${googleId}, TRUE)
        RETURNING id
      `);
      return created.id;
    }).then(getUser);
  }

  // Crea una sesion y devuelve el token para la cookie.
  async function createSession(userId) {
    const token = crypto.randomBytes(32).toString("base64url");
    const expiresAt = new Date(now().getTime() + SESSION_DAYS * DAY_MS);
    await db.run(sql`
      INSERT INTO sessions (id, user_id, expires_at)
      VALUES (${tokenId(token)}, ${userId}, ${expiresAt})
    `);
    // De paso, limpia sesiones vencidas del usuario.
    await db.run(sql`DELETE FROM sessions WHERE user_id = ${userId} AND expires_at < ${now()}`);
    return { token, expiresAt };
  }

  // Devuelve { user, renewed } o null si el token no es valido o vencio.
  async function getSession(token) {
    if (!token) return null;
    const id = tokenId(token);
    const session = await db.one(sql`
      SELECT user_id AS "userId", expires_at AS "expiresAt" FROM sessions
      WHERE id = ${id} AND expires_at > ${now()}
    `);
    if (!session) return null;

    let expiresAt = null;
    if (new Date(session.expiresAt).getTime() - now().getTime() < RENEW_BELOW_DAYS * DAY_MS) {
      expiresAt = new Date(now().getTime() + SESSION_DAYS * DAY_MS);
      await db.run(sql`UPDATE sessions SET expires_at = ${expiresAt} WHERE id = ${id}`);
    }
    const user = await getUser(session.userId);
    return user ? { user, expiresAt } : null;
  }

  async function deleteSession(token) {
    if (token) await db.run(sql`DELETE FROM sessions WHERE id = ${tokenId(token)}`);
  }

  // Borra la cuenta y, en cascada, todos sus datos.
  async function deleteAccount(userId) {
    await db.run(sql`DELETE FROM users WHERE id = ${userId}`);
  }

  return {
    getUser,
    register,
    login,
    loginWithGoogle,
    createSession,
    getSession,
    deleteSession,
    deleteAccount,
  };
}

// --- Cookies ---

export function parseCookies(header = "") {
  const cookies = {};
  for (const part of header.split(";")) {
    const index = part.indexOf("=");
    if (index < 0) continue;
    const key = part.slice(0, index).trim();
    try {
      cookies[key] = decodeURIComponent(part.slice(index + 1).trim());
    } catch {
      // cookie mal formada: se ignora
    }
  }
  return cookies;
}

export function cookieOptions({ secure, expires, maxAge }) {
  return {
    httpOnly: true,
    sameSite: "lax",
    secure,
    path: "/",
    ...(expires && { expires }),
    ...(maxAge && { maxAge }),
  };
}
