import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { PlusIcon } from "lucide-react";
import HistoryFilters from "@/components/History/HistoryFilters";
import { PageHeader } from "@/components/Movements/MovementBits";
import MovementTabs from "@/components/Recurring/MovementTabs";
import { EmptyState, ErrorState } from "@/components/States/States";
import TableHistory, { TableHistorySkeleton } from "../components/TableHistory/TableHistory";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { useApiData } from "@/hooks/useApiData";
import { useLanguage } from "@/hooks/useLanguage";
import { useMovements } from "@/hooks/useMovements";

const FILTER_KEYS = ["type", "category", "paymentMethod", "from", "to"];
const DEFAULT_SORT = "date-desc";
const SEARCH_DEBOUNCE_MS = 300;

// Los filtros viven en la URL (?type=expense&q=super) para poder compartirlos
// y no perderlos al recargar.
function History() {
  const { t } = useLanguage();
  const { openCreate, openEdit, openDelete, version } = useMovements();
  const [searchParams, setSearchParams] = useSearchParams();

  const filters = {
    ...Object.fromEntries(FILTER_KEYS.map((key) => [key, searchParams.get(key) ?? ""])),
    sort: searchParams.get("sort") ?? DEFAULT_SORT,
  };
  const q = searchParams.get("q") ?? "";
  const [search, setSearch] = useState(q);

  const updateParams = useCallback(
    (changes) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          for (const [key, value] of Object.entries(changes)) {
            if (value && !(key === "sort" && value === DEFAULT_SORT)) next.set(key, value);
            else next.delete(key);
          }
          return next;
        },
        { replace: true },
      );
    },
    [setSearchParams],
  );

  // Busqueda con debounce para no pegarle a la API en cada tecla.
  useEffect(() => {
    if (search.trim() === q) return undefined;
    const timer = setTimeout(() => updateParams({ q: search.trim() }), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [search, q, updateParams]);

  function handleFilterChange(key, value) {
    const changes = { [key]: value };
    // Si cambia el tipo, la categoria elegida puede dejar de ser valida.
    if (key === "type" && value) changes.category = "";
    updateParams(changes);
  }

  function handleClear() {
    setSearch("");
    setSearchParams({}, { replace: true });
  }

  const rangeError = Boolean(filters.from && filters.to && filters.from > filters.to);
  const hasFilters = Boolean(q || FILTER_KEYS.some((key) => filters[key]) || filters.sort !== DEFAULT_SORT);

  // `version` cambia al crear/editar/borrar y fuerza la recarga.
  const queryKey = JSON.stringify({ ...filters, q, rangeError, version });

  const loadMovements = useCallback(
    (signal) => {
      const params = JSON.parse(queryKey);
      if (params.rangeError) return Promise.resolve([]);
      const [sort, order] = params.sort.split("-");
      return api.listMovements(
        {
          q: params.q,
          type: params.type,
          category: params.category,
          paymentMethod: params.paymentMethod,
          from: params.from,
          to: params.to,
          sort,
          order,
        },
        { signal },
      );
    },
    [queryKey],
  );

  const { data: movements, error, loading, reload } = useApiData(loadMovements);

  let content;
  if (error && !movements) {
    content = <ErrorState error={error} onRetry={reload} />;
  } else if (!movements) {
    content = <TableHistorySkeleton />;
  } else if (movements.length === 0) {
    content = hasFilters ? (
      <EmptyState message={t("emptyHistory")}>
        <Button variant="outline" size="sm" onClick={handleClear}>
          {t("clearFilters")}
        </Button>
      </EmptyState>
    ) : (
      <EmptyState message={t("emptyMovements")}>
        <Button size="sm" onClick={openCreate}>
          <PlusIcon data-icon="inline-start" />
          {t("newMovement")}
        </Button>
      </EmptyState>
    );
  } else {
    content = (
      <div className="transition-opacity" style={{ opacity: loading ? 0.6 : 1 }}>
        <TableHistory
          movements={movements}
          onEdit={openEdit}
          onDelete={openDelete}
        />
      </div>
    );
  }

  return (
    <div className="grid gap-4">
      <PageHeader
        title={t("titleHistory")}
        subtitle={t("historySubtitle")}
        actions={
          <Button onClick={openCreate} className="max-md:hidden">
            <PlusIcon data-icon="inline-start" />
            {t("newMovement")}
          </Button>
        }
      />

      <MovementTabs />

      <HistoryFilters
        search={search}
        onSearchChange={setSearch}
        filters={filters}
        onFilterChange={handleFilterChange}
        onClear={handleClear}
        hasFilters={hasFilters}
        rangeError={rangeError}
      />

      {/* Anuncio para lectores de pantalla cuando cambian los resultados */}
      <p className="sr-only" role="status" aria-live="polite">
        {movements && !loading ? t("resultsCount", { count: movements.length }) : ""}
      </p>

      <div aria-busy={loading}>{content}</div>
    </div>
  );
}

export default History;
