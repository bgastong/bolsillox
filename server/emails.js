// Emails con codigo (verificacion, recuperar contraseña y cambio de email), en español e ingles.

const COPY = {
  es: {
    verify_email: {
      subject: "Tu código para activar bolsillox",
      title: "Confirmá tu email",
      intro: "Ingresá este código en bolsillox para activar tu cuenta.",
    },
    reset_password: {
      subject: "Tu código para recuperar la contraseña",
      title: "Recuperá tu contraseña",
      intro: "Ingresá este código para elegir una contraseña nueva.",
    },
    change_email: {
      subject: "Confirmá tu nuevo email en bolsillox",
      title: "Confirmá tu nuevo email",
      intro: "Ingresá este código para confirmar que este es tu nuevo email.",
    },
    codeLabel: "Tu código",
    preheader: "Tu código es {{code}}. Vence en {{minutes}} minutos.",
    expires: "Vence en {{minutes}} minutos.",
    ignore: "Si no fuiste vos, ignorá este email: tu cuenta sigue igual. Nunca te vamos a pedir este código por otro medio.",
    tagline: "Tus finanzas, claras.",
    terms: "Términos",
    privacy: "Privacidad",
  },
  en: {
    verify_email: {
      subject: "Your code to activate bolsillox",
      title: "Confirm your email",
      intro: "Enter this code in bolsillox to activate your account.",
    },
    reset_password: {
      subject: "Your password reset code",
      title: "Reset your password",
      intro: "Enter this code to choose a new password.",
    },
    change_email: {
      subject: "Confirm your new email on bolsillox",
      title: "Confirm your new email",
      intro: "Enter this code to confirm this is your new email.",
    },
    codeLabel: "Your code",
    preheader: "Your code is {{code}}. It expires in {{minutes}} minutes.",
    expires: "It expires in {{minutes}} minutes.",
    ignore: "If this wasn't you, ignore this email: your account stays the same. We will never ask you for this code any other way.",
    tagline: "Your money, clear.",
    terms: "Terms",
    privacy: "Privacy",
  },
};

// Colores (tema claro: los clientes de email no siempre respetan fondos oscuros).
const C = {
  page: "#f4f4f2",
  card: "#ffffff",
  border: "#e7e7e4",
  text: "#0b0c0e",
  muted: "#5f636b",
  faint: "#8b8f97",
  codeBg: "#f6f6f4",
};

const FONT = "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";
const MONO = "ui-monospace,SFMono-Regular,Menlo,Consolas,'Liberation Mono',monospace";

function escapeHtml(text) {
  return String(text).replace(/[&<>"']/g, (char) => `&#${char.charCodeAt(0)};`);
}

function fill(template, values) {
  return template.replace(/\{\{(\w+)\}\}/g, (match, key) => values[key] ?? match);
}

// Logo "pila" (tres monedas) armado con tablas: se ve aunque el cliente bloquee las imagenes.
function logo() {
  const bar = (width, opacity, margin) =>
    `<tr><td style="padding:0 0 ${margin}px 0"><div style="width:${width}px;height:5px;border-radius:3px;background:#ffffff;opacity:${opacity};font-size:0;line-height:0">&nbsp;</div></td></tr>`;
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
<td width="32" height="32" align="center" valign="middle" style="width:32px;height:32px;background:${C.text};border-radius:8px">
<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 auto">${bar(17, 1, 2)}${bar(15, 0.65, 2)}${bar(17, 0.35, 0)}</table>
</td>
<td style="padding-left:10px;font-family:${FONT};font-size:17px;font-weight:600;letter-spacing:-0.3px;color:${C.text}">bolsillo<span style="color:${C.faint}">x</span></td>
</tr></table>`;
}

/*
Email con un codigo de 6 digitos.
- purpose: "verify_email" | "reset_password" | "change_email"
- appUrl: URL publica de la app, para los links del pie (sin ella no se ponen).
*/
export function codeEmail({ purpose, code, language = "es", minutes, appUrl = null }) {
  const copy = COPY[language] ?? COPY.es;
  const { subject, title, intro } = copy[purpose];
  const values = { code, minutes: String(minutes) };
  const expires = fill(copy.expires, values);
  const text = `${title}\n\n${intro}\n\n${code}\n\n${expires}\n${copy.ignore}\n\n— bolsillox`;

  const links = appUrl
    ? `<p style="margin:8px 0 0;font-family:${FONT};font-size:12px;color:${C.faint}">
<a href="${escapeHtml(appUrl)}/terminos" style="color:${C.faint};text-decoration:underline">${escapeHtml(copy.terms)}</a>
&nbsp;·&nbsp;
<a href="${escapeHtml(appUrl)}/privacidad" style="color:${C.faint};text-decoration:underline">${escapeHtml(copy.privacy)}</a>
</p>`
    : "";

  const html = `<!doctype html>
<html lang="${language === "en" ? "en" : "es"}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light only">
<meta name="supported-color-schemes" content="light only">
<title>${escapeHtml(subject)}</title>
</head>
<body style="margin:0;padding:0;background:${C.page};-webkit-text-size-adjust:100%">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:${C.page}">${escapeHtml(fill(copy.preheader, values))}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${C.page}">
<tr><td align="center" style="padding:40px 16px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:460px">
<tr><td style="padding:0 4px 20px">${logo()}</td></tr>
<tr><td style="background:${C.card};border:1px solid ${C.border};border-radius:16px;padding:32px 28px">
<h1 style="margin:0 0 8px;font-family:${FONT};font-size:22px;line-height:1.25;font-weight:600;letter-spacing:-0.4px;color:${C.text}">${escapeHtml(title)}</h1>
<p style="margin:0 0 24px;font-family:${FONT};font-size:15px;line-height:1.55;color:${C.muted}">${escapeHtml(intro)}</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
<tr><td align="center" style="background:${C.codeBg};border:1px solid ${C.border};border-radius:12px;padding:18px 12px 20px">
<p style="margin:0 0 6px;font-family:${FONT};font-size:12px;letter-spacing:0.4px;text-transform:uppercase;color:${C.faint}">${escapeHtml(copy.codeLabel)}</p>
<p style="margin:0;font-family:${MONO};font-size:34px;line-height:1.2;font-weight:600;letter-spacing:8px;padding-left:8px;color:${C.text}">${escapeHtml(code)}</p>
</td></tr>
</table>
<p style="margin:20px 0 0;font-family:${FONT};font-size:14px;line-height:1.5;color:${C.text}">${escapeHtml(expires)}</p>
<p style="margin:16px 0 0;padding-top:16px;border-top:1px solid ${C.border};font-family:${FONT};font-size:13px;line-height:1.55;color:${C.muted}">${escapeHtml(copy.ignore)}</p>
</td></tr>
<tr><td align="center" style="padding:20px 4px 0">
<p style="margin:0;font-family:${FONT};font-size:12px;color:${C.faint}">bolsillox · ${escapeHtml(copy.tagline)}</p>
${links}
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;
  return { subject, text, html };
}

const REMINDER_COPY = {
  es: {
    installments: {
      subjectOne: "Cuota de {{title}}: {{due}}",
      subjectMany: "Tenés {{count}} cuotas para pagar",
      title: "Cuotas para pagar",
      intro: "Cuando las pagues, entrá a bolsillox y tocá «Ya la pagué»: así se cargan en tus gastos.",
      due: { overdue: "venció sin pagar", 0: "vence hoy", 1: "vence mañana", 2: "vence en 2 días" },
    },
    receivables: {
      subjectOne: "{{title}} te tiene que pagar: {{due}}",
      subjectMany: "Tenés {{count}} cobros pendientes",
      title: "Te tienen que pagar",
      intro: "Cuando te paguen, entrá a bolsillox y tocá «Cobrar»: así se carga en tus ingresos.",
      due: { overdue: "venció sin cobrar", 0: "vence hoy", 1: "vence mañana", 2: "vence en 2 días" },
    },
    subjectBoth: "Tenés {{count}} avisos de cuotas y cobros",
    titleBoth: "Tus avisos de hoy",
    cta: "Abrir bolsillox",
    settings: "Podés apagar estos avisos en Ajustes.",
    tagline: "Tu plata, clara.",
  },
  en: {
    installments: {
      subjectOne: "{{title}} installment: {{due}}",
      subjectMany: "You have {{count}} installments to pay",
      title: "Installments to pay",
      intro: "When you pay them, open bolsillox and tap “Mark as paid” so they're added to your expenses.",
      due: { overdue: "overdue, unpaid", 0: "due today", 1: "due tomorrow", 2: "due in 2 days" },
    },
    receivables: {
      subjectOne: "{{title}} owes you: {{due}}",
      subjectMany: "You have {{count}} payments to collect",
      title: "Money owed to you",
      intro: "When they pay you, open bolsillox and tap “Collect” so it's added to your income.",
      due: { overdue: "overdue, not collected", 0: "due today", 1: "due tomorrow", 2: "due in 2 days" },
    },
    subjectBoth: "You have {{count}} installment and payment reminders",
    titleBoth: "Today's reminders",
    cta: "Open bolsillox",
    settings: "You can turn these reminders off in Settings.",
    tagline: "Your money, clear.",
  },
};

function formatAmount(amount, currency, language) {
  return new Intl.NumberFormat(language === "en" ? "en-US" : "es-AR", {
    style: "currency",
    currency,
    minimumFractionDigits: Number.isInteger(amount) ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

/*
Recordatorio del dia: cuotas para pagar y lo que te tienen que pagar, cada uno
en su seccion (si hay de los dos tipos). Cada item vence en 2 dias, mañana, hoy
o ya vencio.
- installments: [{ title, number, total, amount, currency, daysLeft }]
- receivables: [{ person, concept, remaining, currency, daysLeft }]
*/
export function reminderEmail({ installments = [], receivables = [], language = "es", appUrl = null }) {
  const copy = REMINDER_COPY[language] ?? REMINDER_COPY.es;
  const sections = [
    {
      copy: copy.installments,
      items: installments.map((item) => ({
        label: item.total > 1 ? `${item.title} (${item.number}/${item.total})` : item.title,
        amount: item.amount,
        currency: item.currency,
        daysLeft: item.daysLeft,
      })),
    },
    {
      copy: copy.receivables,
      items: receivables.map((item) => ({
        label: item.concept ? `${item.person} (${item.concept})` : item.person,
        subjectLabel: item.person,
        amount: item.remaining,
        currency: item.currency,
        daysLeft: item.daysLeft,
      })),
    },
  ].filter((section) => section.items.length);

  const dueText = (section, item) => (item.daysLeft < 0 ? section.copy.due.overdue : section.copy.due[item.daysLeft]);
  const total = sections.reduce((sum, section) => sum + section.items.length, 0);
  let subject;
  if (sections.length > 1) subject = fill(copy.subjectBoth, { count: String(total) });
  else {
    const [section] = sections;
    const [first] = section.items;
    subject =
      section.items.length === 1
        ? fill(section.copy.subjectOne, { title: first.subjectLabel ?? first.label, due: dueText(section, first) })
        : fill(section.copy.subjectMany, { count: String(section.items.length) });
  }
  const title = sections.length > 1 ? copy.titleBoth : sections[0].copy.title;

  const lines = sections.map((section) =>
    section.items.map(
      (item) => `- ${item.label}: ${formatAmount(item.amount, item.currency, language)} · ${dueText(section, item)}`,
    ),
  );
  const textSections = sections.map(
    (section, index) =>
      `${sections.length > 1 ? `${section.copy.title}\n\n` : ""}${lines[index].join("\n")}\n\n${section.copy.intro}`,
  );
  const text = `${title}\n\n${textSections.join("\n\n")}\n${appUrl ? `\n${appUrl}\n` : ""}\n${copy.settings}\n\n— bolsillox`;

  const sectionHtml = sections
    .map((section, index) => {
      const rows = section.items
        .map((item) => {
          const color = item.daysLeft < 0 ? "#c9393e" : item.daysLeft === 0 ? "#a16207" : C.muted;
          return `<tr><td style="padding:12px 0;border-top:1px solid ${C.border}">
<p style="margin:0;font-family:${FONT};font-size:15px;line-height:1.4;color:${C.text}">${escapeHtml(item.label)}</p>
<p style="margin:2px 0 0;font-family:${FONT};font-size:13px;line-height:1.4;color:${color}">${escapeHtml(dueText(section, item))}</p>
</td>
<td align="right" valign="top" style="padding:12px 0 12px 12px;border-top:1px solid ${C.border};font-family:${MONO};font-size:14px;white-space:nowrap;color:${C.text}">${escapeHtml(formatAmount(item.amount, item.currency, language))}</td></tr>`;
        })
        .join("");
      const heading =
        sections.length > 1
          ? `<h2 style="margin:${index ? "28px" : "0"} 0 4px;font-family:${FONT};font-size:16px;line-height:1.3;font-weight:600;color:${C.text}">${escapeHtml(section.copy.title)}</h2>`
          : "";
      return `${heading}<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">${rows}</table>
<p style="margin:16px 0 0;padding-top:16px;border-top:1px solid ${C.border};font-family:${FONT};font-size:14px;line-height:1.55;color:${C.muted}">${escapeHtml(section.copy.intro)}</p>`;
    })
    .join("\n");

  const button = appUrl
    ? `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin-top:20px"><tr><td style="background:${C.text};border-radius:10px">
<a href="${escapeHtml(appUrl)}" style="display:inline-block;padding:12px 20px;font-family:${FONT};font-size:14px;font-weight:600;color:#ffffff;text-decoration:none">${escapeHtml(copy.cta)}</a>
</td></tr></table>`
    : "";

  const html = `<!doctype html>
<html lang="${language === "en" ? "en" : "es"}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light only">
<meta name="supported-color-schemes" content="light only">
<title>${escapeHtml(subject)}</title>
</head>
<body style="margin:0;padding:0;background:${C.page};-webkit-text-size-adjust:100%">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:${C.page}">${escapeHtml(lines.flat().join(" · "))}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${C.page}">
<tr><td align="center" style="padding:40px 16px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:460px">
<tr><td style="padding:0 4px 20px">${logo()}</td></tr>
<tr><td style="background:${C.card};border:1px solid ${C.border};border-radius:16px;padding:32px 28px">
<h1 style="margin:0 0 16px;font-family:${FONT};font-size:22px;line-height:1.25;font-weight:600;letter-spacing:-0.4px;color:${C.text}">${escapeHtml(title)}</h1>
${sectionHtml}
${button}
</td></tr>
<tr><td align="center" style="padding:20px 4px 0">
<p style="margin:0;font-family:${FONT};font-size:12px;color:${C.faint}">${escapeHtml(copy.settings)}</p>
<p style="margin:8px 0 0;font-family:${FONT};font-size:12px;color:${C.faint}">bolsillox · ${escapeHtml(copy.tagline)}</p>
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;
  return { subject, text, html };
}
