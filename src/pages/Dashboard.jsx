import { useCallback, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRightIcon,
  CalendarX2Icon,
  FlaskConicalIcon,
  PlusIcon,
  SparklesIcon,
  Trash2Icon,
  TriangleAlertIcon,
} from "lucide-react";
import {
  BalanceCard,
  FlowCard,
  SummaryHeroSkeleton,
} from "@/components/Dashboard/SummaryHero";
import UpcomingPayments from "@/components/Dashboard/UpcomingPayments";
import InstallmentAlerts from "@/components/Recurring/InstallmentAlerts";
import BudgetRow from "@/components/Budgets/BudgetRow";
import DollarRates from "@/components/Dashboard/DollarRates";
import CategoryBreakdown from "@/components/Dashboard/Charts/CategoryBreakdown";
import BalanceHistoryChart from "@/components/Dashboard/Charts/BalanceHistoryChart";
import ExpenseList from "@/components/Dashboard/ExpenseList/ExpenseList";
import Panel from "@/components/Dashboard/Panel";
import MonthPicker from "@/components/MonthPicker/MonthPicker";
import { EmptyState, ErrorState } from "@/components/States/States";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api";
import { currentMonthKey, formatCurrency, formatMonth } from "@/lib/format";
import { useApiData } from "@/hooks/useApiData";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/hooks/useLanguage";
import { useMovements } from "@/hooks/useMovements";
import { useSettings } from "@/hooks/useSettings";
import { useToast } from "@/hooks/useToast";
import "@/components/Dashboard/Charts/chartSetup";

// Presupuestos que se muestran en el dashboard (los mas comprometidos).
const DASHBOARD_BUDGETS = 3;

// Mes sin movimientos en una cuenta que ya tiene datos: no es una cuenta nueva,
// asi que en vez de la bienvenida se explica que este mes esta vacio.
function EmptyMonthCard({ summary, month, onCreate, onGoTo }) {
  const { t, locale } = useLanguage();
  const latest = summary.latestMonth && summary.latestMonth !== month ? summary.latestMonth : null;

  return (
    <section
      aria-labelledby="empty-month-title"
      className="surface flex flex-col gap-5 rounded-[14px] p-5 sm:flex-row sm:items-center sm:p-6 xl:col-span-12"
    >
      <span className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-fg/10 bg-fg/[0.04] text-[color:var(--text-2)]">
        <CalendarX2Icon className="size-5" strokeWidth={1.75} aria-hidden="true" />
      </span>
      <div className="grid min-w-0 flex-1 gap-1">
        <h2 id="empty-month-title" className="m-0 text-lg font-medium tracking-[-0.02em]">
          {t("emptyMonthTitle", { month: formatMonth(month, locale) })}
        </h2>
        <p className="m-0 max-w-[60ch] text-sm text-muted-foreground">{t("emptyMonthText")}</p>
        {summary.balance !== 0 && (
          <p className="m-0 text-sm text-[color:var(--text-2)]">
            {t("emptyMonthBalance", {
              amount: formatCurrency(summary.balance, locale, { currency: summary.currency }),
            })}
          </p>
        )}
      </div>
      <div className="flex flex-col gap-2 sm:flex-row">
        <Button onClick={onCreate}>
          <PlusIcon data-icon="inline-start" />
          {t("newMovement")}
        </Button>
        {latest && (
          <Button variant="outline" onClick={() => onGoTo(latest)}>
            {t("emptyMonthGoTo", { month: formatMonth(latest, locale) })}
          </Button>
        )}
      </div>
    </section>
  );
}

// Bienvenida para cuentas nuevas: cargar el primer movimiento o datos de ejemplo.
function WelcomeCard({ onCreate, onDemoLoaded }) {
  const { t } = useLanguage();
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  async function loadDemo() {
    setLoading(true);
    try {
      await api.loadDemoData();
      toast(t("demoLoaded"));
      onDemoLoaded();
    } catch {
      toast(t("errorGeneric"), { variant: "error" });
      setLoading(false);
    }
  }

  return (
    <section
      aria-labelledby="welcome-title"
      className="surface grid gap-4 rounded-[14px] p-5 sm:p-6"
    >
      <div className="flex items-start gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-fg/10 bg-fg/[0.04] text-foreground">
          <SparklesIcon className="size-5" aria-hidden="true" />
        </span>
        <div className="grid gap-1">
          <h2 id="welcome-title" className="m-0 text-lg font-medium tracking-[-0.02em]">
            {t("welcomeTitle", { name: user?.name ?? "" })}
          </h2>
          <p className="m-0 text-sm text-muted-foreground">{t("welcomeText")}</p>
        </div>
      </div>
      <div className="flex flex-col gap-2 sm:flex-row">
        <Button onClick={onCreate} className="h-11 sm:h-9">
          <PlusIcon data-icon="inline-start" />
          {t("welcomeFirstMovement")}
        </Button>
        <Button variant="outline" onClick={loadDemo} disabled={loading} className="h-11 sm:h-9">
          {loading ? t("loading") : t("welcomeDemo")}
        </Button>
      </div>
    </section>
  );
}

// Aviso mientras la cuenta tiene datos de ejemplo, con la opcion de borrarlos.
function DemoDataNotice({ onDeleted }) {
  const { t } = useLanguage();
  const { toast } = useToast();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    setDeleting(true);
    try {
      await api.deleteDemoData();
      toast(t("demoDeleted"));
      setConfirmOpen(false);
      onDeleted();
    } catch {
      toast(t("errorGeneric"), { variant: "error" });
    } finally {
      setDeleting(false);
    }
  }

  return (
    <section
      aria-labelledby="demo-notice-title"
      className="flex flex-col gap-3 rounded-xl border border-fg/10 bg-fg/[0.03] px-4 py-3 sm:flex-row sm:items-center"
    >
      <span className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-fg/10 bg-fg/[0.04] max-sm:hidden">
        <FlaskConicalIcon className="size-4" aria-hidden="true" />
      </span>
      <div className="grid flex-1 gap-0.5">
        <h2 id="demo-notice-title" className="m-0 text-sm font-medium">
          {t("demoNoticeTitle")}
        </h2>
        <p className="m-0 text-sm text-muted-foreground">{t("demoNoticeText")}</p>
      </div>
      <Button variant="outline" onClick={() => setConfirmOpen(true)} className="h-11 sm:h-9">
        <Trash2Icon data-icon="inline-start" />
        {t("demoDelete")}
      </Button>

      <Dialog open={confirmOpen} onOpenChange={(open) => !deleting && setConfirmOpen(open)}>
        <DialogContent className="max-w-md" closeLabel={t("close")}>
          <DialogHeader>
            <DialogTitle>{t("demoDeleteTitle")}</DialogTitle>
            <DialogDescription>{t("demoDeleteText")}</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-2 sm:flex sm:justify-end">
            <Button variant="outline" onClick={() => setConfirmOpen(false)} disabled={deleting}>
              {t("cancel")}
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting ? t("deleting") : t("demoDelete")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </section>
  );
}

function PanelSkeleton({ className = "h-64" }) {
  return <Skeleton className={`w-full rounded-lg ${className}`} />;
}

function PanelLink({ to, children }) {
  return (
    <Link
      to={to}
      className="-mt-1 -mr-2 inline-flex min-h-9 items-center gap-1 rounded-lg px-2 text-[12.5px] text-[color:var(--text-3)] outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
    >
      {children}
      <ArrowRightIcon className="size-3.5" aria-hidden="true" />
    </Link>
  );
}

function Dashboard() {
  const { t } = useLanguage();
  const [month, setMonth] = useState(currentMonthKey);
  const { openCreate, openEdit, notifyChange, version } = useMovements();
  const { currency, rate } = useSettings();

  // Se recarga al cambiar de mes o de moneda, al crear/editar/borrar
  // (`version`) y cuando cambia la cotizacion.
  const loadSummary = useCallback(
    (signal) => api.getSummary(month, currency, { signal }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [month, currency, version, rate],
  );
  const { data: summary, error, loading, reload } = useApiData(loadSummary);

  const loadBudgets = useCallback(
    (signal) => api.getBudgets(month, { signal }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [month, version, rate],
  );
  const { data: budgets } = useApiData(loadBudgets);

  // Cuenta nueva: sin ningun movimiento cargado todavia (en ningun mes).
  const isEmptyAccount = summary && !summary.hasMovements;
  // La cuenta tiene datos, pero el mes elegido esta vacio.
  const isEmptyMonth = summary && summary.hasMovements && summary.count === 0;
  // El flujo de caja necesita al menos un dia con movimientos en los ultimos meses.
  const hasHistory = Boolean(summary?.history?.days.length);
  const showSkeleton = loading && !summary;

  return (
    <div className="grid grid-cols-1 gap-4">
      {/* El titulo queda para lectores de pantalla: arriba ya esta la marca */}
      <h1 className="sr-only">{t("dashboardTitle")}</h1>
      <header className="flex items-center justify-between gap-3">
        <MonthPicker month={month} onChange={setMonth} />
        <Button onClick={openCreate} className="max-md:hidden">
          <PlusIcon data-icon="inline-start" />
          {t("newMovement")}
          <kbd className="kbd ml-1 border-current bg-transparent text-current opacity-45">N</kbd>
        </Button>
      </header>

      {isEmptyAccount && <WelcomeCard onCreate={openCreate} onDemoLoaded={notifyChange} />}
      {summary?.hasDemoData && <DemoDataNotice onDeleted={notifyChange} />}
      <InstallmentAlerts />

      {summary?.unconverted > 0 && (
        <p
          role="alert"
          className="m-0 flex flex-wrap items-center gap-x-2 gap-y-1 rounded-xl border border-[color:var(--warn-border)] bg-[color:var(--warn-bg)] px-4 py-3 text-sm text-warn-strong"
        >
          <TriangleAlertIcon className="size-4 shrink-0" aria-hidden="true" />
          <span className="flex-1">{t("rateMissingSummary", { count: summary.unconverted })}</span>
          <Link to="/settings" className="font-medium text-warn-strong underline underline-offset-4">
            {t("rateConfigure")}
          </Link>
        </p>
      )}

      {error && !summary ? (
        <ErrorState error={error} onRetry={reload} />
      ) : isEmptyAccount ? (
        // Sin datos, las tarjetas en $0 y los graficos vacios solo hacen ruido.
        <DollarRates />
      ) : (
        <div
          className="stagger grid grid-cols-1 gap-3 transition-opacity sm:gap-4 xl:grid-cols-12"
          style={{ opacity: loading && summary ? 0.6 : 1 }}
          aria-busy={loading}
        >
          {showSkeleton ? (
            <SummaryHeroSkeleton />
          ) : isEmptyMonth ? (
            <EmptyMonthCard summary={summary} month={month} onCreate={openCreate} onGoTo={setMonth} />
          ) : (
            <>
              <BalanceCard summary={summary} className="xl:col-span-8" />
              <FlowCard summary={summary} className="xl:col-span-4" />
            </>
          )}

          <Panel
            className="order-last xl:order-none xl:col-span-8"
            title={t("cashflowTitle")}
            titleId="cashflow-title"
            hint={t("cashflowHint")}
          >
            {showSkeleton ? (
              <PanelSkeleton className="h-60 sm:h-64" />
            ) : hasHistory ? (
              <BalanceHistoryChart history={summary.history} currency={summary.currency} />
            ) : (
              <EmptyState message={t("chartEmpty")} />
            )}
          </Panel>

          <Panel
            className="xl:col-span-4 xl:self-start"
            title={t("chartByCategory")}
            titleId="categories-title"
            action={<span className="text-xs text-[color:var(--text-4)]">{t("vsLastMonth")}</span>}
          >
            {showSkeleton ? (
              <PanelSkeleton />
            ) : summary.byCategory.length ? (
              <CategoryBreakdown data={summary.byCategory} currency={summary.currency} />
            ) : (
              <EmptyState message={t("chartEmpty")} />
            )}
          </Panel>

          <Panel
            className="xl:col-span-8 xl:self-start"
            title={t("recentMovements")}
            titleId="recent-title"
            action={<PanelLink to="/history">{t("viewAll")}</PanelLink>}
          >
            {showSkeleton ? (
              <div className="grid gap-3">
                {Array.from({ length: 4 }, (_, index) => (
                  <PanelSkeleton key={index} className="h-12" />
                ))}
              </div>
            ) : summary.recent.length ? (
              <ExpenseList movements={summary.recent} onEdit={openEdit} />
            ) : (
              <EmptyState message={t("emptyMovements")}>
                <Button size="sm" onClick={openCreate}>
                  <PlusIcon data-icon="inline-start" />
                  {t("newMovement")}
                </Button>
              </EmptyState>
            )}
          </Panel>

          <div className="grid content-start gap-3 sm:gap-4 xl:col-span-4">
            <Panel
              title={t("budgetsTitle")}
              titleId="budgets-title"
              action={<PanelLink to="/budgets">{t("viewAll")}</PanelLink>}
            >
              {!budgets ? (
                <div className="grid gap-4">
                  {Array.from({ length: 3 }, (_, index) => (
                    <PanelSkeleton key={index} className="h-14" />
                  ))}
                </div>
              ) : budgets.items.length ? (
                <ul className="m-0 flex list-none flex-col gap-4 p-0">
                  {budgets.items.slice(0, DASHBOARD_BUDGETS).map((item) => (
                    <li key={item.category}>
                      <BudgetRow item={item} compact />
                    </li>
                  ))}
                </ul>
              ) : (
                <EmptyState message={t("budgetsEmptyShort")}>
                  <Button asChild size="sm" variant="outline">
                    <Link to="/budgets">{t("budgetsCreate")}</Link>
                  </Button>
                </EmptyState>
              )}
            </Panel>

            <UpcomingPayments />

            <DollarRates />
          </div>
        </div>
      )}
    </div>
  );
}

export default Dashboard;
