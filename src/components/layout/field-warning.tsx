import { TriangleAlert } from "lucide-react";

/** Aviso de validación bajo un campo de formulario. */
export function FieldWarning({ id, children }: { id?: string; children: React.ReactNode }) {
  return (
    <p id={id} role="alert" className="flex items-start gap-1.5 text-xs text-amber-300">
      <TriangleAlert className="mt-px size-3.5 shrink-0" />
      {children}
    </p>
  );
}
