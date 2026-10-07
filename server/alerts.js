/*
Aviso de errores por email (con el mismo Resend de los codigos).
Cada error inesperado (500 en la API o una falla en la pagina) se escribe en
los logs y, si hay ALERT_EMAIL, se manda un email. Para no llenar la casilla:
- el mismo error se avisa como mucho una vez por hora (por instancia);
- y como mucho 20 emails por hora en total.
Los emails no incluyen datos cargados por las personas (ni el cuerpo del
pedido), solo la ruta, el id de usuario y el detalle tecnico del error.
*/
const HOUR_MS = 60 * 60 * 1000;
const MAX_PER_HOUR = 20;

function firstLine(text) {
  return String(text ?? "").split("\n")[0].slice(0, 200);
}

// Identifica "el mismo error": mensaje + primera linea del stack que no sea del mensaje.
function signatureOf({ source, message, stack }) {
  const frame = String(stack ?? "")
    .split("\n")
    .find((line) => line.trim().startsWith("at "));
  return `${source}|${firstLine(message)}|${frame?.trim() ?? ""}`;
}

export function createErrorReporter({ mailer, to = null, appName = "bolsillox", now = () => new Date() }) {
  const lastSent = new Map();
  let windowStart = 0;
  let sentInWindow = 0;

  function shouldEmail(signature, time) {
    if (!to || !mailer?.enabled) return false;
    if (time - windowStart > HOUR_MS) {
      windowStart = time;
      sentInWindow = 0;
    }
    if (sentInWindow >= MAX_PER_HOUR) return false;
    const previous = lastSent.get(signature);
    if (previous && time - previous < HOUR_MS) return false;
    if (lastSent.size > 500) lastSent.clear();
    lastSent.set(signature, time);
    sentInWindow++;
    return true;
  }

  /*
  report({ source, message, stack, details })
  - source: "api" | "web"
  - details: { ruta, usuario, pagina... } (texto corto, sin datos personales)
  Nunca tira: si falla el envio solo queda en los logs.
  */
  async function report({ source, message, stack = "", details = {} }) {
    const time = now();
    console.error(`[error:${source}] ${firstLine(message)}\n${stack}`);
    if (!shouldEmail(signatureOf({ source, message, stack }), time.getTime())) return false;

    const lines = Object.entries({ cuándo: time.toISOString(), origen: source, ...details })
      .filter(([, value]) => value !== undefined && value !== null && value !== "")
      .map(([key, value]) => `${key}: ${String(value).slice(0, 500)}`);
    const text = [
      `Hubo un error en ${appName}.`,
      "",
      ...lines,
      "",
      `Mensaje: ${String(message).slice(0, 1000)}`,
      "",
      String(stack).slice(0, 4000),
      "",
      "El mismo error no se vuelve a avisar por una hora.",
    ].join("\n");

    try {
      await mailer.send({
        to,
        subject: `[${appName}] Error (${source}): ${firstLine(message).slice(0, 80)}`,
        text,
        html: `<pre style="font:13px/1.5 ui-monospace,Menlo,Consolas,monospace;white-space:pre-wrap">${text.replace(/[&<>]/g, (char) => `&#${char.charCodeAt(0)};`)}</pre>`,
      });
      return true;
    } catch (error) {
      console.error("[error] no se pudo mandar el aviso por email:", error.message);
      return false;
    }
  }

  return { report };
}
