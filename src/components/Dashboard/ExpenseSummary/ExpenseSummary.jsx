function ExpenseSummary({ totalSpent = 0, expenseCount = 0 }) {
  return (
    <section>
      <h2>Resumen de gastos</h2>
      <p>Total gastado: ${totalSpent}</p>
      <p>Cantidad de gastos: {expenseCount}</p>
    </section>
  );
}

export default ExpenseSummary;
