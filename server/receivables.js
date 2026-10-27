import { HttpError } from "./errors.js";
import { roundMoney } from "./money.js";
import { daysBetween, INSTALLMENT_ALERT_DAYS, toISODate } from "./recurring.js";
import { raw, sql } from "./sql.js";

/*
Deudas que le deben a la persona ("Me deben"). Cada una puede cobrarse en
partes: lo cobrado queda en receivable_payments y, si se pide, cada cobro se
carga tambien como ingreso en los movimientos.
*/

const COLUMNS = raw(`
  r.id, r.person, r.concept, r.amount, r.currency, r.date, r.due_date AS "dueDate",
  r.movement_id AS "movementId",
  r.created_at AS "createdAt", r.updated_at AS "updatedAt",
  COALESCE((SELECT SUM(p.amount) FROM receivable_payments p WHERE p.receivable_id = r.id), 0) AS paid
`);

function withStatus(row) {
  if (!row) return null;
  const paid = roundMoney(row.paid);
  const remaining = roundMoney(row.amount - paid);
  return { ...row, paid, remaining, status: remaining <= 0 ? "paid" : "open" };
}

// Avisa lo que hay que cobrar con la misma anticipacion que las cuotas.
export const RECEIVABLE_ALERT_DAYS = INSTALLMENT_ALERT_DAYS;

export function createReceivablesService(db, { now = () => new Date() } = {}) {
  // Primero las que faltan cobrar (las que vencen antes arriba); despues las cobradas.
  async function list(userId) {
    const rows = await db.all(sql`
      SELECT ${COLUMNS} FROM receivables r WHERE r.user_id = ${userId}
      ORDER BY r.date DESC, r.id DESC
    `);
    const items = rows.map(withStatus);
    const open = items
      .filter((item) => item.status === "open")
      .sort((a, b) => (a.dueDate ?? "9999").localeCompare(b.dueDate ?? "9999") || b.date.localeCompare(a.date));
    return [...open, ...items.filter((item) => item.status === "paid")];
  }

  async function get(userId, id) {
    return withStatus(
      await db.one(sql`SELECT ${COLUMNS} FROM receivables r WHERE r.user_id = ${userId} AND r.id = ${id}`),
    );
  }

  async function create(userId, data) {
    const { id } = await db.one(sql`
      INSERT INTO receivables (user_id, person, concept, amount, currency, date, due_date)
      VALUES (${userId}, ${data.person}, ${data.concept}, ${data.amount}, ${data.currency},
              ${data.date}, ${data.dueDate})
      RETURNING id
    `);
    return get(userId, id);
  }

  async function update(userId, id, data) {
    const current = await get(userId, id);
    if (!current) return null;
    // No puede quedar debiendo menos de lo que ya se cobro.
    if (data.amount < current.paid) {
      throw new HttpError(400, "validation_error", { amount: "errorAmountBelowPaid" });
    }
    await db.run(sql`
      UPDATE receivables
      SET person = ${data.person}, concept = ${data.concept}, amount = ${data.amount},
          currency = ${data.currency}, date = ${data.date}, due_date = ${data.dueDate}, updated_at = now()
      WHERE user_id = ${userId} AND id = ${id}
    `);
    return get(userId, id);
  }

  /*
  Gasto compartido: carga el gasto completo (lo pago la persona) y una deuda en
  "Me deben" por la parte de cada uno, unidas al gasto. Cuando le paguen, el
  cobro se carga como ingreso y el gasto neto queda en su parte.
  */
  async function createShared(userId, { split, ...movement }) {
    return db.transaction(async (tx) => {
      const { id: movementId } = await tx.one(sql`
        INSERT INTO movements (user_id, type, title, amount, currency, date, category, payment_method, note)
        VALUES (${userId}, 'expense', ${movement.title}, ${movement.amount}, ${movement.currency}, ${movement.date},
                ${movement.category}, ${movement.paymentMethod}, ${movement.note ?? ""})
        RETURNING id
      `);
      for (const share of split.people) {
        await tx.run(sql`
          INSERT INTO receivables (user_id, person, concept, amount, currency, date, movement_id)
          VALUES (${userId}, ${share.person}, ${movement.title}, ${share.amount}, ${movement.currency},
                  ${movement.date}, ${movementId})
        `);
      }
      const owed = roundMoney(split.people.reduce((sum, share) => sum + share.amount, 0));
      return { movementId, owed, myShare: roundMoney(movement.amount - owed), people: split.people.length };
    });
  }

  // Los ingresos que ya se cargaron por los cobros quedan en los movimientos.
  async function remove(userId, id) {
    return (await db.run(sql`DELETE FROM receivables WHERE user_id = ${userId} AND id = ${id}`)) > 0;
  }

  /*
  Registra un cobro (total o parcial). Si registerIncome, carga el ingreso
  "Cobro: <persona> (<concepto>)" en la categoria "Otros ingresos".
  */
  async function addPayment(userId, id, { amount, date, registerIncome, paymentMethod }) {
    const current = await get(userId, id);
    if (!current) return null;
    if (current.status === "paid") throw new HttpError(409, "receivable_already_paid");
    if (amount > current.remaining + 0.001) {
      throw new HttpError(400, "validation_error", { amount: "errorPaymentTooLarge" });
    }
    await db.transaction(async (tx) => {
      let movementId = null;
      if (registerIncome) {
        const title = `Cobro: ${current.person}${current.concept ? ` (${current.concept})` : ""}`.slice(0, 80);
        ({ id: movementId } = await tx.one(sql`
          INSERT INTO movements (user_id, type, title, amount, currency, date, category, payment_method, note)
          VALUES (${userId}, 'income', ${title}, ${amount}, ${current.currency}, ${date}, 'otherIncome',
                  ${paymentMethod}, '')
          RETURNING id
        `));
      }
      await tx.run(sql`
        INSERT INTO receivable_payments (receivable_id, amount, date, movement_id)
        VALUES (${id}, ${amount}, ${date}, ${movementId})
      `);
    });
    return get(userId, id);
  }

  /*
  Deudas con vencimiento que faltan cobrar y vencen en los proximos
  RECEIVABLE_ALERT_DAYS dias, hoy o ya vencieron. La que vence antes, primero.
  */
  async function alerts(userId) {
    const today = toISODate(now());
    const items = await list(userId);
    return items
      .filter((item) => item.status === "open" && item.dueDate)
      .map((item) => ({
        id: item.id,
        person: item.person,
        concept: item.concept,
        amount: item.amount,
        paid: item.paid,
        remaining: item.remaining,
        currency: item.currency,
        dueDate: item.dueDate,
        daysLeft: daysBetween(today, item.dueDate),
      }))
      .filter((item) => item.daysLeft <= RECEIVABLE_ALERT_DAYS);
  }

  return { list, get, create, createShared, update, remove, addPayment, alerts };
}
