import { cn } from "@/lib/utils";
import { dueTone } from "@/lib/due";
import { parseISODate } from "@/lib/format";
import { useLanguage } from "@/hooks/useLanguage";

// Colores por urgencia (ver lib/due.js): sin color, ámbar o rojo.
const TEXT_TONE = { later: undefined, soon: "text-warn", overdue: "text-danger" };
const TILE_TONE = {
  later: "border-fg/[0.07] bg-fg/[0.02]",
  soon: "border-[color:var(--warn-border)] bg-[color:var(--warn-bg)]",
  overdue: "border-[color:var(--danger)]/40 bg-[color:var(--danger-soft)]",
};
const MONTH_TONE = { later: "text-[color:var(--text-3)]", soon: "text-warn", overdue: "text-danger" };

/*
Fecha como mini calendario: mes arriba y día abajo. Es decorativa (el texto de
DueStatus dice lo mismo), así que el lector de pantalla la saltea.
*/
export function DueDateTile({ date, daysLeft, className }) {
  const { locale } = useLanguage();
  const value = parseISODate(date);
  const month = new Intl.DateTimeFormat(locale, { month: "short" }).format(value).replace(".", "");
  const tone = dueTone(daysLeft);
  return (
    <span
      aria-hidden="true"
      className={cn(
        "flex size-10 shrink-0 flex-col items-center justify-center rounded-[9px] border leading-none",
        TILE_TONE[tone],
        className,
      )}
    >
      <span className={cn("font-mono text-[9px] font-medium tracking-[0.06em] uppercase", MONTH_TONE[tone])}>{month}</span>
      <span className="mt-[3px] font-mono text-[15px] font-medium">{String(value.getDate()).padStart(2, "0")}</span>
    </span>
  );
}

/*
Estado de un vencimiento en palabras: "Vence en 12 días", "Vence mañana",
"Vence hoy" o "Vencida hace 3 días, sin pagar". Se entiende sin el color.
- kind: "pay" (algo que tengo que pagar) o "collect" (algo que me tienen que pagar).
*/
export function DueStatus({ daysLeft, kind = "pay", className }) {
  const { t } = useLanguage();
  const tone = dueTone(daysLeft);
  let text;
  if (daysLeft < 0) {
    text = t(kind === "collect" ? "receivableOverdueDays" : "installmentOverdue", { count: -daysLeft });
  } else if (daysLeft === 0) text = t("installmentDueToday");
  else text = t("installmentDueIn", { count: daysLeft });
  return <span className={cn(TEXT_TONE[tone], className)}>{text}</span>;
}
