import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import compression from "compression";
import express from "express";
import { notificationSettingsSchema, rateSettingsSchema } from "../shared/movementSchema.js";
import { appearanceSchema } from "../shared/appearance.js";
import { createAppearance } from "./appearance.js";
import { createAuthService, cookieOptions, parseCookies, SESSION_COOKIE } from "./auth.js";
import { createRepository } from "./repository.js";
import { createRecurringService, toISODate } from "./recurring.js";
import { createBudgetsService } from "./budgets.js";
import { createCategoriesService } from "./categories.js";
import { createReceivablesService } from "./receivables.js";
import { createRatesService } from "./rates.js";
import { deleteDemoData, hasDemoData, seedUser } from "./db.js";
import { authRouter } from "./routes/auth.js";
import { movementsRouter } from "./routes/movements.js";
import { recurringRouter } from "./routes/recurring.js";
import { budgetsRouter } from "./routes/budgets.js";
import { categoriesRouter } from "./routes/categories.js";
import { receivablesRouter } from "./routes/receivables.js";
import { buildSummary } from "./summary.js";
import { parseCurrency, parseMonth } from "./params.js";
import { errorHandler, HttpError } from "./errors.js";
import { disabledMailer } from "./mailer.js";
import { createErrorReporter } from "./alerts.js";
import { createMaintenance } from "./maintenance.js";
import { createReminders } from "./reminders.js";
import { createRateLimiter } from "./rateLimit.js";
import { clientErrorSchema } from "./clientErrors.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DIST_DIR = path.join(__dirname, "..", "dist");

function hostOf(url) {
  try {
    return new URL(url).host;
  } catch {
    return null;
  }
}

/*
options:
- serveStatic: sirve el build de Vite (produccion).
- secureCookies: cookies solo por HTTPS (produccion).
- trustProxy: detras de un proxy (como Vercel) para leer la IP y el protocolo reales.
- google: { clientId, clientSecret } para el login con Google (o null).
- publicUrl: URL publica de la app (para la vuelta de Google).
- now: reloj (los tests lo fijan para que las fechas sean predecibles).
- fetchImpl: fetch para cotizaciones y Google (los tests lo simulan).
- authLimits: { login, register, code, send } limites de intentos (los tests los suben).
- mailer: envio de emails con codigos (ver mailer.js). Sin el, no se piden codigos.
- alertEmail: a donde avisar los errores inesperados (ver alerts.js). Sin el, solo van a los logs.
- cronSecret: clave del cron de Vercel para /api/cron/reminders (CRON_SECRET). Sin ella, esa ruta no existe.
*/
export function createApp(
  db,
  {
    serveStatic = false,
    secureCookies = false,
    trustProxy = false,
    google = null,
    publicUrl = null,
    now = () => new Date(),
    fetchImpl = globalThis.fetch,
    authLimits,
    mailer = disabledMailer,
    alertEmail = null,
    cronSecret = null,
  } = {},
) {
  const app = express();
  const auth = createAuthService(db, { now });
  const repo = createRepository(db);
  const recurring = createRecurringService(db, { now });
  const budgets = createBudgetsService(db);
  const categories = createCategoriesService(db);
  const receivables = createReceivablesService(db, { now });
  const rates = createRatesService(db, { now, fetchImpl });
  const reminders = createReminders(db, { recurring, receivables, mailer, appUrl: publicUrl });
  const appearance = createAppearance(db);
  const maintenance = createMaintenance(db, { now, reminders });
  const reporter = createErrorReporter({ mailer, to: alertEmail, now });
  const clientErrorLimiter = createRateLimiter({
    db,
    name: "client_error",
    limit: 20,
    windowMs: 60 * 60 * 1000,
    now,
  });

  app.disable("x-powered-by");
  if (trustProxy) app.set("trust proxy", 1);
  // Respuestas comprimidas (gzip/brotli): la API y el build pesan bastante menos.
  app.use(compression());
  app.use(express.json({ limit: "100kb" }));

  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Cron diario de Vercel (vercel.json): manda los recordatorios de cuotas y cobros.
  // Vercel firma el pedido con "Authorization: Bearer <CRON_SECRET>".
  app.get("/api/cron/reminders", async (req, res) => {
    if (!cronSecret) throw new HttpError(404, "not_found");
    if (req.get("authorization") !== `Bearer ${cronSecret}`) throw new HttpError(401, "unauthorized");
    res.json({ sent: await reminders.sendDue() });
  });

  // Proteccion CSRF: los pedidos que modifican datos tienen que venir de la
  // misma pagina (ademas, la cookie es SameSite=Lax).
  app.use("/api", (req, res, next) => {
    if (req.method !== "GET" && req.method !== "HEAD") {
      const origin = req.get("origin");
      if (origin && hostOf(origin) !== req.get("host")) {
        throw new HttpError(403, "forbidden_origin");
      }
    }
    next();
  });

  // Limpieza periodica de la base (cuentas sin confirmar, sesiones vencidas...).
  app.use("/api", async (req, res, next) => {
    await maintenance.runIfDue();
    next();
  });

  // Errores de la pagina (los manda src/lib/errorReporting.js). No pide sesion.
  app.post("/api/client-errors", async (req, res) => {
    await clientErrorLimiter.consume(req.ip);
    const { message, stack, url } = clientErrorSchema.parse(req.body ?? {});
    await reporter.report({
      source: "web",
      message,
      stack,
      details: { página: url, navegador: req.get("user-agent")?.slice(0, 200) },
    });
    res.status(204).end();
  });

  // Lee la cookie de sesion y deja el usuario en req.user (o null).
  app.use("/api", async (req, res, next) => {
    req.cookies = parseCookies(req.get("cookie"));
    req.sessionToken = req.cookies[SESSION_COOKIE] ?? null;
    const session = await auth.getSession(req.sessionToken);
    req.user = session?.user ?? null;
    if (session?.expiresAt) {
      res.cookie(
        SESSION_COOKIE,
        req.sessionToken,
        cookieOptions({ secure: secureCookies, expires: session.expiresAt }),
      );
    }
    next();
  });

  app.use(
    "/api/auth",
    authRouter(auth, { db, secureCookies, google, publicUrl, fetchImpl, now, limits: authLimits, mailer }),
  );

  // De aca en adelante todo requiere haber iniciado sesion.
  app.use("/api", (req, res, next) => {
    if (!req.user) throw new HttpError(401, "unauthorized");
    next();
  });

  // Genera los movimientos recurrentes vencidos, una vez por dia y usuario
  // (crear o editar una regla tambien genera lo que corresponda).
  const generatedOn = new Map();
  app.use("/api", async (req, res, next) => {
    const today = toISODate(now());
    if (generatedOn.get(req.user.id) !== today) {
      await recurring.generateDue(req.user.id, today);
      generatedOn.set(req.user.id, today);
    }
    next();
  });

  app.use("/api/movements", movementsRouter(repo, categories));
  app.use("/api/recurring", recurringRouter(recurring, categories));
  app.use("/api/budgets", budgetsRouter(budgets, rates, categories));
  app.use("/api/categories", categoriesRouter(categories));
  app.use("/api/receivables", receivablesRouter(receivables));

  app.get("/api/summary", async (req, res) => {
    const month = parseMonth(req.query.month);
    const target = parseCurrency(req.query.currency);
    const rate = await rates.getActiveRate(req.user.id);
    const summary = await buildSummary(repo, req.user.id, month, { target, rate, today: toISODate(now()) });
    // Con datos de ejemplo, el inicio ofrece borrarlos.
    res.json({ ...summary, hasDemoData: await hasDemoData(db, req.user.id) });
  });

  // Avisos por email de cuotas por vencer (se pueden apagar) e idioma de los emails.
  app.get("/api/notifications", async (req, res) => {
    res.json(await reminders.getSettings(req.user.id));
  });

  app.put("/api/notifications", async (req, res) => {
    res.json(await reminders.saveSettings(req.user.id, notificationSettingsSchema.parse(req.body ?? {})));
  });

  // Colores a eleccion (paleta y donde se ve el color de los gastos).
  app.get("/api/appearance", async (req, res) => {
    res.json(await appearance.get(req.user.id));
  });

  app.put("/api/appearance", async (req, res) => {
    res.json(await appearance.save(req.user.id, appearanceSchema.parse(req.body ?? {})));
  });

  app.get("/api/rates", async (req, res) => {
    await rates.ensureFresh();
    res.json(await rates.getStatus(req.user.id));
  });

  app.put("/api/rates/settings", async (req, res) => {
    await rates.saveSettings(req.user.id, rateSettingsSchema.parse(req.body ?? {}));
    res.json(await rates.getStatus(req.user.id));
  });

  // Carga datos de ejemplo en una cuenta vacia (para probar la app).
  app.post("/api/demo-data", async (req, res) => {
    const created = await seedUser(db, req.user.id, now());
    if (!created) throw new HttpError(409, "account_not_empty");
    res.status(201).json({ created });
  });

  // Borra solo los datos de ejemplo (lo que cargo la persona queda).
  app.delete("/api/demo-data", async (req, res) => {
    res.json({ deleted: await deleteDemoData(db, req.user.id) });
  });

  app.use("/api", () => {
    throw new HttpError(404, "not_found");
  });

  // En produccion el mismo servidor sirve el build de Vite.
  if (serveStatic && fs.existsSync(DIST_DIR)) {
    // Los archivos de /assets llevan un hash en el nombre: se pueden cachear
    // "para siempre". index.html no, para que siempre tome la ultima version.
    app.use(
      "/assets",
      express.static(path.join(DIST_DIR, "assets"), { immutable: true, maxAge: "1y" }),
    );
    app.use(express.static(DIST_DIR, { index: false }));
    app.get(/^(?!\/api).*/, (req, res) => {
      res.setHeader("Cache-Control", "no-cache");
      res.sendFile(path.join(DIST_DIR, "index.html"));
    });
  }

  app.use(errorHandler);

  // index.js lo usa para traer la cotizacion apenas arranca el servidor.
  app.locals.rates = rates;
  // errorHandler avisa con esto los errores inesperados (500).
  app.locals.reportError = (error, req) =>
    reporter.report({
      source: "api",
      message: error?.message ?? String(error),
      stack: error?.stack,
      details: { ruta: `${req.method} ${req.originalUrl.split("?")[0]}`, usuario: req.user?.id },
    });

  return app;
}
