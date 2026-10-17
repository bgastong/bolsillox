import { CreditCardIcon } from "lucide-react";
import InstallmentsPanel from "@/components/Debts/InstallmentsPanel";
import { PageHeader } from "@/components/Movements/MovementBits";
import MovementTabs from "@/components/Recurring/MovementTabs";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/hooks/useLanguage";
import { useMovements } from "@/hooks/useMovements";

// Deudas: por ahora, lo que debo (compras en cuotas).
function Debts() {
  const { t } = useLanguage();
  const { openCreateInstallments } = useMovements();

  const installmentsButton = (
    <Button onClick={openCreateInstallments}>
      <CreditCardIcon data-icon="inline-start" />
      {t("newInstallments")}
    </Button>
  );

  return (
    <div className="grid grid-cols-1 gap-5">
      <PageHeader title={t("debtsTitle")} subtitle={t("debtsSubtitle")} actions={installmentsButton} />
      <MovementTabs />
      <InstallmentsPanel addButton={installmentsButton} />
    </div>
  );
}

export default Debts;
