import crypto from "node:crypto";

/*
Inicio de sesion con Google (OAuth 2.0 / OpenID Connect, flujo "authorization
code" con PKCE). No hace falta ninguna libreria:
1. /api/auth/google redirige a Google con un `state` y un `code_challenge`.
2. Google vuelve a /api/auth/google/callback con un `code`.
3. El servidor cambia el code por un id_token directamente con Google (por
   HTTPS y con el client secret), asi que su contenido es confiable.
*/

const AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_URL = "https://oauth2.googleapis.com/token";
const ISSUERS = new Set(["accounts.google.com", "https://accounts.google.com"]);

export const OAUTH_COOKIE = "bx_oauth";
export const OAUTH_COOKIE_MAX_AGE = 10 * 60 * 1000;

export function googleConfigFromEnv(env = process.env) {
  if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET) return null;
  return { clientId: env.GOOGLE_CLIENT_ID, clientSecret: env.GOOGLE_CLIENT_SECRET };
}

function base64url(buffer) {
  return buffer.toString("base64url");
}

export function redirectUri(baseUrl) {
  return `${baseUrl}/api/auth/google/callback`;
}

// Arma la URL de Google y lo que hay que recordar en la cookie temporal.
export function startGoogleLogin(config, baseUrl) {
  const state = base64url(crypto.randomBytes(24));
  const verifier = base64url(crypto.randomBytes(32));
  const challenge = base64url(crypto.createHash("sha256").update(verifier).digest());
  const params = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: redirectUri(baseUrl),
    response_type: "code",
    scope: "openid email profile",
    state,
    code_challenge: challenge,
    code_challenge_method: "S256",
    prompt: "select_account",
  });
  return { url: `${AUTH_URL}?${params}`, cookie: `${state}.${verifier}` };
}

function decodeJwtPayload(token) {
  const part = String(token ?? "").split(".")[1];
  if (!part) throw new Error("id_token invalido");
  return JSON.parse(Buffer.from(part, "base64url").toString("utf8"));
}

// Valida el callback y devuelve { googleId, email, name }. Tira error si algo no cierra.
export async function finishGoogleLogin(config, baseUrl, { code, state, cookie, fetchImpl, now }) {
  const [expectedState, verifier] = String(cookie ?? "").split(".");
  const stateOk =
    expectedState &&
    state &&
    expectedState.length === String(state).length &&
    crypto.timingSafeEqual(Buffer.from(expectedState), Buffer.from(String(state)));
  if (!stateOk || !verifier || !code) throw new Error("state invalido");

  const response = await fetchImpl(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code: String(code),
      client_id: config.clientId,
      client_secret: config.clientSecret,
      redirect_uri: redirectUri(baseUrl),
      grant_type: "authorization_code",
      code_verifier: verifier,
    }),
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) throw new Error(`token HTTP ${response.status}`);
  const { id_token: idToken } = await response.json();

  const claims = decodeJwtPayload(idToken);
  if (claims.aud !== config.clientId) throw new Error("aud invalido");
  if (!ISSUERS.has(claims.iss)) throw new Error("iss invalido");
  if (!claims.exp || claims.exp * 1000 < now().getTime()) throw new Error("token vencido");
  if (!claims.sub || !claims.email || claims.email_verified !== true) {
    throw new Error("email sin verificar");
  }

  const email = String(claims.email).trim().toLowerCase();
  const name = String(claims.name || claims.given_name || email.split("@")[0]).slice(0, 60);
  return { googleId: String(claims.sub), email, name };
}
