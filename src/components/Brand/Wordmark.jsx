import { cn } from "@/lib/utils";

// Logo tipografico: "bolsillo" + "x" en el color de marca.
function Wordmark({ className }) {
  return (
    <span
      className={cn(
        "inline-flex items-baseline font-display text-[1.6rem] leading-none font-extrabold tracking-[-0.045em] text-foreground select-none",
        className,
      )}
    >
      bolsillo
      <span className="text-primary">x</span>
    </span>
  );
}

export default Wordmark;
