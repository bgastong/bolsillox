import { cn } from "@/lib/utils";
import { BrandTile } from "./BrandIcons";

// Logo completo: la ficha con la pila de monedas + "bolsillo" y la "x" en gris.
function Wordmark({ className }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2.5 text-[1.05rem] leading-none font-semibold tracking-[-0.035em] text-foreground select-none",
        className,
      )}
      aria-label="bolsillox"
      role="img"
    >
      <BrandTile />
      <span aria-hidden="true">
        bolsillo<span className="text-[color:var(--text-4)]">x</span>
      </span>
    </span>
  );
}

export default Wordmark;
