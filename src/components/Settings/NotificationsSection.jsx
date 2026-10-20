import { useCallback, useState } from "react";
import { BellIcon, HandCoinsIcon } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { api } from "@/lib/api";
import { useApiData } from "@/hooks/useApiData";
import { useLanguage } from "@/hooks/useLanguage";
import { useToast } from "@/hooks/useToast";

// Cada tipo de recordatorio por email que se puede prender o apagar.
const OPTIONS = [
  { key: "installmentEmails", id: "installment-emails", icon: BellIcon, label: "installmentEmailsLabel", hint: "installmentEmailsHint" },
  { key: "receivableEmails", id: "receivable-emails", icon: HandCoinsIcon, label: "receivableEmailsLabel", hint: "receivableEmailsHint" },
];

// Ajustes > Avisos: prender o apagar los recordatorios de cuotas y de cobros por email.
function NotificationsSection({ Section }) {
  const { t } = useLanguage();
  const { toast } = useToast();
  const load = useCallback((signal) => api.getNotificationSettings({ signal }), []);
  const { data } = useApiData(load);
  const [saving, setSaving] = useState(null);
  // Lo elegido en esta pantalla (hasta que se recargue lo guardado).
  const [changed, setChanged] = useState({});
  const isOn = (key) => changed[key] ?? data?.[key] ?? true;

  async function toggle(key, next) {
    setChanged((prev) => ({ ...prev, [key]: next }));
    setSaving(key);
    try {
      await api.saveNotificationSettings({ [key]: next });
      toast(t(next ? "installmentEmailsOn" : "installmentEmailsOff"));
    } catch {
      setChanged((prev) => ({ ...prev, [key]: !next }));
      toast(t("errorGeneric"), { variant: "error" });
    } finally {
      setSaving(null);
    }
  }

  return (
    <Section id="settings-notifications" title={t("notificationsTitle")} description={t("notificationsDescription")}>
      <div className="grid gap-2">
        {OPTIONS.map(({ key, id, icon: Icon, label, hint }) => (
          <label
            key={key}
            htmlFor={id}
            className="flex min-h-14 cursor-pointer items-center gap-3 rounded-xl border border-input px-4 py-3"
          >
            <Icon className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
            <span className="grid min-w-0 flex-1 gap-0.5">
              <span className="text-[15px] font-medium sm:text-sm">{t(label)}</span>
              <span className="text-xs text-muted-foreground">{t(hint)}</span>
            </span>
            <Switch
              id={id}
              checked={isOn(key)}
              onCheckedChange={(next) => toggle(key, next)}
              disabled={!data || saving === key}
            />
          </label>
        ))}
      </div>
    </Section>
  );
}

export default NotificationsSection;
