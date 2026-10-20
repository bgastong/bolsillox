import { reminderEmail } from "./emails.js";
import { sql } from "./sql.js";

/*
Recordatorios por email de cuotas para pagar y de lo que te tienen que pagar.
Cada cuota o deuda avisa una vez en cada momento: 2 dias antes, 1 dia antes, el
mismo dia y, si se vencio, una vez mas. Lo ya enviado queda en
installment_reminders y receivable_reminders, asi correrlo varias veces el
mismo dia no repite emails. Cada persona recibe un solo email con todo lo que le
toca ese dia, en su idioma. Cada tipo de aviso se puede apagar desde Ajustes.
*/

// Ajustes de avisos guardados en user_settings.
export const NOTIFICATION_KEYS = {
  installmentEmails: "installmentEmails",
  receivableEmails: "receivableEmails",
  language: "language",
};

function reminderKind(daysLeft) {
  return daysLeft < 0 ? "overdue" : `d${daysLeft}`;
}

export function createReminders(db, { recurring, receivables, mailer, appUrl = null }) {
  async function getSettings(userId) {
    const rows = await db.all(sql`
      SELECT key, value FROM user_settings
      WHERE user_id = ${userId}
        AND key IN (${NOTIFICATION_KEYS.installmentEmails}, ${NOTIFICATION_KEYS.receivableEmails}, ${NOTIFICATION_KEYS.language})
    `);
    const values = Object.fromEntries(rows.map((row) => [row.key, row.value]));
    return {
      installmentEmails: values.installmentEmails !== "off",
      receivableEmails: values.receivableEmails !== "off",
      language: values.language === "en" ? "en" : "es",
    };
  }

  async function saveSettings(userId, { installmentEmails, receivableEmails, language }) {
    const entries = [];
    if (installmentEmails !== undefined) entries.push([NOTIFICATION_KEYS.installmentEmails, installmentEmails ? "on" : "off"]);
    if (receivableEmails !== undefined) entries.push([NOTIFICATION_KEYS.receivableEmails, receivableEmails ? "on" : "off"]);
    if (language !== undefined) entries.push([NOTIFICATION_KEYS.language, language]);
    for (const [key, value] of entries) {
      await db.run(sql`
        INSERT INTO user_settings (user_id, key, value) VALUES (${userId}, ${key}, ${value})
        ON CONFLICT (user_id, key) DO UPDATE SET value = excluded.value
      `);
    }
    return getSettings(userId);
  }

  // Cuotas que todavia no se avisaron en este momento (y las marca como avisadas).
  async function newInstallments(userId) {
    const items = [];
    for (const item of await recurring.alerts(userId)) {
      const kind = reminderKind(item.daysLeft);
      const inserted = await db.run(sql`
        INSERT INTO installment_reminders (recurring_id, month, kind)
        VALUES (${item.ruleId}, ${item.month}, ${kind})
        ON CONFLICT DO NOTHING
      `);
      if (inserted) items.push({ ...item, kind });
    }
    return items;
  }

  // Lo mismo para lo que me deben.
  async function newReceivables(userId) {
    const items = [];
    for (const item of await receivables.alerts(userId)) {
      const kind = reminderKind(item.daysLeft);
      const inserted = await db.run(sql`
        INSERT INTO receivable_reminders (receivable_id, due_date, kind)
        VALUES (${item.id}, ${item.dueDate}, ${kind})
        ON CONFLICT DO NOTHING
      `);
      if (inserted) items.push({ ...item, kind });
    }
    return items;
  }

  // Si el email no salio, se borran las marcas para reintentar en la proxima vuelta.
  async function unmark(installments, owed) {
    for (const item of installments) {
      await db.run(sql`
        DELETE FROM installment_reminders
        WHERE recurring_id = ${item.ruleId} AND month = ${item.month} AND kind = ${item.kind}
      `);
    }
    for (const item of owed) {
      await db.run(sql`
        DELETE FROM receivable_reminders
        WHERE receivable_id = ${item.id} AND due_date = ${item.dueDate} AND kind = ${item.kind}
      `);
    }
  }

  // Manda los recordatorios que tocan hoy. Devuelve cuantos emails mando.
  async function sendDue() {
    if (!mailer.enabled) return 0;
    // Solo quien tiene la cuenta confirmada y compras en cuotas activas o deudas con vencimiento.
    const users = await db.all(sql`
      SELECT u.id, u.email FROM users u
      WHERE NOT u.pending_verification AND (
        EXISTS (SELECT 1 FROM recurring r WHERE r.user_id = u.id AND r.active
                AND r.installments_total IS NOT NULL AND r.confirm_from IS NOT NULL)
        OR EXISTS (SELECT 1 FROM receivables d WHERE d.user_id = u.id AND d.due_date IS NOT NULL)
      )
    `);
    let sent = 0;
    for (const user of users) {
      const settings = await getSettings(user.id);
      const installments = settings.installmentEmails ? await newInstallments(user.id) : [];
      const owed = settings.receivableEmails ? await newReceivables(user.id) : [];
      if (!installments.length && !owed.length) continue;
      try {
        await mailer.send({
          to: user.email,
          ...reminderEmail({ installments, receivables: owed, language: settings.language, appUrl }),
        });
        sent++;
      } catch (error) {
        await unmark(installments, owed);
        console.warn("[recordatorios] no se pudo enviar:", error.message);
      }
    }
    return sent;
  }

  return { getSettings, saveSettings, sendDue };
}
