import { useLayoutEffect, useRef } from "react";
import { PlusIcon, XIcon } from "lucide-react";
import { RECEIVABLE_PERSON_MAX_LENGTH, SHARED_PEOPLE_MAX } from "@shared/movementSchema.js";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AmountInput } from "@/components/ui/amount-input";
import { formatCurrency } from "@/lib/format";
import { splitEqually } from "@/lib/split";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/hooks/useLanguage";
import { Segmented } from "./MovementForm";

/*
Con quien se divide un gasto: una fila por persona y, en "montos a mano",
cuanto pone cada una. Abajo, la cuenta: tu parte y cuanto te deben.
- value: { mode: "equal" | "custom", people: [{ person, amount }] }
- errors: { "person-0": clave, "amount-1": clave, form: clave }
*/
function SplitEditor({ amount, currency, value, onChange, errors = {}, disabled }) {
  const { t, locale } = useLanguage();
  const listRef = useRef(null);
  // Al agregar una persona, el foco va a su nombre (antes de que se pinte).
  const focusNew = useRef(false);
  useLayoutEffect(() => {
    if (!focusNew.current) return;
    focusNew.current = false;
    listRef.current?.querySelector("li:last-child input")?.focus();
  }, [value.people.length]);
  const { mode, people } = value;
  const total = Number(amount) > 0 ? Number(amount) : 0;
  const money = (number) => formatCurrency(number, locale, { currency });

  const { share, mine: equalMine } = splitEqually(total, people.length);
  const owed =
    mode === "equal"
      ? total - equalMine
      : people.reduce((sum, item) => sum + (Number(item.amount) > 0 ? Number(item.amount) : 0), 0);
  const mine = Math.round((total - owed) * 100) / 100;

  function setPerson(index, field, next) {
    onChange({ mode, people: people.map((item, i) => (i === index ? { ...item, [field]: next } : item)) });
  }

  function addPerson() {
    focusNew.current = true;
    onChange({ mode, people: [...people, { person: "", amount: "" }] });
  }

  function removePerson(index) {
    onChange({ mode, people: people.filter((_, i) => i !== index) });
  }

  const error = (key) => (errors[key] ? t(errors[key]) : null);

  return (
    <div className="grid gap-3 rounded-xl border bg-fg/[0.02] p-3.5">
      <Segmented
        label={t("splitMode")}
        size="sm"
        value={mode}
        onChange={(next) => onChange({ mode: next, people })}
        options={[
          { value: "equal", label: t("splitEqual") },
          { value: "custom", label: t("splitCustom") },
        ]}
      />

      <ul ref={listRef} aria-label={t("splitPeople")} className="m-0 grid list-none gap-2 p-0">
        {people.map((item, index) => {
          const nameId = `split-person-${index}`;
          const amountId = `split-amount-${index}`;
          const rowError = error(`person-${index}`) ?? error(`amount-${index}`);
          return (
            <li key={index} className="grid gap-1">
              <div className="flex items-center gap-2">
                <Input
                  id={nameId}
                  value={item.person}
                  maxLength={RECEIVABLE_PERSON_MAX_LENGTH}
                  placeholder={t("splitPersonPlaceholder", { number: index + 1 })}
                  aria-label={t("splitPersonLabel", { number: index + 1 })}
                  aria-invalid={errors[`person-${index}`] ? true : undefined}
                  aria-describedby={rowError ? `split-row-${index}-error` : undefined}
                  onChange={(event) => setPerson(index, "person", event.target.value)}
                  autoComplete="off"
                  autoCapitalize="words"
                  disabled={disabled}
                  className="min-w-0 flex-1"
                />
                {mode === "custom" ? (
                  <AmountInput
                    id={amountId}
                                        placeholder="0"
                    value={item.amount}
                    aria-label={t("splitAmountLabel", { person: item.person || t("splitPersonLabel", { number: index + 1 }) })}
                    aria-invalid={errors[`amount-${index}`] ? true : undefined}
                    aria-describedby={rowError ? `split-row-${index}-error` : undefined}
                    onChange={(event) => setPerson(index, "amount", event.target.value)}
                    disabled={disabled}
                    className="w-28 shrink-0 tabular-nums sm:w-32"
                  />
                ) : (
                  <span className="w-28 shrink-0 text-right text-sm text-muted-foreground tabular-nums sm:w-32">
                    {money(share)}
                  </span>
                )}
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => removePerson(index)}
                  disabled={disabled || people.length === 1}
                  aria-label={t("splitRemovePerson", { person: item.person || t("splitPersonLabel", { number: index + 1 }) })}
                  className="shrink-0 text-muted-foreground"
                >
                  <XIcon aria-hidden="true" />
                </Button>
              </div>
              {rowError && (
                <p id={`split-row-${index}-error`} role="alert" className="m-0 text-xs text-destructive">
                  {rowError}
                </p>
              )}
            </li>
          );
        })}
      </ul>

      {people.length < SHARED_PEOPLE_MAX && (
        <Button type="button" variant="outline" size="sm" onClick={addPerson} disabled={disabled} className="justify-self-start">
          <PlusIcon data-icon="inline-start" />
          {t("splitAddPerson")}
        </Button>
      )}

      {/* La cuenta: se anuncia al cambiar, sin mover el foco */}
      <dl aria-live="polite" className="m-0 grid grid-cols-2 gap-2 border-t pt-3 text-sm">
        <div className="grid gap-0.5">
          <dt className="text-xs text-muted-foreground">{t("splitMine")}</dt>
          <dd className={cn("m-0 font-medium tabular-nums", mine < 0 && "text-danger")}>{money(mine)}</dd>
        </div>
        <div className="grid gap-0.5">
          <dt className="text-xs text-muted-foreground">{t("splitOwed", { count: people.length })}</dt>
          <dd className="m-0 font-medium text-income tabular-nums">{money(owed)}</dd>
        </div>
      </dl>
      {errors.form && (
        <p role="alert" className="m-0 text-xs text-destructive">
          {t(errors.form)}
        </p>
      )}
    </div>
  );
}

export default SplitEditor;
