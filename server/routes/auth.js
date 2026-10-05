import { Router } from "express";
import { deleteAccountSchema, loginSchema, registerSchema } from "../../shared/authSchema.js";
import { cookieOptions, SESSION_COOKIE } from "../auth.js";
import { HttpError } from "../errors.js";
import {
  finishGoogleLogin,
  OAUTH_COOKIE,
  OAUTH_COOKIE_MAX_AGE,
  startGoogleLogin,
} from "../google.js";
import { createRateLimiter } from "../rateLimit.js";

/*
Rutas de cuenta: registro, login (email o Google), logout y borrar cuenta.
La sesion vive en una cookie httpOnly (el JavaScript de la pagina no la ve).
*/
export function authRouter(
  auth,
  { secureCookies, google, publicUrl, fetchImpl, now, limits = {} },
) {
  const router = Router();
  // Intentos de login por IP + email cada 15 minutos y registros por IP por hora.
  const loginLimiter = createRateLimiter({ limit: limits.login ?? 10, windowMs: 15 * 60 * 1000 });
  const registerLimiter = createRateLimiter({
    limit: limits.register ?? 20,
    windowMs: 60 * 60 * 1000,
  });

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
    res.json({ google: Boolean(google) });
  });

  router.get("/me", (req, res) => {
    if (!req.user) throw new HttpError(401, "unauthorized");
    res.json(req.user);
  });

  router.post("/register", async (req, res) => {
    registerLimiter.consume(req.ip);
    const data = registerSchema.parse(req.body ?? {});
    const user = await auth.register(data);
    startSession(res, await auth.createSession(user.id));
    res.status(201).json(user);
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
