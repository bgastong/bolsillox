import { ZodError } from "zod";
import { issuesToFieldErrors } from "../shared/movementSchema.js";

export class HttpError extends Error {
  // fields: { campo: claveDeTraduccion }, igual que los errores de zod.
  constructor(status, code, fields = null) {
    super(code);
    this.status = status;
    this.code = code;
    this.fields = fields;
  }
}

// Middleware final: traduce errores conocidos a respuestas JSON. Los
// inesperados (500) se avisan con app.locals.reportError (ver alerts.js).
// eslint-disable-next-line no-unused-vars
export async function errorHandler(err, req, res, next) {
  if (err instanceof ZodError) {
    return res.status(400).json({
      error: "validation_error",
      fields: issuesToFieldErrors(err.issues),
    });
  }
  if (err instanceof HttpError) {
    return res.status(err.status).json({ error: err.code, ...(err.fields && { fields: err.fields }) });
  }
  if (err?.type === "entity.parse.failed") {
    return res.status(400).json({ error: "invalid_json" });
  }

  const report = req.app.locals.reportError;
  if (report) await report(err, req);
  else console.error(err);
  return res.status(500).json({ error: "internal_error" });
}
