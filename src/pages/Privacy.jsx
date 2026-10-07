import { Link } from "react-router-dom";
import LegalPage from "@/components/Legal/LegalPage";
import { LEGAL_UPDATED, PRIVACY } from "@/lib/legalContent";
import { useLanguage } from "@/hooks/useLanguage";

function Privacy() {
  const { t } = useLanguage();
  return (
    <LegalPage
      title={t("privacyLink")}
      sections={PRIVACY}
      updated={LEGAL_UPDATED}
      otherLink={
        <Link to="/terminos" className="underline underline-offset-4 hover:text-foreground">
          {t("termsLink")}
        </Link>
      }
    />
  );
}

export default Privacy;
