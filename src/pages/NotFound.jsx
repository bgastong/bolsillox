import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/hooks/useLanguage";

function NotFound() {
  const { t } = useLanguage();

  return (
    <div className="flex flex-col items-center gap-4 py-20 text-center">
      <p className="m-0 text-6xl font-bold text-muted-foreground">404</p>
      <h1 className="m-0 text-xl font-semibold">{t("notFoundTitle")}</h1>
      <Button asChild variant="outline">
        <Link to="/">{t("backHome")}</Link>
      </Button>
    </div>
  );
}

export default NotFound;
