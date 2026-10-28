import { Dialog as DialogPrimitive } from "radix-ui"
import { XIcon } from "lucide-react"

import { cn } from "@/lib/utils"

function Dialog({ ...props }) {
  return <DialogPrimitive.Root data-slot="dialog" {...props} />;
}

function DialogTrigger({ ...props }) {
  return <DialogPrimitive.Trigger data-slot="dialog-trigger" {...props} />;
}

function DialogPortal({ ...props }) {
  return <DialogPrimitive.Portal data-slot="dialog-portal" {...props} />;
}

function DialogClose({ ...props }) {
  return <DialogPrimitive.Close data-slot="dialog-close" {...props} />;
}

function DialogOverlay({ className, ...props }) {
  return (
    <DialogPrimitive.Overlay
      data-slot="dialog-overlay"
      className={cn(
        "fixed inset-0 z-50 bg-black/70 duration-150 supports-backdrop-filter:backdrop-blur-sm data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0",
        className
      )}
      {...props} />
  );
}

/*
En mobile se muestra como "bottom sheet" (pegado abajo, a ancho completo,
con la zona segura del iPhone); desde sm en adelante, centrado.
*/
function DialogContent({ className, children, showCloseButton = true, closeLabel = "Close", ...props }) {
  return (
    <DialogPortal>
      <DialogOverlay />
      <DialogPrimitive.Content
        data-slot="dialog-content"
        className={cn(
          "fixed inset-x-0 bottom-0 z-50 grid max-h-[92svh] w-full gap-5 overflow-y-auto overscroll-contain rounded-t-3xl border border-b-0 bg-popover px-5 pt-3 pb-[calc(1.25rem+env(safe-area-inset-bottom))] text-popover-foreground shadow-2xl outline-none duration-200 data-open:animate-in data-open:fade-in-0 data-open:slide-in-from-bottom-10 data-closed:animate-out data-closed:fade-out-0 data-closed:slide-out-to-bottom-10",
          "sm:inset-x-auto sm:top-1/2 sm:bottom-auto sm:left-1/2 sm:max-h-[calc(100svh-2rem)] sm:w-[calc(100%-2rem)] sm:max-w-lg sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-2xl sm:border-b sm:p-6 sm:data-open:slide-in-from-bottom-0 sm:data-open:zoom-in-95 sm:data-closed:slide-out-to-bottom-0 sm:data-closed:zoom-out-95",
          className
        )}
        {...props}>
        {/* Indicador visual de hoja inferior (solo mobile) */}
        <div aria-hidden="true" className="mx-auto h-1 w-10 rounded-full bg-fg/15 sm:hidden" />
        {children}
        {showCloseButton && (
          <DialogPrimitive.Close
            data-slot="dialog-close"
            className="absolute top-3 right-3 inline-flex size-11 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none sm:top-4 sm:right-4 sm:size-9">
            <XIcon className="size-5 sm:size-4" />
            <span className="sr-only">{closeLabel}</span>
          </DialogPrimitive.Close>
        )}
      </DialogPrimitive.Content>
    </DialogPortal>
  );
}

function DialogHeader({ className, ...props }) {
  return (
    <div
      data-slot="dialog-header"
      className={cn("flex flex-col gap-1.5 pr-12 text-left", className)}
      {...props} />
  );
}

function DialogFooter({ className, ...props }) {
  return (
    <div
      data-slot="dialog-footer"
      className={cn("flex flex-col-reverse gap-2 sm:flex-row sm:justify-end", className)}
      {...props} />
  );
}

/*
Botones al pie de un formulario dentro de un dialogo. En el celular quedan
pegados abajo y llegan hasta el borde de la pantalla: cubren el margen de la
barrita de inicio (que queda como espacio dentro de la barra), asi el
formulario no se ve pasar por debajo de los botones al hacer scroll.
Igual en pantallas grandes, donde un formulario largo no entra en la ventana.
*/
function DialogActions({ className, ...props }) {
  return (
    <div
      data-slot="dialog-actions"
      className={cn(
        "sticky -bottom-[calc(1.25rem+env(safe-area-inset-bottom))] z-10 -mx-5 -mb-[calc(1.25rem+env(safe-area-inset-bottom))] flex flex-col gap-2 border-t bg-popover px-5 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]",
        // En pantallas grandes tambien quedan fijos abajo (el dialogo tiene p-6).
        "sm:-bottom-6 sm:-mx-6 sm:-mb-6 sm:flex-row sm:items-center sm:rounded-b-2xl sm:px-6 sm:pt-4 sm:pb-6",
        className
      )}
      {...props} />
  );
}

function DialogTitle({ className, ...props }) {
  return (
    <DialogPrimitive.Title
      data-slot="dialog-title"
      className={cn("text-xl font-medium tracking-[-0.02em] sm:text-lg", className)}
      {...props} />
  );
}

function DialogDescription({ className, ...props }) {
  return (
    <DialogPrimitive.Description
      data-slot="dialog-description"
      className={cn("text-sm text-muted-foreground", className)}
      {...props} />
  );
}

export {
  Dialog,
  DialogActions,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
}
