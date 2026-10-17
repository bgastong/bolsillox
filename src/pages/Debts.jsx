import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { CreditCardIcon, HandCoinsIcon } from "lucide-react";
import InstallmentsPanel from "@/components/Debts/InstallmentsPanel";
import ReceivablesPanel from "@/components/Debts/ReceivablesPanel";
import { PageHeader } from "@/components/Movements/MovementBits";
import { Segmented } from "@/components/Movements/MovementForm";
import MovementTabs from "@/components/Recurring/MovementTabs";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/hooks/useLanguage";
import { useMovements } from "@/hooks/useMovements";

const TABS = ["owe", "owed"];

/*
Deudas: lo que debo (compras en cuotas) y lo que me deben. La pestaña queda en
la URL (?tab=owed) para poder volver directo.
*/
function Debts() {
  const { t } = useLanguage();
  const { openCreateInstallments } = useMovements();
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = TABS.includes(searchParams.get("tab")) ? searchParams.get("tab") : "owe";
  // Dialogo de "Me deben" (cargar o editar una deuda).
  const [receivableTarget, setReceivableTarget] = useState(null);

  function changeTab(next) {
    setSearchParams(next === "owe" ? {} : { tab: next }, { replace: true });
  }

  const installmentsButton = (
    <Button onClick={openCreateInstallments}>
      <CreditCardIcon data-icon="inline-start" />
      {t("newInstallments")}
    </Button>
  );
  const action =
    tab === "owe" ? (
      installmentsButton
    ) : (
      <Button onClick={() => setReceivableTarget({ item: null })}>
        <HandCoinsIcon data-icon="inline-start" />
        {t("newReceivable")}
      </Button>
    );

  return (
    <div className="grid grid-cols-1 gap-5">
      <PageHeader title={t("debtsTitle")} subtitle={t("debtsSubtitle")} actions={action} />
      <MovementTabs />
      <Segmented
        label={t("debtsTitle")}
        className="sm:max-w-sm"
        value={tab}
        onChange={changeTab}
        options={[
          { value: "owe", label: t("debtsOwe"), icon: CreditCardIcon, activeClass: "text-expense" },
          { value: "owed", label: t("debtsOwed"), icon: HandCoinsIcon, activeClass: "text-income" },
        ]}
      />
      {tab === "owe" ? (
        <InstallmentsPanel addButton={installmentsButton} />
      ) : (
        <ReceivablesPanel target={receivableTarget} setTarget={setReceivableTarget} />
      )}
    </div>
  );
}

export default Debts;
