import { GOALS_MAX } from "../shared/catalog.js";
import { HttpError } from "./errors.js";
import { roundMoney } from "./money.js";
import { toISODate } from "./recurring.js";
import { sql } from "./sql.js";

/*
Metas de ahorro ("Vacaciones: $ 800.000 para marzo"). Lo que se aporta o se
saca queda en savings_goal_entries; si se pide, cada aporte se carga tambien
como gasto (y cada retiro como ingreso) para que el saldo disponible baje.
*/

const GOAL_COLUMNS = sql`
  id, name, target, currency, deadline, icon,
  created_at AS "createdAt", updated_at AS "updatedAt"
`;

// Cuantos aportes recientes vuelven con cada meta.
const RECENT_ENTRIES = 20;

// Meses entre dos fechas "YYYY-MM-DD" contando solo año y mes (b - a).
function monthsBetween(a, b) {
  return (Number(b.slice(0, 4)) - Number(a.slice(0, 4))) * 12 + Number(b.slice(5, 7)) - Number(a.slice(5, 7));
}

/*
Cuanto se lleva y cuanto falta. Con fecha limite, tambien cuanto hay que
apartar por mes para llegar: lo que faltaba al empezar este mes, repartido
entre los meses que quedan (este incluido).
status:
- done: se llego al objetivo.
- overdue: paso la fecha y no se llego.
- onTrack: este mes ya se aporto lo que hacia falta.
- behind: este mes todavia falta aportar.
- open: sin fecha limite.
*/
export function goalProgress({ target, deadline, entries }, today) {
  const saved = roundMoney(entries.reduce((sum, entry) => sum + entry.amount, 0));
  const remaining = roundMoney(Math.max(target - saved, 0));
  const percent = Math.min(100, Math.round((Math.max(saved, 0) / target) * 1000) / 10);
  const base = { saved, remaining, percent, monthsLeft: null, perMonth: null, thisMonth: null, thisMonthLeft: null };

  if (saved >= target) return { ...base, status: "done" };
  if (!deadline) return { ...base, status: "open" };
  if (deadline < today) return { ...base, status: "overdue" };

  const monthStart = `${today.slice(0, 7)}-01`;
  const thisMonth = roundMoney(entries.filter((entry) => entry.date >= monthStart).reduce((sum, entry) => sum + entry.amount, 0));
  const savedBefore = saved - thisMonth;
  const monthsLeft = monthsBetween(today, deadline) + 1;
  // Redondeado para arriba a la unidad: apartando eso todos los meses se llega.
  const perMonth = Math.ceil(Math.max(target - savedBefore, 0) / monthsLeft);
  const thisMonthLeft = roundMoney(Math.max(perMonth - thisMonth, 0));
  return {
    ...base,
    monthsLeft,
    perMonth,
    thisMonth,
    thisMonthLeft,
    status: thisMonthLeft === 0 ? "onTrack" : "behind",
  };
}

// Primero las que faltan (la que vence antes arriba, las sin fecha al final); despues las cumplidas.
function sortGoals(a, b) {
  const doneA = a.status === "done";
  const doneB = b.status === "done";
  if (doneA !== doneB) return doneA ? 1 : -1;
  return (a.deadline ?? "9999").localeCompare(b.deadline ?? "9999") || a.id - b.id;
}

export function createGoalsService(db, { now = () => new Date() } = {}) {
  async function entriesOf(goalIds) {
    if (!goalIds.length) return new Map();
    const rows = await db.all(sql`
      SELECT id, goal_id AS "goalId", amount, date, movement_id AS "movementId"
      FROM savings_goal_entries
      WHERE goal_id = ANY(${goalIds}::int[])
      ORDER BY date DESC, id DESC
    `);
    const byGoal = new Map(goalIds.map((id) => [id, []]));
    for (const row of rows) byGoal.get(row.goalId).push(row);
    return byGoal;
  }

  function withProgress(goal, entries, today) {
    return {
      ...goal,
      ...goalProgress({ target: goal.target, deadline: goal.deadline, entries }, today),
      entries: entries.slice(0, RECENT_ENTRIES).map(({ id, amount, date, movementId }) => ({ id, amount, date, movementId })),
    };
  }

  async function list(userId) {
    const today = toISODate(now());
    const goals = await db.all(sql`SELECT ${GOAL_COLUMNS} FROM savings_goals WHERE user_id = ${userId}`);
    const entries = await entriesOf(goals.map((goal) => goal.id));
    return goals.map((goal) => withProgress(goal, entries.get(goal.id), today)).sort(sortGoals);
  }

  async function get(userId, id) {
    const goal = await db.one(sql`SELECT ${GOAL_COLUMNS} FROM savings_goals WHERE user_id = ${userId} AND id = ${id}`);
    if (!goal) return null;
    const entries = await entriesOf([goal.id]);
    return withProgress(goal, entries.get(goal.id), toISODate(now()));
  }

  async function create(userId, data) {
    const { count } = await db.one(sql`SELECT COUNT(*) AS count FROM savings_goals WHERE user_id = ${userId}`);
    if (count >= GOALS_MAX) throw new HttpError(409, "goals_limit");
    const { id } = await db.one(sql`
      INSERT INTO savings_goals (user_id, name, target, currency, deadline, icon)
      VALUES (${userId}, ${data.name}, ${data.target}, ${data.currency}, ${data.deadline}, ${data.icon})
      RETURNING id
    `);
    return get(userId, id);
  }

  // La moneda no se cambia si ya hay aportes (quedarian en otra moneda).
  async function update(userId, id, data) {
    const current = await get(userId, id);
    if (!current) return null;
    if (data.currency !== current.currency && current.entries.length) {
      throw new HttpError(400, "validation_error", { currency: "errorGoalCurrencyLocked" });
    }
    await db.run(sql`
      UPDATE savings_goals
      SET name = ${data.name}, target = ${data.target}, currency = ${data.currency},
          deadline = ${data.deadline}, icon = ${data.icon}, updated_at = now()
      WHERE user_id = ${userId} AND id = ${id}
    `);
    return get(userId, id);
  }

  // Los gastos e ingresos que se cargaron por los aportes quedan en los movimientos.
  async function remove(userId, id) {
    return (await db.run(sql`DELETE FROM savings_goals WHERE user_id = ${userId} AND id = ${id}`)) > 0;
  }

  /*
  Aporte o retiro. Si registerMovement, carga "Ahorro: <meta>" como gasto (en
  Otros) o "Retiro de ahorro: <meta>" como ingreso (en Otros ingresos).
  No se puede sacar mas de lo que hay ahorrado.
  */
  async function addEntry(userId, id, { type, amount, date, registerMovement, paymentMethod }) {
    const goal = await get(userId, id);
    if (!goal) return null;
    if (type === "withdraw" && amount > goal.saved + 0.001) {
      throw new HttpError(400, "validation_error", { amount: "errorWithdrawTooLarge" });
    }
    await db.transaction(async (tx) => {
      let movementId = null;
      if (registerMovement) {
        const deposit = type === "deposit";
        const title = `${deposit ? "Ahorro" : "Retiro de ahorro"}: ${goal.name}`.slice(0, 80);
        ({ id: movementId } = await tx.one(sql`
          INSERT INTO movements (user_id, type, title, amount, currency, date, category, payment_method, note)
          VALUES (${userId}, ${deposit ? "expense" : "income"}, ${title}, ${amount}, ${goal.currency}, ${date},
                  ${deposit ? "other" : "otherIncome"}, ${paymentMethod}, '')
          RETURNING id
        `));
      }
      await tx.run(sql`
        INSERT INTO savings_goal_entries (goal_id, amount, date, movement_id)
        VALUES (${id}, ${type === "deposit" ? amount : -amount}, ${date}, ${movementId})
      `);
    });
    return get(userId, id);
  }

  /*
  Borra un aporte o retiro (por ejemplo, cargado de mas) y el movimiento que
  genero, si quedo. No se puede si la meta quedaria con menos de cero.
  */
  async function removeEntry(userId, id, entryId) {
    const goal = await get(userId, id);
    if (!goal) return false;
    const entry = await db.one(sql`SELECT amount FROM savings_goal_entries WHERE id = ${entryId} AND goal_id = ${id}`);
    if (!entry) return false;
    if (goal.saved - entry.amount < -0.001) throw new HttpError(409, "goal_entry_needed");
    return db.transaction(async (tx) => {
      const entry = await tx.one(sql`
        DELETE FROM savings_goal_entries e
        USING savings_goals g
        WHERE e.id = ${entryId} AND e.goal_id = ${id} AND g.id = e.goal_id AND g.user_id = ${userId}
        RETURNING e.movement_id AS "movementId"
      `);
      if (!entry) return false;
      if (entry.movementId) {
        await tx.run(sql`DELETE FROM movements WHERE id = ${entry.movementId} AND user_id = ${userId}`);
      }
      return true;
    });
  }

  return { list, get, create, update, remove, addEntry, removeEntry };
}
