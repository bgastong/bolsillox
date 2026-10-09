import { useState } from "react";
import { ArrowDownLeftIcon, ArrowUpRightIcon, RepeatIcon, Trash2Icon } from "lucide-react";
import {
  CATEGORIES_BY_TYPE,
  CURRENCIES,
  NOTE_MAX_LENGTH,
  TITLE_MAX_LENGTH,
} from "@shared/catalog.js";
import {
  issuesToFieldErrors,
  movementSchema,
  recurringSchema,
} from "@shared/movementSchema.js";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DatePicker } from "@/components/ui/date-picker";
import { Select } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { todayISO } from "@/lib/format";
import { getCategoryMeta } from "@/lib/categories";
import { paymentMethodOptions } from "@/lib/paymentMethods";
import { useLanguage } from "@/hooks/useLanguage";

/*
mode "movement": un movimiento (al crearlo se puede marcar "se repite").
mode "recurring": una regla recurrente (inicio, fin opcional, activa).
*/
function toFormValues(item, mode) {
  const base = {
    type: item?.type ?? "expense",
    title: item?.title ?? "",
    amount: item ? String(item.amount) : "",
    currency: item?.currency ?? "ARS",
    category: item?.category ?? "",
    paymentMethod: item?.paymentMethod ?? "",
    note: item?.note ?? "",
  };
  if (mode === "recurring") {
    return {
      ...base,
      startDate: item?.startDate ?? todayISO(),
      endDate: item?.endDate ?? "",
      active: item?.active ?? true,
    };
  }
  return { ...base, date: item?.date ?? todayISO(), repeat: false };
}

function validate(values, mode) {
  const schema = mode === "recurring" ? recurringSchema : movementSchema;
  const result = schema.safeParse(values);
  return result.success
    ? { data: result.data, errors: {} }
    : { data: null, errors: issuesToFieldErrors(result.error.issues) };
}

function Field({ id, label, error, hint, children, className }) {
  return (
    <div className={cn("grid gap-2", className)}>
      <Label htmlFor={id}>{label}</Label>
      {children}
      {hint && !error && <p className="m-0 text-xs text-muted-foreground">{hint}</p>}
      {error && (
        <p id={`${id}-error`} role="alert" className="m-0 text-xs text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}

// Control segmentado reutilizable (radiogroup accesible).
function Segmented({ label, options, value, onChange, className, size = "md" }) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={cn("grid gap-1 rounded-xl bg-fg/[0.04] p-1", className)}
      style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}
    >
      {options.map(({ value: optionValue, label: optionLabel, icon: Icon, activeClass }) => {
        const active = value === optionValue;
        return (
          <button
            key={optionValue}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(optionValue)}
            className={cn(
              "flex items-center justify-center gap-2 rounded-lg text-sm font-medium transition-all focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:outline-none",
              size === "md" ? "h-11 sm:h-10" : "h-9 px-2 sm:h-8",
              active
                ? "bg-secondary text-foreground shadow-[0_1px_2px_rgba(0,0,0,0.4),inset_0_0_0_1px_rgba(255,255,255,0.08)]"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {Icon && <Icon className={cn("size-4", active && activeClass)} aria-hidden="true" />}
            {optionLabel}
          </button>
        );
      })}
    </div>
  );
}

/*
Formulario de alta/edicion. Valida en el front con el mismo schema (zod)
que usa el back, y muestra tambien los errores que devuelva el servidor.
onSubmit(data, { repeat }) — repeat indica "crear como recurrente".
*/
function MovementForm({ item, mode = "movement", onSubmit, onCancel, onDelete }) {
  const { t } = useLanguage();
  const [values, setValues] = useState(() => toFormValues(item, mode));
  const [errors, setErrors] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);

  const isRecurring = mode === "recurring";
  const isNew = !item;
  const categories = CATEGORIES_BY_TYPE[values.type] ?? [];

  function update(field, value) {
    const next = { ...values, [field]: value };
    // Si cambia el tipo y la categoria ya no corresponde, se limpia.
    if (field === "type" && !CATEGORIES_BY_TYPE[value]?.includes(next.category)) {
      next.category = "";
    }
    setValues(next);
    // Despues del primer intento de guardar, se revalida en vivo.
    if (submitted) setErrors(validate(next, mode).errors);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSubmitted(true);
    const { data, errors: fieldErrors } = validate(values, mode);
    setErrors(fieldErrors);
    if (!data) {
      const firstField = Object.keys(fieldErrors)[0];
      document.getElementById(`movement-${firstField}`)?.focus();
      return;
    }

    setSaving(true);
    try {
      await onSubmit(data, { repeat: !isRecurring && values.repeat });
    } catch (error) {
      if (error?.fields && Object.keys(error.fields).length) {
        // La regla recurrente usa startDate; en el form de movimiento es "date".
        const fields = { ...error.fields };
        if (!isRecurring && fields.startDate) fields.date = fields.startDate;
        setErrors(fields);
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

  // Para los controles propios (fecha y medio de pago), que devuelven el valor directo.
  function pickerProps(field) {
    const error = errors[field];
    return {
      id: `movement-${field}`,
      value: values[field],
      "aria-invalid": error ? true : undefined,
      "aria-describedby": error ? `movement-${field}-error` : undefined,
      disabled: saving,
    };
  }

  const errorText = (field) => (errors[field] ? t(errors[field]) : null);

  return (
    <form noValidate onSubmit={handleSubmit} className="grid gap-4">
      {!isRecurring && item?.recurringId && (
        <p className="m-0 flex items-start gap-2 rounded-xl bg-fg/[0.04] px-3 py-2.5 text-sm text-muted-foreground">
          <RepeatIcon className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          {t("generatedOccurrenceHint")}
        </p>
      )}

      <fieldset className="m-0 grid gap-2 border-0 p-0" disabled={saving}>
        <legend className="sr-only">{t("type")}</legend>
        <Segmented
          label={t("type")}
          value={values.type}
          onChange={(value) => update("type", value)}
          options={[
            { value: "expense", label: t("expense"), icon: ArrowUpRightIcon },
            { value: "income", label: t("income"), icon: ArrowDownLeftIcon, activeClass: "text-income" },
          ]}
        />
        {errors.type && (
          <p role="alert" className="m-0 text-xs text-destructive">
            {t(errors.type)}
          </p>
        )}
      </fieldset>

      <Field id="movement-title" label={t("titleLabel")} error={errorText("title")}>
        <Input
          {...fieldProps("title")}
          placeholder={t("titlePlaceholder")}
          maxLength={TITLE_MAX_LENGTH}
          autoComplete="off"
          autoCapitalize="sentences"
          enterKeyHint="next"
        />
      </Field>

      {/* Monto + moneda */}
      <div className="grid gap-2">
        <div className="flex items-end justify-between gap-3">
          <Label htmlFor="movement-amount">{t("amount")}</Label>
          <Segmented
            label={t("currency")}
            value={values.currency}
            onChange={(value) => update("currency", value)}
            size="sm"
            className="w-32"
            options={CURRENCIES.map((code) => ({ value: code, label: code }))}
          />
        </div>
        <div className="relative">
          <span
            aria-hidden="true"
            className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-lg font-medium text-muted-foreground sm:text-base"
          >
            {values.currency === "USD" ? "US$" : "$"}
          </span>
          <Input
            {...fieldProps("amount")}
            type="number"
            inputMode="decimal"
            enterKeyHint="next"
            min="0"
            step="0.01"
            placeholder="0"
            aria-label={`${t("amount")} (${values.currency})`}
            className={cn(
              "text-lg font-medium tabular-nums sm:text-base",
              values.currency === "USD" ? "pl-14" : "pl-7",
            )}
          />
        </div>
        {errors.amount && (
          <p id="movement-amount-error" role="alert" className="m-0 text-xs text-destructive">
            {t(errors.amount)}
          </p>
        )}
        {errors.currency && (
          <p role="alert" className="m-0 text-xs text-destructive">
            {t(errors.currency)}
          </p>
        )}
      </div>

      {isRecurring ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            id="movement-startDate"
            label={t("startDate")}
            hint={t("startDateHint")}
            error={errorText("startDate")}
          >
            <DatePicker
              {...pickerProps("startDate")}
              onChange={(value) => update("startDate", value)}
            />
          </Field>
          <Field
            id="movement-endDate"
            label={t("endDateOptional")}
            hint={t("endDateHint")}
            error={errorText("endDate")}
          >
            <DatePicker
              {...pickerProps("endDate")}
              onChange={(value) => update("endDate", value)}
              min={values.startDate || undefined}
              placeholder={t("noEndDate")}
              clearable
            />
          </Field>
        </div>
      ) : (
        <Field id="movement-date" label={t("date")} error={errorText("date")}>
          <DatePicker
            {...pickerProps("date")}
            onChange={(value) => update("date", value)}
            shortcuts
          />
        </Field>
      )}

      <fieldset
        className="m-0 grid gap-2 border-0 p-0"
        disabled={saving}
        aria-describedby={errors.category ? "movement-category-error" : undefined}
      >
        <legend className="mb-2 text-sm font-medium">{t("category")}</legend>
        {/* Chips de categoria, cada una con su color e icono */}
        <div className="flex flex-wrap gap-2" role="radiogroup" aria-label={t("category")}>
          {categories.map((category, index) => {
            const { color, icon: Icon } = getCategoryMeta(category);
            const active = values.category === category;
            return (
              <button
                key={category}
                id={index === 0 ? "movement-category" : undefined}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => update("category", category)}
                className={cn(
                  "inline-flex h-11 items-center gap-1.5 rounded-full border px-3.5 text-sm transition-all focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:outline-none sm:h-9 sm:px-3",
                  active
                    ? "font-medium text-foreground"
                    : "border-input text-muted-foreground hover:border-fg/20 hover:text-foreground",
                  errors.category && !active && "border-destructive/50",
                )}
                style={
                  active
                    ? {
                        borderColor: color,
                        background: `color-mix(in srgb, ${color} 16%, transparent)`,
                      }
                    : undefined
                }
              >
                <Icon className="size-3.5" style={{ color }} aria-hidden="true" />
                {t(`cat_${category}`)}
              </button>
            );
          })}
        </div>
        {errors.category && (
          <p id="movement-category-error" role="alert" className="m-0 text-xs text-destructive">
            {t(errors.category)}
          </p>
        )}
      </fieldset>

      <Field id="movement-paymentMethod" label={t("method")} error={errorText("paymentMethod")}>
        <Select
          {...pickerProps("paymentMethod")}
          onValueChange={(value) => update("paymentMethod", value)}
          options={paymentMethodOptions(t)}
          placeholder={t("selectPlaceholder")}
        />
      </Field>

      <Field id="movement-note" label={t("note")} error={errorText("note")}>
        <Textarea
          {...fieldProps("note")}
          placeholder={t("notePlaceholder")}
          maxLength={NOTE_MAX_LENGTH}
          rows={2}
        />
      </Field>

      {/* Repetir todos los meses (al crear) / regla activa (al editar una regla) */}
      {((!isRecurring && isNew) || (isRecurring && !isNew)) && (
        <label
          htmlFor="movement-toggle"
          className="flex cursor-pointer items-center gap-3 rounded-xl border bg-fg/[0.02] p-3.5"
        >
          <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <RepeatIcon className="size-[18px]" aria-hidden="true" />
          </span>
          <span className="grid min-w-0 flex-1 gap-0.5">
            <span className="text-sm font-medium">
              {isRecurring ? t("recurringActive") : t("repeatMonthly")}
            </span>
            <span className="text-xs text-muted-foreground">
              {isRecurring ? t("recurringActiveHint") : t("repeatMonthlyHint")}
            </span>
          </span>
          <Switch
            id="movement-toggle"
            checked={isRecurring ? values.active : values.repeat}
            onCheckedChange={(checked) => update(isRecurring ? "active" : "repeat", checked)}
            disabled={saving}
          />
        </label>
      )}

      {/* Acciones fijas abajo: siempre visibles aunque el teclado este abierto */}
      <div className="sticky bottom-0 -mx-5 mt-1 flex flex-col gap-2 border-t bg-popover px-5 pt-3 pb-1 sm:static sm:mx-0 sm:flex-row sm:items-center sm:border-0 sm:p-0">
        {onDelete && (
          <Button
            type="button"
            variant="ghost"
            onClick={onDelete}
            disabled={saving}
            className="order-3 text-destructive hover:bg-destructive/10 hover:text-destructive sm:order-none sm:mr-auto"
          >
            <Trash2Icon data-icon="inline-start" />
            {t("delete")}
          </Button>
        )}
        <div className="grid grid-cols-2 gap-2 sm:ml-auto sm:flex">
          <Button type="button" variant="outline" onClick={onCancel} disabled={saving}>
            {t("cancel")}
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? t("saving") : t("save")}
          </Button>
        </div>
      </div>
    </form>
  );
}

export default MovementForm;
