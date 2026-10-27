import { useState } from "react";
import { CheckIcon, Trash2Icon } from "lucide-react";
import { CURRENCIES, INVESTMENT_INDICES, INVESTMENT_NAME_MAX_LENGTH } from "@shared/catalog.js";
import { investmentSchema, issuesToFieldErrors } from "@shared/movementSchema.js";
import { Field, Segmented } from "@/components/Movements/MovementForm";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/hooks/useLanguage";
import { useToast } from "@/hooks/useToast";

function InvestmentForm({ item, onDone, onCancel }) {
  const { t } = useLanguage();
  const { toast } = useToast();
  const isEdit = Boolean(item);
  // Con aportes cargados, el indice y la moneda quedan fijos (cambiaria todo el calculo).
  const locked = Boolean(item?.entries.length);
  const [values, setValues] = useState(() => ({
    name: item?.name ?? "",
    index: item?.index ?? "sp500",
    currency: item?.currency ?? "ARS",
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
    const result = investmentSchema.safeParse(values);
    if (!result.success) {
      const fieldErrors = issuesToFieldErrors(result.error.issues);
      setErrors(fieldErrors);
      document.getElementById(`investment-${Object.keys(fieldErrors)[0]}`)?.focus();
      return;
    }
    setSaving(true);
    try {
      if (isEdit) await api.updateInvestment(item.id, result.data);
      else await api.createInvestment(result.data);
      toast(t(isEdit ? "investmentSaved" : "investmentCreated"));
      onDone();
    } catch (error) {
      if (error?.fields && Object.keys(error.fields).length) setErrors(error.fields);
      else toast(t(error?.code === "investments_limit" ? "errorInvestmentsLimit" : "errorGeneric"), { variant: "error" });
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
      await api.deleteInvestment(item.id);
      toast(t("investmentDeleted"));
      onDone();
    } catch {
      toast(t("errorGeneric"), { variant: "error" });
      setSaving(false);
    }
  }

  return (
    <form noValidate onSubmit={handleSubmit} className="grid gap-5">
      <Field id="investment-name" label={t("investmentName")} error={errors.name ? t(errors.name) : null}>
        <Input
          id="investment-name"
          value={values.name}
          maxLength={INVESTMENT_NAME_MAX_LENGTH}
          placeholder={t("investmentNamePlaceholder")}
          onChange={(event) => update("name", event.target.value)}
          aria-invalid={errors.name ? true : undefined}
          aria-describedby={errors.name ? "investment-name-error" : undefined}
          autoComplete="off"
          disabled={saving}
        />
      </Field>

      <fieldset className="m-0 grid gap-2 border-0 p-0" disabled={saving || locked}>
        <legend className="mb-2 text-sm font-medium">{t("investmentIndex")}</legend>
        <div role="radiogroup" aria-label={t("investmentIndex")} className="grid gap-2">
          {INVESTMENT_INDICES.map((key) => {
            const active = values.index === key;
            return (
              <button
                key={key}
                id={key === INVESTMENT_INDICES[0] ? "investment-index" : undefined}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => update("index", key)}
                className={cn(
                  "flex items-center gap-3 rounded-xl border px-3.5 py-3 text-left transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  active ? "border-foreground/50 bg-fg/[0.05]" : "border-input hover:border-fg/20",
                )}
              >
                <span className="grid min-w-0 flex-1 gap-0.5">
                  <span className="text-sm font-medium">{t(`investmentIndex_${key}`)}</span>
                  <span className="text-xs text-muted-foreground">{t(`investmentIndexHint_${key}`)}</span>
                </span>
                {active && <CheckIcon className="size-4 shrink-0" aria-hidden="true" />}
              </button>
            );
          })}
        </div>
        <p className="m-0 text-xs text-muted-foreground">{t("investmentMoreIndices")}</p>
      </fieldset>

      <div className="grid gap-2">
        <span className="text-sm font-medium" id="investment-currency-label">
          {t("investmentCurrency")}
        </span>
        <Segmented
          label={t("investmentCurrency")}
          className={cn(locked && "pointer-events-none opacity-60")}
          value={values.currency}
          onChange={(value) => !locked && update("currency", value)}
          options={CURRENCIES.map((code) => ({ value: code, label: t(code === "USD" ? "investmentInUsd" : "investmentInArs") }))}
        />
        <p className={cn("m-0 text-xs", errors.currency ? "text-destructive" : "text-muted-foreground")} role={errors.currency ? "alert" : undefined}>
          {errors.currency
            ? t(errors.currency)
            : locked
              ? t("investmentLockedHint")
              : t(values.currency === "ARS" ? "investmentArsHint" : "investmentUsdHint")}
        </p>
      </div>

      {confirmDelete && (
        <p role="alert" className="m-0 rounded-xl bg-destructive/10 px-3 py-2.5 text-sm text-destructive">
          {t("investmentDeleteConfirm")}
        </p>
      )}

      <div className="sticky bottom-0 -mx-5 flex flex-col gap-2 border-t bg-popover px-5 pt-3 pb-1 sm:static sm:mx-0 sm:flex-row sm:items-center sm:border-0 sm:p-0">
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
      </div>
    </form>
  );
}

// target: null (cerrado), { item: null } para crear o { item } para editar.
function InvestmentDialog({ target, onClose, onDone }) {
  const { t } = useLanguage();
  const isEdit = Boolean(target?.item);
  return (
    <Dialog open={Boolean(target)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md" closeLabel={t("close")}>
        <DialogHeader>
          <DialogTitle>{t(isEdit ? "editInvestmentTitle" : "newInvestmentTitle")}</DialogTitle>
          <DialogDescription>{t("investmentDialogDescription")}</DialogDescription>
        </DialogHeader>
        {target && (
          <InvestmentForm
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

export default InvestmentDialog;
