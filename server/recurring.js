import { transaction } from "./db.js";

/*
Movimientos recurrentes: una regla genera un movimiento por mes, el dia
day_of_month (si el mes es mas corto, el ultimo dia). Solo se generan las
fechas que ya llegaron. Cada mes generado queda en recurring_occurrences,
asi el proceso es idempotente y un movimiento borrado no se vuelve a crear.
*/

const COLUMNS = `
  id, type, title, amount, currency, category, payment_method AS paymentMethod, note,
  day_of_month AS dayOfMonth, start_date AS startDate, end_date AS endDate, active,
  created_at AS createdAt, updated_at AS updatedAt
`;

// Tope de meses hacia atras que se generan de una vez (evita miles de filas
// si alguien carga una fecha de inicio muy vieja por error).
const MAX_BACKFILL_MONTHS = 36;

function pad(value) {
  return String(value).padStart(2, "0");
}

export function toISODate(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function addMonths(monthKey, offset) {
  const [year, month] = monthKey.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1 + offset, 1));
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}`;
}

// Fecha de la ocurrencia de un mes, ajustada al ultimo dia si hace falta.
export function occurrenceDate(monthKey, dayOfMonth) {
  const [year, month] = monthKey.split("-").map(Number);
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return `${monthKey}-${pad(Math.min(dayOfMonth, lastDay))}`;
}

function ruleParams(data) {
  return {
    type: data.type,
    title: data.title,
    amount: data.amount,
    currency: data.currency ?? "ARS",
    category: data.category,
    paymentMethod: data.paymentMethod,
    note: data.note ?? "",
    dayOfMonth: Number(data.startDate.slice(8, 10)),
    startDate: data.startDate,
    endDate: data.endDate ?? null,
    active: data.active === false ? 0 : 1,
  };
}

function toRule(row) {
  return row ? { ...row, active: Boolean(row.active) } : null;
}

export function createRecurringService(db, { now = () => new Date() } = {}) {
  const listStmt = db.prepare(`SELECT ${COLUMNS} FROM recurring ORDER BY active DESC, day_of_month, title`);
  const getStmt = db.prepare(`SELECT ${COLUMNS} FROM recurring WHERE id = ?`);
  const insertStmt = db.prepare(`
    INSERT INTO recurring (type, title, amount, currency, category, payment_method, note,
                           day_of_month, start_date, end_date, active)
    VALUES (@type, @title, @amount, @currency, @category, @paymentMethod, @note,
            @dayOfMonth, @startDate, @endDate, @active)
  `);
  const updateStmt = db.prepare(`
    UPDATE recurring
    SET type = @type, title = @title, amount = @amount, currency = @currency,
        category = @category, payment_method = @paymentMethod, note = @note,
        day_of_month = @dayOfMonth, start_date = @startDate, end_date = @endDate,
        active = @active, updated_at = datetime('now')
    WHERE id = @id
  `);
  const deleteStmt = db.prepare("DELETE FROM recurring WHERE id = ?");
  const activeStmt = db.prepare(`SELECT ${COLUMNS} FROM recurring WHERE active = 1`);
  const occurrencesStmt = db.prepare("SELECT month FROM recurring_occurrences WHERE recurring_id = ?");
  const insertOccurrence = db.prepare(
    "INSERT OR IGNORE INTO recurring_occurrences (recurring_id, month) VALUES (?, ?)",
  );
  const insertMovement = db.prepare(`
    INSERT INTO movements (type, title, amount, currency, date, category, payment_method,
                           note, recurring_id)
    VALUES (@type, @title, @amount, @currency, @date, @category, @paymentMethod,
            @note, @recurringId)
  `);
  const lastGeneratedStmt = db.prepare(
    "SELECT MAX(month) AS month FROM recurring_occurrences WHERE recurring_id = ?",
  );

  // Proxima fecha que todavia no se genero (o null si la regla termino).
  function nextDate(rule, today = toISODate(now())) {
    if (!rule.active) return null;
    const done = new Set(occurrencesStmt.all(rule.id).map((row) => row.month));
    let month = rule.startDate.slice(0, 7);
    const currentMonth = today.slice(0, 7);
    if (month < currentMonth) month = currentMonth;
    for (let index = 0; index < 24; index++, month = addMonths(month, 1)) {
      const date = occurrenceDate(month, rule.dayOfMonth);
      if (rule.endDate && date > rule.endDate) return null;
      if (date < rule.startDate || done.has(month)) continue;
      return date;
    }
    return null;
  }

  function withExtras(rule) {
    if (!rule) return null;
    return {
      ...rule,
      nextDate: nextDate(rule),
      lastGeneratedMonth: lastGeneratedStmt.get(rule.id).month ?? null,
    };
  }

  function list() {
    return listStmt.all().map((row) => withExtras(toRule(row)));
  }

  function get(id) {
    return withExtras(toRule(getStmt.get(id)));
  }

  // Genera todas las ocurrencias pendientes hasta hoy. Devuelve cuantas creo.
  function generateDue(today = toISODate(now())) {
    const currentMonth = today.slice(0, 7);
    let created = 0;

    transaction(db, () => {
      for (const row of activeStmt.all()) {
        const rule = toRule(row);
        const done = new Set(occurrencesStmt.all(rule.id).map((item) => item.month));
        let month = rule.startDate.slice(0, 7);
        const oldest = addMonths(currentMonth, -MAX_BACKFILL_MONTHS);
        if (month < oldest) month = oldest;

        for (; month <= currentMonth; month = addMonths(month, 1)) {
          if (done.has(month)) continue;
          const date = occurrenceDate(month, rule.dayOfMonth);
          if (date < rule.startDate || date > today) continue;
          if (rule.endDate && date > rule.endDate) break;

          insertMovement.run({
            type: rule.type,
            title: rule.title,
            amount: rule.amount,
            currency: rule.currency,
            date,
            category: rule.category,
            paymentMethod: rule.paymentMethod,
            note: rule.note,
            recurringId: rule.id,
          });
          insertOccurrence.run(rule.id, month);
          created++;
        }
      }
    });

    return created;
  }

  function create(data) {
    const { lastInsertRowid } = insertStmt.run(ruleParams(data));
    generateDue();
    return get(Number(lastInsertRowid));
  }

  // Los cambios aplican a las proximas ocurrencias; las ya generadas no se tocan.
  function update(id, data) {
    const { changes } = updateStmt.run({ ...ruleParams(data), id });
    if (!Number(changes)) return null;
    generateDue();
    return get(id);
  }

  // Los movimientos ya generados se conservan (recurring_id pasa a NULL).
  function remove(id) {
    return Number(deleteStmt.run(id).changes) > 0;
  }

  return { list, get, create, update, remove, generateDue, nextDate };
}
