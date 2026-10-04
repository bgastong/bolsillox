import { cn } from "@/lib/utils";

// El PNG tiene mucho margen negro: se recorta con object-fit y
// mix-blend-mode "lighten" lo funde con el fondo oscuro.
function BrandLogo({ className }) {
  return (
    <img
      src="/bolsillox-entero.png"
      alt="bolsillox"
      draggable="false"
      className={cn(
        "block h-12 w-44 object-cover object-[center_49%] mix-blend-lighten select-none",
        className,
      )}
    />
  );
}

export default BrandLogo;
