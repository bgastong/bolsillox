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
