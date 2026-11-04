"use client";

import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/layout/page-header";

/** Error al cargar una sección: mensaje en alemán, sin detalles internos. */
export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <>
      <PageHeader
        title="Das hat nicht geklappt"
        description="Die Daten ließen sich gerade nicht laden. Versuch es bitte noch einmal."
      />
      <Button onClick={reset}>Erneut versuchen</Button>
    </>
  );
}
