import { PageHeader } from "@/components/layout/page-header";
import { ReceiptsView } from "@/components/receipts/receipts-view";
import { categoriesRepository } from "@/lib/data/categories-repository";
import { receiptsRepository } from "@/lib/data/receipts-repository";
import { taxYearsRepository } from "@/lib/data/tax-years-repository";

export const metadata = { title: "Belege · ab1 Tax Helfer" };
export const dynamic = "force-dynamic";

type Props = { searchParams: Promise<{ jahr?: string }> };

export default async function ReceiptsPage({ searchParams }: Props) {
  const [{ jahr }, receipts, years, categories] = await Promise.all([
    searchParams,
    receiptsRepository.list(),
    taxYearsRepository.list(),
    categoriesRepository.list(),
  ]);
  const initialYear = jahr && years.some((y) => String(y.year) === jahr) ? jahr : "alle";

  return (
    <>
      <PageHeader title="Belege" description="Rechnungen, Quittungen und Nachweise mit Datum, Betrag und Kategorie." />
      <ReceiptsView initialReceipts={receipts} years={years} categories={categories} initialYear={initialYear} />
    </>
  );
}
