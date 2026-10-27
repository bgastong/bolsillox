import { ArrowDownLeftIcon, ArrowUpRightIcon, CircleCheckIcon, ClockIcon, PencilIcon, TriangleAlertIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CUSTOM_CATEGORY_ICONS } from "@/lib/categories";
import { formatCurrency, formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/hooks/useLanguage";

/*
Como viene la meta, siempre con icono y texto (no solo color):
- done: se llego. onTrack: este mes ya se aparto lo necesario.
- behind: falta apartar este mes. overdue: paso la fecha. open: sin fecha.
*/
function goalStatus(goal, t, money) {
  switch (goal.status) {
    case "done":
      return { icon: CircleCheckIcon, tone: "text-income", text: t("goalStatusDone") };
    case "onTrack":
      return { icon: CircleCheckIcon, tone: "text-income", text: t("goalStatusOnTrack", { amount: money(goal.perMonth) }) };
    case "behind":
      return {
        icon: ClockIcon,
        tone: "text-[color:var(--text-2)]",
        text: t("goalStatusBehind", { amount: money(goal.thisMonthLeft), total: money(goal.perMonth) }),
      };
    case "overdue":
      return { icon: TriangleAlertIcon, tone: "text-warn", text: t("goalStatusOverdue", { amount: money(goal.remaining) }) };
    default:
      return { icon: ClockIcon, tone: "text-[color:var(--text-2)]", text: t("goalStatusOpen", { amount: money(goal.remaining) }) };
  }
}

// Una meta: icono, nombre y fecha; cuanto se lleva de cuanto, barra y como viene.
function GoalCard({ goal, onEdit, onEntry }) {
  const { t, locale } = useLanguage();
  const Icon = CUSTOM_CATEGORY_ICONS[goal.icon] ?? CUSTOM_CATEGORY_ICONS.piggyBank;
  const money = (value) => formatCurrency(value, locale, { currency: goal.currency });
  const status = goalStatus(goal, t, money);
  const StatusIcon = status.icon;
  const done = goal.status === "done";
  const deadline = goal.deadline
    ? t("goalDeadlineOn", { date: formatDate(goal.deadline, locale, { day: "numeric", month: "short", year: "numeric" }) })
    : t("goalNoDeadline");

  return (
    <article aria-labelledby={`goal-${goal.id}-name`} className="surface grid gap-4 rounded-2xl bg-card p-4 sm:p-5">
      <div className="flex items-start gap-3">
        <span
          aria-hidden="true"
          className={cn(
            "flex size-11 shrink-0 items-center justify-center rounded-xl border",
            done ? "border-[color:var(--income)]/30 bg-[color:var(--income)]/10 text-income" : "border-fg/[0.07] bg-fg/[0.04] text-[color:var(--text-2)]",
          )}
        >
          <Icon className="size-5" strokeWidth={1.75} />
        </span>
        <div className="grid min-w-0 flex-1 gap-0.5">
          <h3 id={`goal-${goal.id}-name`} className="m-0 truncate text-[15px] font-medium">
            {goal.name}
          </h3>
          <p className="m-0 text-xs text-muted-foreground">{deadline}</p>
        </div>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => onEdit(goal)}
          aria-label={`${t("edit")}: ${goal.name}`}
          className="-mt-1 -mr-1 text-muted-foreground"
        >
          <PencilIcon aria-hidden="true" />
        </Button>
      </div>

      <div className="grid gap-2">
        <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
          <p className="m-0 text-xl font-medium tracking-[-0.03em] tabular-nums">
            {money(Math.max(goal.saved, 0))}
            <span className="text-sm font-normal text-muted-foreground"> {t("goalOf", { amount: money(goal.target) })}</span>
          </p>
          <span className="text-xs text-muted-foreground tabular-nums">{Math.round(goal.percent)}%</span>
        </div>
        <div
          role="progressbar"
          aria-label={t("goalProgressLabel", { name: goal.name })}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(goal.percent)}
          aria-valuetext={t("goalProgressText", { saved: money(Math.max(goal.saved, 0)), target: money(goal.target) })}
          className="h-2 overflow-hidden rounded-full bg-fg/[0.06]"
        >
          <div
            className="grow-x h-full rounded-full bg-income transition-[width] duration-500"
            style={{ width: `${goal.percent > 0 ? Math.max(goal.percent, 2) : 0}%` }}
          />
        </div>
        <p className={cn("m-0 flex items-start gap-1.5 text-xs", status.tone)}>
          <StatusIcon className="mt-px size-3.5 shrink-0" aria-hidden="true" />
          <span>{status.text}</span>
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Button variant={done ? "outline" : "default"} onClick={() => onEntry(goal, "deposit")} className="h-10">
          <ArrowDownLeftIcon data-icon="inline-start" />
          {t("goalDeposit")}
        </Button>
        <Button
          variant="outline"
          onClick={() => onEntry(goal, "withdraw")}
          disabled={goal.saved <= 0}
          className="h-10"
        >
          <ArrowUpRightIcon data-icon="inline-start" />
          {t("goalWithdraw")}
        </Button>
      </div>
    </article>
  );
}

export default GoalCard;
