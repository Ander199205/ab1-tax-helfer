// Route handlers REST de cada recurso. Cada `route.ts` solo delega aquí.
// Las reglas entre colecciones van aquí como ganchos de `createCrudHandlers`, nunca en `route.ts`.
import { categoriesRepository } from "@/lib/data/categories-repository";
import { receiptsRepository } from "@/lib/data/receipts-repository";
import { taxYearsRepository } from "@/lib/data/tax-years-repository";
import { parseCategoryInput } from "@/lib/categories/parse";
import { validateCategory } from "@/lib/categories/rules";
import { parseReceiptInput } from "@/lib/receipts/parse";
import { validateReceipt } from "@/lib/receipts/rules";
import { parseTaxYearInput } from "@/lib/tax-years/parse";
import { isClosed, validateTaxYear } from "@/lib/tax-years/rules";
import type { Receipt, TaxYear } from "@/lib/types";
import { deleteFile } from "@/lib/data/file-store";
import { createCrudHandlers } from "./crud-route";

/** «1 Beleg» / «3 Belege» (nominativo) y «1 Beleg» / «3 Belegen» (dativo). */
const belegeNom = (n: number) => (n === 1 ? "1 Beleg" : `${n} Belege`);
const belegeDat = (n: number) => (n === 1 ? "1 Beleg" : `${n} Belegen`);
export const closedMessage = (year: number) =>
  `Das Steuerjahr ${year} ist abgeschlossen. Öffne es wieder, um Belege zu ändern.`;

export const findYear = async (ownerId: string, year: number) =>
  (await taxYearsRepository(ownerId).list()).find((y) => y.year === year);
const receiptsOfYear = async (ownerId: string, year: number) =>
  (await receiptsRepository(ownerId).list()).filter((r) => r.year === year);

const sameContent = (a: TaxYear, b: Omit<TaxYear, "id" | "createdAt" | "updatedAt">) =>
  a.year === b.year && a.note === b.note && JSON.stringify(a.checklist) === JSON.stringify(b.checklist);

export const taxYearsHandlers = createCrudHandlers({
  repo: taxYearsRepository,
  parse: parseTaxYearInput,
  validate: (input) => validateTaxYear(input),
  notFound: "Steuerjahr nicht gefunden.",
  // Un año cerrado solo admite cambiar su estado (reabrirlo o marcarlo como entregado).
  guard: async (input, current) =>
    current && isClosed(current) && isClosed(input) && !sameContent(current, input)
      ? `Das Steuerjahr ${current.year} ist abgeschlossen. Öffne es wieder, um etwas zu ändern.`
      : null,
  check: async (input, current, ownerId) => {
    const years = await taxYearsRepository(ownerId).list();
    if (years.some((y) => y.year === input.year && y.id !== current?.id)) {
      return { year: `Das Steuerjahr ${input.year} gibt es schon.` };
    }
    if (current && current.year !== input.year && (await receiptsOfYear(ownerId, current.year)).length > 0) {
      return { year: "Die Jahreszahl lässt sich nicht mehr ändern, weil schon Belege dazugehören." };
    }
    return {};
  },
  beforeRemove: async (year, ownerId) => {
    const count = (await receiptsOfYear(ownerId, year.year)).length;
    return count > 0
      ? `Zum Steuerjahr ${year.year} ${count === 1 ? "gehört" : "gehören"} noch ${belegeNom(count)}. Lösch oder verschieb sie zuerst.`
      : null;
  },
});

export const receiptsHandlers = createCrudHandlers({
  repo: receiptsRepository,
  parse: parseReceiptInput,
  validate: (input) => validateReceipt(input),
  notFound: "Beleg nicht gefunden.",
  guard: async (input, current: Receipt | null, ownerId) => {
    if (current && isClosed(await findYear(ownerId, current.year))) return closedMessage(current.year);
    if (isClosed(await findYear(ownerId, input.year))) return closedMessage(input.year);
    return null;
  },
  check: async (input, _current, ownerId) => {
    const categories = await categoriesRepository(ownerId).list();
    if (!categories.some((c) => c.id === input.categoryId)) return { categoryId: "Diese Kategorie gibt es nicht mehr." };
    if (!(await findYear(ownerId, input.year))) return { year: `Leg zuerst das Steuerjahr ${input.year} an.` };
    return {};
  },
  beforeRemove: async (receipt, ownerId) =>
    isClosed(await findYear(ownerId, receipt.year)) ? closedMessage(receipt.year) : null,
  afterRemove: async (receipt) => {
    for (const file of receipt.files ?? []) {
      await deleteFile(file).catch((error) => console.error("Datei ließ sich nicht löschen", file.id, error));
    }
  },
});

export const categoriesHandlers = createCrudHandlers({
  repo: categoriesRepository,
  parse: parseCategoryInput,
  validate: (input) => validateCategory(input),
  notFound: "Kategorie nicht gefunden.",
  check: async (input, current, ownerId) =>
    validateCategory(input, await categoriesRepository(ownerId).list(), current?.id),
  beforeRemove: async (category, ownerId) => {
    const count = (await receiptsRepository(ownerId).list()).filter((r) => r.categoryId === category.id).length;
    return count > 0 ? `„${category.name}“ wird noch von ${belegeDat(count)} verwendet.` : null;
  },
});
