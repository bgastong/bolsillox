import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { CheckSquareIcon, DownloadIcon, PlusIcon, Trash2Icon, XIcon } from "lucide-react";
import HistoryFilters from "@/components/History/HistoryFilters";
import { PageHeader } from "@/components/Movements/MovementBits";
import MovementTabs from "@/components/Recurring/MovementTabs";
import { EmptyState, ErrorState } from "@/components/States/States";
import TableHistory, { TableHistorySkeleton } from "../components/TableHistory/TableHistory";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { api } from "@/lib/api";
import { todayISO } from "@/lib/format";
import { downloadFile, EXPORT_FORMATS, movementsTable } from "@/lib/exportMovements";
import { useApiData } from "@/hooks/useApiData";
import { useCategories } from "@/hooks/useCategories";
import { useLanguage } from "@/hooks/useLanguage";
import { useMovements } from "@/hooks/useMovements";
import { useToast } from "@/hooks/useToast";

const FILTER_KEYS = ["type", "category", "paymentMethod", "from", "to"];
const DEFAULT_SORT = "date-desc";
const SEARCH_DEBOUNCE_MS = 300;

// Los filtros viven en la URL (?type=expense&q=super) para poder compartirlos
// y no perderlos al recargar.
// Barra que aparece al elegir movimientos: cuantos, deseleccionar y eliminar.
function SelectionBar({ count, onClear, onDelete }) {
  const { t } = useLanguage();
  return (
    <div
      role="region"
      aria-label={t("selectionBar")}
      className="sticky bottom-[calc(96px+env(safe-area-inset-bottom))] z-20 mx-auto flex w-full max-w-xl min-w-0 items-center gap-2 rounded-2xl border border-fg/10 bg-popover/95 p-2 pl-4 shadow-2xl backdrop-blur-xl md:bottom-4"
    >
      <p className="m-0 min-w-0 flex-1 truncate text-sm font-medium" aria-live="polite">
        {t("selectedCount", { count })}
      </p>
      {/* En el celular solo la cruz, para que entre en una linea */}
      <Button variant="ghost" onClick={onClear} className="h-10 max-sm:w-10 max-sm:px-0 sm:h-9" aria-label={t("deselect")}>
        <XIcon data-icon="inline-start" className="max-sm:m-0" />
        <span className="max-sm:hidden">{t("deselect")}</span>
      </Button>
      <Button variant="destructive" onClick={onDelete} className="h-10 sm:h-9">
        <Trash2Icon data-icon="inline-start" />
        {t("delete")}
      </Button>
    </div>
  );
}

// Descarga lo que se ve en la lista (con los filtros aplicados) en Excel o CSV.
function ExportMenu({ movements, filters }) {
  const { t } = useLanguage();
  const { nameOf } = useCategories();
  const { toast } = useToast();
  const count = movements?.length ?? 0;

  function exportAs(format) {
    const { extension, mime, build } = EXPORT_FORMATS[format];
    const { columns, rows } = movementsTable(movements, {
      t,
      categoryName: nameOf,
      methodName: (key) => t(`pm_${key}`),
    });
    // El nombre lleva el rango filtrado, o la fecha de hoy si no hay.
    const range = [filters.from, filters.to].filter(Boolean).join("_") || todayISO();
    downloadFile(build(columns, rows, t("exportSheetName")), `bolsillox-${range}.${extension}`, mime);
    toast(t("exportDone", { count }));
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" disabled={!count} aria-label={t("exportLabel", { count })}>
          <DownloadIcon data-icon="inline-start" />
          {t("export")}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuLabel className="text-xs font-normal tracking-normal text-muted-foreground normal-case">
          {t("exportHint", { count })}
        </DropdownMenuLabel>
        <DropdownMenuItem onSelect={() => exportAs("xlsx")}>{t("exportExcel")}</DropdownMenuItem>
        <DropdownMenuItem onSelect={() => exportAs("csv")}>{t("exportCsv")}</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function History() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const { openCreate, openEdit, openDelete, notifyChange, version } = useMovements();
  // Movimientos elegidos para borrar juntos. En el celular hay que activar "Seleccionar".
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [selecting, setSelecting] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
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

  // Solo cuentan los elegidos que se ven con los filtros actuales.
  const selected = useMemo(
    () => new Set((movements ?? []).filter((item) => selectedIds.has(item.id)).map((item) => item.id)),
    [movements, selectedIds],
  );

  function toggle(id) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    const all = movements ?? [];
    setSelectedIds(selected.size === all.length ? new Set() : new Set(all.map((item) => item.id)));
  }

  function clearSelection() {
    setSelectedIds(new Set());
    setSelecting(false);
  }

  async function deleteSelected() {
    setDeleting(true);
    try {
      const { deleted } = await api.deleteMovements([...selected]);
      toast(t("movementsDeleted", { count: deleted }));
      setConfirmOpen(false);
      clearSelection();
      notifyChange();
    } catch {
      toast(t("errorGeneric"), { variant: "error" });
    } finally {
      setDeleting(false);
    }
  }

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
          selected={selected}
          onToggle={toggle}
          onToggleAll={toggleAll}
          selecting={selecting}
        />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4">
      <PageHeader
        title={t("titleHistory")}
        subtitle={t("historySubtitle")}
        actions={
          <>
            <ExportMenu movements={movements} filters={filters} />
            <Button onClick={openCreate} className="max-md:hidden">
              <PlusIcon data-icon="inline-start" />
              {t("newMovement")}
            </Button>
          </>
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

      {/* Celular: entrar o salir del modo de seleccion */}
      {movements?.length > 0 && (
        <div className="-mb-1 flex justify-end md:hidden">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => (selecting ? clearSelection() : setSelecting(true))}
            aria-pressed={selecting}
          >
            {selecting ? <XIcon data-icon="inline-start" /> : <CheckSquareIcon data-icon="inline-start" />}
            {selecting ? t("cancelSelection") : t("select")}
          </Button>
        </div>
      )}

      <div aria-busy={loading}>{content}</div>

      {selected.size > 0 && (
        <SelectionBar count={selected.size} onClear={clearSelection} onDelete={() => setConfirmOpen(true)} />
      )}

      <Dialog open={confirmOpen} onOpenChange={(open) => !deleting && setConfirmOpen(open)}>
        <DialogContent className="max-w-md" closeLabel={t("close")}>
          <DialogHeader>
            <DialogTitle>{t("deleteSelectedTitle", { count: selected.size })}</DialogTitle>
            <DialogDescription>{t("deleteSelectedText")}</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-2 sm:flex sm:justify-end">
            <Button variant="outline" onClick={() => setConfirmOpen(false)} disabled={deleting}>
              {t("cancel")}
            </Button>
            <Button variant="destructive" onClick={deleteSelected} disabled={deleting}>
              {deleting ? t("deleting") : t("delete")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default History;
