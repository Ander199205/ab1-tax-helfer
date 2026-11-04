import { Card, CardContent } from "@/components/ui/card";

/** Estado vacío: un texto y, si hace falta, una acción. */
export function EmptyState({ children, action }: { children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <Card className="border-dashed">
      <CardContent className="flex flex-col items-center gap-4 py-12 text-center text-sm text-muted-foreground">
        <p>{children}</p>
        {action}
      </CardContent>
    </Card>
  );
}
