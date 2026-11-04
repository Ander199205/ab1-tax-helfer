// Reglas de los justificantes, compartidas por cliente y servidor.
import { isValidDay } from "@/lib/dates";
import { MAX_AMOUNT_CENTS } from "@/lib/money";
import { MIN_YEAR, maxYear } from "@/lib/tax-years/rules";
import { RECEIPT_KINDS, type Receipt, type ReceiptInput } from "@/lib/types";

export type ReceiptErrors = Partial<Record<keyof ReceiptInput, string>>;

export function validateReceipt(input: ReceiptInput, today = new Date()): ReceiptErrors {
  const errors: ReceiptErrors = {};
  if (!isValidDay(input.date)) errors.date = "Gib ein gültiges Datum ein.";
  if (!Number.isInteger(input.amountCents) || input.amountCents <= 0) {
    errors.amountCents = "Gib einen Betrag größer als 0 ein, z. B. 1.234,56.";
  } else if (input.amountCents > MAX_AMOUNT_CENTS) {
    errors.amountCents = "Der Betrag darf höchstens 9.999.999,99 € sein.";
  }
  if (!RECEIPT_KINDS.includes(input.kind)) errors.kind = "Wähle Ausgabe oder Einnahme.";
  if (!input.party.trim()) errors.party = "Gib an, von wem der Beleg ist oder an wen er geht.";
  else if (input.party.length > 120) errors.party = "Höchstens 120 Zeichen.";
  if (input.description.length > 200) errors.description = "Höchstens 200 Zeichen.";
  if (!input.categoryId) errors.categoryId = "Wähle eine Kategorie.";
  if (!Number.isInteger(input.year) || input.year < MIN_YEAR || input.year > maxYear(today)) {
    errors.year = "Wähle ein Steuerjahr.";
  }
  if (input.note.length > 1000) errors.note = "Die Notiz darf höchstens 1.000 Zeichen lang sein.";
  return errors;
}

/** Año de una fecha «YYYY-MM-DD» (o null si la fecha no es válida). */
export const yearOf = (date: string) => (isValidDay(date) ? Number(date.slice(0, 4)) : null);

export interface ReceiptTotals {
  count: number;
  expenses: number;
  income: number;
}

/** Sumas por tipo (no es ningún cálculo fiscal). */
export function totals(receipts: Pick<Receipt, "kind" | "amountCents">[]): ReceiptTotals {
  return receipts.reduce(
    (t, r) => ({
      count: t.count + 1,
      expenses: t.expenses + (r.kind === "ausgabe" ? r.amountCents : 0),
      income: t.income + (r.kind === "einnahme" ? r.amountCents : 0),
    }),
    { count: 0, expenses: 0, income: 0 },
  );
}
