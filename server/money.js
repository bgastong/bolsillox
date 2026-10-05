import { sql } from "./sql.js";

/*
Conversion de montos dentro de SQL. Cada movimiento guarda su monto en su
moneda original; los totales se convierten a la moneda pedida (target) con
la cotizacion activa (rate = pesos por dolar).
Si no hay cotizacion, los montos en otra moneda suman 0 y se cuentan
aparte (ver unconvertedSql) para avisar en la interfaz.
*/
export function convertedAmountSql({ target = "ARS", rate = null }) {
  return sql`
    CASE
      WHEN currency = ${target}::text THEN amount
      WHEN ${rate}::float8 IS NULL THEN 0
      WHEN currency = 'USD' THEN amount * ${rate}::float8
      ELSE amount / ${rate}::float8
    END
  `;
}

export function unconvertedSql({ target = "ARS", rate = null }) {
  return sql`
    SUM(CASE WHEN currency <> ${target}::text AND ${rate}::float8 IS NULL THEN 1 ELSE 0 END)
  `;
}

export function roundMoney(value) {
  return Math.round((value ?? 0) * 100) / 100;
}
