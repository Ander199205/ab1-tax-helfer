import { PageHeader } from "@/components/layout/page-header";
import { TaxYearsView } from "@/components/tax-years/tax-years-view";
import { receiptsRepository } from "@/lib/data/receipts-repository";
import { taxYearsRepository } from "@/lib/data/tax-years-repository";

export const metadata = { title: "Steuerjahre · ab1 Tax Helfer" };
export const dynamic = "force-dynamic";

export default async function TaxYearsPage() {
  const [years, receipts] = await Promise.all([taxYearsRepository.list(), receiptsRepository.list()]);
  const counts: Record<number, number> = {};
  for (const r of receipts) counts[r.year] = (counts[r.year] ?? 0) + 1;

  return (
    <>
      <PageHeader
        title="Steuerjahre"
        description="Ein Ordner pro Jahr: offen, an die Steuerberatung übergeben oder abgeschlossen."
      />
      <TaxYearsView initialYears={years} counts={counts} />
    </>
  );
}
