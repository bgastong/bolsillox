import { CircleAlertIcon, InboxIcon, RotateCwIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/hooks/useLanguage";

export function ErrorState({ error, onRetry, className }) {
  const { t } = useLanguage();
  const isNetwork = error?.code === "network_error" || error?.status >= 500;

  return (
    <div
      role="alert"
      className={cn(
        "flex flex-col items-center gap-3 rounded-2xl border border-destructive/30 bg-destructive/5 px-6 py-10 text-center",
        className,
      )}
    >
      <CircleAlertIcon className="size-8 text-destructive" />
      <div className="grid gap-1">
        <p className="font-medium">{t("errorLoading")}</p>
        {isNetwork && <p className="text-sm text-muted-foreground">{t("errorServer")}</p>}
      </div>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry}>
          <RotateCwIcon data-icon="inline-start" />
          {t("retry")}
        </Button>
      )}
    </div>
  );
}

export function EmptyState({ message, children, className }) {
  return (
    <div
      className={cn(
        "flex flex-col items-center gap-3 rounded-2xl border border-dashed px-6 py-10 text-center text-muted-foreground",
        className,
      )}
    >
      <InboxIcon className="size-8" />
      <p className="text-sm">{message}</p>
      {children}
    </div>
  );
}
