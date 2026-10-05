import { useCallback, useRef, useState } from "react";

/*
Estado de los dialogos de movimientos y reglas recurrentes.
- form: { kind: "movement" | "recurring", item: null | objeto, key }
- toDelete: { kind, item }
*/
export function useMovementDialogs() {
  const [form, setForm] = useState(null);
  const [toDelete, setToDelete] = useState(null);
  const counter = useRef(0);

  const openForm = useCallback((kind, item = null) => {
    counter.current += 1;
    setForm({ kind, item, key: `${kind}-${item?.id ?? "new"}-${counter.current}` });
  }, []);

  return {
    form,
    toDelete,
    openCreate: useCallback(() => openForm("movement"), [openForm]),
    openEdit: useCallback((movement) => openForm("movement", movement), [openForm]),
    openCreateRecurring: useCallback(() => openForm("recurring"), [openForm]),
    openEditRecurring: useCallback((rule) => openForm("recurring", rule), [openForm]),
    openDelete: useCallback((item, kind = "movement") => setToDelete({ kind, item }), []),
    closeForm: useCallback(() => setForm(null), []),
    closeDelete: useCallback(() => setToDelete(null), []),
  };
}
