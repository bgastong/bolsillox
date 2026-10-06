import { useState } from "react";
import { Trash2Icon } from "lucide-react";
import { budgetSchema, issuesToFieldErrors } from "@shared/movementSchema.js";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/api";
import { useLanguage } from "@/hooks/useLanguage";
import { useToast } from "@/hooks/useToast";
import { CategoryIcon } from "../Movements/MovementBits";

function BudgetForm({ category, current, onDone, onCancel }) {
  const { t } = useLanguage();
  const { toast } = useToast();
  const [amount, setAmount] = useState(current ? String(current.amount) : "");
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    const result = budgetSchema.safeParse({ amount });
    if (!result.success) {
      setError(issuesToFieldErrors(result.error.issues).amount);
      document.getElementById("budget-amount")?.focus();
      return;
    }
    setSaving(true);
    try {
      await api.setBudget(category, result.data.amount);
      toast(t("budgetSaved"));
      onDone();
    } catch (err) {
      if (err?.fields?.amount) setError(err.fields.amount);
      else toast(t("errorGeneric"), { variant: "error" });
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    setSaving(true);
    try {
      await api.deleteBudget(category);
      toast(t("budgetDeleted"));
      onDone();
    } catch {
      toast(t("errorGeneric"), { variant: "error" });
      setSaving(false);
    }
  }

  return (
    <form noValidate onSubmit={handleSubmit} className="grid gap-4">
      <div className="grid gap-2">
        <Label htmlFor="budget-amount">{t("budgetMonthlyLimit")}</Label>
        <div className="relative">
          <span
            aria-hidden="true"
            className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-lg font-medium text-muted-foreground"
          >
            $
          </span>
          <Input
            id="budget-amount"
            type="number"
            inputMode="decimal"
            min="0"
            step="1"
            placeholder="0"
            value={amount}
            onChange={(event) => {
              setAmount(event.target.value);
              if (error) setError(null);
            }}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? "budget-amount-error" : "budget-amount-hint"}
            disabled={saving}
            className="pl-7 text-lg font-medium tabular-nums"
          />
        </div>
        {error ? (
          <p id="budget-amount-error" role="alert" className="m-0 text-xs text-destructive">
            {t(error)}
          </p>
        ) : (
          <p id="budget-amount-hint" className="m-0 text-xs text-muted-foreground">
            {t("budgetHint")}
          </p>
        )}
      </div>

      <div className="sticky bottom-0 -mx-5 mt-1 flex flex-col gap-2 border-t bg-popover px-5 pt-3 pb-1 sm:static sm:mx-0 sm:flex-row sm:items-center sm:border-0 sm:p-0">
        {current && (
          <Button
            type="button"
            variant="ghost"
            onClick={handleDelete}
            disabled={saving}
            className="order-3 text-destructive hover:bg-destructive/10 hover:text-destructive sm:order-none sm:mr-auto"
          >
            <Trash2Icon data-icon="inline-start" />
            {t("budgetRemove")}
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

// target: { category, current: presupuesto existente | null } o null si esta cerrado.
function BudgetDialog({ target, onClose, onSaved }) {
  const { t } = useLanguage();
  const name = target ? t(`cat_${target.category}`) : "";

  return (
    <Dialog open={Boolean(target)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md" closeLabel={t("close")}>
        <DialogHeader>
          <div className="flex items-center gap-3">
            {target && <CategoryIcon category={target.category} />}
            <div className="grid gap-1">
              <DialogTitle>
                {target?.current ? t("editBudgetTitle", { category: name }) : t("newBudgetTitle", { category: name })}
              </DialogTitle>
              <DialogDescription>{t("budgetDialogDescription")}</DialogDescription>
            </div>
          </div>
        </DialogHeader>
        {target && (
          <BudgetForm
            key={target.category}
            category={target.category}
            current={target.current}
            onCancel={onClose}
            onDone={() => {
              onClose();
              onSaved();
            }}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

export default BudgetDialog;
