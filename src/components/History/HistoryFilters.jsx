import { useState } from "react";
import { SearchIcon, SlidersHorizontalIcon, XIcon } from "lucide-react";
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES } from "@shared/catalog.js";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DatePicker } from "@/components/ui/date-picker";
import { Select } from "@/components/ui/select";
import { getCategoryMeta } from "@/lib/categories";
import { paymentMethodOptions } from "@/lib/paymentMethods";
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
      className="surface grid gap-3 rounded-2xl bg-card p-4 sm:grid-cols-2 lg:grid-cols-4"
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
        className="grid grid-cols-3 gap-1 rounded-xl bg-fg/[0.04] p-1 sm:hidden"
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
        <Select
          id="filter-type"
          value={filters.type}
          onValueChange={(value) => onFilterChange("type", value)}
          options={[
            { value: "", label: t("all") },
            { value: "income", label: t("incomes") },
            { value: "expense", label: t("expenses") },
          ]}
        />
      </FilterField>

      <FilterField className={advanced} id="filter-category" label={t("category")}>
        <Select
          id="filter-category"
          value={filters.category}
          onValueChange={(value) => onFilterChange("category", value)}
          options={[{ value: "", label: t("allFem") }]}
          groups={categoryGroups.map((group) => ({
            label: t(group.type === "income" ? "incomes" : "expenses"),
            options: group.items.map((category) => {
              const { color, icon } = getCategoryMeta(category);
              return { value: category, label: t(`cat_${category}`), icon, iconColor: color };
            }),
          }))}
        />
      </FilterField>

      <FilterField className={advanced} id="filter-method" label={t("method")}>
        <Select
          id="filter-method"
          value={filters.paymentMethod}
          onValueChange={(value) => onFilterChange("paymentMethod", value)}
          options={[{ value: "", label: t("all") }, ...paymentMethodOptions(t)]}
        />
      </FilterField>

      <FilterField className={advanced} id="filter-from" label={t("from")}>
        <DatePicker
          id="filter-from"
          value={filters.from}
          max={filters.to || undefined}
          onChange={(value) => onFilterChange("from", value)}
          placeholder={t("anyDate")}
          clearable
        />
      </FilterField>

      <FilterField className={advanced} id="filter-to" label={t("to")}>
        <DatePicker
          id="filter-to"
          value={filters.to}
          min={filters.from || undefined}
          onChange={(value) => onFilterChange("to", value)}
          placeholder={t("anyDate")}
          clearable
          aria-invalid={rangeError ? true : undefined}
          aria-describedby={rangeError ? "filter-range-error" : undefined}
        />
      </FilterField>

      <FilterField className={advanced} id="filter-sort" label={t("sortBy")}>
        <Select
          id="filter-sort"
          value={filters.sort}
          onValueChange={(value) => onFilterChange("sort", value)}
          options={SORT_OPTIONS.map((option) => ({ value: option.value, label: t(option.labelKey) }))}
        />
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
