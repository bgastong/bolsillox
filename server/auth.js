import crypto from "node:crypto";
import { promisify } from "node:util";
import { TERMS_VERSION } from "../shared/legal.js";
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

// Codigos por email: 6 digitos, vencen a los 15 minutos, 5 intentos como
// maximo y no se puede pedir otro hasta pasado un minuto.
export const CODE_MINUTES = 15;
const CODE_MAX_ATTEMPTS = 5;
const CODE_COOLDOWN_MS = 60 * 1000;

function codeHash(userId, purpose, code) {
  return crypto.createHash("sha256").update(`${purpose}:${userId}:${code}`).digest("hex");
}

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

  function findByEmail(email) {
    return db.one(sql`
      SELECT id, email, name, password_hash AS "passwordHash",
             pending_verification AS "pending"
      FROM users WHERE email = ${email}
    `);
  }

  /*
  Crea la cuenta. Con verify = true queda pendiente hasta confirmar el email
  con el codigo. Si el email ya estaba registrado pero nunca se confirmo,
  se reemplazan nombre y contraseña (quien lo registro no probo que era suyo).
  */
  async function register({ name, email, password }, { verify = false } = {}) {
    const passwordHash = await hashPassword(password);
    const user = await db.one(sql`
      INSERT INTO users (email, name, password_hash, pending_verification,
                         terms_version, terms_accepted_at)
      VALUES (${email}, ${name}, ${passwordHash}, ${verify}, ${TERMS_VERSION}, ${now()})
      ON CONFLICT (email) DO UPDATE
        SET name = EXCLUDED.name, password_hash = EXCLUDED.password_hash,
            pending_verification = EXCLUDED.pending_verification,
            terms_version = EXCLUDED.terms_version, terms_accepted_at = EXCLUDED.terms_accepted_at
        WHERE users.pending_verification
      RETURNING ${USER_COLUMNS}
    `);
    if (!user) throw new HttpError(409, "email_taken");
    return user;
  }

  async function login({ email, password }) {
    const row = await findByEmail(email);
    const valid = await verifyPassword(password, row?.passwordHash ?? DUMMY_HASH);
    if (!row?.passwordHash || !valid) throw new HttpError(401, "invalid_credentials");
    // La contraseña es correcta pero falta confirmar el email.
    if (row.pending) throw new HttpError(403, "email_not_verified");
    return getUser(row.id);
  }

  // --- Codigos por email ---

  // Genera un codigo nuevo (reemplaza al anterior) y lo devuelve para enviarlo.
  async function issueCode(userId, purpose, { newEmail = null } = {}) {
    const previous = await db.one(sql`
      SELECT created_at AS "createdAt" FROM email_codes
      WHERE user_id = ${userId} AND purpose = ${purpose}
    `);
    if (previous && now().getTime() - new Date(previous.createdAt).getTime() < CODE_COOLDOWN_MS) {
      throw new HttpError(429, "code_cooldown");
    }
    const code = String(crypto.randomInt(0, 1_000_000)).padStart(6, "0");
    const expiresAt = new Date(now().getTime() + CODE_MINUTES * 60 * 1000);
    await db.run(sql`
      INSERT INTO email_codes (user_id, purpose, code_hash, new_email, attempts, expires_at, created_at)
      VALUES (${userId}, ${purpose}, ${codeHash(userId, purpose, code)}, ${newEmail}, 0,
              ${expiresAt}, ${now()})
      ON CONFLICT (user_id, purpose) DO UPDATE
        SET code_hash = EXCLUDED.code_hash, new_email = EXCLUDED.new_email, attempts = 0,
            expires_at = EXCLUDED.expires_at, created_at = EXCLUDED.created_at
    `);
    return code;
  }

  // Valida el codigo; si es correcto lo borra (un solo uso) y devuelve su fila.
  async function consumeCode(userId, purpose, code) {
    const row = await db.one(sql`
      SELECT code_hash AS "codeHash", new_email AS "newEmail", attempts, expires_at AS "expiresAt"
      FROM email_codes WHERE user_id = ${userId} AND purpose = ${purpose}
    `);
    if (!row) throw new HttpError(400, "code_invalid");
    if (new Date(row.expiresAt) <= now()) {
      await db.run(sql`DELETE FROM email_codes WHERE user_id = ${userId} AND purpose = ${purpose}`);
      throw new HttpError(400, "code_expired");
    }
    const expected = Buffer.from(row.codeHash, "hex");
    const actual = Buffer.from(codeHash(userId, purpose, code), "hex");
    if (!crypto.timingSafeEqual(expected, actual)) {
      if (row.attempts + 1 >= CODE_MAX_ATTEMPTS) {
        // Demasiados intentos: el codigo deja de servir y hay que pedir otro.
        await db.run(sql`DELETE FROM email_codes WHERE user_id = ${userId} AND purpose = ${purpose}`);
        throw new HttpError(429, "too_many_attempts");
      }
      await db.run(sql`
        UPDATE email_codes SET attempts = attempts + 1
        WHERE user_id = ${userId} AND purpose = ${purpose}
      `);
      throw new HttpError(400, "code_invalid");
    }
    await db.run(sql`DELETE FROM email_codes WHERE user_id = ${userId} AND purpose = ${purpose}`);
    return row;
  }

  // Confirma el email de una cuenta nueva.
  async function verifyEmail({ email, code }) {
    const row = await findByEmail(email);
    if (!row?.pending) throw new HttpError(400, "code_invalid");
    await consumeCode(row.id, "verify_email", code);
    await db.run(sql`
      UPDATE users SET pending_verification = FALSE, email_verified = TRUE WHERE id = ${row.id}
    `);
    return getUser(row.id);
  }

  // Codigo para confirmar el email (null si no hay una cuenta pendiente con ese email).
  async function verificationCodeFor(email) {
    const row = await findByEmail(email);
    if (!row?.pending) return null;
    return { user: row, code: await issueCode(row.id, "verify_email") };
  }

  // Codigo para recuperar la contraseña (null si el email no tiene cuenta).
  async function resetCodeFor(email) {
    const row = await findByEmail(email);
    if (!row) return null;
    return { user: row, code: await issueCode(row.id, "reset_password") };
  }

  // Elige una contraseña nueva con el codigo. Cierra todas las sesiones abiertas.
  async function resetPassword({ email, code, password }) {
    const row = await findByEmail(email);
    if (!row) throw new HttpError(400, "code_invalid");
    await consumeCode(row.id, "reset_password", code);
    const passwordHash = await hashPassword(password);
    // Recibir el codigo tambien prueba que el email es de esta persona.
    await db.run(sql`
      UPDATE users SET password_hash = ${passwordHash}, pending_verification = FALSE,
                       email_verified = TRUE
      WHERE id = ${row.id}
    `);
    await db.run(sql`DELETE FROM sessions WHERE user_id = ${row.id}`);
    return getUser(row.id);
  }

  // --- Datos de la cuenta ---

  async function updateProfile(userId, { name }) {
    await db.run(sql`UPDATE users SET name = ${name} WHERE id = ${userId}`);
    return getUser(userId);
  }

  async function checkPassword(userId, password) {
    const row = await db.one(sql`SELECT password_hash AS "passwordHash" FROM users WHERE id = ${userId}`);
    // Las cuentas solo con Google no tienen contraseña: no se pide.
    if (!row?.passwordHash) return;
    if (!password || !(await verifyPassword(password, row.passwordHash))) {
      throw new HttpError(400, "wrong_password");
    }
  }

  // Cambia la contraseña y cierra las demas sesiones (la actual sigue abierta).
  async function changePassword(userId, { currentPassword, newPassword }, keepToken) {
    await checkPassword(userId, currentPassword);
    await db.run(sql`
      UPDATE users SET password_hash = ${await hashPassword(newPassword)} WHERE id = ${userId}
    `);
    await db.run(sql`
      DELETE FROM sessions WHERE user_id = ${userId} AND id <> ${keepToken ? tokenId(keepToken) : ""}
    `);
    return getUser(userId);
  }

  // Primer paso para cambiar el email: codigo al email nuevo.
  async function requestEmailChange(userId, { email, password }) {
    await checkPassword(userId, password);
    const current = await getUser(userId);
    if (current.email === email) throw new HttpError(400, "email_same");
    const taken = await db.one(sql`SELECT id FROM users WHERE email = ${email}`);
    if (taken) throw new HttpError(409, "email_taken");
    return issueCode(userId, "change_email", { newEmail: email });
  }

  async function confirmEmailChange(userId, { code }) {
    const { newEmail } = await consumeCode(userId, "change_email", code);
    const updated = await db.run(sql`
      UPDATE users SET email = ${newEmail}, email_verified = TRUE
      WHERE id = ${userId} AND NOT EXISTS (SELECT 1 FROM users WHERE email = ${newEmail})
    `);
    if (!updated) throw new HttpError(409, "email_taken");
    return getUser(userId);
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
          UPDATE users SET google_id = ${googleId}, email_verified = TRUE,
                           pending_verification = FALSE
          WHERE id = ${existing.id}
        `);
        return existing.id;
      }

      const created = await tx.one(sql`
        INSERT INTO users (email, name, google_id, email_verified, terms_version, terms_accepted_at)
        VALUES (${email}, ${name}, ${googleId}, TRUE, ${TERMS_VERSION}, ${now()})
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
    verifyEmail,
    verificationCodeFor,
    resetCodeFor,
    resetPassword,
    updateProfile,
    changePassword,
    requestEmailChange,
    confirmEmailChange,
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
