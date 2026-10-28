import { useState } from "react";
import { Trash2Icon } from "lucide-react";
import { CURRENCIES } from "@shared/catalog.js";
import {
  issuesToFieldErrors,
  RECEIVABLE_CONCEPT_MAX_LENGTH,
  RECEIVABLE_PERSON_MAX_LENGTH,
  receivableSchema,
} from "@shared/movementSchema.js";
import { Field, Segmented } from "@/components/Movements/MovementForm";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import {
  Dialog,
  DialogActions,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { AmountInput } from "@/components/ui/amount-input";
import { api } from "@/lib/api";
import { todayISO } from "@/lib/format";
import { useLanguage } from "@/hooks/useLanguage";
import { useToast } from "@/hooks/useToast";

function ReceivableForm({ item, onDone, onCancel }) {
  const { t } = useLanguage();
  const { toast } = useToast();
  const isEdit = Boolean(item);
  const [values, setValues] = useState(() => ({
    person: item?.person ?? "",
    concept: item?.concept ?? "",
    amount: item ? String(item.amount) : "",
    currency: item?.currency ?? "ARS",
    date: item?.date ?? todayISO(),
    dueDate: item?.dueDate ?? "",
  }));
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  function update(field, value) {
    setValues((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: null }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    const result = receivableSchema.safeParse(values);
    if (!result.success) {
      const fieldErrors = issuesToFieldErrors(result.error.issues);
      setErrors(fieldErrors);
      document.getElementById(`receivable-${Object.keys(fieldErrors)[0]}`)?.focus();
      return;
    }
    setSaving(true);
    try {
      if (isEdit) await api.updateReceivable(item.id, result.data);
      else await api.createReceivable(result.data);
      toast(t(isEdit ? "receivableSaved" : "receivableCreated"));
      onDone();
    } catch (error) {
      if (error?.fields && Object.keys(error.fields).length) setErrors(error.fields);
      else toast(t("errorGeneric"), { variant: "error" });
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    setSaving(true);
    try {
      await api.deleteReceivable(item.id);
      toast(t("receivableDeleted"));
      onDone();
    } catch {
      toast(t("errorGeneric"), { variant: "error" });
      setSaving(false);
    }
  }

  const error = (field) => (errors[field] ? t(errors[field]) : null);
  const describedBy = (field) => (errors[field] ? `receivable-${field}-error` : undefined);

  return (
    <form noValidate onSubmit={handleSubmit} className="grid gap-4">
      <Field id="receivable-person" label={t("receivablePerson")} error={error("person")}>
        <Input
          id="receivable-person"
          value={values.person}
          maxLength={RECEIVABLE_PERSON_MAX_LENGTH}
          placeholder={t("receivablePersonPlaceholder")}
          onChange={(event) => update("person", event.target.value)}
          aria-invalid={errors.person ? true : undefined}
          aria-describedby={describedBy("person")}
          autoComplete="off"
          disabled={saving}
        />
      </Field>

      <Field id="receivable-concept" label={t("receivableConcept")} error={error("concept")} hint={t("optional")}>
        <Input
          id="receivable-concept"
          value={values.concept}
          maxLength={RECEIVABLE_CONCEPT_MAX_LENGTH}
          placeholder={t("receivableConceptPlaceholder")}
          onChange={(event) => update("concept", event.target.value)}
          aria-describedby={describedBy("concept")}
          autoComplete="off"
          disabled={saving}
        />
      </Field>

      <div className="grid gap-2">
        <div className="flex items-end justify-between gap-3">
          <label htmlFor="receivable-amount" className="text-sm font-medium">
            {t("amount")}
          </label>
          <Segmented
            label={t("currency")}
            size="sm"
            className="w-36"
            value={values.currency}
            onChange={(value) => update("currency", value)}
            options={CURRENCIES.map((code) => ({ value: code, label: code }))}
          />
        </div>
        <AmountInput
          id="receivable-amount"
                    placeholder="0"
          value={values.amount}
          onChange={(event) => update("amount", event.target.value)}
          aria-invalid={errors.amount ? true : undefined}
          aria-describedby={describedBy("amount")}
          className="text-lg font-medium tabular-nums"
          disabled={saving}
        />
        {errors.amount && (
          <p id="receivable-amount-error" role="alert" className="m-0 text-xs text-destructive">
            {t(errors.amount)}
          </p>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="receivable-date" label={t("receivableDate")} error={error("date")}>
          <DatePicker
            id="receivable-date"
            value={values.date}
            onChange={(value) => update("date", value)}
            shortcuts
            disabled={saving}
            aria-invalid={errors.date ? true : undefined}
            aria-describedby={describedBy("date")}
          />
        </Field>
        <Field id="receivable-dueDate" label={t("receivableDueDate")} error={error("dueDate")} hint={t("optional")}>
          <DatePicker
            id="receivable-dueDate"
            value={values.dueDate}
            onChange={(value) => update("dueDate", value)}
            min={values.date}
            clearable
            placeholder={t("receivableNoDueDate")}
            disabled={saving}
            aria-invalid={errors.dueDate ? true : undefined}
            aria-describedby={describedBy("dueDate")}
          />
        </Field>
      </div>

      {confirmDelete && (
        <p role="alert" className="m-0 rounded-xl bg-destructive/10 px-3 py-2.5 text-sm text-destructive">
          {t("receivableDeleteConfirm")}
        </p>
      )}

      <DialogActions>
        {isEdit && (
          <Button
            type="button"
            variant="ghost"
            onClick={handleDelete}
            disabled={saving}
            className="order-3 text-destructive hover:bg-destructive/10 hover:text-destructive sm:order-none sm:mr-auto"
          >
            <Trash2Icon data-icon="inline-start" />
            {confirmDelete ? t("categoryDeleteYes") : t("delete")}
          </Button>
        )}
        <div className="grid grid-cols-2 gap-2 sm:ml-auto sm:flex">
          <Button type="button" variant="outline" onClick={onCancel} disabled={saving}>
            {t("cancel")}
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? t("saving") : isEdit ? t("save") : t("create")}
          </Button>
        </div>
      </DialogActions>
    </form>
  );
}

// target: null (cerrado), { item: null } para cargar una deuda o { item } para editarla.
function ReceivableDialog({ target, onClose, onDone }) {
  const { t } = useLanguage();
  const isEdit = Boolean(target?.item);
  return (
    <Dialog open={Boolean(target)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md" closeLabel={t("close")}>
        <DialogHeader>
          <DialogTitle>{t(isEdit ? "editReceivableTitle" : "newReceivableTitle")}</DialogTitle>
          <DialogDescription>{t("receivableDialogDescription")}</DialogDescription>
        </DialogHeader>
        {target && (
          <ReceivableForm
            key={target.item?.id ?? "new"}
            item={target.item}
            onCancel={onClose}
            onDone={() => {
              onClose();
              onDone();
            }}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

export default ReceivableDialog;
