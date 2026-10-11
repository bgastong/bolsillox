import { useState } from "react";
import { CheckIcon, Trash2Icon } from "lucide-react";
import { CATEGORY_COLORS, CATEGORY_ICONS, CATEGORY_NAME_MAX_LENGTH } from "@shared/catalog.js";
import { categorySchema, issuesToFieldErrors } from "@shared/movementSchema.js";
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
import { CUSTOM_CATEGORY_ICONS } from "@/lib/categories";
import { cn } from "@/lib/utils";
import { useCategories } from "@/hooks/useCategories";
import { useLanguage } from "@/hooks/useLanguage";
import { useToast } from "@/hooks/useToast";

const TYPES = ["expense", "income"];

// Muestra como va a quedar la categoria (icono, color y nombre).
function Preview({ name, icon, color }) {
  const { t } = useLanguage();
  const Icon = CUSTOM_CATEGORY_ICONS[icon];
  return (
    <div className="flex items-center gap-3 rounded-xl border border-dashed px-3 py-2.5" aria-hidden="true">
      <span className="flex size-9 items-center justify-center rounded-[9px] border border-fg/[0.07] bg-fg/[0.04]">
        <Icon className="size-4" style={{ color }} strokeWidth={1.75} />
      </span>
      <span
        className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium"
        style={{ boxShadow: "inset 0 0 0 1px var(--border)" }}
      >
        <span className="size-1.5 rounded-full" style={{ background: color }} />
        {name.trim() || t("categoryNamePlaceholder")}
      </span>
    </div>
  );
}

function CategoryForm({ category, initialType, onDone, onCancel }) {
  const { t } = useLanguage();
  const { toast } = useToast();
  const isEdit = Boolean(category);
  const [values, setValues] = useState(() => ({
    type: category?.type ?? initialType ?? "expense",
    name: category?.name ?? "",
    icon: category?.icon ?? CATEGORY_ICONS[0],
    color: category?.color ?? CATEGORY_COLORS[0],
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
    // El dialogo puede abrirse desde el formulario de un movimiento: que el
    // submit no llegue a ese formulario (los eventos de React cruzan portales).
    event.stopPropagation();
    const result = categorySchema.safeParse(values);
    if (!result.success) {
      setErrors(issuesToFieldErrors(result.error.issues));
      document.getElementById("category-name")?.focus();
      return;
    }
    setSaving(true);
    try {
      const { type, ...changes } = result.data;
      const saved = isEdit
        ? await api.updateCategory(category.id, changes)
        : await api.createCategory({ type, ...changes });
      toast(t(isEdit ? "categorySaved" : "categoryCreated"));
      onDone({ saved });
    } catch (error) {
      if (error?.fields && Object.keys(error.fields).length) {
        setErrors(error.fields);
        document.getElementById("category-name")?.focus();
      } else {
        toast(t(error?.code === "too_many_categories" ? "errorTooManyCategories" : "errorGeneric"), {
          variant: "error",
        });
      }
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
      const { moved } = await api.deleteCategory(category.id);
      toast(t(moved ? "categoryDeleted" : "categoryDeletedEmpty", { count: moved }));
      onDone({ deleted: category });
    } catch {
      toast(t("errorGeneric"), { variant: "error" });
      setSaving(false);
    }
  }

  return (
    <form noValidate onSubmit={handleSubmit} className="grid gap-5">
      {!isEdit && (
        <div role="radiogroup" aria-label={t("type")} className="grid grid-cols-2 gap-1 rounded-xl bg-fg/[0.04] p-1">
          {TYPES.map((type) => (
            <button
              key={type}
              type="button"
              role="radio"
              aria-checked={values.type === type}
              onClick={() => update("type", type)}
              disabled={saving}
              className={cn(
                "h-10 rounded-lg text-sm transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring sm:h-9",
                values.type === type
                  ? "bg-background font-medium text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {t(type === "expense" ? "expense" : "income")}
            </button>
          ))}
        </div>
      )}

      <div className="grid gap-2">
        <Label htmlFor="category-name">{t("categoryName")}</Label>
        <Input
          id="category-name"
          value={values.name}
          maxLength={CATEGORY_NAME_MAX_LENGTH}
          placeholder={t("categoryNamePlaceholder")}
          onChange={(event) => update("name", event.target.value)}
          aria-invalid={errors.name ? true : undefined}
          aria-describedby={errors.name ? "category-name-error" : undefined}
          disabled={saving}
          autoComplete="off"
        />
        {errors.name && (
          <p id="category-name-error" role="alert" className="m-0 text-xs text-destructive">
            {t(errors.name)}
          </p>
        )}
      </div>

      <fieldset className="m-0 grid gap-2 border-0 p-0" disabled={saving}>
        <legend className="mb-2 text-sm font-medium">{t("categoryIcon")}</legend>
        <div role="radiogroup" aria-label={t("categoryIcon")} className="grid grid-cols-8 gap-1.5">
          {CATEGORY_ICONS.map((name) => {
            const Icon = CUSTOM_CATEGORY_ICONS[name];
            const active = values.icon === name;
            return (
              <button
                key={name}
                type="button"
                role="radio"
                aria-checked={active}
                aria-label={t(`icon_${name}`)}
                title={t(`icon_${name}`)}
                onClick={() => update("icon", name)}
                className={cn(
                  "flex aspect-square items-center justify-center rounded-lg border transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  active
                    ? "border-fg/40 bg-fg/[0.07] text-foreground"
                    : "border-transparent text-muted-foreground hover:bg-fg/[0.04] hover:text-foreground",
                )}
              >
                <Icon className="size-[18px]" strokeWidth={1.75} aria-hidden="true" />
              </button>
            );
          })}
        </div>
      </fieldset>

      <fieldset className="m-0 grid gap-2 border-0 p-0" disabled={saving}>
        <legend className="mb-2 text-sm font-medium">{t("categoryColor")}</legend>
        <div role="radiogroup" aria-label={t("categoryColor")} className="flex flex-wrap gap-2">
          {CATEGORY_COLORS.map((color, index) => {
            const active = values.color === color;
            return (
              <button
                key={color}
                type="button"
                role="radio"
                aria-checked={active}
                aria-label={t("categoryColorN", { n: index + 1 })}
                onClick={() => update("color", color)}
                className={cn(
                  "flex size-9 items-center justify-center rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background sm:size-8",
                  active && "ring-2 ring-fg/60 ring-offset-2 ring-offset-background",
                )}
                style={{ background: color }}
              >
                {active && <CheckIcon className="size-4 text-black/70" strokeWidth={3} aria-hidden="true" />}
              </button>
            );
          })}
        </div>
      </fieldset>

      <Preview {...values} />

      {confirmDelete && (
        <p role="alert" className="m-0 rounded-xl bg-destructive/10 px-3 py-2.5 text-sm text-destructive">
          {t("categoryDeleteConfirm", {
            fallback: t(values.type === "income" ? "cat_otherIncome" : "cat_other"),
          })}
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

/*
target: null (cerrado), { type } para crear una nueva o { category } para editarla.
onDone({ saved } | { deleted }) despues de guardar o borrar.
*/
function CategoryDialog({ target, onClose, onDone }) {
  const { t } = useLanguage();
  const { reload } = useCategories();
  const isEdit = Boolean(target?.category);

  return (
    <Dialog open={Boolean(target)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md" closeLabel={t("close")}>
        <DialogHeader>
          <DialogTitle>{t(isEdit ? "editCategoryTitle" : "newCategoryTitle")}</DialogTitle>
          <DialogDescription>{t("categoryDialogDescription")}</DialogDescription>
        </DialogHeader>
        {target && (
          <CategoryForm
            key={target.category?.id ?? "new"}
            category={target.category}
            initialType={target.type}
            onCancel={onClose}
            onDone={async (result) => {
              await reload();
              onClose();
              onDone?.(result);
            }}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

export default CategoryDialog;
