import { TriangleAlert } from "lucide-react";

interface FieldWarningProps {
  id?: string;
  /**
   * Anunciarlo en cuanto aparece (role="alert"). Los formularios que llevan el foco al primer campo
   * con error lo ponen a false: el campo ya lee el aviso con aria-describedby y no se pisan varios avisos.
   */
  live?: boolean;
  children: React.ReactNode;
}

/** Aviso de validación bajo un campo de formulario (ámbar oscuro: 7,1:1 sobre blanco). */
export function FieldWarning({ id, live = true, children }: FieldWarningProps) {
  return (
    <p id={id} role={live ? "alert" : undefined} className="flex items-start gap-1.5 text-xs text-amber-800">
      <TriangleAlert className="mt-px size-3.5 shrink-0" />
      {children}
    </p>
  );
}
