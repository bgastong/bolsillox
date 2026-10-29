import { SlidersHorizontalIcon } from "lucide-react";
import { CATEGORY_CHART_LABELS, CATEGORY_CHART_TOPS, CATEGORY_CHART_TYPES } from "@shared/appearance.js";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAppearance } from "@/hooks/useAppearance";
import { useLanguage } from "@/hooks/useLanguage";
import { useToast } from "@/hooks/useToast";

const TYPE_LABELS = { pie: "chartTypePie", donut: "chartTypeDonut", bars: "chartTypeBars" };
const LABEL_LABELS = { percent: "chartLabelsPercent", amount: "chartLabelsAmount", none: "chartLabelsNone" };
const TOP_LABELS = { 0: "chartCategoriesAll", 5: "chartCategoriesTop" };

/*
Configuracion del grafico de gastos por categoria: tipo (torta, dona o barras
contra el mes anterior), que dicen las etiquetas y cuantas categorias se ven.
Se guarda en la cuenta junto con los colores.
*/
function CategoryChartMenu() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const { appearance, setAppearance } = useAppearance();
  const config = appearance.categoryChart;

  async function change(field, value) {
    try {
      await setAppearance({ ...appearance, categoryChart: { ...config, [field]: value } });
    } catch {
      toast(t("errorGeneric"), { variant: "error" });
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="-my-1 size-7 text-[color:var(--text-3)]" aria-label={t("chartSettings")}>
          <SlidersHorizontalIcon className="size-3.5" aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>{t("chartType")}</DropdownMenuLabel>
        <DropdownMenuRadioGroup value={config.type} onValueChange={(value) => change("type", value)}>
          {CATEGORY_CHART_TYPES.map((type) => (
            <DropdownMenuRadioItem key={type} value={type}>
              {t(TYPE_LABELS[type])}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
        <DropdownMenuSeparator />
        <DropdownMenuLabel>{t("chartLabels")}</DropdownMenuLabel>
        <DropdownMenuRadioGroup value={config.labels} onValueChange={(value) => change("labels", value)}>
          {CATEGORY_CHART_LABELS.map((labels) => (
            <DropdownMenuRadioItem key={labels} value={labels}>
              {t(LABEL_LABELS[labels])}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
        <DropdownMenuSeparator />
        <DropdownMenuLabel>{t("chartCategories")}</DropdownMenuLabel>
        <DropdownMenuRadioGroup value={String(config.top)} onValueChange={(value) => change("top", Number(value))}>
          {CATEGORY_CHART_TOPS.map((top) => (
            <DropdownMenuRadioItem key={top} value={String(top)}>
              {t(TOP_LABELS[top])}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default CategoryChartMenu;
