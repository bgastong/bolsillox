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

/*
Dialogos de crear/editar y eliminar.
- form: { movement: null | movimiento, key } cuando esta abierto
- toDelete: movimiento a confirmar
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

  const isEdit = Boolean(form?.movement);

  async function handleSubmit(data) {
    try {
      if (isEdit) {
        await api.updateMovement(form.movement.id, data);
        toast(t("movementUpdated"));
      } else {
        await api.createMovement(data);
        toast(t("movementCreated"));
      }
      onFormClose();
      onChange?.();
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
      await api.deleteMovement(toDelete.id);
      toast(t("movementDeleted"));
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
            <DialogTitle>{isEdit ? t("editMovement") : t("newMovement")}</DialogTitle>
            <DialogDescription>
              {isEdit ? t("editMovementDescription") : t("newMovementDescription")}
            </DialogDescription>
          </DialogHeader>
          {form && (
            <MovementForm
              key={form.key}
              movement={form.movement}
              onSubmit={handleSubmit}
              onCancel={onFormClose}
              onDelete={isEdit && onRequestDelete ? () => onRequestDelete(form.movement) : undefined}
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
            <DialogTitle>{t("deleteTitle")}</DialogTitle>
            <DialogDescription>
              {t("deleteDescription", { title: toDelete?.title ?? "" })}
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
