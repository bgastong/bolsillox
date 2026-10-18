import { useState } from "react";
import { issuesToFieldErrors, receivablePaymentSchema } from "@shared/movementSchema.js";
import { Field } from "@/components/Movements/MovementForm";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { api } from "@/lib/api";
import { formatCurrency, todayISO } from "@/lib/format";
import { paymentMethodOptions } from "@/lib/paymentMethods";
import { useLanguage } from "@/hooks/useLanguage";
import { useToast } from "@/hooks/useToast";

// Cobro de una deuda: por defecto todo lo que falta, hoy y cargado como ingreso.
function CollectForm({ item, onDone, onCancel }) {
  const { t, locale } = useLanguage();
  const { toast } = useToast();
  const [values, setValues] = useState({
    amount: String(item.remaining),
    date: todayISO(),
    registerIncome: true,
    paymentMethod: "transfer",
  });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  function update(field, value) {
    setValues((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: null }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    const result = receivablePaymentSchema.safeParse(values);
    const fieldErrors = result.success ? {} : issuesToFieldErrors(result.error.issues);
    if (result.success && result.data.amount > item.remaining) fieldErrors.amount = "errorPaymentTooLarge";
    if (Object.keys(fieldErrors).length) {
      setErrors(fieldErrors);
      document.getElementById("collect-amount")?.focus();
      return;
    }
    setSaving(true);
    try {
      const updated = await api.collectReceivable(item.id, result.data);
      toast(t(updated.status === "paid" ? "receivableCollectedAll" : "receivableCollectedPart"));
      onDone();
    } catch (error) {
      if (error?.fields && Object.keys(error.fields).length) setErrors(error.fields);
      else toast(t("errorGeneric"), { variant: "error" });
      setSaving(false);
    }
  }

  return (
    <form noValidate onSubmit={handleSubmit} className="grid gap-4">
      <Field
        id="collect-amount"
        label={t("collectAmount")}
        error={errors.amount ? t(errors.amount) : null}
        hint={t("collectAmountHint", { amount: formatCurrency(item.remaining, locale, { currency: item.currency }) })}
      >
        <Input
          id="collect-amount"
          type="number"
          inputMode="decimal"
          min="0"
          step="0.01"
          value={values.amount}
          onChange={(event) => update("amount", event.target.value)}
          aria-invalid={errors.amount ? true : undefined}
          aria-describedby={errors.amount ? "collect-amount-error" : undefined}
          className="text-lg font-medium tabular-nums"
          disabled={saving}
        />
      </Field>

      <Field id="collect-date" label={t("collectDate")} error={errors.date ? t(errors.date) : null}>
        <DatePicker id="collect-date" value={values.date} onChange={(value) => update("date", value)} shortcuts disabled={saving} />
      </Field>

      <label htmlFor="collect-income" className="flex cursor-pointer items-center gap-3 rounded-xl border border-input px-4 py-3">
        <span className="grid min-w-0 flex-1 gap-0.5">
          <span className="text-sm font-medium">{t("collectRegisterIncome")}</span>
          <span className="text-xs text-muted-foreground">{t("collectRegisterIncomeHint")}</span>
        </span>
        <Switch
          id="collect-income"
          checked={values.registerIncome}
          onCheckedChange={(checked) => update("registerIncome", checked)}
          disabled={saving}
        />
      </label>

      {values.registerIncome && (
        <Field id="collect-method" label={t("method")}>
          <Select
            id="collect-method"
            value={values.paymentMethod}
            onValueChange={(value) => update("paymentMethod", value)}
            options={paymentMethodOptions(t)}
            disabled={saving}
          />
        </Field>
      )}

      <div className="grid grid-cols-2 gap-2 sm:flex sm:justify-end">
        <Button type="button" variant="outline" onClick={onCancel} disabled={saving}>
          {t("cancel")}
        </Button>
        <Button type="submit" disabled={saving}>
          {saving ? t("saving") : t("collectConfirm")}
        </Button>
      </div>
    </form>
  );
}

// item: la deuda a cobrar, o null si esta cerrado.
function CollectDialog({ item, onClose, onDone }) {
  const { t } = useLanguage();
  return (
    <Dialog open={Boolean(item)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md" closeLabel={t("close")}>
        <DialogHeader>
          <DialogTitle>{item ? t("collectTitle", { person: item.person }) : ""}</DialogTitle>
          <DialogDescription>{t("collectDescription")}</DialogDescription>
        </DialogHeader>
        {item && (
          <CollectForm
            key={item.id}
            item={item}
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

export default CollectDialog;
