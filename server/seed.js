// Datos de ejemplo que se cargan la primera vez (cuando la tabla esta vacia).
// Las fechas son relativas al mes actual para que el dashboard tenga datos.
// monthOffset: 0 = mes actual, 1 = mes anterior, etc.
// recurringKey: el movimiento lo genero esa regla recurrente (ver seedRecurring).

const seedMovements = [
  // Mes actual
  { monthOffset: 0, day: 1, type: "income", title: "Sueldo", category: "salary", amount: 950000, paymentMethod: "transfer", recurringKey: "salary" },
  { monthOffset: 0, day: 2, type: "expense", title: "Alquiler", category: "housing", amount: 320000, paymentMethod: "transfer", recurringKey: "rent" },
  { monthOffset: 0, day: 3, type: "expense", title: "Supermercado", category: "food", amount: 24500, paymentMethod: "credit" },
  { monthOffset: 0, day: 3, type: "expense", title: "Netflix", category: "subscriptions", amount: 8990, paymentMethod: "debit", recurringKey: "netflix" },
  { monthOffset: 0, day: 4, type: "income", title: "Cliente del exterior", category: "freelance", amount: 250, currency: "USD", paymentMethod: "transfer" },
  { monthOffset: 0, day: 4, type: "expense", title: "Colectivo", category: "transport", amount: 1200, paymentMethod: "sube" },
  { monthOffset: 0, day: 5, type: "income", title: "Proyecto freelance", category: "freelance", amount: 180000, paymentMethod: "wallet" },
  { monthOffset: 0, day: 6, type: "expense", title: "Luz y gas", category: "services", amount: 42000, paymentMethod: "debit" },
  { monthOffset: 0, day: 8, type: "expense", title: "Cine", category: "entertainment", amount: 12000, paymentMethod: "cash" },

  // Mes anterior
  { monthOffset: 1, day: 1, type: "income", title: "Sueldo", category: "salary", amount: 950000, paymentMethod: "transfer" },
  { monthOffset: 1, day: 2, type: "expense", title: "Alquiler", category: "housing", amount: 320000, paymentMethod: "transfer" },
  { monthOffset: 1, day: 5, type: "expense", title: "Supermercado", category: "food", amount: 98000, paymentMethod: "credit" },
  { monthOffset: 1, day: 9, type: "expense", title: "Farmacia", category: "health", amount: 23000, paymentMethod: "debit" },
  { monthOffset: 1, day: 12, type: "expense", title: "Curso online", category: "education", amount: 45000, paymentMethod: "credit" },
  { monthOffset: 1, day: 15, type: "expense", title: "Zapatillas", category: "shopping", amount: 110000, paymentMethod: "credit" },
  { monthOffset: 1, day: 18, type: "expense", title: "Internet", category: "services", amount: 28000, paymentMethod: "debit" },
  { monthOffset: 1, day: 22, type: "expense", title: "Carga SUBE", category: "transport", amount: 15000, paymentMethod: "sube" },

  // Hace dos meses
  { monthOffset: 2, day: 1, type: "income", title: "Sueldo", category: "salary", amount: 900000, paymentMethod: "transfer" },
  { monthOffset: 2, day: 2, type: "expense", title: "Alquiler", category: "housing", amount: 300000, paymentMethod: "transfer" },
  { monthOffset: 2, day: 7, type: "expense", title: "Supermercado", category: "food", amount: 87000, paymentMethod: "debit" },
  { monthOffset: 2, day: 14, type: "income", title: "Regalo de cumpleaños", category: "gift", amount: 50000, paymentMethod: "cash" },
  { monthOffset: 2, day: 20, type: "expense", title: "Recital", category: "entertainment", amount: 60000, paymentMethod: "credit" },

  // Hace tres meses
  { monthOffset: 3, day: 1, type: "income", title: "Sueldo", category: "salary", amount: 900000, paymentMethod: "transfer" },
  { monthOffset: 3, day: 2, type: "expense", title: "Alquiler", category: "housing", amount: 300000, paymentMethod: "transfer" },
  { monthOffset: 3, day: 10, type: "expense", title: "Supermercado", category: "food", amount: 80000, paymentMethod: "debit" },
  { monthOffset: 3, day: 25, type: "income", title: "Intereses plazo fijo", category: "investments", amount: 35000, paymentMethod: "transfer" },
];

// Reglas recurrentes de ejemplo: arrancan este mes (el movimiento de este
// mes ya esta en seedMovements con su recurringKey).
const seedRecurring = [
  { key: "salary", type: "income", title: "Sueldo", category: "salary", amount: 950000, paymentMethod: "transfer", day: 1 },
  { key: "rent", type: "expense", title: "Alquiler", category: "housing", amount: 320000, paymentMethod: "transfer", day: 2 },
  { key: "netflix", type: "expense", title: "Netflix", category: "subscriptions", amount: 8990, paymentMethod: "debit", day: 3 },
];

const seedBudgets = [
  { category: "food", amount: 150000 },
  { category: "entertainment", amount: 15000 },
  { category: "services", amount: 50000 },
  { category: "transport", amount: 30000 },
];

function pad(value) {
  return String(value).padStart(2, "0");
}

function seedDate(today, monthOffset, day) {
  const base = new Date(today.getFullYear(), today.getMonth() - monthOffset, 1);
  // En el mes actual no generamos fechas futuras.
  const lastDay = monthOffset === 0 ? today.getDate() : 28;
  const safeDay = Math.min(day, lastDay);
  return `${base.getFullYear()}-${pad(base.getMonth() + 1)}-${pad(safeDay)}`;
}

export function buildSeed(today = new Date()) {
  const movements = seedMovements.map(({ monthOffset, day, ...movement }) => ({
    currency: "ARS",
    recurringKey: null,
    ...movement,
    note: "",
    date: seedDate(today, monthOffset, day),
  }));

  const recurring = seedRecurring.map(({ day, ...rule }) => {
    const startDate = seedDate(today, 0, day);
    return {
      ...rule,
      currency: "ARS",
      note: "",
      startDate,
      dayOfMonth: Number(startDate.slice(8, 10)),
    };
  });

  return { movements, recurring, budgets: seedBudgets };
}
