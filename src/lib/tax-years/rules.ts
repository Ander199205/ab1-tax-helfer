// Reglas de los años fiscales, compartidas por cliente y servidor.
import { YEAR_STATUSES, type TaxYear, type TaxYearInput } from "@/lib/types";

export type TaxYearErrors = Partial<Record<keyof TaxYearInput, string>>;

export const MIN_YEAR = 2000;
export const maxYear = (today = new Date()) => today.getFullYear() + 1;

export const isClosed = (year: Pick<TaxYear, "status"> | undefined) => year?.status === "abgeschlossen";

export function validateTaxYear(input: TaxYearInput, today = new Date()): TaxYearErrors {
  const errors: TaxYearErrors = {};
  if (!Number.isInteger(input.year) || input.year < MIN_YEAR || input.year > maxYear(today)) {
    errors.year = `Gib ein Jahr zwischen ${MIN_YEAR} und ${maxYear(today)} ein.`;
  }
  if (!YEAR_STATUSES.includes(input.status)) errors.status = "Unbekannter Status.";
  if (input.note.length > 1000) errors.note = "Die Notiz darf höchstens 1.000 Zeichen lang sein.";
  if (input.checklist.length > 50) errors.checklist = "Höchstens 50 Punkte pro Jahr.";
  else if (input.checklist.some((i) => !i.title.trim() || i.title.length > 120)) {
    errors.checklist = "Jeder Punkt braucht einen Text mit höchstens 120 Zeichen.";
  } else if (new Set(input.checklist.map((i) => i.id)).size !== input.checklist.length) {
    errors.checklist = "Ein Punkt ist doppelt vorhanden.";
  }
  return errors;
}

/** Puntos pendientes de la checklist. */
export const openItems = (year: Pick<TaxYear, "checklist">) => year.checklist.filter((i) => !i.done).length;
