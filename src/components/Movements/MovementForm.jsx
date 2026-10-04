import { useState } from "react";
import { ArrowDownLeftIcon, ArrowUpRightIcon } from "lucide-react";
import {
  CATEGORIES_BY_TYPE,
  NOTE_MAX_LENGTH,
  PAYMENT_METHODS,
  TITLE_MAX_LENGTH,
} from "@shared/catalog.js";
import { issuesToFieldErrors, movementSchema } from "@shared/movementSchema.js";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { todayISO } from "@/lib/format";
import { useLanguage } from "@/hooks/useLanguage";

const inputClass =
  "rounded-md border-input bg-background px-3 focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 aria-invalid:border-destructive aria-invalid:ring-2 aria-invalid:ring-destructive/20";

function toFormValues(movement) {
  if (!movement) {
    return {
      type: "expense",
      title: "",
      amount: "",
      date: todayISO(),
      category: "",
      paymentMethod: "",
      note: "",
    };
  }
  return {
    type: movement.type,
    title: movement.title,
    amount: String(movement.amount),
    date: movement.date,
    category: movement.category,
    paymentMethod: movement.paymentMethod,
    note: movement.note ?? "",
  };
}

function validate(values) {
  const result = movementSchema.safeParse(values);
  return result.success
    ? { data: result.data, errors: {} }
    : { data: null, errors: issuesToFieldErrors(result.error.issues) };
}

function Field({ id, label, error, children, className }) {
  return (
    <div className={cn("grid gap-2", className)}>
      <Label htmlFor={id}>{label}</Label>
      {children}
      {error && (
        <p id={`${id}-error`} role="alert" className="text-xs text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}

/*
Formulario de alta/edicion. Valida en el front con el mismo schema (zod)
que usa el back, y muestra tambien los errores que devuelva el servidor.
*/
function MovementForm({ movement, onSubmit, onCancel }) {
  const { t } = useLanguage();
  const [values, setValues] = useState(() => toFormValues(movement));
  const [errors, setErrors] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);

  const categories = CATEGORIES_BY_TYPE[values.type] ?? [];

  function update(field, value) {
    const next = { ...values, [field]: value };
    // Si cambia el tipo y la categoria ya no corresponde, se limpia.
    if (field === "type" && !CATEGORIES_BY_TYPE[value]?.includes(next.category)) {
      next.category = "";
    }
    setValues(next);
    // Despues del primer intento de guardar, se revalida en vivo.
    if (submitted) setErrors(validate(next).errors);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSubmitted(true);
    const { data, errors: fieldErrors } = validate(values);
    setErrors(fieldErrors);
    if (!data) {
      const firstField = Object.keys(fieldErrors)[0];
      document.getElementById(`movement-${firstField}`)?.focus();
      return;
    }

    setSaving(true);
    try {
      await onSubmit(data);
    } catch (error) {
      if (error?.fields && Object.keys(error.fields).length) {
        setErrors(error.fields);
      }
    } finally {
      setSaving(false);
    }
  }

  function fieldProps(field) {
    const error = errors[field];
    return {
      id: `movement-${field}`,
      name: field,
      value: values[field],
      "aria-invalid": error ? true : undefined,
      "aria-describedby": error ? `movement-${field}-error` : undefined,
      onChange: (event) => update(field, event.target.value),
      disabled: saving,
    };
  }

  const errorText = (field) => (errors[field] ? t(errors[field]) : null);

  return (
    <form noValidate onSubmit={handleSubmit} className="grid gap-4">
      <fieldset className="grid gap-2" disabled={saving}>
        <legend className="mb-2 text-sm font-medium">{t("type")}</legend>
        <div className="grid grid-cols-2 gap-2" role="radiogroup">
          {[
            { value: "expense", label: t("expense"), icon: ArrowUpRightIcon, color: "text-expense" },
            { value: "income", label: t("income"), icon: ArrowDownLeftIcon, color: "text-income" },
          ].map(({ value, label, icon: Icon, color }) => {
            const active = values.type === value;
            return (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => update("type", value)}
                className={cn(
                  "flex h-11 items-center justify-center gap-2 rounded-md border text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:outline-none",
                  active
                    ? "border-foreground bg-secondary text-foreground"
                    : "border-input text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                <Icon className={cn("size-4", color)} />
                {label}
              </button>
            );
          })}
        </div>
        {errors.type && (
          <p role="alert" className="text-xs text-destructive">
            {t(errors.type)}
          </p>
        )}
      </fieldset>

      <Field id="movement-title" label={t("titleLabel")} error={errorText("title")}>
        <Input
          {...fieldProps("title")}
          className={inputClass}
          placeholder={t("titlePlaceholder")}
          maxLength={TITLE_MAX_LENGTH}
          autoComplete="off"
          autoFocus
        />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="movement-amount" label={`${t("amount")} (ARS)`} error={errorText("amount")}>
          <Input
            {...fieldProps("amount")}
            className={inputClass}
            type="number"
            inputMode="decimal"
            min="0"
            step="0.01"
            placeholder="0"
          />
        </Field>

        <Field id="movement-date" label={t("date")} error={errorText("date")}>
          <Input {...fieldProps("date")} className={inputClass} type="date" />
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="movement-category" label={t("category")} error={errorText("category")}>
          <NativeSelect {...fieldProps("category")}>
            <option value="" disabled>
              {t("selectPlaceholder")}
            </option>
            {categories.map((category) => (
              <option key={category} value={category}>
                {t(`cat_${category}`)}
              </option>
            ))}
          </NativeSelect>
        </Field>

        <Field
          id="movement-paymentMethod"
          label={t("method")}
          error={errorText("paymentMethod")}
        >
          <NativeSelect {...fieldProps("paymentMethod")}>
            <option value="" disabled>
              {t("selectPlaceholder")}
            </option>
            {PAYMENT_METHODS.map((method) => (
              <option key={method} value={method}>
                {t(`pm_${method}`)}
              </option>
            ))}
          </NativeSelect>
        </Field>
      </div>

      <Field id="movement-note" label={t("note")} error={errorText("note")}>
        <Textarea
          {...fieldProps("note")}
          placeholder={t("notePlaceholder")}
          maxLength={NOTE_MAX_LENGTH}
          rows={2}
        />
      </Field>

      <div className="mt-2 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button type="button" variant="outline" onClick={onCancel} disabled={saving}>
          {t("cancel")}
        </Button>
        <Button type="submit" disabled={saving}>
          {saving ? t("saving") : t("save")}
        </Button>
      </div>
    </form>
  );
}

export default MovementForm;
