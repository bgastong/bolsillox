import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildSeed, SEED_SIGNATURES } from "./seed.js";
import { sql } from "./sql.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const DEFAULT_DATA_DIR = path.join(__dirname, "data", "pglite");

/*
Base de datos Postgres:
- En produccion, DATABASE_URL apunta a un Postgres real (por ejemplo, Neon).
- En desarrollo y en los tests se usa PGlite: Postgres embebido en Node,
  sin instalar nada. Guarda los datos en server/data/pglite (o en memoria).

Todas las funciones devuelven promesas y reciben consultas armadas con sql``.
*/

// Migraciones en orden; la tabla schema_migrations guarda cuales ya corrieron.
// Texto SQL literal para la migracion v4 (son datos fijos del codigo, no del usuario).
const literal = (value) =>
  typeof value === "number" ? String(value) : `'${String(value).replaceAll("'", "''")}'`;
const tuple = (values) => `(${values.map(literal).join(", ")})`;
const SEED_MOVEMENT_ROWS = [
  ...new Set(
    SEED_SIGNATURES.movements.map((row) =>
      tuple([row.type, row.title, row.category, row.amount, row.currency, row.paymentMethod]),
    ),
  ),
].join(",\n    ");
const SEED_BUDGET_ROWS = SEED_SIGNATURES.budgets
  .map((row) => tuple([row.category, row.amount]))
  .join(", ");

// Marca como datos de ejemplo los que se cargaron antes de existir is_demo.
// Exportado para probarlo (server/demoData.test.js).
export const LEGACY_DEMO_SQL = `
  UPDATE movements SET is_demo = TRUE
  WHERE note = '' AND (type, title, category, amount, currency, payment_method) IN (
    VALUES ${SEED_MOVEMENT_ROWS}
  );
  UPDATE recurring SET is_demo = TRUE
  WHERE note = '' AND (type, title, category, amount, currency, payment_method) IN (
    VALUES ${SEED_MOVEMENT_ROWS}
  );
  -- Presupuestos de ejemplo: solo en cuentas que tienen movimientos de ejemplo.
  UPDATE budgets SET is_demo = TRUE
  WHERE (category, amount) IN (VALUES ${SEED_BUDGET_ROWS})
    AND user_id IN (SELECT user_id FROM movements WHERE is_demo);
`;

const MIGRATIONS = [
  // v1: usuarios, sesiones y todos los datos separados por usuario.
  `
  CREATE TABLE users (
    id            SERIAL PRIMARY KEY,
    email         TEXT        NOT NULL UNIQUE,
    name          TEXT        NOT NULL,
    password_hash TEXT,
    google_id     TEXT        UNIQUE,
    -- true cuando Google confirmo que el email es de esta persona.
    email_verified BOOLEAN    NOT NULL DEFAULT FALSE,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
  );

  -- id = hash SHA-256 del token de la cookie (el token en si no se guarda).
  CREATE TABLE sessions (
    id         TEXT        PRIMARY KEY,
    user_id    INTEGER     NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  );
  CREATE INDEX idx_sessions_user ON sessions (user_id);

  CREATE TABLE recurring (
    id             SERIAL PRIMARY KEY,
    user_id        INTEGER          NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    type           TEXT             NOT NULL CHECK (type IN ('income', 'expense')),
    title          TEXT             NOT NULL,
    amount         DOUBLE PRECISION NOT NULL CHECK (amount > 0),
    currency       TEXT             NOT NULL DEFAULT 'ARS' CHECK (currency IN ('ARS', 'USD')),
    category       TEXT             NOT NULL,
    payment_method TEXT             NOT NULL,
    note           TEXT             NOT NULL DEFAULT '',
    day_of_month   INTEGER          NOT NULL CHECK (day_of_month BETWEEN 1 AND 31),
    start_date     TEXT             NOT NULL,
    end_date       TEXT,
    active         BOOLEAN          NOT NULL DEFAULT TRUE,
    created_at     TIMESTAMPTZ      NOT NULL DEFAULT now(),
    updated_at     TIMESTAMPTZ      NOT NULL DEFAULT now()
  );
  CREATE INDEX idx_recurring_user ON recurring (user_id);

  -- Meses ya generados por cada regla. Si se borra el movimiento generado,
  -- la ocurrencia queda registrada y no se vuelve a crear.
  CREATE TABLE recurring_occurrences (
    recurring_id INTEGER NOT NULL REFERENCES recurring (id) ON DELETE CASCADE,
    month        TEXT    NOT NULL,
    PRIMARY KEY (recurring_id, month)
  );

  CREATE TABLE movements (
    id             SERIAL PRIMARY KEY,
    user_id        INTEGER          NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    type           TEXT             NOT NULL CHECK (type IN ('income', 'expense')),
    title          TEXT             NOT NULL,
    amount         DOUBLE PRECISION NOT NULL CHECK (amount > 0),
    currency       TEXT             NOT NULL DEFAULT 'ARS' CHECK (currency IN ('ARS', 'USD')),
    date           TEXT             NOT NULL,
    category       TEXT             NOT NULL,
    payment_method TEXT             NOT NULL,
    note           TEXT             NOT NULL DEFAULT '',
    recurring_id   INTEGER          REFERENCES recurring (id) ON DELETE SET NULL,
    created_at     TIMESTAMPTZ      NOT NULL DEFAULT now(),
    updated_at     TIMESTAMPTZ      NOT NULL DEFAULT now()
  );
  CREATE INDEX idx_movements_user_date ON movements (user_id, date);

  CREATE TABLE budgets (
    user_id    INTEGER          NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    category   TEXT             NOT NULL,
    amount     DOUBLE PRECISION NOT NULL CHECK (amount > 0),
    updated_at TIMESTAMPTZ      NOT NULL DEFAULT now(),
    PRIMARY KEY (user_id, category)
  );

  CREATE TABLE user_settings (
    user_id INTEGER NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    key     TEXT    NOT NULL,
    value   TEXT    NOT NULL,
    PRIMARY KEY (user_id, key)
  );

  -- Cotizaciones del dolar: son las mismas para todos los usuarios.
  CREATE TABLE exchange_rates (
    source     TEXT PRIMARY KEY,
    buy        DOUBLE PRECISION,
    sell       DOUBLE PRECISION NOT NULL,
    updated_at TEXT NOT NULL,
    fetched_at TEXT NOT NULL
  );
  `,
  // v2: verificacion de email con codigo, aceptacion de terminos y codigos
  // de un solo uso (verificar email, recuperar contraseña, cambiar email).
  `
  -- true mientras la cuenta nueva no confirmo su email con el codigo.
  -- Las cuentas creadas antes de esta version quedan en false (no se bloquean).
  ALTER TABLE users ADD COLUMN pending_verification BOOLEAN NOT NULL DEFAULT FALSE;
  ALTER TABLE users ADD COLUMN terms_version TEXT;
  ALTER TABLE users ADD COLUMN terms_accepted_at TIMESTAMPTZ;

  -- Un codigo vigente por usuario y proposito. Se guarda el hash, no el codigo.
  CREATE TABLE email_codes (
    user_id    INTEGER     NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    purpose    TEXT        NOT NULL CHECK (purpose IN ('verify_email', 'reset_password', 'change_email')),
    code_hash  TEXT        NOT NULL,
    new_email  TEXT,
    attempts   INTEGER     NOT NULL DEFAULT 0,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL,
    PRIMARY KEY (user_id, purpose)
  );
  `,
  // v3: limite de intentos compartido entre instancias (Vercel) y tareas de limpieza.
  `
  -- key = hash SHA-256 de "limite:IP|email..." (no se guardan IP ni emails en claro).
  CREATE TABLE rate_limits (
    key      TEXT        PRIMARY KEY,
    count    INTEGER     NOT NULL,
    reset_at TIMESTAMPTZ NOT NULL
  );
  CREATE INDEX idx_rate_limits_reset ON rate_limits (reset_at);

  -- Ultima vez que corrio cada tarea de mantenimiento (una sola instancia la corre).
  CREATE TABLE maintenance_runs (
    task   TEXT        PRIMARY KEY,
    ran_at TIMESTAMPTZ NOT NULL
  );
  `,
  // v4: marca de "datos de ejemplo", para poder borrarlos sin tocar lo que
  // cargo la persona. Tambien marca los datos de ejemplo cargados antes de
  // esta version (mismos titulos, montos y categorias que server/seed.js).
  `
  ALTER TABLE movements ADD COLUMN is_demo BOOLEAN NOT NULL DEFAULT FALSE;
  ALTER TABLE recurring ADD COLUMN is_demo BOOLEAN NOT NULL DEFAULT FALSE;
  ALTER TABLE budgets ADD COLUMN is_demo BOOLEAN NOT NULL DEFAULT FALSE;

  ${LEGACY_DEMO_SQL}
  `,
  // v5: compras en cuotas. Una regla recurrente con installments_total es un
  // plan de cuotas: installment_first es el numero de la cuota de start_date
  // (por ejemplo, 3 si ya se pagaron 2) y end_date es la fecha de la ultima.
  `
  ALTER TABLE recurring ADD COLUMN installments_total INTEGER CHECK (installments_total BETWEEN 2 AND 360);
  ALTER TABLE recurring ADD COLUMN installment_first INTEGER CHECK (installment_first >= 1);
  `,
];

// BIGINT (COUNT, SUM de enteros) y NUMERIC llegan como texto: se pasan a numero.
const INT8_OID = 20;
const NUMERIC_OID = 1700;

// Adapta un cliente (pg o PGlite) a una interfaz comun.
function wrap(client, { affected }) {
  async function query(statement) {
    const { text, values } = statement.toQuery();
    return client.query(text, values);
  }
  return {
    async all(statement) {
      return (await query(statement)).rows;
    },
    async one(statement) {
      return (await query(statement)).rows[0] ?? null;
    },
    // Cantidad de filas afectadas.
    async run(statement) {
      return affected(await query(statement));
    },
  };
}

async function openPglite(dataDir) {
  const { PGlite, types } = await import("@electric-sql/pglite");
  if (dataDir) fs.mkdirSync(dataDir, { recursive: true });
  const pg = await PGlite.create(dataDir, {
    parsers: { [INT8_OID]: Number, [NUMERIC_OID]: Number },
    serializers: { [types.INT8]: String },
  });
  const affected = (result) => result.affectedRows ?? 0;

  return {
    ...wrap(pg, { affected }),
    exec: (text) => pg.exec(text),
    transaction: (fn) => pg.transaction((tx) => fn(wrap(tx, { affected }))),
    close: () => pg.close(),
  };
}

async function openPostgres(url) {
  const { default: pg } = await import("pg");
  pg.types.setTypeParser(INT8_OID, Number);
  pg.types.setTypeParser(NUMERIC_OID, Number);
  // En Vercel cada instancia de la funcion tiene su propio pool: conviene uno
  // chico (PG_POOL_MAX) y la URL "pooled" de Neon.
  const pool = new pg.Pool({
    connectionString: url,
    max: Number(process.env.PG_POOL_MAX) || 5,
    idleTimeoutMillis: 30_000,
  });
  // Neon corta las conexiones inactivas cuando suspende la base: sin este
  // manejador, ese error tiraria abajo el proceso.
  pool.on("error", (error) => console.warn("[db] conexion cerrada:", error.message));
  const affected = (result) => result.rowCount ?? 0;

  return {
    ...wrap(pool, { affected }),
    exec: (text) => pool.query(text),
    async transaction(fn) {
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        const result = await fn(wrap(client, { affected }));
        await client.query("COMMIT");
        return result;
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      } finally {
        client.release();
      }
    },
    close: () => pool.end(),
  };
}

async function migrate(db) {
  await db.exec("CREATE TABLE IF NOT EXISTS schema_migrations (version INTEGER PRIMARY KEY)");
  await db.transaction(async (tx) => {
    // Si hay varias instancias arrancando a la vez, solo una migra.
    await tx.run(sql`SELECT pg_advisory_xact_lock(4242)`);
    const row = await tx.one(sql`SELECT COALESCE(MAX(version), 0) AS version FROM schema_migrations`);
    for (let index = row.version; index < MIGRATIONS.length; index++) {
      // Cada migracion puede tener varias sentencias separadas por ";".
      for (const statement of splitStatements(MIGRATIONS[index])) {
        await tx.run(sql([statement]));
      }
      await tx.run(sql`INSERT INTO schema_migrations (version) VALUES (${index + 1})`);
    }
  });
}

function splitStatements(script) {
  return script
    .replace(/--.*$/gm, "")
    .split(";")
    .map((statement) => statement.trim())
    .filter(Boolean);
}

/*
Abre la base y aplica las migraciones pendientes.
- url: Postgres (DATABASE_URL). Si no hay, se usa PGlite.
- dataDir: carpeta de PGlite; null = en memoria (tests).
*/
export async function openDatabase({ url, dataDir = DEFAULT_DATA_DIR } = {}) {
  const db = url ? await openPostgres(url) : await openPglite(dataDir ?? undefined);
  await migrate(db);
  return db;
}

// Carga los datos de ejemplo en la cuenta de un usuario (si no tiene movimientos).
export async function seedUser(db, userId, today = new Date()) {
  const { count } = await db.one(
    sql`SELECT COUNT(*) AS count FROM movements WHERE user_id = ${userId}`,
  );
  if (count > 0) return 0;

  const { movements, recurring, budgets } = buildSeed(today);

  await db.transaction(async (tx) => {
    const ruleIds = {};
    for (const { key, ...rule } of recurring) {
      const row = await tx.one(sql`
        INSERT INTO recurring (user_id, type, title, amount, currency, category, payment_method,
                               note, day_of_month, start_date, is_demo)
        VALUES (${userId}, ${rule.type}, ${rule.title}, ${rule.amount}, ${rule.currency},
                ${rule.category}, ${rule.paymentMethod}, ${rule.note}, ${rule.dayOfMonth},
                ${rule.startDate}, TRUE)
        RETURNING id
      `);
      ruleIds[key] = row.id;
    }
    for (const { recurringKey, ...movement } of movements) {
      const recurringId = recurringKey ? ruleIds[recurringKey] : null;
      await tx.run(sql`
        INSERT INTO movements (user_id, type, title, amount, currency, date, category,
                               payment_method, note, recurring_id, is_demo)
        VALUES (${userId}, ${movement.type}, ${movement.title}, ${movement.amount},
                ${movement.currency}, ${movement.date}, ${movement.category},
                ${movement.paymentMethod}, ${movement.note}, ${recurringId}, TRUE)
      `);
      if (recurringId) {
        await tx.run(sql`
          INSERT INTO recurring_occurrences (recurring_id, month)
          VALUES (${recurringId}, ${movement.date.slice(0, 7)})
          ON CONFLICT DO NOTHING
        `);
      }
    }
    for (const budget of budgets) {
      await tx.run(sql`
        INSERT INTO budgets (user_id, category, amount, is_demo)
        VALUES (${userId}, ${budget.category}, ${budget.amount}, TRUE)
        ON CONFLICT DO NOTHING
      `);
    }
  });

  return movements.length;
}

// ¿La cuenta tiene datos de ejemplo?
export async function hasDemoData(db, userId) {
  const row = await db.one(sql`
    SELECT EXISTS (SELECT 1 FROM movements WHERE user_id = ${userId} AND is_demo)
        OR EXISTS (SELECT 1 FROM recurring WHERE user_id = ${userId} AND is_demo)
        OR EXISTS (SELECT 1 FROM budgets WHERE user_id = ${userId} AND is_demo) AS found
  `);
  return Boolean(row.found);
}

/*
Borra los datos de ejemplo de una cuenta: movimientos, recurrentes (y lo que
generaron desde que se cargaron) y presupuestos. Lo que cargo la persona queda.
*/
export async function deleteDemoData(db, userId) {
  return db.transaction(async (tx) => {
    const movements = await tx.run(sql`
      DELETE FROM movements
      WHERE user_id = ${userId}
        AND (is_demo OR recurring_id IN (SELECT id FROM recurring WHERE user_id = ${userId} AND is_demo))
    `);
    const recurring = await tx.run(sql`DELETE FROM recurring WHERE user_id = ${userId} AND is_demo`);
    const budgets = await tx.run(sql`DELETE FROM budgets WHERE user_id = ${userId} AND is_demo`);
    return { movements, recurring, budgets };
  });
}
