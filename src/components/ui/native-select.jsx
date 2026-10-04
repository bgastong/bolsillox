import { ChevronDownIcon } from "lucide-react"

import { cn } from "@/lib/utils"

// <select> nativo con estilo: accesible y comodo en mobile.
function NativeSelect({ className, wrapperClassName, children, ...props }) {
  return (
    <div className={cn("relative", wrapperClassName)}>
      <select
        data-slot="native-select"
        className={cn(
          "h-10 w-full min-w-0 cursor-pointer appearance-none rounded-lg border border-input bg-white/[0.03] pr-9 pl-3 text-sm text-foreground transition-colors outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-2 aria-invalid:ring-destructive/20",
          className
        )}
        {...props}>
        {children}
      </select>
      <ChevronDownIcon
        aria-hidden="true"
        className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-muted-foreground" />
    </div>
  );
}

export { NativeSelect }
