import { cn } from "@/lib/utils";
import { BrandMark } from "./BrandIcons";

// Logo completo: isotipo + "bolsillo" con la "x" en el color de marca.
function Wordmark({ className, markClassName }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5 select-none", className)}>
      <BrandMark className={markClassName} />
      <span className="inline-flex items-baseline font-display text-[1.45rem] leading-none font-extrabold tracking-[-0.045em] text-foreground">
        bolsillo
        <span className="text-primary">x</span>
      </span>
    </span>
  );
}

export default Wordmark;
