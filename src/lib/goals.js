import { todayISO } from "./format.js";

/*
Meses que quedan para llegar a una fecha, contando este (como el servidor, ver
server/goals.js): de hoy, 27 de octubre, al 15 de marzo quedan 6 (octubre a
marzo). Si la fecha ya paso, null.
*/
export function monthsUntil(deadline, today = todayISO()) {
  if (!deadline || deadline < today) return null;
  return (Number(deadline.slice(0, 4)) - Number(today.slice(0, 4))) * 12 + Number(deadline.slice(5, 7)) - Number(today.slice(5, 7)) + 1;
}
