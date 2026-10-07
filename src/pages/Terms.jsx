import { Link } from "react-router-dom";
import LegalPage from "@/components/Legal/LegalPage";
import { LEGAL_UPDATED, TERMS } from "@/lib/legalContent";
import { useLanguage } from "@/hooks/useLanguage";

function Terms() {
  const { t } = useLanguage();
  return (
    <LegalPage
      title={t("termsLink")}
      sections={TERMS}
      updated={LEGAL_UPDATED}
      otherLink={
        <Link to="/privacidad" className="underline underline-offset-4 hover:text-foreground">
          {t("privacyLink")}
        </Link>
      }
    />
  );
}

export default Terms;
