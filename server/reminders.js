import { installmentReminderEmail } from "./emails.js";
import { sql } from "./sql.js";

/*
Recordatorios de cuotas por email. Cada cuota pendiente avisa una vez en cada
momento: 2 dias antes, 1 dia antes, el mismo dia y, si se vencio sin pagar, una
vez mas. Lo ya enviado queda en installment_reminders, asi correrlo varias veces
el mismo dia no repite emails. Cada persona recibe un solo email con todo lo que
le toca ese dia, en su idioma. Se puede apagar desde Ajustes.
*/

// Ajustes de avisos guardados en user_settings.
export const NOTIFICATION_KEYS = { installmentEmails: "installmentEmails", language: "language" };

function reminderKind(daysLeft) {
  return daysLeft < 0 ? "overdue" : `d${daysLeft}`;
}

export function createReminders(db, { recurring, mailer, appUrl = null }) {
  async function getSettings(userId) {
    const rows = await db.all(sql`
      SELECT key, value FROM user_settings
      WHERE user_id = ${userId} AND key IN (${NOTIFICATION_KEYS.installmentEmails}, ${NOTIFICATION_KEYS.language})
    `);
    const values = Object.fromEntries(rows.map((row) => [row.key, row.value]));
    return {
      installmentEmails: values.installmentEmails !== "off",
      language: values.language === "en" ? "en" : "es",
    };
  }

  async function saveSettings(userId, { installmentEmails, language }) {
    const entries = [];
    if (installmentEmails !== undefined) entries.push([NOTIFICATION_KEYS.installmentEmails, installmentEmails ? "on" : "off"]);
    if (language !== undefined) entries.push([NOTIFICATION_KEYS.language, language]);
    for (const [key, value] of entries) {
      await db.run(sql`
        INSERT INTO user_settings (user_id, key, value) VALUES (${userId}, ${key}, ${value})
        ON CONFLICT (user_id, key) DO UPDATE SET value = excluded.value
      `);
    }
    return getSettings(userId);
  }

  // Manda los recordatorios que tocan hoy. Devuelve cuantos emails mando.
  async function sendDue() {
    if (!mailer.enabled) return 0;
    // Solo quien tiene compras en cuotas activas y la cuenta confirmada.
    const users = await db.all(sql`
      SELECT DISTINCT u.id, u.email FROM users u
      JOIN recurring r ON r.user_id = u.id
      WHERE NOT u.pending_verification AND r.active AND r.installments_total IS NOT NULL
        AND r.confirm_from IS NOT NULL
    `);
    let sent = 0;
    for (const user of users) {
      const settings = await getSettings(user.id);
      if (!settings.installmentEmails) continue;
      const items = [];
      for (const item of await recurring.alerts(user.id)) {
        const kind = reminderKind(item.daysLeft);
        const inserted = await db.run(sql`
          INSERT INTO installment_reminders (recurring_id, month, kind)
          VALUES (${item.ruleId}, ${item.month}, ${kind})
          ON CONFLICT DO NOTHING
        `);
        if (inserted) items.push({ ...item, kind });
      }
      if (!items.length) continue;
      try {
        await mailer.send({ to: user.email, ...installmentReminderEmail({ items, language: settings.language, appUrl }) });
        sent++;
      } catch (error) {
        // Si no salio, se borra la marca para reintentar en la proxima vuelta.
        for (const item of items) {
          await db.run(sql`
            DELETE FROM installment_reminders
            WHERE recurring_id = ${item.ruleId} AND month = ${item.month} AND kind = ${item.kind}
          `);
        }
        console.warn("[recordatorios] no se pudo enviar:", error.message);
      }
    }
    return sent;
  }

  return { getSettings, saveSettings, sendDue };
}
