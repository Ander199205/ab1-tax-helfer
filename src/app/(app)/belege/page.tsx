import { PageHeader } from "@/components/layout/page-header";
import { ReceiptsView } from "@/components/receipts/receipts-view";
import { categoriesRepository } from "@/lib/data/categories-repository";
import { receiptsRepository } from "@/lib/data/receipts-repository";
import { taxYearsRepository } from "@/lib/data/tax-years-repository";
import { requireUser } from "@/lib/auth/current-user";

export const metadata = { title: "Belege · ab1 Tax Helfer" };
export const dynamic = "force-dynamic";

type Props = { searchParams: Promise<{ jahr?: string; datei?: string }> };

export default async function ReceiptsPage({ searchParams }: Props) {
  const { id } = await requireUser();
  const [{ jahr, datei }, receipts, years, categories] = await Promise.all([
    searchParams,
    receiptsRepository(id).list(),
    taxYearsRepository(id).list(),
    categoriesRepository(id).list(),
  ]);
  const initialYear = jahr && years.some((y) => String(y.year) === jahr) ? jahr : "alle";

  return (
    <>
      <PageHeader title="Belege" description="Rechnungen, Quittungen und Nachweise mit Datum, Betrag und Kategorie." />
      <ReceiptsView
        initialReceipts={receipts}
        years={years}
        categories={categories}
        initialYear={initialYear}
        initialFileFilter={datei === "ohne" || datei === "mit" ? datei : "alle"}
      />
    </>
  );
}
