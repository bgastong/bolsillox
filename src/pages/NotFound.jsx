import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/hooks/useLanguage";

function NotFound() {
  const { t } = useLanguage();

  return (
    <div className="relative flex min-h-[60svh] flex-col items-center justify-center gap-4 overflow-hidden rounded-3xl py-20 text-center">
      {/* Arco de luz decorativo */}
      <span className="horizon top-[74%]" aria-hidden="true" />
      <p className="relative m-0 font-display text-7xl font-bold tracking-[-0.05em] text-foreground">404</p>
      <h1 className="relative m-0 text-xl font-semibold">{t("notFoundTitle")}</h1>
      <Button asChild variant="outline" className="relative">
        <Link to="/">{t("backHome")}</Link>
      </Button>
    </div>
  );
}

export default NotFound;
