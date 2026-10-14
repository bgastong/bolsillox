import { useCallback, useState } from "react";
import { BellIcon } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { api } from "@/lib/api";
import { useApiData } from "@/hooks/useApiData";
import { useLanguage } from "@/hooks/useLanguage";
import { useToast } from "@/hooks/useToast";

// Ajustes > Avisos: prender o apagar los recordatorios de cuotas por email.
function NotificationsSection({ Section }) {
  const { t } = useLanguage();
  const { toast } = useToast();
  const load = useCallback((signal) => api.getNotificationSettings({ signal }), []);
  const { data } = useApiData(load);
  const [saving, setSaving] = useState(false);
  const [enabled, setEnabled] = useState(null);
  const checked = enabled ?? data?.installmentEmails ?? true;

  async function toggle(next) {
    setEnabled(next);
    setSaving(true);
    try {
      await api.saveNotificationSettings({ installmentEmails: next });
      toast(t(next ? "installmentEmailsOn" : "installmentEmailsOff"));
    } catch {
      setEnabled(!next);
      toast(t("errorGeneric"), { variant: "error" });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Section id="settings-notifications" title={t("notificationsTitle")} description={t("notificationsDescription")}>
      <label
        htmlFor="installment-emails"
        className="flex min-h-14 cursor-pointer items-center gap-3 rounded-xl border border-input px-4 py-3"
      >
        <BellIcon className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
        <span className="grid min-w-0 flex-1 gap-0.5">
          <span className="text-[15px] font-medium sm:text-sm">{t("installmentEmailsLabel")}</span>
          <span className="text-xs text-muted-foreground">{t("installmentEmailsHint")}</span>
        </span>
        <Switch id="installment-emails" checked={checked} onCheckedChange={toggle} disabled={!data || saving} />
      </label>
    </Section>
  );
}

export default NotificationsSection;
