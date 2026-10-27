import { useState } from "react";
import { ArrowDownLeftIcon, ArrowUpRightIcon, Trash2Icon } from "lucide-react";
import { goalEntrySchema, issuesToFieldErrors } from "@shared/movementSchema.js";
import { Field, Segmented } from "@/components/Movements/MovementForm";
import Money from "@/components/Money/Money";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AmountInput } from "@/components/ui/amount-input";
import { Select } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { api } from "@/lib/api";
import { formatCurrency, formatDate, todayISO } from "@/lib/format";
import { paymentMethodOptions } from "@/lib/paymentMethods";
import { useLanguage } from "@/hooks/useLanguage";
import { useToast } from "@/hooks/useToast";

// Lo sugerido al aportar: lo que falta este mes para ir al dia (o nada).
function suggestedAmount(goal, type) {
  if (type === "withdraw") return "";
  if (goal.thisMonthLeft > 0) return String(Math.min(goal.thisMonthLeft, goal.remaining));
  return "";
}

function EntryForm({ goal, initialType, onSaved, onCancel }) {
  const { t, locale } = useLanguage();
  const { toast } = useToast();
  const [values, setValues] = useState(() => ({
    type: initialType,
    amount: suggestedAmount(goal, initialType),
    date: todayISO(),
    registerMovement: true,
    paymentMethod: "transfer",
  }));
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const withdraw = values.type === "withdraw";
  const money = (value) => formatCurrency(value, locale, { currency: goal.currency });

  function update(field, value) {
    setValues((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: null }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    const result = goalEntrySchema.safeParse(values);
    const fieldErrors = result.success ? {} : issuesToFieldErrors(result.error.issues);
    if (result.success && withdraw && result.data.amount > goal.saved) fieldErrors.amount = "errorWithdrawTooLarge";
    if (Object.keys(fieldErrors).length) {
      setErrors(fieldErrors);
      document.getElementById("goal-entry-amount")?.focus();
      return;
    }
    setSaving(true);
    try {
      const updated = await api.addGoalEntry(goal.id, result.data);
      const reached = updated.status === "done" && goal.status !== "done";
      toast(t(reached ? "goalReachedToast" : withdraw ? "goalWithdrawn" : "goalDeposited", { name: goal.name }));
      onSaved(updated, result.data.registerMovement);
    } catch (error) {
      if (error?.fields && Object.keys(error.fields).length) setErrors(error.fields);
      else toast(t("errorGeneric"), { variant: "error" });
      setSaving(false);
    }
  }

  return (
    <form noValidate onSubmit={handleSubmit} className="grid gap-4">
      <Segmented
        label={t("goalEntryType")}
        value={values.type}
        onChange={(value) => update("type", value)}
        options={[
          { value: "deposit", label: t("goalDeposit"), icon: ArrowDownLeftIcon, activeClass: "text-income" },
          { value: "withdraw", label: t("goalWithdraw"), icon: ArrowUpRightIcon },
        ]}
      />

      <Field
        id="goal-entry-amount"
        label={t("amount")}
        error={errors.amount ? t(errors.amount) : null}
        hint={
          withdraw
            ? t("goalWithdrawHint", { amount: money(goal.saved) })
            : goal.thisMonthLeft > 0
              ? t("goalDepositHint", { amount: money(goal.thisMonthLeft) })
              : t("goalRemainingHint", { amount: money(goal.remaining) })
        }
      >
        <AmountInput
          id="goal-entry-amount"
                    placeholder="0"
          value={values.amount}
          onChange={(event) => update("amount", event.target.value)}
          aria-invalid={errors.amount ? true : undefined}
          aria-describedby={errors.amount ? "goal-entry-amount-error" : undefined}
          aria-label={`${t("amount")} (${goal.currency})`}
          className="text-lg font-medium tabular-nums"
          disabled={saving}
        />
      </Field>

      <Field id="goal-entry-date" label={t("date")} error={errors.date ? t(errors.date) : null}>
        <DatePicker id="goal-entry-date" value={values.date} onChange={(value) => update("date", value)} shortcuts disabled={saving} />
      </Field>

      <label htmlFor="goal-entry-movement" className="flex cursor-pointer items-center gap-3 rounded-xl border border-input px-4 py-3">
        <span className="grid min-w-0 flex-1 gap-0.5">
          <span className="text-sm font-medium">{t(withdraw ? "goalRegisterIncome" : "goalRegisterExpense")}</span>
          <span className="text-xs text-muted-foreground">
            {t(withdraw ? "goalRegisterIncomeHint" : "goalRegisterExpenseHint", { name: goal.name })}
          </span>
        </span>
        <Switch
          id="goal-entry-movement"
          checked={values.registerMovement}
          onCheckedChange={(checked) => update("registerMovement", checked)}
          disabled={saving}
        />
      </label>

      {values.registerMovement && (
        <Field id="goal-entry-method" label={t("method")}>
          <Select
            id="goal-entry-method"
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
          {saving ? t("saving") : t(withdraw ? "goalWithdrawConfirm" : "goalDepositConfirm")}
        </Button>
      </div>
    </form>
  );
}

/*
Ultimos aportes y retiros de la meta. Se puede borrar uno cargado por error
(si genero un gasto o ingreso, se borra tambien).
*/
function EntryHistory({ goal, onChanged }) {
  const { t, locale } = useLanguage();
  const { toast } = useToast();
  const [confirming, setConfirming] = useState(null);
  const [busy, setBusy] = useState(false);

  if (!goal.entries.length) return null;

  async function remove(entry) {
    if (confirming !== entry.id) {
      setConfirming(entry.id);
      return;
    }
    setBusy(true);
    try {
      const updated = await api.deleteGoalEntry(goal.id, entry.id);
      toast(t("goalEntryDeleted"));
      setConfirming(null);
      onChanged(updated, Boolean(entry.movementId));
    } catch (error) {
      toast(t(error?.code === "goal_entry_needed" ? "errorGoalEntryNeeded" : "errorGeneric"), { variant: "error" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <section aria-labelledby="goal-entries-title" className="grid gap-2 border-t pt-4">
      <h3 id="goal-entries-title" className="m-0 text-sm font-medium">
        {t("goalEntriesTitle")}
      </h3>
      <ul className="m-0 grid list-none gap-1 p-0">
        {goal.entries.map((entry) => {
          const deposit = entry.amount > 0;
          const asking = confirming === entry.id;
          return (
            <li key={entry.id} className="flex items-center gap-3 rounded-xl px-1 py-1.5">
              <span className="grid min-w-0 flex-1 gap-0.5">
                <span className="text-sm">{t(deposit ? "goalEntryDeposit" : "goalEntryWithdraw")}</span>
                <span className="text-xs text-muted-foreground">
                  {formatDate(entry.date, locale, { day: "numeric", month: "short", year: "numeric" })}
                  {entry.movementId ? ` · ${t("goalEntryInMovements")}` : ""}
                </span>
              </span>
              <Money amount={entry.amount} type={deposit ? "income" : "expense"} currency={goal.currency} className="text-sm" />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => remove(entry)}
                onBlur={() => asking && setConfirming(null)}
                disabled={busy}
                aria-label={asking ? t("goalEntryDeleteConfirm") : t("goalEntryDelete")}
                className={asking ? "text-destructive hover:bg-destructive/10 hover:text-destructive" : "text-muted-foreground"}
              >
                <Trash2Icon aria-hidden="true" />
                {asking && <span>{t("categoryDeleteYes")}</span>}
              </Button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/*
target: null (cerrado) o { goal, type: "deposit" | "withdraw" }.
onChanged(goal, movementsChanged): despues de aportar, sacar o borrar.
*/
function GoalEntryDialog({ target, onClose, onChanged }) {
  const { t } = useLanguage();
  // La meta se actualiza dentro del dialogo al borrar un aporte.
  const [current, setCurrent] = useState(null);
  const goal = current?.id === target?.goal.id ? current : target?.goal;

  return (
    <Dialog
      open={Boolean(target)}
      onOpenChange={(open) => {
        if (!open) {
          setCurrent(null);
          onClose();
        }
      }}
    >
      <DialogContent className="max-w-md" closeLabel={t("close")}>
        <DialogHeader>
          <DialogTitle>{goal ? goal.name : ""}</DialogTitle>
          <DialogDescription>{t("goalEntryDescription")}</DialogDescription>
        </DialogHeader>
        {target && goal && (
          <div className="grid gap-5">
            <EntryForm
              key={`${goal.id}-${target.type}`}
              goal={goal}
              initialType={target.type}
              onCancel={onClose}
              onSaved={(updated, movementsChanged) => {
                setCurrent(null);
                onClose();
                onChanged(updated, movementsChanged);
              }}
            />
            <EntryHistory
              goal={goal}
              onChanged={(updated, movementsChanged) => {
                setCurrent(updated);
                onChanged(updated, movementsChanged);
              }}
            />
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default GoalEntryDialog;
