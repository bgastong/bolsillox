import { useCallback, useMemo, useState } from "react";
import { MovementDialogs } from "@/components/Movements/MovementDialogs";
import { useMovementDialogs } from "@/hooks/useMovementDialogs";
import { MovementsContext } from "./MovementsContextValue";

/*
Un solo juego de dialogos para toda la app: asi el boton "+" de la
navegacion mobile funciona desde cualquier pantalla.
*/
export function MovementsProvider({ children }) {
  const dialogs = useMovementDialogs();
  const [version, setVersion] = useState(0);
  const { openCreate, openEdit, openDelete, closeForm } = dialogs;

  const handleChange = useCallback(() => setVersion((value) => value + 1), []);

  // Desde el formulario de edicion se puede pasar a confirmar el borrado.
  const handleRequestDelete = useCallback(
    (movement) => {
      closeForm();
      openDelete(movement);
    },
    [closeForm, openDelete],
  );

  const value = useMemo(
    () => ({ openCreate, openEdit, openDelete, version }),
    [openCreate, openEdit, openDelete, version],
  );

  return (
    <MovementsContext.Provider value={value}>
      {children}
      <MovementDialogs
        form={dialogs.form}
        onFormClose={dialogs.closeForm}
        toDelete={dialogs.toDelete}
        onDeleteClose={dialogs.closeDelete}
        onChange={handleChange}
        onRequestDelete={handleRequestDelete}
      />
    </MovementsContext.Provider>
  );
}
