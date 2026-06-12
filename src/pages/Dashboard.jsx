import SummaryCards from "@/components/Cards/SummaryCards/SummaryCards";
import { mockExpenses } from "../data/mockExpenses";
import HoverCards from "@/components/Cards/HoverCard/HoverCards";
function Dashboard() {
  //Recorro todos los gastos(reduce) y sumo los amount.
  const totalSpent = mockExpenses.reduce((total, expense) => {
    return total + expense.amount;
  }, 0);

  const expenseCount = mockExpenses.length;

  //Recorro y elijo el monto max
  const expenseMax = mockExpenses.reduce((max, expense) => {
    return expense.amount > max ? expense.amount : max;
  }, 0);

  //Ultimo gasto
  const lastExpense = mockExpenses[mockExpenses.length - 1];

  return (
    <main className="dashboard">
      <SummaryCards />
      <HoverCards />
    </main>
  );
}

export default Dashboard;
