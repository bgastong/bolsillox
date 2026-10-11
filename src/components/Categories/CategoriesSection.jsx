import { useState } from "react";
import { ChevronRightIcon, PlusIcon } from "lucide-react";
import { CUSTOM_CATEGORIES_MAX } from "@shared/catalog.js";
import { CategoryIcon } from "@/components/Movements/MovementBits";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useCategories } from "@/hooks/useCategories";
import { useLanguage } from "@/hooks/useLanguage";
import { useMovements } from "@/hooks/useMovements";
import CategoryDialog from "./CategoryDialog";

const TYPES = ["expense", "income"];

// Categorias propias en Ajustes: crearlas, editarlas y borrarlas.
function CategoriesSection({ Section }) {
  const { t } = useLanguage();
  const { custom, loaded } = useCategories();
  const { notifyChange } = useMovements();
  const [target, setTarget] = useState(null);
  const full = custom.length >= CUSTOM_CATEGORIES_MAX;

  return (
    <Section id="settings-categories" title={t("categoriesTitle")} description={t("categoriesDescription")}>
      {!loaded ? (
        <Skeleton className="h-24 w-full rounded-xl" />
      ) : custom.length === 0 ? (
        <p className="m-0 rounded-xl border border-dashed px-4 py-5 text-center text-sm text-muted-foreground">
          {t("categoriesEmpty")}
        </p>
      ) : (
        TYPES.map((type) => {
          const items = custom.filter((item) => item.type === type);
          if (!items.length) return null;
          const headingId = `categories-${type}`;
          return (
            <div key={type} className="grid gap-1.5">
              <h3 id={headingId} className="m-0 text-xs font-medium text-muted-foreground">
                {t(type === "expense" ? "expenses" : "incomes")}
              </h3>
              <ul aria-labelledby={headingId} className="-mx-2 m-0 grid list-none gap-0.5 p-0">
                {items.map((item) => (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() => setTarget({ category: item })}
                      aria-label={`${t("edit")}: ${item.name}`}
                      className="flex min-h-12 w-full items-center gap-3 rounded-xl px-2 py-1.5 text-left transition-colors outline-none hover:bg-fg/[0.03] focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <CategoryIcon category={item.key} />
                      <span className="size-2 shrink-0 rounded-full" style={{ background: item.color }} aria-hidden="true" />
                      <span className="min-w-0 flex-1 truncate font-medium">{item.name}</span>
                      <ChevronRightIcon className="size-4 text-muted-foreground" aria-hidden="true" />
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          );
        })
      )}

      <div className="flex flex-wrap items-center justify-between gap-2">
        {full && <p className="m-0 text-xs text-muted-foreground">{t("errorTooManyCategories")}</p>}
        <Button variant="outline" onClick={() => setTarget({ type: "expense" })} disabled={!loaded || full} className="ml-auto">
          <PlusIcon data-icon="inline-start" />
          {t("newCategory")}
        </Button>
      </div>

      <CategoryDialog
        target={target}
        onClose={() => setTarget(null)}
        // Al borrar, los movimientos cambian de categoria: se recargan las listas.
        onDone={({ deleted }) => deleted && notifyChange()}
      />
    </Section>
  );
}

export default CategoriesSection;
