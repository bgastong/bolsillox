import { useState } from "react";
import { ChevronDownIcon, ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import MonthWheel from "./MonthWheel";
import { currentMonthKey, formatMonth, shiftMonth } from "@/lib/format";
import { useLanguage } from "@/hooks/useLanguage";

function capitalize(text) {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

// Selector de mes: anterior / siguiente y, tocando el mes, una ruleta
// para saltar a cualquier mes (no deja pasar del mes actual).
function MonthPicker({ month, onChange }) {
  const { t, locale } = useLanguage();
  const [open, setOpen] = useState(false);
  const isCurrent = month >= currentMonthKey();

  return (
    <div className="flex h-12 w-full items-center justify-between rounded-xl border border-input bg-fg/[0.03] sm:h-10 sm:w-auto sm:rounded-lg">
      <Button
        variant="ghost"
        size="icon"
        className="rounded-l-xl sm:size-9 sm:rounded-l-lg"
        onClick={() => onChange(shiftMonth(month, -1))}
        aria-label={t("previousMonth")}
      >
        <ChevronLeftIcon />
      </Button>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className="inline-flex h-full min-w-36 touch-manipulation items-center justify-center gap-1.5 rounded-lg px-2 text-sm font-medium outline-none hover:bg-fg/[0.04] focus-visible:ring-2 focus-visible:ring-ring"
            aria-label={`${t("chooseMonth")}: ${formatMonth(month, locale)}`}
          >
            <span aria-live="polite" aria-atomic="true">
              {capitalize(formatMonth(month, locale))}
            </span>
            <ChevronDownIcon className="size-3.5 text-muted-foreground" aria-hidden="true" />
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-[min(18rem,calc(100vw-2rem))]" aria-label={t("chooseMonth")}>
          <MonthWheel
            value={month}
            onSelect={(next) => {
              onChange(next);
              setOpen(false);
            }}
          />
        </PopoverContent>
      </Popover>
      <Button
        variant="ghost"
        size="icon"
        className="rounded-r-xl sm:size-9 sm:rounded-r-lg"
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
