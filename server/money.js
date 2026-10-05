/*
Conversion de montos dentro de SQL. Cada movimiento guarda su monto en su
moneda original; los totales se convierten a la moneda pedida con la
cotizacion activa (@rate = pesos por dolar).
Si no hay cotizacion, los montos en otra moneda suman 0 y se cuentan
aparte (ver unconvertedSql) para avisar en la interfaz.
*/
export const convertedAmountSql = `
  CASE
    WHEN currency = @target THEN amount
    WHEN @rate IS NULL THEN 0
    WHEN currency = 'USD' THEN amount * @rate
    ELSE amount / @rate
  END
`;

export const unconvertedSql = `
  SUM(CASE WHEN currency <> @target AND @rate IS NULL THEN 1 ELSE 0 END)
`;

export function roundMoney(value) {
  return Math.round((value ?? 0) * 100) / 100;
}
