import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useMovementDialogs } from "@/hooks/useMovementDialogs";
import { MovementsContext } from "./MovementsContextValue";
import { whenIdle } from "@/lib/idle";

// Los dialogos (formulario + zod) se bajan aparte: no hacen falta para la
// primera pantalla. Se precargan apenas el navegador queda libre.
const loadDialogs = () => import("@/components/Movements/MovementDialogs");
const MovementDialogs = lazy(() =>
  loadDialogs().then((module) => ({ default: module.MovementDialogs })),
);

/*
Un solo juego de dialogos para toda la app: asi el boton "+" de la
navegacion mobile funciona desde cualquier pantalla.
`version` cambia con cada alta/edicion/baja para que las pantallas recarguen.
*/
export function MovementsProvider({ children }) {
  const dialogs = useMovementDialogs();
  const [version, setVersion] = useState(0);
  const {
    openCreate,
    openEdit,
    openCreateRecurring,
    openCreateInstallments,
    openEditRecurring,
    openDelete,
    closeForm,
  } = dialogs;

  // Se montan con la primera apertura y quedan montados (para las animaciones de cierre).
  const [dialogsMounted, setDialogsMounted] = useState(false);
  if (!dialogsMounted && (dialogs.form || dialogs.toDelete)) setDialogsMounted(true);

  useEffect(() => whenIdle(loadDialogs), []);

  const handleChange = useCallback(() => setVersion((value) => value + 1), []);

  // Desde el formulario de edicion se puede pasar a confirmar el borrado.
  const handleRequestDelete = useCallback(
    (item, kind) => {
      closeForm();
      openDelete(item, kind);
    },
    [closeForm, openDelete],
  );

  const value = useMemo(
    () => ({
      openCreate,
      openEdit,
      openCreateRecurring,
      openCreateInstallments,
      openEditRecurring,
      openDelete,
      notifyChange: handleChange,
      version,
    }),
    [
      openCreate,
      openEdit,
      openCreateRecurring,
      openCreateInstallments,
      openEditRecurring,
      openDelete,
      handleChange,
      version,
    ],
  );

  return (
    <MovementsContext.Provider value={value}>
      {children}
      {dialogsMounted && (
        <Suspense fallback={null}>
          <MovementDialogs
            form={dialogs.form}
            onFormClose={dialogs.closeForm}
            toDelete={dialogs.toDelete}
            onDeleteClose={dialogs.closeDelete}
            onChange={handleChange}
            onRequestDelete={handleRequestDelete}
          />
        </Suspense>
      )}
    </MovementsContext.Provider>
  );
}
