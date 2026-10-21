/*
Urgencia de un vencimiento, igual en toda la app (cuotas, gastos fijos y lo que
me deben). El color acompaña al texto, nunca lo reemplaza:
- later: falta más de DUE_SOON_DAYS días (sin color).
- soon: vence hoy o en los próximos DUE_SOON_DAYS días (ámbar).
- overdue: ya venció (rojo).
*/

// Igual que los avisos del servidor (INSTALLMENT_ALERT_DAYS en server/recurring.js).
export const DUE_SOON_DAYS = 2;

// Días entre hoy y una fecha "YYYY-MM-DD" (negativo si ya pasó).
export function daysUntil(date, today) {
  const toUtc = (iso) => Date.UTC(Number(iso.slice(0, 4)), Number(iso.slice(5, 7)) - 1, Number(iso.slice(8, 10)));
  return Math.round((toUtc(date) - toUtc(today)) / 86_400_000);
}

export function dueTone(daysLeft) {
  if (daysLeft < 0) return "overdue";
  if (daysLeft <= DUE_SOON_DAYS) return "soon";
  return "later";
}
