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
      className="grid gap-3 rounded-2xl border bg-card p-4 sm:grid-cols-2 lg:grid-cols-4"
    >
      <FilterField id="filter-q" label={t("search")} className="sm:col-span-2">
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
              className="pl-9"
              maxLength={80}
            />
          </div>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className={cn(
              "relative sm:hidden",
              expanded && "border-ring bg-muted",
            )}
            onClick={() => setExpanded((value) => !value)}
            aria-expanded={expanded}
            aria-label={
              activeCount
                ? `${t("filters")} (${t("activeFilters", { count: activeCount })})`
                : t("filters")
            }
          >
            <SlidersHorizontalIcon />
            {activeCount > 0 && (
              <span
                aria-hidden="true"
                className="absolute -top-1.5 -right-1.5 flex size-5 items-center justify-center rounded-full bg-primary text-[11px] font-semibold text-primary-foreground"
              >
                {activeCount}
              </span>
            )}
          </Button>
        </div>
      </FilterField>

      {/* Mobile: tipo como control segmentado, siempre visible */}
      <div
        role="radiogroup"
        aria-label={t("type")}
        className="grid grid-cols-3 gap-1 rounded-xl bg-white/[0.04] p-1 sm:hidden"
      >
        {[
          { value: "", label: t("all") },
          { value: "income", label: t("incomes") },
          { value: "expense", label: t("expenses") },
        ].map((option) => {
          const active = filters.type === option.value;
          return (
            <button
              key={option.value || "all"}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => onFilterChange("type", option.value)}
              className={cn(
                "h-11 touch-manipulation rounded-lg text-sm font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring",
                active
                  ? "bg-secondary text-foreground shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08)]"
                  : "text-muted-foreground",
              )}
            >
              {option.label}
            </button>
          );
        })}
      </div>

      <FilterField className="max-sm:hidden" id="filter-type" label={t("type")}>
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
        />
      </FilterField>

      <FilterField className={advanced} id="filter-to" label={t("to")}>
        <Input
          id="filter-to"
          type="date"
          value={filters.to}
          min={filters.from || undefined}
          onChange={(event) => onFilterChange("to", event.target.value)}
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
        <div className="flex flex-wrap items-center justify-between gap-2 sm:col-span-2 lg:col-span-4">
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
