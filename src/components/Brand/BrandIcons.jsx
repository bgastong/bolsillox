import { cn } from "@/lib/utils";

/*
Isotipo de bolsillox ("Pila"): tres monedas apiladas en capas de luz.
Usa currentColor, asi sirve sobre fondo claro u oscuro. Es un SVG
vectorial: se ve nitido a cualquier tamaño y densidad de pantalla.
*/
export function BrandMark({ className, title }) {
  return (
    <svg
      viewBox="0 0 64 64"
      fill="currentColor"
      className={cn("size-8 shrink-0", className)}
      role={title ? "img" : undefined}
      aria-hidden={title ? undefined : true}
      aria-label={title}
    >
      <rect x="10" y="40" width="44" height="13" rx="6.5" opacity=".35" />
      <rect x="14" y="26" width="40" height="13" rx="6.5" opacity=".65" />
      <rect x="10" y="12" width="44" height="13" rx="6.5" />
    </svg>
  );
}

// Isotipo dentro de su "ficha" clara (icono de la app).
export function BrandTile({ className }) {
  return (
    <span
      className={cn(
        "inline-grid size-7 shrink-0 place-items-center rounded-[8px] bg-[image:var(--tile-bg)] text-[color:var(--tile-fg)] shadow-[inset_0_-1px_0_rgba(0,0,0,0.25),0_1px_2px_rgba(0,0,0,0.25)]",
        className,
      )}
      aria-hidden="true"
    >
      <BrandMark className="size-[64%]" />
    </span>
  );
}

// Logo de Google para el boton "Continuar con Google" (colores oficiales).
export function GoogleIcon({ className }) {
  return (
    <svg viewBox="0 0 24 24" className={cn("size-5 shrink-0", className)} aria-hidden="true">
      <path
        fill="#4285F4"
        d="M23.52 12.27c0-.85-.08-1.67-.22-2.45H12v4.64h6.46a5.52 5.52 0 0 1-2.4 3.62v3h3.88c2.27-2.09 3.58-5.17 3.58-8.81Z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.96-1.07 7.94-2.92l-3.88-3c-1.07.72-2.45 1.15-4.06 1.15-3.13 0-5.78-2.11-6.72-4.95H1.27v3.1A12 12 0 0 0 12 24Z"
      />
      <path
        fill="#FBBC05"
        d="M5.28 14.28A7.2 7.2 0 0 1 4.9 12c0-.79.14-1.56.38-2.28v-3.1H1.27A12 12 0 0 0 0 12c0 1.94.46 3.77 1.27 5.38l4.01-3.1Z"
      />
      <path
        fill="#EA4335"
        d="M12 4.77c1.76 0 3.35.61 4.6 1.8l3.44-3.44A11.97 11.97 0 0 0 12 0 12 12 0 0 0 1.27 6.62l4.01 3.1C6.22 6.88 8.87 4.77 12 4.77Z"
      />
    </svg>
  );
}
