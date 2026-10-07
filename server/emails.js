// Textos de los emails con codigo, en español e ingles.

const COPY = {
  es: {
    verify_email: {
      subject: "Tu código para activar bolsillox",
      intro: "Usá este código para confirmar tu email y activar tu cuenta:",
    },
    reset_password: {
      subject: "Tu código para recuperar la contraseña",
      intro: "Usá este código para elegir una contraseña nueva:",
    },
    change_email: {
      subject: "Confirmá tu nuevo email en bolsillox",
      intro: "Usá este código para confirmar que este es tu nuevo email:",
    },
    expires: "Vence en {{minutes}} minutos.",
    ignore: "Si no fuiste vos, ignorá este email: tu cuenta sigue igual.",
  },
  en: {
    verify_email: {
      subject: "Your code to activate bolsillox",
      intro: "Use this code to confirm your email and activate your account:",
    },
    reset_password: {
      subject: "Your password reset code",
      intro: "Use this code to choose a new password:",
    },
    change_email: {
      subject: "Confirm your new email on bolsillox",
      intro: "Use this code to confirm this is your new email:",
    },
    expires: "It expires in {{minutes}} minutes.",
    ignore: "If this wasn't you, ignore this email: your account stays the same.",
  },
};

function escapeHtml(text) {
  return text.replace(/[&<>"']/g, (char) => `&#${char.charCodeAt(0)};`);
}

export function codeEmail({ purpose, code, language = "es", minutes }) {
  const copy = COPY[language] ?? COPY.es;
  const { subject, intro } = copy[purpose];
  const expires = copy.expires.replace("{{minutes}}", String(minutes));
  const text = `${intro}\n\n${code}\n\n${expires}\n${copy.ignore}\n\n— bolsillox`;
  const html = `<!doctype html><html><body style="margin:0;background:#f6f6f5;font-family:-apple-system,Segoe UI,Roboto,sans-serif;color:#0b0c0e">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:440px;background:#ffffff;border:1px solid #e6e6e6;border-radius:14px">
<tr><td style="padding:28px">
<p style="margin:0 0 18px;font-size:16px;font-weight:600;letter-spacing:-0.02em">bolsillo<span style="color:#8b8f97">x</span></p>
<p style="margin:0 0 18px;font-size:15px;line-height:1.5">${escapeHtml(intro)}</p>
<p style="margin:0 0 18px;font-family:ui-monospace,Menlo,monospace;font-size:32px;letter-spacing:0.25em;font-weight:600">${code}</p>
<p style="margin:0 0 6px;font-size:13px;color:#5f636b">${escapeHtml(expires)}</p>
<p style="margin:0;font-size:13px;color:#5f636b">${escapeHtml(copy.ignore)}</p>
</td></tr></table></td></tr></table></body></html>`;
  return { subject, text, html };
}
