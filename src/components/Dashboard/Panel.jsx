import { cn } from "@/lib/utils";

// Contenedor de las secciones del dashboard (graficos, listas).
function Panel({ title, hint, action, children, className }) {
  return (
    <section
      className={cn(
        "flex min-w-0 flex-col gap-4 rounded-xl border bg-card p-4 text-card-foreground sm:p-5",
        className,
      )}
    >
      <header className="flex items-start justify-between gap-3">
        <div className="grid gap-0.5">
          <h2 className="m-0 text-base font-semibold">{title}</h2>
          {hint && <p className="m-0 text-xs text-muted-foreground">{hint}</p>}
        </div>
        {action}
      </header>
      {children}
    </section>
  );
}

export default Panel;
