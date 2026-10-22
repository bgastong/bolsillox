import { EXPENSE_COLOR_PLACES, PALETTES } from "@shared/appearance.js";
import { Switch } from "@/components/ui/switch";
import { useAppearance } from "@/hooks/useAppearance";
import { useLanguage } from "@/hooks/useLanguage";
import { useTheme } from "@/hooks/useTheme";
import { useToast } from "@/hooks/useToast";

// Muestras de cada paleta (ingresos, gastos) en cada tema; las mismas que index.css.
const SWATCHES = {
  clasica: { dark: ["#3ecf8e", "#f2555a"], light: ["#0a7d56", "#d0303a"] },
  suave: { dark: ["#7fd8b0", "#e3a08e"], light: ["#167a56", "#b04e36"] },
  sobria: { dark: ["#3ecf8e", "#9a9fa8"], light: ["#0a7d56", "#5f636b"] },
  contraste: { dark: ["#5aa9ff", "#ff9f43"], light: ["#1b64c9", "#b35300"] },
};

/*
Ajustes > Colores: la paleta de ingresos y gastos y donde se ve el color de los
gastos. Se aplica al instante en toda la app y se guarda en la cuenta.
Section y OptionCard son los de la pagina de Ajustes.
*/
function ColorsSection({ Section, OptionCard }) {
  const { t } = useLanguage();
  const { resolvedTheme } = useTheme();
  const { toast } = useToast();
  const { appearance, setAppearance } = useAppearance();

  async function save(next) {
    try {
      await setAppearance(next);
    } catch {
      toast(t("errorGeneric"), { variant: "error" });
    }
  }

  return (
    <Section id="settings-colors" title={t("colorsTitle")} description={t("colorsDescription")}>
      <div className="grid gap-2">
        <span className="text-sm font-medium">{t("colorsPalette")}</span>
        <div role="radiogroup" aria-label={t("colorsPalette")} className="grid gap-2 sm:grid-cols-2">
          {PALETTES.map((palette) => {
            const [income, expense] = SWATCHES[palette][resolvedTheme === "light" ? "light" : "dark"];
            return (
              <OptionCard
                key={palette}
                checked={appearance.palette === palette}
                onSelect={() => save({ ...appearance, palette })}
                title={t(`palette_${palette}`)}
                detail={t(`palette_${palette}_detail`)}
                trailing={
                  <span className="flex shrink-0 gap-1" aria-hidden="true">
                    <span className="size-3 rounded-full" style={{ background: income }} />
                    <span className="size-3 rounded-full" style={{ background: expense }} />
                  </span>
                }
              />
            );
          })}
        </div>
      </div>

      <div className="grid gap-2">
        <span id="colors-places" className="text-sm font-medium">
          {t("colorsPlaces")}
        </span>
        <div role="group" aria-labelledby="colors-places" className="grid gap-2">
          {EXPENSE_COLOR_PLACES.map((place) => (
            <label
              key={place}
              htmlFor={`expense-color-${place}`}
              className="flex min-h-14 cursor-pointer items-center gap-3 rounded-xl border border-input px-4 py-3"
            >
              <span className="grid min-w-0 flex-1 gap-0.5">
                <span className="text-[15px] font-medium sm:text-sm">{t(`colorsPlace_${place}`)}</span>
                <span className="text-xs text-muted-foreground">{t(`colorsPlace_${place}_hint`)}</span>
              </span>
              <Switch
                id={`expense-color-${place}`}
                checked={appearance.expenseColor[place]}
                onCheckedChange={(checked) =>
                  save({ ...appearance, expenseColor: { ...appearance.expenseColor, [place]: checked } })
                }
              />
            </label>
          ))}
        </div>
        <p className="m-0 text-xs text-muted-foreground">{t("colorsAlertsNote")}</p>
      </div>
    </Section>
  );
}

export default ColorsSection;
