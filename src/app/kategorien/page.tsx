import { CategoriesView } from "@/components/categories/categories-view";
import { PageHeader } from "@/components/layout/page-header";
import { categoriesRepository } from "@/lib/data/categories-repository";
import { receiptsRepository } from "@/lib/data/receipts-repository";

export const metadata = { title: "Kategorien · ab1 Tax Helfer" };
export const dynamic = "force-dynamic";

export default async function CategoriesPage() {
  const [categories, receipts] = await Promise.all([categoriesRepository.list(), receiptsRepository.list()]);
  const usage: Record<string, number> = {};
  for (const r of receipts) usage[r.categoryId] = (usage[r.categoryId] ?? 0) + 1;

  return (
    <>
      <PageHeader
        title="Kategorien"
        description="Eigene Kategorien, um Belege übersichtlich zu ordnen. Die fachliche Zuordnung übernimmt deine Steuerberatung."
      />
      <CategoriesView initialCategories={categories} usage={usage} />
    </>
  );
}
