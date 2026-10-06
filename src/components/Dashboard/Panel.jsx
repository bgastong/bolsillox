import { cn } from "@/lib/utils";

// Contenedor de las secciones del dashboard (graficos, listas).
function Panel({ title, hint, action, children, className, titleId }) {
  return (
    <section
      aria-labelledby={titleId}
      className={cn(
        "surface flex min-w-0 flex-col gap-4 rounded-[14px] p-4 text-card-foreground sm:p-[18px]",
        className,
      )}
    >
      <header className="flex min-h-7 items-start justify-between gap-3">
        <div className="grid gap-0.5">
          <h2 id={titleId} className="m-0 text-[13.5px] font-medium tracking-[-0.01em]">{title}</h2>
          {hint && <p className="m-0 text-xs text-[color:var(--text-4)]">{hint}</p>}
        </div>
        {action}
      </header>
      {children}
    </section>
  );
}

export default Panel;
