import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/hooks/useLanguage";

function NotFound() {
  const { t } = useLanguage();

  return (
    <div className="relative flex min-h-[60svh] flex-col items-center justify-center gap-4 py-20 text-center">
      <p className="m-0 font-display text-7xl font-bold tracking-[-0.05em] text-foreground">404</p>
      <h1 className="m-0 text-xl font-semibold">{t("notFoundTitle")}</h1>
      <Button asChild variant="outline">
        <Link to="/">{t("backHome")}</Link>
      </Button>
    </div>
  );
}

export default NotFound;
