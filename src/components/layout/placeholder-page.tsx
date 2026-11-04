import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "./page-header";

/** Página provisional para secciones que aún no se han construido. */
export function PlaceholderPage({ title, description }: { title: string; description: string }) {
  return (
    <>
      <PageHeader title={title} description={description} />
      <Card className="border-dashed">
        <CardContent className="py-16 text-center text-sm text-muted-foreground">
          Dieser Bereich wird gerade aufgebaut.
        </CardContent>
      </Card>
    </>
  );
}
