import { cn } from "@/lib/utils";

/**
 * Desplegable nativo con el aspecto de `Input`. Se usa en lugar del `Select` de Radix:
 * en móvil abre el selector del sistema y funciona igual con teclado y lectores de pantalla.
 */
export function NativeSelect({ className, ...props }: React.ComponentProps<"select">) {
  return (
    <select
      className={cn(
        "h-9 w-full min-w-0 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs outline-none",
        "focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50",
        "aria-invalid:border-destructive",
        className,
      )}
      {...props}
    />
  );
}
