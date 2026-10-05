// Cliente minimo para la API REST del backend (/api, proxy de Vite en dev).

const BASE_URL = import.meta.env.VITE_API_URL ?? "/api";

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
  if (!response.ok) throw new ApiError(response.status, data);
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
  createRecurring: (data) => request("/recurring", { method: "POST", body: data }),
  updateRecurring: (id, data) => request(`/recurring/${id}`, { method: "PUT", body: data }),
  deleteRecurring: (id) => request(`/recurring/${id}`, { method: "DELETE" }),

  // Presupuestos
  getBudgets: (month, options) => request(`/budgets${toQuery({ month })}`, options),
  setBudget: (category, amount) =>
    request(`/budgets/${category}`, { method: "PUT", body: { amount } }),
  deleteBudget: (category) => request(`/budgets/${category}`, { method: "DELETE" }),

  // Cotizacion del dolar
  getRates: (options) => request("/rates", options),
  saveRateSettings: (settings) =>
    request("/rates/settings", { method: "PUT", body: settings }),
};
