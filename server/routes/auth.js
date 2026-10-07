import { Router } from "express";
import {
  changeEmailSchema,
  changePasswordSchema,
  confirmCodeSchema,
  deleteAccountSchema,
  loginSchema,
  registerSchema,
  requestCodeSchema,
  resetPasswordSchema,
  updateProfileSchema,
  verifyEmailSchema,
} from "../../shared/authSchema.js";
import { CODE_MINUTES, cookieOptions, SESSION_COOKIE } from "../auth.js";
import { codeEmail } from "../emails.js";
import { HttpError } from "../errors.js";
import {
  finishGoogleLogin,
  OAUTH_COOKIE,
  OAUTH_COOKIE_MAX_AGE,
  startGoogleLogin,
} from "../google.js";
import { createRateLimiter } from "../rateLimit.js";

/*
Rutas de cuenta: registro con codigo por email, login (email o Google),
recuperar contraseña, cambiar datos, logout y borrar cuenta.
La sesion vive en una cookie httpOnly (el JavaScript de la pagina no la ve).
*/
export function authRouter(
  auth,
  { secureCookies, google, publicUrl, fetchImpl, now, limits = {}, mailer },
) {
  const router = Router();
  // Intentos de login por IP + email cada 15 minutos y registros por IP por hora.
  const loginLimiter = createRateLimiter({ limit: limits.login ?? 10, windowMs: 15 * 60 * 1000 });
  const registerLimiter = createRateLimiter({
    limit: limits.register ?? 20,
    windowMs: 60 * 60 * 1000,
  });

  // Codigos: intentos por IP + email cada 15 minutos y emails enviados por IP por hora.
  const codeLimiter = createRateLimiter({ limit: limits.code ?? 10, windowMs: 15 * 60 * 1000 });
  const sendLimiter = createRateLimiter({ limit: limits.send ?? 10, windowMs: 60 * 60 * 1000 });

  function requireUser(req) {
    if (!req.user) throw new HttpError(401, "unauthorized");
    return req.user;
  }

  function requireMailer() {
    if (!mailer.enabled) throw new HttpError(503, "email_disabled");
  }

  async function sendCode(to, purpose, code, language) {
    await mailer.send({ to, ...codeEmail({ purpose, code, language, minutes: CODE_MINUTES }) });
  }

  function startSession(res, { token, expiresAt }) {
    res.cookie(SESSION_COOKIE, token, cookieOptions({ secure: secureCookies, expires: expiresAt }));
  }

  function clearSession(res) {
    res.clearCookie(SESSION_COOKIE, cookieOptions({ secure: secureCookies }));
  }

  function baseUrl(req) {
    return publicUrl || `${req.protocol}://${req.get("host")}`;
  }

  router.get("/config", (req, res) => {
    // email: si se pueden enviar codigos (verificacion y recuperar contraseña).
    res.json({ google: Boolean(google), email: mailer.enabled });
  });

  router.get("/me", (req, res) => {
    if (!req.user) throw new HttpError(401, "unauthorized");
    res.json(req.user);
  });

  /*
  Registro. Con el envio de emails activo, la cuenta queda pendiente y se
  manda un codigo (la sesion empieza al confirmarlo). Sin emails, entra directo.
  */
  router.post("/register", async (req, res) => {
    registerLimiter.consume(req.ip);
    const { language, ...data } = registerSchema.parse(req.body ?? {});
    const verify = mailer.enabled;
    const user = await auth.register(data, { verify });
    if (!verify) {
      startSession(res, await auth.createSession(user.id));
      return res.status(201).json({ ...user, verificationRequired: false });
    }
    sendLimiter.consume(req.ip);
    const pending = await auth.verificationCodeFor(user.email).catch((error) => {
      // Re-registro dentro del minuto: el codigo anterior sigue sirviendo.
      if (error.code === "code_cooldown") return null;
      throw error;
    });
    if (pending) await sendCode(user.email, "verify_email", pending.code, language);
    res.status(201).json({ email: user.email, verificationRequired: true });
  });

  router.post("/verify-email", async (req, res) => {
    const data = verifyEmailSchema.parse(req.body ?? {});
    codeLimiter.consume(`${req.ip}|${data.email}`);
    const user = await auth.verifyEmail(data);
    startSession(res, await auth.createSession(user.id));
    res.json(user);
  });

  // Reenviar el codigo de verificacion. Siempre responde 204: no revela si el email existe.
  router.post("/resend-verification", async (req, res) => {
    requireMailer();
    const { email, language } = requestCodeSchema.parse(req.body ?? {});
    sendLimiter.consume(req.ip);
    const pending = await auth.verificationCodeFor(email);
    if (pending) await sendCode(email, "verify_email", pending.code, language);
    res.status(204).end();
  });

  // Olvide mi contraseña: manda un codigo si hay una cuenta con ese email (siempre 204).
  router.post("/forgot-password", async (req, res) => {
    requireMailer();
    const { email, language } = requestCodeSchema.parse(req.body ?? {});
    sendLimiter.consume(req.ip);
    const found = await auth.resetCodeFor(email).catch((error) => {
      // Si ya se pidio hace menos de un minuto, no se manda otro (y no se avisa).
      if (error.code === "code_cooldown") return null;
      throw error;
    });
    if (found) await sendCode(email, "reset_password", found.code, language);
    res.status(204).end();
  });

  router.post("/reset-password", async (req, res) => {
    const data = resetPasswordSchema.parse(req.body ?? {});
    codeLimiter.consume(`${req.ip}|${data.email}`);
    const user = await auth.resetPassword(data);
    startSession(res, await auth.createSession(user.id));
    res.json(user);
  });

  // --- Datos de la cuenta (con sesion) ---

  router.patch("/me", async (req, res) => {
    const user = requireUser(req);
    res.json(await auth.updateProfile(user.id, updateProfileSchema.parse(req.body ?? {})));
  });

  router.post("/change-password", async (req, res) => {
    const user = requireUser(req);
    const data = changePasswordSchema.parse(req.body ?? {});
    codeLimiter.consume(`${req.ip}|pw|${user.id}`);
    res.json(await auth.changePassword(user.id, data, req.sessionToken));
  });

  router.post("/change-email", async (req, res) => {
    const user = requireUser(req);
    requireMailer();
    const { language, ...data } = changeEmailSchema.parse(req.body ?? {});
    codeLimiter.consume(`${req.ip}|email|${user.id}`);
    sendLimiter.consume(req.ip);
    const code = await auth.requestEmailChange(user.id, data);
    await sendCode(data.email, "change_email", code, language);
    res.status(204).end();
  });

  router.post("/confirm-email-change", async (req, res) => {
    const user = requireUser(req);
    const data = confirmCodeSchema.parse(req.body ?? {});
    codeLimiter.consume(`${req.ip}|confirm|${user.id}`);
    res.json(await auth.confirmEmailChange(user.id, data));
  });

  router.post("/login", async (req, res) => {
    const data = loginSchema.parse(req.body ?? {});
    const key = `${req.ip}|${data.email}`;
    loginLimiter.consume(key);
    const user = await auth.login(data);
    loginLimiter.reset(key);
    startSession(res, await auth.createSession(user.id));
    res.json(user);
  });

  router.post("/logout", async (req, res) => {
    await auth.deleteSession(req.sessionToken);
    clearSession(res);
    res.status(204).end();
  });

  router.delete("/account", async (req, res) => {
    if (!req.user) throw new HttpError(401, "unauthorized");
    const { email } = deleteAccountSchema.parse(req.body ?? {});
    if (email !== req.user.email) throw new HttpError(400, "email_mismatch");
    await auth.deleteAccount(req.user.id);
    clearSession(res);
    res.status(204).end();
  });

  router.get("/google", (req, res) => {
    if (!google) throw new HttpError(404, "google_disabled");
    const { url, cookie } = startGoogleLogin(google, baseUrl(req));
    res.cookie(
      OAUTH_COOKIE,
      cookie,
      cookieOptions({ secure: secureCookies, maxAge: OAUTH_COOKIE_MAX_AGE }),
    );
    res.redirect(url);
  });

  router.get("/google/callback", async (req, res) => {
    if (!google) throw new HttpError(404, "google_disabled");
    res.clearCookie(OAUTH_COOKIE, cookieOptions({ secure: secureCookies }));
    try {
      if (req.query.error) throw new Error(String(req.query.error));
      const profile = await finishGoogleLogin(google, baseUrl(req), {
        code: req.query.code,
        state: req.query.state,
        cookie: req.cookies[OAUTH_COOKIE],
        fetchImpl,
        now,
      });
      const user = await auth.loginWithGoogle(profile);
      startSession(res, await auth.createSession(user.id));
      res.redirect("/");
    } catch (error) {
      console.warn(`[auth] Fallo el login con Google: ${error.message}`);
      res.redirect("/login?error=google");
    }
  });

  return router;
}
