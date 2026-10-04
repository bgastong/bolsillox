import { useContext } from "react";
import { MovementsContext } from "../context/MovementsContextValue";

// Acciones globales de movimientos: abrir los dialogos y `version`,
// que cambia cada vez que se crea, edita o borra algo (para recargar datos).
export function useMovements() {
  const context = useContext(MovementsContext);

  if (!context) {
    throw new Error("useMovements must be used inside MovementsProvider");
  }

  return context;
}
