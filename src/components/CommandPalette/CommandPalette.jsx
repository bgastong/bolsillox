import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Dialog as DialogPrimitive } from "radix-ui";
import {
  CreditCardIcon,
  EyeIcon,
  EyeOffIcon,
  HandCoinsIcon,
  HistoryIcon,
  LayoutDashboardIcon,
  MoonIcon,
  PiggyBankIcon,
  PlusIcon,
  RepeatIcon,
  SearchIcon,
  SettingsIcon,
  SunIcon,
  TargetIcon,
  TrendingUpIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api";
import { formatDate } from "@/lib/format";
import { useLanguage } from "@/hooks/useLanguage";
import { useMovements } from "@/hooks/useMovements";
import { useTheme } from "@/hooks/useTheme";
import { CommandPaletteContext } from "@/context/CommandPaletteValue";
import Money from "../Money/Money";
import { PRIVACY_SHORTCUT, usePrivacyToggle } from "@/hooks/usePrivacyToggle";
import { CategoryIcon } from "../Movements/MovementBits";

const PAGES = [
  { to: "/", labelKey: "home", icon: LayoutDashboardIcon },
  { to: "/history", labelKey: "history", icon: HistoryIcon },
  { to: "/recurring", labelKey: "recurringTitle", icon: RepeatIcon },
  { to: "/debts", labelKey: "debtsTitle", icon: HandCoinsIcon },
  { to: "/budgets", labelKey: "budgetsTitle", icon: PiggyBankIcon },
  { to: "/goals", labelKey: "goalsTitle", icon: TargetIcon },
  { to: "/investments", labelKey: "investmentsTitle", icon: TrendingUpIcon },
  { to: "/settings", labelKey: "settingsTitle", icon: SettingsIcon },
];

// Sin tildes ni mayusculas, para que "presu" encuentre "Presupuestos".
function normalize(text) {
  return text.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
}

// Busca movimientos por titulo mientras se escribe (con una pequeña espera).
function useMovementSearch(query, open) {
  const [found, setFound] = useState({ q: "", items: [] });
  const q = query.trim();
  const enabled = open && q.length >= 2;

  useEffect(() => {
    if (!enabled) return undefined;
    const controller = new AbortController();
    const timer = setTimeout(() => {
      api
        .listMovements({ q, sort: "date", order: "desc", limit: 6 }, { signal: controller.signal })
        .then((items) => setFound({ q, items }))
        .catch(() => {});
    }, 160);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [q, enabled]);

  // Solo se muestran los resultados de la busqueda actual.
  return enabled && found.q === q ? found.items : [];
}

/*
Buscador global (⌘K / Ctrl+K): acciones, navegacion y movimientos.
Se maneja solo con el teclado: flechas para moverse, Enter para elegir
y Esc para cerrar. Envuelve la app y expone `open()` via useCommandPalette.
*/
function CommandPalette({ children }) {
  const { t, locale, hideAmounts } = useLanguage();
  const togglePrivacy = usePrivacyToggle();
  const navigate = useNavigate();
  const { openCreate, openCreateRecurring, openCreateInstallments, openEdit } = useMovements();
  const { resolvedTheme, setTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const listRef = useRef(null);
  const movements = useMovementSearch(query, open);

  const show = useCallback(() => {
    setQuery("");
    setActive(0);
    setOpen(true);
  }, []);

  useEffect(() => {
    function handleKey(event) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen((value) => {
          if (!value) {
            setQuery("");
            setActive(0);
          }
          return !value;
        });
        return;
      }
      // Atajos de una tecla, salvo que se este escribiendo o haya un dialogo abierto:
      // "N" nuevo movimiento y "P" modo privado.
      const target = event.target;
      const typing =
        target instanceof HTMLElement &&
        (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName));
      if (event.metaKey || event.ctrlKey || event.altKey || typing || document.querySelector("[role='dialog']")) {
        return;
      }
      const key = event.key.toLowerCase();
      if (key === "n") {
        event.preventDefault();
        openCreate();
      } else if (key === PRIVACY_SHORTCUT.toLowerCase()) {
        event.preventDefault();
        togglePrivacy();
      }
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [openCreate, togglePrivacy]);

  const groups = useMemo(() => {
    const q = normalize(query);
    const match = (label) => !q || normalize(label).includes(q);
    const actions = [
      { id: "new", label: t("cmdNewMovement"), icon: PlusIcon, run: openCreate, hint: "N" },
      { id: "new-recurring", label: t("cmdNewRecurring"), icon: RepeatIcon, run: openCreateRecurring },
      {
        id: "new-installments",
        label: t("newInstallments"),
        icon: CreditCardIcon,
        run: openCreateInstallments,
      },
      {
        id: "privacy",
        label: t(hideAmounts ? "showAmounts" : "hideAmounts"),
        icon: hideAmounts ? EyeIcon : EyeOffIcon,
        run: togglePrivacy,
        hint: PRIVACY_SHORTCUT,
      },
      resolvedTheme === "dark"
        ? { id: "theme", label: t("themeToLight"), icon: SunIcon, run: () => setTheme("light") }
        : { id: "theme", label: t("themeToDark"), icon: MoonIcon, run: () => setTheme("dark") },
    ].filter((item) => match(item.label));
    const pages = PAGES.map((page) => ({
      id: page.to,
      label: t(page.labelKey),
      icon: page.icon,
      run: () => navigate(page.to),
    })).filter((item) => match(item.label));
    const found = movements.map((movement) => ({
      id: `m-${movement.id}`,
      movement,
      label: movement.title,
      run: () => openEdit(movement),
    }));
    return [
      { title: t("cmdActions"), items: actions },
      { title: t("cmdMovements"), items: found },
      { title: t("cmdGoTo"), items: pages },
    ].filter((group) => group.items.length);
  }, [
    query,
    movements,
    t,
    navigate,
    openCreate,
    openCreateRecurring,
    openCreateInstallments,
    openEdit,
    resolvedTheme,
    setTheme,
    hideAmounts,
    togglePrivacy,
  ]);

  const flat = groups.flatMap((group) => group.items);
  const current = Math.min(active, Math.max(flat.length - 1, 0));

  function choose(item) {
    setOpen(false);
    // Se espera a que cierre el buscador para no pelear por el foco.
    requestAnimationFrame(() => item.run());
  }

  function handleKeyDown(event) {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      const step = event.key === "ArrowDown" ? 1 : -1;
      const next = (current + step + flat.length) % Math.max(flat.length, 1);
      setActive(next);
      listRef.current?.querySelector(`[data-index="${next}"]`)?.scrollIntoView({ block: "nearest" });
    } else if (event.key === "Enter" && flat[current]) {
      event.preventDefault();
      choose(flat[current]);
    }
  }

  const value = useMemo(() => ({ open: show }), [show]);
  let index = -1;

  return (
    <CommandPaletteContext.Provider value={value}>
      {children}
      <DialogPrimitive.Root open={open} onOpenChange={setOpen}>
        <DialogPrimitive.Portal>
          <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/60 backdrop-blur-[3px] data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0" />
          <DialogPrimitive.Content
            aria-describedby={undefined}
            onKeyDown={handleKeyDown}
            className="fixed top-[12svh] left-1/2 z-50 w-[min(620px,calc(100vw-24px))] -translate-x-1/2 overflow-hidden rounded-2xl border border-fg/10 bg-[color:var(--elevated)] shadow-[var(--hero-shadow)] outline-none data-open:animate-in data-open:fade-in-0 data-open:zoom-in-[0.98] data-open:slide-in-from-top-2 data-closed:animate-out data-closed:fade-out-0"
          >
            <DialogPrimitive.Title className="sr-only">{t("cmdLabel")}</DialogPrimitive.Title>
            <div className="flex h-14 items-center gap-3 border-b border-fg/[0.07] px-4">
              <SearchIcon className="size-4 shrink-0 text-[color:var(--text-3)]" aria-hidden="true" />
              <input
                autoFocus
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value);
                  setActive(0);
                }}
                placeholder={t("cmdPlaceholder")}
                aria-label={t("cmdLabel")}
                role="combobox"
                aria-expanded="true"
                aria-controls="command-list"
                aria-activedescendant={flat[current] ? `cmd-${flat[current].id}` : undefined}
                className="h-full min-w-0 flex-1 bg-transparent text-[15px] text-foreground outline-none placeholder:text-[color:var(--text-4)]"
              />
              <kbd className="kbd max-sm:hidden">esc</kbd>
            </div>

            <div id="command-list" role="listbox" ref={listRef} className="max-h-[min(420px,60svh)] overflow-y-auto py-2">
              {groups.length === 0 && (
                <p className="m-0 px-4 py-8 text-center text-sm text-muted-foreground">{t("cmdNoResults")}</p>
              )}
              {groups.map((group) => (
                <div key={group.title} role="group" aria-label={group.title}>
                  <p className="m-0 px-4 pt-2 pb-1 text-[11.5px] text-[color:var(--text-4)]">{group.title}</p>
                  {group.items.map((item) => {
                    index += 1;
                    const itemIndex = index;
                    const selected = itemIndex === current;
                    const Icon = item.icon;
                    return (
                      <div
                        key={item.id}
                        id={`cmd-${item.id}`}
                        role="option"
                        aria-selected={selected}
                        data-index={itemIndex}
                        onMouseMove={() => setActive(itemIndex)}
                        onClick={() => choose(item)}
                        className={cn(
                          "mx-1.5 flex min-h-11 cursor-pointer items-center gap-3 rounded-lg px-2.5 text-sm text-[color:var(--text-2)]",
                          selected && "bg-fg/[0.06] text-foreground",
                        )}
                      >
                        {item.movement ? (
                          <>
                            <CategoryIcon category={item.movement.category} className="size-7 rounded-md" />
                            <span className="min-w-0 flex-1 truncate">
                              {item.label}
                              <span className="ml-2 text-xs text-[color:var(--text-4)]">
                                {formatDate(item.movement.date, locale, { day: "numeric", month: "short" })}
                              </span>
                            </span>
                            <Money
                              listItem
                              type={item.movement.type}
                              amount={item.movement.amount}
                              currency={item.movement.currency}
                              className="text-[13px] font-normal"
                            />
                          </>
                        ) : (
                          <>
                            <Icon className="size-4 shrink-0 text-[color:var(--text-3)]" aria-hidden="true" />
                            <span className="flex-1 truncate">{item.label}</span>
                            {item.hint && <kbd className="kbd">{item.hint}</kbd>}
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>

            <div className="flex gap-4 border-t border-fg/[0.07] px-4 py-2.5 text-[11.5px] text-[color:var(--text-4)] max-sm:hidden">
              <span className="flex items-center gap-1.5"><kbd className="kbd">↑</kbd><kbd className="kbd">↓</kbd>{t("cmdNavigate")}</span>
              <span className="flex items-center gap-1.5"><kbd className="kbd">↵</kbd>{t("cmdSelect")}</span>
              <span className="flex items-center gap-1.5"><kbd className="kbd">esc</kbd>{t("cmdClose")}</span>
            </div>
          </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>
    </CommandPaletteContext.Provider>
  );
}

export default CommandPalette;
