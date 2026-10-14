// Cliente minimo para la API REST del backend (/api, proxy de Vite en dev).

const BASE_URL = import.meta.env.VITE_API_URL ?? "/api";

export const UNAUTHORIZED_EVENT = "bolsillox:unauthorized";

export class ApiError extends Error {
  constructor(status, body) {
    super(body?.error ?? `HTTP ${status}`);
    this.status = status;
    this.code = body?.error ?? "unknown_error";
    // { campo: claveDeTraduccion } cuando es un error de validacion
    this.fields = body?.fields ?? {};
  }
}

async function request(path, { method = "GET", body, signal } = {}) {
  let response;
  try {
    response = await fetch(`${BASE_URL}${path}`, {
      method,
      signal,
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch (error) {
    if (error.name === "AbortError") throw error;
    throw new ApiError(0, { error: "network_error" });
  }

  if (response.status === 204) return null;

  const data = await response.json().catch(() => null);
  if (!response.ok) {
    // Sesion vencida o cerrada en otro lado: AuthContext vuelve al login.
    if (response.status === 401 && !path.startsWith("/auth/")) {
      window.dispatchEvent(new Event(UNAUTHORIZED_EVENT));
    }
    throw new ApiError(response.status, data);
  }
  return data;
}

function toQuery(params = {}) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== "") {
      search.set(key, value);
    }
  }
  const query = search.toString();
  return query ? `?${query}` : "";
}

export const api = {
  // Cuenta
  getAuthConfig: (options) => request("/auth/config", options),
  me: (options) => request("/auth/me", options),
  register: (data) => request("/auth/register", { method: "POST", body: data }),
  login: (data) => request("/auth/login", { method: "POST", body: data }),
  logout: () => request("/auth/logout", { method: "POST" }),
  deleteAccount: (email) => request("/auth/account", { method: "DELETE", body: { email } }),
  // Codigos por email: confirmar la cuenta, recuperar la contraseña, cambiar el email.
  verifyEmail: (data) => request("/auth/verify-email", { method: "POST", body: data }),
  resendVerification: (data) => request("/auth/resend-verification", { method: "POST", body: data }),
  forgotPassword: (data) => request("/auth/forgot-password", { method: "POST", body: data }),
  resetPassword: (data) => request("/auth/reset-password", { method: "POST", body: data }),
  updateProfile: (data) => request("/auth/me", { method: "PATCH", body: data }),
  changePassword: (data) => request("/auth/change-password", { method: "POST", body: data }),
  changeEmail: (data) => request("/auth/change-email", { method: "POST", body: data }),
  confirmEmailChange: (data) => request("/auth/confirm-email-change", { method: "POST", body: data }),
  // Redireccion completa (no fetch): Google vuelve a /api/auth/google/callback.
  googleLoginUrl: `${BASE_URL}/auth/google`,
  deleteMovements: (ids) => request("/movements/bulk-delete", { method: "POST", body: { ids } }),
  loadDemoData: () => request("/demo-data", { method: "POST" }),
  deleteDemoData: () => request("/demo-data", { method: "DELETE" }),

  // Movimientos
  listMovements: (filters, options) =>
    request(`/movements${toQuery(filters)}`, options),
  createMovement: (data) => request("/movements", { method: "POST", body: data }),
  updateMovement: (id, data) =>
    request(`/movements/${id}`, { method: "PUT", body: data }),
  deleteMovement: (id) => request(`/movements/${id}`, { method: "DELETE" }),

  // Resumen del dashboard (currency: moneda en la que se ven los totales)
  getSummary: (month, currency, options) =>
    request(`/summary${toQuery({ month, currency })}`, options),

  // Recurrentes
  listRecurring: (options) => request("/recurring", options),
  // Cuotas por vencer o vencidas sin pagar, y marcar una como pagada.
  getInstallmentAlerts: (options) => request("/recurring/alerts", options),
  payInstallment: (id, month) => request(`/recurring/${id}/pay`, { method: "POST", body: { month } }),
  createRecurring: (data) => request("/recurring", { method: "POST", body: data }),
  updateRecurring: (id, data) => request(`/recurring/${id}`, { method: "PUT", body: data }),
  deleteRecurring: (id) => request(`/recurring/${id}`, { method: "DELETE" }),

  // Presupuestos
  getBudgets: (month, options) => request(`/budgets${toQuery({ month })}`, options),
  setBudget: (category, amount) =>
    request(`/budgets/${category}`, { method: "PUT", body: { amount } }),
  deleteBudget: (category) => request(`/budgets/${category}`, { method: "DELETE" }),

  // Categorias propias
  listCategories: (options) => request("/categories", options),
  createCategory: (data) => request("/categories", { method: "POST", body: data }),
  updateCategory: (id, data) => request(`/categories/${id}`, { method: "PUT", body: data }),
  deleteCategory: (id) => request(`/categories/${id}`, { method: "DELETE" }),

  // Avisos por email (recordatorios de cuotas) e idioma en que llegan
  getNotificationSettings: (options) => request("/notifications", options),
  saveNotificationSettings: (settings) => request("/notifications", { method: "PUT", body: settings }),

  // Cotizacion del dolar
  getRates: (options) => request("/rates", options),
  saveRateSettings: (settings) =>
    request("/rates/settings", { method: "PUT", body: settings }),
};
