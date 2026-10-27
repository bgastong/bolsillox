/*
Division de un gasto compartido. Los montos van en centavos redondeados y lo
que sobra del redondeo queda en la parte de quien pago:
splitEqually(100, 2) -> { share: 33.33, mine: 33.34 }.
- others: cuantas personas ademas de quien pago.
*/
export function splitEqually(amount, others) {
  if (!(amount > 0) || others < 1) return { share: 0, mine: amount > 0 ? amount : 0 };
  const share = Math.round((amount / (others + 1)) * 100) / 100;
  return { share, mine: Math.round((amount - share * others) * 100) / 100 };
}

/*
Arma lo que se manda al servidor: [{ person, amount }].
mode "equal": todos ponen lo mismo; "custom": lo que se escribio para cada uno.
*/
export function splitPeople(people, mode, amount) {
  const { share } = splitEqually(amount, people.length);
  return people.map((item) => ({
    person: item.person,
    amount: mode === "equal" ? share : item.amount,
  }));
}

// Errores de zod de split.people.N.campo -> { "person-0": clave, "amount-1": clave, form: clave }.
export function splitErrors(issues) {
  const errors = {};
  for (const issue of issues) {
    if (issue.path[0] !== "split") continue;
    const [, list, index, field] = issue.path;
    const key = list === "people" && index !== undefined && field ? `${field}-${index}` : "form";
    if (!errors[key]) errors[key] = issue.message;
  }
  return errors;
}
