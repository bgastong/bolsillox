import { useState } from "react";
import { ArrowDownLeftIcon, ArrowUpRightIcon, Trash2Icon } from "lucide-react";
import { investmentEntrySchema, issuesToFieldErrors } from "@shared/movementSchema.js";
import { Field, Segmented } from "@/components/Movements/MovementForm";
import Money from "@/components/Money/Money";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { api } from "@/lib/api";
import { formatCurrency, formatDate, todayISO } from "@/lib/format";
import { paymentMethodOptions } from "@/lib/paymentMethods";
import { useLanguage } from "@/hooks/useLanguage";
import { useToast } from "@/hooks/useToast";

// El ultimo aporte, como sugerencia (si se aporta siempre lo mismo, no hay que escribirlo).
function lastDeposit(item) {
  const entry = item.entries.find((candidate) => candidate.amount > 0);
  return entry ? String(entry.amount) : "";
}

function EntryForm({ item, initialType, onSaved, onCancel }) {
  const { t, locale } = useLanguage();
  const { toast } = useToast();
  const [values, setValues] = useState(() => ({
    type: initialType,
    amount: initialType === "deposit" ? lastDeposit(item) : "",
    date: todayISO(),
    registerMovement: true,
    paymentMethod: "transfer",
  }));
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const withdraw = values.type === "withdraw";
  const available = item.value ?? item.invested;
  const money = (value) => formatCurrency(value, locale, { currency: item.currency });

  function update(field, value) {
    setValues((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: null }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    const result = investmentEntrySchema.safeParse(values);
    const fieldErrors = result.success ? {} : issuesToFieldErrors(result.error.issues);
    if (result.success && withdraw && result.data.amount > available) fieldErrors.amount = "errorRedeemTooLarge";
    if (Object.keys(fieldErrors).length) {
      setErrors(fieldErrors);
      document.getElementById(fieldErrors.date ? "investment-entry-date" : "investment-entry-amount")?.focus();
      return;
    }
    setSaving(true);
    try {
      await api.addInvestmentEntry(item.id, result.data);
      toast(t(withdraw ? "investmentWithdrawn" : "investmentDeposited"));
      onSaved(result.data.registerMovement);
    } catch (error) {
      if (error?.fields && Object.keys(error.fields).length) setErrors(error.fields);
      else toast(t("errorGeneric"), { variant: "error" });
      setSaving(false);
    }
  }

  return (
    <form noValidate onSubmit={handleSubmit} className="grid gap-4">
      <Segmented
        label={t("investmentEntryType")}
        value={values.type}
        onChange={(value) => update("type", value)}
        options={[
          { value: "deposit", label: t("investmentDeposit"), icon: ArrowDownLeftIcon, activeClass: "text-income" },
          { value: "withdraw", label: t("investmentWithdraw"), icon: ArrowUpRightIcon },
        ]}
      />

      <Field
        id="investment-entry-amount"
        label={t("amount")}
        error={errors.amount ? t(errors.amount) : null}
        hint={withdraw ? t("investmentWithdrawHint", { amount: money(available) }) : t("investmentDepositHint")}
      >
        <Input
          id="investment-entry-amount"
          type="number"
          inputMode="decimal"
          min="0"
          step="0.01"
          placeholder="0"
          value={values.amount}
          onChange={(event) => update("amount", event.target.value)}
          aria-invalid={errors.amount ? true : undefined}
          aria-describedby={errors.amount ? "investment-entry-amount-error" : undefined}
          aria-label={`${t("amount")} (${item.currency})`}
          className="text-lg font-medium tabular-nums"
          disabled={saving}
        />
      </Field>

      <Field
        id="investment-entry-date"
        label={t("date")}
        error={errors.date ? t(errors.date) : null}
        hint={t("investmentDateHint")}
      >
        <DatePicker
          id="investment-entry-date"
          value={values.date}
          onChange={(value) => update("date", value)}
          max={todayISO()}
          shortcuts
          disabled={saving}
        />
      </Field>

      <label htmlFor="investment-entry-movement" className="flex cursor-pointer items-center gap-3 rounded-xl border border-input px-4 py-3">
        <span className="grid min-w-0 flex-1 gap-0.5">
          <span className="text-sm font-medium">{t(withdraw ? "goalRegisterIncome" : "goalRegisterExpense")}</span>
          <span className="text-xs text-muted-foreground">
            {t(withdraw ? "investmentRegisterIncomeHint" : "investmentRegisterExpenseHint", { name: item.name })}
          </span>
        </span>
        <Switch
          id="investment-entry-movement"
          checked={values.registerMovement}
          onCheckedChange={(checked) => update("registerMovement", checked)}
          disabled={saving}
        />
      </label>

      {values.registerMovement && (
        <Field id="investment-entry-method" label={t("method")}>
          <Select
            id="investment-entry-method"
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
          {saving ? t("saving") : t(withdraw ? "investmentWithdraw" : "investmentDeposit")}
        </Button>
      </div>
    </form>
  );
}

// Ultimos aportes y rescates; se puede borrar uno cargado por error (y su movimiento).
function EntryHistory({ item, onChanged }) {
  const { t, locale } = useLanguage();
  const { toast } = useToast();
  const [confirming, setConfirming] = useState(null);
  const [busy, setBusy] = useState(false);
  if (!item.entries.length) return null;

  async function remove(entry) {
    if (confirming !== entry.id) {
      setConfirming(entry.id);
      return;
    }
    setBusy(true);
    try {
      const updated = await api.deleteInvestmentEntry(item.id, entry.id);
      toast(t("goalEntryDeleted"));
      setConfirming(null);
      onChanged(updated, Boolean(entry.movementId));
    } catch (error) {
      toast(t(error?.code === "investment_entry_needed" ? "errorInvestmentEntryNeeded" : "errorGeneric"), { variant: "error" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <section aria-labelledby="investment-entries-title" className="grid gap-2 border-t pt-4">
      <h3 id="investment-entries-title" className="m-0 text-sm font-medium">
        {t("goalEntriesTitle")}
      </h3>
      <ul className="m-0 grid max-h-64 list-none gap-1 overflow-y-auto p-0">
        {item.entries.map((entry) => {
          const deposit = entry.amount > 0;
          const asking = confirming === entry.id;
          return (
            <li key={entry.id} className="flex items-center gap-3 rounded-xl px-1 py-1.5">
              <span className="grid min-w-0 flex-1 gap-0.5">
                <span className="text-sm">{t(deposit ? "investmentEntryDeposit" : "investmentEntryWithdraw")}</span>
                <span className="text-xs text-muted-foreground">
                  {formatDate(entry.date, locale, { day: "numeric", month: "short", year: "numeric" })}
                  {entry.movementId ? ` · ${t("goalEntryInMovements")}` : ""}
                </span>
              </span>
              <Money amount={entry.amount} type={deposit ? "income" : "expense"} currency={item.currency} className="text-sm" />
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
target: null (cerrado) o { item, type: "deposit" | "withdraw" }.
onChanged(movementsChanged): despues de aportar, rescatar o borrar.
*/
function InvestmentEntryDialog({ target, onClose, onChanged }) {
  const { t } = useLanguage();
  const [current, setCurrent] = useState(null);
  const item = current?.id === target?.item.id ? current : target?.item;

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
          <DialogTitle>{item?.name ?? ""}</DialogTitle>
          <DialogDescription>{t("investmentEntryDescription")}</DialogDescription>
        </DialogHeader>
        {target && item && (
          <div className="grid gap-5">
            <EntryForm
              key={`${item.id}-${target.type}`}
              item={item}
              initialType={target.type}
              onCancel={onClose}
              onSaved={(movementsChanged) => {
                setCurrent(null);
                onClose();
                onChanged(movementsChanged);
              }}
            />
            <EntryHistory
              item={item}
              onChanged={(updated, movementsChanged) => {
                setCurrent(updated);
                onChanged(movementsChanged);
              }}
            />
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default InvestmentEntryDialog;
