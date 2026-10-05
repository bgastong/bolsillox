import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { api } from "@/lib/api";
import { useLanguage } from "@/hooks/useLanguage";
import { useToast } from "@/hooks/useToast";
import MovementForm from "./MovementForm";

function errorMessage(t, error) {
  return error?.code === "network_error" ? t("errorServer") : t("errorGeneric");
}

const TEXTS = {
  movement: {
    newTitle: "newMovement",
    editTitle: "editMovement",
    newDescription: "newMovementDescription",
    editDescription: "editMovementDescription",
    created: "movementCreated",
    updated: "movementUpdated",
    deleted: "movementDeleted",
    deleteTitle: "deleteTitle",
    deleteDescription: "deleteDescription",
  },
  recurring: {
    newTitle: "newRecurring",
    editTitle: "editRecurring",
    newDescription: "newRecurringDescription",
    editDescription: "editRecurringDescription",
    created: "recurringCreated",
    updated: "recurringUpdated",
    deleted: "recurringDeleted",
    deleteTitle: "deleteRecurringTitle",
    deleteDescription: "deleteRecurringDescription",
  },
};

/*
Dialogos de crear/editar y eliminar, para movimientos y reglas recurrentes.
- form: { kind, item, key } cuando esta abierto
- toDelete: { kind, item } a confirmar
*/
export function MovementDialogs({
  form,
  onFormClose,
  toDelete,
  onDeleteClose,
  onChange,
  onRequestDelete,
}) {
  const { t } = useLanguage();
  const { toast } = useToast();
  const [deleting, setDeleting] = useState(false);

  const kind = form?.kind ?? "movement";
  const texts = TEXTS[kind];
  const isEdit = Boolean(form?.item);
  const deleteTexts = TEXTS[toDelete?.kind ?? "movement"];

  // Despues de guardar un gasto, avisa si el presupuesto de su categoria
  // esta cerca del limite o se paso.
  async function checkBudget(data) {
    if (data.type !== "expense") return;
    const month = (data.date ?? data.startDate).slice(0, 7);
    try {
      const { items } = await api.getBudgets(month);
      const budget = items.find((item) => item.category === data.category);
      if (!budget || budget.status === "ok") return;
      const vars = { category: t(`cat_${budget.category}`), percent: Math.round(budget.percent) };
      toast(t(budget.status === "over" ? "budgetOverToast" : "budgetWarningToast", vars), {
        variant: "warning",
      });
    } catch {
      // El aviso es opcional: si falla, no molesta al usuario.
    }
  }

  async function handleSubmit(data, { repeat }) {
    try {
      if (kind === "recurring") {
        if (isEdit) await api.updateRecurring(form.item.id, data);
        else await api.createRecurring(data);
        toast(t(isEdit ? texts.updated : texts.created));
      } else if (repeat) {
        // "Se repite todos los meses": se crea la regla y genera este mes.
        const { date, ...rest } = data;
        await api.createRecurring({ ...rest, startDate: date });
        toast(t("recurringCreated"));
      } else {
        if (isEdit) await api.updateMovement(form.item.id, data);
        else await api.createMovement(data);
        toast(t(isEdit ? texts.updated : texts.created));
      }
      onFormClose();
      onChange?.();
      checkBudget(data);
    } catch (error) {
      // Los errores de validacion se muestran en el formulario.
      if (error?.code !== "validation_error") {
        toast(errorMessage(t, error), { variant: "error" });
      }
      throw error;
    }
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      if (toDelete.kind === "recurring") await api.deleteRecurring(toDelete.item.id);
      else await api.deleteMovement(toDelete.item.id);
      toast(t(deleteTexts.deleted));
      onDeleteClose();
      onChange?.();
    } catch (error) {
      toast(errorMessage(t, error), { variant: "error" });
    } finally {
      setDeleting(false);
    }
  }

  return (
    <>
      <Dialog open={Boolean(form)} onOpenChange={(open) => !open && onFormClose()}>
        <DialogContent closeLabel={t("close")}>
          <DialogHeader>
            <DialogTitle>{t(isEdit ? texts.editTitle : texts.newTitle)}</DialogTitle>
            <DialogDescription>
              {t(isEdit ? texts.editDescription : texts.newDescription)}
            </DialogDescription>
          </DialogHeader>
          {form && (
            <MovementForm
              key={form.key}
              item={form.item}
              mode={kind}
              onSubmit={handleSubmit}
              onCancel={onFormClose}
              onDelete={
                isEdit && onRequestDelete ? () => onRequestDelete(form.item, kind) : undefined
              }
            />
          )}
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(toDelete)}
        onOpenChange={(open) => !open && !deleting && onDeleteClose()}
      >
        <DialogContent className="max-w-md" closeLabel={t("close")}>
          <DialogHeader>
            <DialogTitle>{t(deleteTexts.deleteTitle)}</DialogTitle>
            <DialogDescription>
              {t(deleteTexts.deleteDescription, { title: toDelete?.item.title ?? "" })}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={onDeleteClose} disabled={deleting}>
              {t("cancel")}
            </Button>
            <Button
              className="bg-destructive text-white shadow-none hover:bg-destructive/85"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting ? t("deleting") : t("delete")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
