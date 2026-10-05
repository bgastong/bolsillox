// Conversion ARS <-> USD con la cotizacion activa (pesos por dolar).
// Devuelve null si hace falta convertir y no hay cotizacion.
export function convertAmount(amount, from, to, rate) {
  if (from === to) return amount;
  if (!rate) return null;
  return from === "USD" ? amount * rate : amount / rate;
}

// Neto (ingresos - gastos) de una lista de movimientos.
// Con cotizacion: un solo total en `target`. Sin cotizacion: un total por moneda.
export function netTotals(movements, target, rate) {
  const byCurrency = {};
  let converted = 0;
  let convertible = true;

  for (const movement of movements) {
    const signed = movement.type === "income" ? movement.amount : -movement.amount;
    const currency = movement.currency ?? "ARS";
    byCurrency[currency] = (byCurrency[currency] ?? 0) + signed;
    const value = convertAmount(signed, currency, target, rate);
    if (value === null) convertible = false;
    else converted += value;
  }

  return convertible
    ? [{ currency: target, amount: converted }]
    : Object.entries(byCurrency).map(([currency, amount]) => ({ currency, amount }));
}
