import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/layout/page-header";
import { NAV_ITEMS } from "@/lib/navigation";

export default function HomePage() {
  return (
    <>
      <PageHeader
        title="Übersicht"
        description="Belege pro Steuerjahr sammeln, ordnen und an die Steuerberatung übergeben. Der ab1 Tax Helfer berechnet keine Steuern und ersetzt keine Steuerberatung."
      />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {NAV_ITEMS.filter((item) => item.href !== "/").map(({ href, label, icon: Icon, description }) => (
          <Link key={href} href={href} className="group">
            <Card className="h-full transition-colors group-hover:border-foreground/20">
              <CardHeader>
                <Icon className="mb-2 size-5 text-muted-foreground" />
                <CardTitle>{label}</CardTitle>
                <CardDescription>{description}</CardDescription>
              </CardHeader>
              <CardContent />
            </Card>
          </Link>
        ))}
      </div>
    </>
  );
}
