import { useState } from "react";
import { SearchIcon, SlidersHorizontalIcon, XIcon } from "lucide-react";
import {
  EXPENSE_CATEGORIES,
  INCOME_CATEGORIES,
  PAYMENT_METHODS,
} from "@shared/catalog.js";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/hooks/useLanguage";

const SORT_OPTIONS = [
  { value: "date-desc", labelKey: "sortDateDesc" },
  { value: "date-asc", labelKey: "sortDateAsc" },
  { value: "amount-desc", labelKey: "sortAmountDesc" },
  { value: "amount-asc", labelKey: "sortAmountAsc" },
  { value: "title-asc", labelKey: "sortTitleAsc" },
];

const inputClass =
  "rounded-md border-input bg-background px-3 focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 aria-invalid:border-destructive";

function FilterField({ id, label, children, className }) {
  return (
    <div className={cn("grid gap-1.5", className)}>
      <Label htmlFor={id} className="text-xs text-muted-foreground">
        {label}
      </Label>
      {children}
    </div>
  );
}

function HistoryFilters({
  search,
  onSearchChange,
  filters,
  onFilterChange,
  onClear,
  hasFilters,
  rangeError,
}) {
  const { t } = useLanguage();
  // En mobile los filtros avanzados se pliegan para no ocupar toda la pantalla.
  const [expanded, setExpanded] = useState(false);
  const advanced = expanded ? "" : "max-sm:hidden";
  const activeCount = [
    "type",
    "category",
    "paymentMethod",
    "from",
    "to",
  ].filter((key) => filters[key]).length;

  const categoryGroups = filters.type
    ? [
        {
          type: filters.type,
          items:
            filters.type === "income" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES,
        },
      ]
    : [
        { type: "expense", items: EXPENSE_CATEGORIES },
        { type: "income", items: INCOME_CATEGORIES },
      ];

  return (
    <section
      aria-label={t("filters")}
      className="grid gap-3 rounded-xl border bg-card p-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8"
    >
      <FilterField
        id="filter-q"
        label={t("search")}
        className="sm:col-span-2 lg:col-span-4 xl:col-span-2"
      >
        <div className="flex gap-2">
          <div className="relative flex-1">
            <SearchIcon
              aria-hidden="true"
              className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              id="filter-q"
              type="search"
              value={search}
              onChange={(event) => onSearchChange(event.target.value)}
              placeholder={t("searchPlaceholder")}
              className={`${inputClass} pl-9`}
              maxLength={80}
            />
          </div>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="relative rounded-md sm:hidden"
            onClick={() => setExpanded((value) => !value)}
            aria-expanded={expanded}
            aria-label={t("filters")}
          >
            <SlidersHorizontalIcon />
            {activeCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 flex size-4 items-center justify-center rounded-full bg-primary text-[10px] text-primary-foreground">
                {activeCount}
              </span>
            )}
          </Button>
        </div>
      </FilterField>

      <FilterField className={advanced} id="filter-type" label={t("type")}>
        <NativeSelect
          id="filter-type"
          value={filters.type}
          onChange={(event) => onFilterChange("type", event.target.value)}
        >
          <option value="">{t("all")}</option>
          <option value="income">{t("incomes")}</option>
          <option value="expense">{t("expenses")}</option>
        </NativeSelect>
      </FilterField>

      <FilterField
        className={advanced}
        id="filter-category"
        label={t("category")}
      >
        <NativeSelect
          id="filter-category"
          value={filters.category}
          onChange={(event) => onFilterChange("category", event.target.value)}
        >
          <option value="">{t("allFem")}</option>
          {categoryGroups.map((group) => (
            <optgroup
              key={group.type}
              label={t(group.type === "income" ? "incomes" : "expenses")}
            >
              {group.items.map((category) => (
                <option key={category} value={category}>
                  {t(`cat_${category}`)}
                </option>
              ))}
            </optgroup>
          ))}
        </NativeSelect>
      </FilterField>

      <FilterField className={advanced} id="filter-method" label={t("method")}>
        <NativeSelect
          id="filter-method"
          value={filters.paymentMethod}
          onChange={(event) =>
            onFilterChange("paymentMethod", event.target.value)
          }
        >
          <option value="">{t("all")}</option>
          {PAYMENT_METHODS.map((method) => (
            <option key={method} value={method}>
              {t(`pm_${method}`)}
            </option>
          ))}
        </NativeSelect>
      </FilterField>

      <FilterField className={advanced} id="filter-from" label={t("from")}>
        <Input
          id="filter-from"
          type="date"
          value={filters.from}
          max={filters.to || undefined}
          onChange={(event) => onFilterChange("from", event.target.value)}
          className={inputClass}
        />
      </FilterField>

      <FilterField className={advanced} id="filter-to" label={t("to")}>
        <Input
          id="filter-to"
          type="date"
          value={filters.to}
          min={filters.from || undefined}
          onChange={(event) => onFilterChange("to", event.target.value)}
          className={inputClass}
          aria-invalid={rangeError ? true : undefined}
          aria-describedby={rangeError ? "filter-range-error" : undefined}
        />
      </FilterField>

      <FilterField className={advanced} id="filter-sort" label={t("sortBy")}>
        <NativeSelect
          id="filter-sort"
          value={filters.sort}
          onChange={(event) => onFilterChange("sort", event.target.value)}
        >
          {SORT_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {t(option.labelKey)}
            </option>
          ))}
        </NativeSelect>
      </FilterField>

      {(rangeError || hasFilters) && (
        <div className="flex flex-wrap items-center justify-between gap-2 sm:col-span-2 lg:col-span-4 xl:col-span-8">
          {rangeError ? (
            <p
              id="filter-range-error"
              role="alert"
              className="m-0 text-xs text-destructive"
            >
              {t("errorDateRange")}
            </p>
          ) : (
            <span />
          )}
          {hasFilters && (
            <Button variant="ghost" size="xs" onClick={onClear}>
              <XIcon data-icon="inline-start" />
              {t("clearFilters")}
            </Button>
          )}
        </div>
      )}
    </section>
  );
}

export default HistoryFilters;
