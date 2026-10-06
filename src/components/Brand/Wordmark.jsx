import { cn } from "@/lib/utils";
import { BrandMark } from "./BrandIcons";

// Logo completo: "bolsillo" y la "x" como sticker (el isotipo).
function Wordmark({ className }) {
  return (
    <span
      className={cn(
        "inline-flex items-center font-display text-[1.45rem] leading-none font-extrabold tracking-[-0.045em] text-foreground select-none",
        className,
      )}
      aria-label="bolsillox"
      role="img"
    >
      <span aria-hidden="true">bolsillo</span>
      <BrandMark className="ml-0.5 size-[1.3em]" />
    </span>
  );
}

export default Wordmark;
