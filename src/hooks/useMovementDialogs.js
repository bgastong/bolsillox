import { useCallback, useRef, useState } from "react";

// Estado de los dialogos de movimientos (crear / editar / eliminar).
export function useMovementDialogs() {
  const [form, setForm] = useState(null);
  const [toDelete, setToDelete] = useState(null);
  const counter = useRef(0);

  const openCreate = useCallback(() => {
    counter.current += 1;
    setForm({ movement: null, key: `new-${counter.current}` });
  }, []);

  const openEdit = useCallback((movement) => {
    counter.current += 1;
    setForm({ movement, key: `edit-${movement.id}-${counter.current}` });
  }, []);

  return {
    form,
    toDelete,
    openCreate,
    openEdit,
    openDelete: setToDelete,
    closeForm: useCallback(() => setForm(null), []),
    closeDelete: useCallback(() => setToDelete(null), []),
  };
}
