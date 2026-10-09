import { CheckIcon, ChevronDownIcon } from "lucide-react";
import { Select as SelectPrimitive } from "radix-ui";

import { cn } from "@/lib/utils";

// Radix no acepta "" como valor de una opcion: se usa este en su lugar
// (por ejemplo, "Todos" en los filtros) y afuera se sigue viendo "".
const EMPTY = "__empty__";
const toInner = (value) => (value === "" || value == null ? EMPTY : value);
const toOuter = (value) => (value === EMPTY ? "" : value);

function OptionContent({ option }) {
  const Icon = option.icon;
  return (
    <span className="flex min-w-0 items-center gap-2.5">
      {Icon && (
        <Icon
          aria-hidden="true"
          className="size-4 shrink-0 text-muted-foreground"
          style={option.iconColor ? { color: option.iconColor } : undefined}
        />
      )}
      <span className="truncate">{option.label}</span>
    </span>
  );
}

function SelectItem({ option }) {
  return (
    <SelectPrimitive.Item
      value={toInner(option.value)}
      disabled={option.disabled}
      className="relative flex min-h-11 cursor-pointer items-center rounded-lg py-2 pr-9 pl-2.5 text-[15px] outline-none select-none data-disabled:pointer-events-none data-disabled:opacity-50 data-highlighted:bg-fg/[0.07] data-[state=checked]:font-medium sm:min-h-9 sm:text-sm"
    >
      <SelectPrimitive.ItemText>
        <OptionContent option={option} />
      </SelectPrimitive.ItemText>
      <SelectPrimitive.ItemIndicator className="absolute right-2.5 flex items-center">
        <CheckIcon className="size-4 text-foreground" aria-hidden="true" />
      </SelectPrimitive.ItemIndicator>
    </SelectPrimitive.Item>
  );
}

/*
Desplegable con el estilo de la app (reemplaza al <select> nativo, que en
el tema oscuro se ve distinto en cada navegador). Accesible con teclado y
lector de pantalla (Radix Select).
- options: [{ value, label, icon?, iconColor?, disabled? }]
- groups: [{ label, options }] para opciones agrupadas (van despues de options).
- value "" = sin elegir (se muestra el placeholder) o una opcion con value "".
*/
function Select({
  id,
  value,
  onValueChange,
  options,
  groups,
  placeholder,
  disabled,
  className,
  "aria-invalid": ariaInvalid,
  "aria-describedby": ariaDescribedBy,
  "aria-label": ariaLabel,
}) {
  const allOptions = [...(options ?? []), ...(groups ?? []).flatMap((group) => group.options)];
  // Sin una opcion "" se muestra el placeholder (Radix lo hace con value undefined).
  const hasEmptyOption = allOptions.some((option) => option.value === "");
  const innerValue = value === "" && !hasEmptyOption ? undefined : toInner(value);

  return (
    <SelectPrimitive.Root
      value={innerValue}
      onValueChange={(next) => onValueChange(toOuter(next))}
      disabled={disabled}
    >
      <SelectPrimitive.Trigger
        id={id}
        aria-invalid={ariaInvalid}
        aria-describedby={ariaDescribedBy}
        aria-label={ariaLabel}
        className={cn(
          "flex h-11 w-full min-w-0 cursor-pointer items-center justify-between gap-2 rounded-lg border border-input bg-fg/[0.03] px-3 text-left text-base text-foreground transition-colors outline-none hover:border-fg/20 focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-2 aria-invalid:ring-destructive/20 data-placeholder:text-muted-foreground data-[state=open]:border-ring sm:h-10 sm:text-sm",
          className,
        )}
      >
        <span className="min-w-0 flex-1 truncate">
          <SelectPrimitive.Value placeholder={placeholder} />
        </span>
        <SelectPrimitive.Icon asChild>
          <ChevronDownIcon
            aria-hidden="true"
            className="size-4 shrink-0 text-muted-foreground transition-transform duration-150 in-data-[state=open]:rotate-180"
          />
        </SelectPrimitive.Icon>
      </SelectPrimitive.Trigger>

      <SelectPrimitive.Portal>
        <SelectPrimitive.Content
          position="popper"
          sideOffset={6}
          className="z-50 max-h-(--radix-select-content-available-height) w-(--radix-select-trigger-width) min-w-44 origin-(--radix-select-content-transform-origin) overflow-hidden rounded-xl border border-fg/10 bg-popover text-popover-foreground shadow-2xl data-[side=bottom]:slide-in-from-top-1 data-[side=top]:slide-in-from-bottom-1 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95"
        >
          <SelectPrimitive.Viewport className="max-h-80 p-1.5">
            {(options ?? []).map((option) => (
              <SelectItem key={option.value} option={option} />
            ))}
            {(groups ?? []).map((group, index) => (
              <SelectPrimitive.Group key={group.label}>
                {(index > 0 || options?.length > 0) && (
                  <SelectPrimitive.Separator className="mx-1 my-1.5 h-px bg-border" />
                )}
                <SelectPrimitive.Label className="px-2.5 pt-1.5 pb-1 text-xs font-medium text-muted-foreground">
                  {group.label}
                </SelectPrimitive.Label>
                {group.options.map((option) => (
                  <SelectItem key={option.value} option={option} />
                ))}
              </SelectPrimitive.Group>
            ))}
          </SelectPrimitive.Viewport>
        </SelectPrimitive.Content>
      </SelectPrimitive.Portal>
    </SelectPrimitive.Root>
  );
}

export { Select };
