import { PageHeader } from "@/components/layout/page-header";
import { OverviewView } from "@/components/overview/overview-view";
import { receiptsRepository } from "@/lib/data/receipts-repository";
import { taxYearsRepository } from "@/lib/data/tax-years-repository";
import { requireUser } from "@/lib/auth/current-user";
import { totals } from "@/lib/receipts/rules";

export const dynamic = "force-dynamic";

export default async function OverviewPage() {
  const { id } = await requireUser();
  const [years, receipts] = await Promise.all([taxYearsRepository(id).list(), receiptsRepository(id).list()]);
  const summaries = [...years]
    .sort((a, b) => b.year - a.year)
    .map((year) => {
      const ofYear = receipts.filter((r) => r.year === year.year);
      return { year, sum: totals(ofYear), missingFiles: ofYear.filter((r) => (r.files ?? []).length === 0).length };
    });

  return (
    <>
      <PageHeader
        title="Übersicht"
        description="Belege pro Steuerjahr sammeln, ordnen und an die Steuerberatung übergeben. Der ab1 Tax Helfer berechnet keine Steuern und ersetzt keine Steuerberatung."
      />
      <OverviewView summaries={summaries} />
    </>
  );
}
