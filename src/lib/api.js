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
  listMovements: (filters, options) =>
    request(`/movements${toQuery(filters)}`, options),
  getSummary: (month, options) => request(`/summary${toQuery({ month })}`, options),
  createMovement: (data) => request("/movements", { method: "POST", body: data }),
  updateMovement: (id, data) =>
    request(`/movements/${id}`, { method: "PUT", body: data }),
  deleteMovement: (id) => request(`/movements/${id}`, { method: "DELETE" }),
};
