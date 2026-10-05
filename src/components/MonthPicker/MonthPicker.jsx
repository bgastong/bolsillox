import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { currentMonthKey, formatMonth, shiftMonth } from "@/lib/format";
import { useLanguage } from "@/hooks/useLanguage";

function capitalize(text) {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

// Selector de mes: anterior / siguiente (no deja pasar del mes actual).
function MonthPicker({ month, onChange }) {
  const { t, locale } = useLanguage();
  const isCurrent = month >= currentMonthKey();

  return (
    <div className="flex h-11 w-full items-center justify-between rounded-xl border border-input bg-white/[0.03] sm:h-10 sm:w-auto sm:rounded-lg sm:[&>button]:size-9">
      <Button
        variant="ghost"
        size="icon"
        className="rounded-l-xl sm:rounded-l-lg"
        onClick={() => onChange(shiftMonth(month, -1))}
        aria-label={t("previousMonth")}
      >
        <ChevronLeftIcon />
      </Button>
      <span
        className="min-w-32 px-2 text-center text-sm font-medium"
        aria-live="polite"
        aria-atomic="true"
      >
        {capitalize(formatMonth(month, locale))}
      </span>
      <Button
        variant="ghost"
        size="icon"
        className="rounded-r-xl sm:rounded-r-lg"
        onClick={() => onChange(shiftMonth(month, 1))}
        disabled={isCurrent}
        aria-label={t("nextMonth")}
      >
        <ChevronRightIcon />
      </Button>
    </div>
  );
}

export default MonthPicker;
