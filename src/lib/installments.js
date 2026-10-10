// Calculos de las compras en cuotas (sin React: se usan en la pantalla Cuotas y en los tests).
import { shiftMonth } from "./format.js";
import { convertAmount } from "./money.js";

/*
Cuanto toca pagar de cuotas cada mes, desde la proxima cuota de cada compra
hasta la ultima. Devuelve [{ month: "YYYY-MM", amount, count }] ordenado, en
la moneda elegida, y si alguna cuota no se pudo convertir (falta cotizacion).
*/
export function installmentsSchedule(plans, currency, rate) {
  const byMonth = new Map();
  let convertible = true;
  for (const plan of plans) {
    if (!plan.active || !plan.nextDate || plan.type !== "expense") continue;
    const value = convertAmount(plan.amount, plan.currency, currency, rate);
    if (value === null) {
      convertible = false;
      continue;
    }
    const first = plan.nextDate.slice(0, 7);
    for (let number = plan.nextInstallment; number <= plan.installmentsTotal; number++) {
      const month = shiftMonth(first, number - plan.nextInstallment);
      const entry = byMonth.get(month) ?? { month, amount: 0, count: 0 };
      entry.amount += value;
      entry.count += 1;
      byMonth.set(month, entry);
    }
  }
  const months = [...byMonth.values()].sort((a, b) => a.month.localeCompare(b.month));
  return { months, convertible };
}
