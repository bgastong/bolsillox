import { raw, sql } from "./sql.js";

/*
Movimientos recurrentes: una regla genera un movimiento por mes, el dia
day_of_month (si el mes es mas corto, el ultimo dia). Solo se generan las
fechas que ya llegaron. Cada mes generado queda en recurring_occurrences,
asi el proceso es idempotente y un movimiento borrado no se vuelve a crear.

Cuotas: una regla con installmentsTotal es una compra en cuotas. Termina sola
en la ultima cuota y cada movimiento lleva el numero en el titulo: "TV (3/12)".
*/

const COLUMNS = raw(`
  id, type, title, amount, currency, category, payment_method AS "paymentMethod", note,
  day_of_month AS "dayOfMonth", start_date AS "startDate", end_date AS "endDate", active,
  installments_total AS "installmentsTotal", installment_first AS "installmentFirst",
  created_at AS "createdAt", updated_at AS "updatedAt"
`);

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

// Meses entre dos "YYYY-MM" (b - a).
function monthsBetween(a, b) {
  const [yearA, monthA] = a.split("-").map(Number);
  const [yearB, monthB] = b.split("-").map(Number);
  return (yearB - yearA) * 12 + (monthB - monthA);
}

// Numero de cuota del movimiento de un mes ("YYYY-MM").
export function installmentNumber(rule, month) {
  return rule.installmentFirst + monthsBetween(rule.startDate.slice(0, 7), month);
}

function ruleParams(data) {
  const dayOfMonth = Number(data.startDate.slice(8, 10));
  if (data.kind === "installments") {
    // La ultima cuota: tantos meses despues de startDate como cuotas faltan.
    const lastMonth = addMonths(data.startDate.slice(0, 7), data.installmentsTotal - data.installmentFirst);
    return {
      ...ruleParams({ ...data, kind: "recurring" }),
      endDate: occurrenceDate(lastMonth, dayOfMonth),
      installmentsTotal: data.installmentsTotal,
      installmentFirst: data.installmentFirst,
    };
  }
  return {
    type: data.type,
    title: data.title,
    amount: data.amount,
    currency: data.currency ?? "ARS",
    category: data.category,
    paymentMethod: data.paymentMethod,
    note: data.note ?? "",
    dayOfMonth,
    startDate: data.startDate,
    endDate: data.endDate ?? null,
    active: data.active !== false,
    installmentsTotal: null,
    installmentFirst: null,
  };
}

// Meses ya generados de cada regla: { [ruleId]: Set("YYYY-MM") }.
async function occurrencesByRule(db, ruleIds) {
  const done = Object.fromEntries(ruleIds.map((id) => [id, new Set()]));
  if (!ruleIds.length) return done;
  const rows = await db.all(sql`
    SELECT recurring_id AS "ruleId", month FROM recurring_occurrences
    WHERE recurring_id = ANY(${ruleIds}::int[])
  `);
  for (const row of rows) done[row.ruleId].add(row.month);
  return done;
}

export function createRecurringService(db, { now = () => new Date() } = {}) {
  // Proxima fecha que todavia no se genero (o null si la regla termino).
  function nextDate(rule, done, today = toISODate(now())) {
    if (!rule.active) return null;
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

  async function withExtras(rules) {
    const done = await occurrencesByRule(db, rules.map((rule) => rule.id));
    return rules.map((rule) => {
      const months = [...done[rule.id]].sort();
      const next = nextDate(rule, done[rule.id]);
      const extras = {
        kind: rule.installmentsTotal ? "installments" : "recurring",
        nextDate: next,
        lastGeneratedMonth: months.at(-1) ?? null,
      };
      if (rule.installmentsTotal) {
        // Pagadas: las de antes de cargarla mas las que ya se generaron.
        const paid = Math.min(rule.installmentsTotal, rule.installmentFirst - 1 + months.length);
        extras.installmentsPaid = paid;
        extras.nextInstallment = next ? installmentNumber(rule, next.slice(0, 7)) : null;
        extras.remainingAmount = (rule.installmentsTotal - paid) * rule.amount;
      }
      return { ...rule, ...extras };
    });
  }

  async function list(userId) {
    const rules = await db.all(sql`
      SELECT ${COLUMNS} FROM recurring WHERE user_id = ${userId}
      ORDER BY active DESC, day_of_month, title
    `);
    return withExtras(rules);
  }

  async function get(userId, id) {
    const rule = await db.one(
      sql`SELECT ${COLUMNS} FROM recurring WHERE id = ${id} AND user_id = ${userId}`,
    );
    return rule ? (await withExtras([rule]))[0] : null;
  }

  // Genera las ocurrencias pendientes hasta hoy para un usuario. Devuelve cuantas creo.
  async function generateDue(userId, today = toISODate(now())) {
    const currentMonth = today.slice(0, 7);
    const oldest = addMonths(currentMonth, -MAX_BACKFILL_MONTHS);

    return db.transaction(async (tx) => {
      const rules = await tx.all(
        sql`SELECT ${COLUMNS} FROM recurring WHERE user_id = ${userId} AND active`,
      );
      const done = await occurrencesByRule(tx, rules.map((rule) => rule.id));
      let created = 0;

      for (const rule of rules) {
        let month = rule.startDate.slice(0, 7);
        if (month < oldest) month = oldest;

        for (; month <= currentMonth; month = addMonths(month, 1)) {
          if (done[rule.id].has(month)) continue;
          const date = occurrenceDate(month, rule.dayOfMonth);
          if (date < rule.startDate || date > today) continue;
          if (rule.endDate && date > rule.endDate) break;

          // Si otra peticion ya genero este mes, no se duplica.
          const inserted = await tx.run(sql`
            INSERT INTO recurring_occurrences (recurring_id, month)
            VALUES (${rule.id}, ${month})
            ON CONFLICT DO NOTHING
          `);
          if (!inserted) continue;
          // Una sola cuota (un pago diferido) no lleva numero en el titulo.
          const title =
            rule.installmentsTotal > 1
              ? `${rule.title} (${installmentNumber(rule, month)}/${rule.installmentsTotal})`
              : rule.title;
          await tx.run(sql`
            INSERT INTO movements (user_id, type, title, amount, currency, date, category,
                                   payment_method, note, recurring_id)
            VALUES (${userId}, ${rule.type}, ${title}, ${rule.amount}, ${rule.currency},
                    ${date}, ${rule.category}, ${rule.paymentMethod}, ${rule.note}, ${rule.id})
          `);
          created++;
        }
      }
      return created;
    });
  }

  async function create(userId, data) {
    const rule = ruleParams(data);
    const { id } = await db.one(sql`
      INSERT INTO recurring (user_id, type, title, amount, currency, category, payment_method,
                             note, day_of_month, start_date, end_date, active,
                             installments_total, installment_first)
      VALUES (${userId}, ${rule.type}, ${rule.title}, ${rule.amount}, ${rule.currency},
              ${rule.category}, ${rule.paymentMethod}, ${rule.note}, ${rule.dayOfMonth},
              ${rule.startDate}, ${rule.endDate}, ${rule.active},
              ${rule.installmentsTotal}, ${rule.installmentFirst})
      RETURNING id
    `);
    await generateDue(userId);
    return get(userId, id);
  }

  // Los cambios aplican a las proximas ocurrencias; las ya generadas no se tocan.
  async function update(userId, id, data) {
    const rule = ruleParams(data);
    const changed = await db.run(sql`
      UPDATE recurring
      SET type = ${rule.type}, title = ${rule.title}, amount = ${rule.amount},
          currency = ${rule.currency}, category = ${rule.category},
          payment_method = ${rule.paymentMethod}, note = ${rule.note},
          day_of_month = ${rule.dayOfMonth}, start_date = ${rule.startDate},
          end_date = ${rule.endDate}, active = ${rule.active},
          installments_total = ${rule.installmentsTotal},
          installment_first = ${rule.installmentFirst}, updated_at = now()
      WHERE id = ${id} AND user_id = ${userId}
    `);
    if (!changed) return null;
    await generateDue(userId);
    return get(userId, id);
  }

  // Los movimientos ya generados se conservan (recurring_id pasa a NULL).
  async function remove(userId, id) {
    const count = await db.run(
      sql`DELETE FROM recurring WHERE id = ${id} AND user_id = ${userId}`,
    );
    return count > 0;
  }

  return { list, get, create, update, remove, generateDue };
}
