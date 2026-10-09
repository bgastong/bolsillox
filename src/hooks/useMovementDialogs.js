import { useCallback, useRef, useState } from "react";

/*
Estado de los dialogos de movimientos y reglas recurrentes.
- form: { kind: "movement" | "recurring", item: null | objeto, preset, key }
  preset: al crear una regla, "recurring" o "installments" (compra en cuotas).
- toDelete: { kind, item }
*/
export function useMovementDialogs() {
  const [form, setForm] = useState(null);
  const [toDelete, setToDelete] = useState(null);
  const counter = useRef(0);

  const openForm = useCallback((kind, item = null, preset = null) => {
    counter.current += 1;
    setForm({ kind, item, preset, key: `${kind}-${item?.id ?? "new"}-${counter.current}` });
  }, []);

  return {
    form,
    toDelete,
    openCreate: useCallback(() => openForm("movement"), [openForm]),
    openEdit: useCallback((movement) => openForm("movement", movement), [openForm]),
    openCreateRecurring: useCallback(() => openForm("recurring", null, "recurring"), [openForm]),
    openCreateInstallments: useCallback(
      () => openForm("recurring", null, "installments"),
      [openForm],
    ),
    openEditRecurring: useCallback((rule) => openForm("recurring", rule), [openForm]),
    openDelete: useCallback((item, kind = "movement") => setToDelete({ kind, item }), []),
    closeForm: useCallback(() => setForm(null), []),
    closeDelete: useCallback(() => setToDelete(null), []),
  };
}
