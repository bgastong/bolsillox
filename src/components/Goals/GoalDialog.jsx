import { useState } from "react";
import { Trash2Icon } from "lucide-react";
import { CURRENCIES, GOAL_ICONS, GOAL_NAME_MAX_LENGTH } from "@shared/catalog.js";
import { goalSchema, issuesToFieldErrors } from "@shared/movementSchema.js";
import { Field, Segmented } from "@/components/Movements/MovementForm";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import { Dialog, DialogActions, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { AmountInput } from "@/components/ui/amount-input";
import { api } from "@/lib/api";
import { CUSTOM_CATEGORY_ICONS } from "@/lib/categories";
import { formatCurrency, todayISO } from "@/lib/format";
import { monthsUntil } from "@/lib/goals";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/hooks/useLanguage";
import { useToast } from "@/hooks/useToast";

function GoalForm({ goal, onDone, onCancel }) {
  const { t, locale } = useLanguage();
  const { toast } = useToast();
  const isEdit = Boolean(goal);
  // Con aportes cargados la moneda queda fija (estan en esa moneda).
  const currencyLocked = Boolean(goal?.entries.length);
  const [values, setValues] = useState(() => ({
    name: goal?.name ?? "",
    target: goal ? String(goal.target) : "",
    currency: goal?.currency ?? "ARS",
    deadline: goal?.deadline ?? "",
    icon: goal?.icon ?? "piggyBank",
  }));
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  function update(field, value) {
    setValues((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: null }));
  }

  // Mientras se completa: cuanto habria que apartar por mes para llegar.
  const target = Number(values.target);
  const months = values.deadline ? monthsUntil(values.deadline) : null;
  const missing = target - (goal?.saved ?? 0);
  const planHint =
    target > 0 && months && missing > 0
      ? t("goalPlanHint", {
          amount: formatCurrency(Math.ceil(missing / months), locale, { currency: values.currency }),
          count: months,
        })
      : null;

  async function handleSubmit(event) {
    event.preventDefault();
    const result = goalSchema.safeParse(values);
    if (!result.success) {
      const fieldErrors = issuesToFieldErrors(result.error.issues);
      setErrors(fieldErrors);
      document.getElementById(`goal-${Object.keys(fieldErrors)[0]}`)?.focus();
      return;
    }
    setSaving(true);
    try {
      if (isEdit) await api.updateGoal(goal.id, result.data);
      else await api.createGoal(result.data);
      toast(t(isEdit ? "goalSaved" : "goalCreated"));
      onDone();
    } catch (error) {
      if (error?.fields && Object.keys(error.fields).length) setErrors(error.fields);
      else toast(t(error?.code === "goals_limit" ? "errorGoalsLimit" : "errorGeneric"), { variant: "error" });
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
      await api.deleteGoal(goal.id);
      toast(t("goalDeleted"));
      onDone();
    } catch {
      toast(t("errorGeneric"), { variant: "error" });
      setSaving(false);
    }
  }

  const error = (field) => (errors[field] ? t(errors[field]) : null);
  const describedBy = (field) => (errors[field] ? `goal-${field}-error` : undefined);

  return (
    <form noValidate onSubmit={handleSubmit} className="grid gap-5">
      <Field id="goal-name" label={t("goalName")} error={error("name")}>
        <Input
          id="goal-name"
          value={values.name}
          maxLength={GOAL_NAME_MAX_LENGTH}
          placeholder={t("goalNamePlaceholder")}
          onChange={(event) => update("name", event.target.value)}
          aria-invalid={errors.name ? true : undefined}
          aria-describedby={describedBy("name")}
          autoComplete="off"
          autoCapitalize="sentences"
          disabled={saving}
        />
      </Field>

      <fieldset className="m-0 grid gap-2 border-0 p-0" disabled={saving}>
        <legend className="mb-2 text-sm font-medium">{t("goalIcon")}</legend>
        <div role="radiogroup" aria-label={t("goalIcon")} className="grid grid-cols-6 gap-1.5">
          {GOAL_ICONS.map((name) => {
            const Icon = CUSTOM_CATEGORY_ICONS[name];
            const active = values.icon === name;
            return (
              <button
                key={name}
                type="button"
                role="radio"
                aria-checked={active}
                aria-label={t(`goalIcon_${name}`)}
                onClick={() => update("icon", name)}
                className={cn(
                  "flex h-11 touch-manipulation items-center justify-center rounded-xl border transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring sm:h-10",
                  active
                    ? "border-foreground/60 bg-fg/[0.08] text-foreground"
                    : "border-input text-muted-foreground hover:border-fg/20 hover:text-foreground",
                )}
              >
                <Icon className="size-[18px]" strokeWidth={1.75} aria-hidden="true" />
              </button>
            );
          })}
        </div>
      </fieldset>

      <div className="grid gap-2">
        <div className="flex items-end justify-between gap-3">
          <label htmlFor="goal-target" className="text-sm font-medium">
            {t("goalTarget")}
          </label>
          <Segmented
            label={t("currency")}
            size="sm"
            className={cn("w-36", currencyLocked && "pointer-events-none opacity-60")}
            value={values.currency}
            onChange={(value) => !currencyLocked && update("currency", value)}
            options={CURRENCIES.map((code) => ({ value: code, label: code }))}
          />
        </div>
        <AmountInput
          id="goal-target"
                    placeholder="0"
          value={values.target}
          onChange={(event) => update("target", event.target.value)}
          aria-invalid={errors.target ? true : undefined}
          aria-describedby={describedBy("target")}
          className="text-lg font-medium tabular-nums"
          disabled={saving}
        />
        {(errors.target || errors.currency) && (
          <p id="goal-target-error" role="alert" className="m-0 text-xs text-destructive">
            {t(errors.target ?? errors.currency)}
          </p>
        )}
        {currencyLocked && !errors.currency && (
          <p className="m-0 text-xs text-muted-foreground">{t("goalCurrencyLockedHint")}</p>
        )}
      </div>

      <Field id="goal-deadline" label={t("goalDeadline")} error={error("deadline")} hint={planHint ?? t("goalDeadlineHint")}>
        <DatePicker
          id="goal-deadline"
          value={values.deadline}
          onChange={(value) => update("deadline", value)}
          min={todayISO()}
          clearable
          placeholder={t("goalNoDeadline")}
          disabled={saving}
          aria-invalid={errors.deadline ? true : undefined}
          aria-describedby={describedBy("deadline")}
        />
      </Field>

      {confirmDelete && (
        <p role="alert" className="m-0 rounded-xl bg-destructive/10 px-3 py-2.5 text-sm text-destructive">
          {t("goalDeleteConfirm")}
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

// target: null (cerrado), { goal: null } para crear una meta o { goal } para editarla.
function GoalDialog({ target, onClose, onDone }) {
  const { t } = useLanguage();
  const isEdit = Boolean(target?.goal);
  return (
    <Dialog open={Boolean(target)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md" closeLabel={t("close")}>
        <DialogHeader>
          <DialogTitle>{t(isEdit ? "editGoalTitle" : "newGoalTitle")}</DialogTitle>
          <DialogDescription>{t("goalDialogDescription")}</DialogDescription>
        </DialogHeader>
        {target && (
          <GoalForm
            key={target.goal?.id ?? "new"}
            goal={target.goal}
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

export default GoalDialog;
