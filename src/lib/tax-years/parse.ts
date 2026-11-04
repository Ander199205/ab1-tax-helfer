import { DEFAULT_CHECKLIST, type ChecklistItem, type TaxYearInput, type YearStatus } from "@/lib/types";

const newId = () => globalThis.crypto.randomUUID();

function parseChecklist(value: unknown): ChecklistItem[] | null {
  if (value === undefined) return DEFAULT_CHECKLIST.map((title) => ({ id: newId(), title, done: false }));
  if (!Array.isArray(value)) return null;
  const items: ChecklistItem[] = [];
  for (const raw of value) {
    if (!raw || typeof raw !== "object") return null;
    const r = raw as Record<string, unknown>;
    if (typeof r.title !== "string") return null;
    items.push({ id: typeof r.id === "string" && r.id ? r.id : newId(), title: r.title.trim(), done: r.done === true });
  }
  return items;
}

/** Convierte el cuerpo de la petición en un `TaxYearInput`, o null si no encaja. Sin checklist → la inicial. */
export function parseTaxYearInput(body: unknown): TaxYearInput | null {
  if (!body || typeof body !== "object") return null;
  const b = body as Record<string, unknown>;
  if (typeof b.year !== "number") return null;
  const checklist = parseChecklist(b.checklist);
  if (!checklist) return null;
  return {
    year: b.year,
    status: (typeof b.status === "string" ? b.status : "offen") as YearStatus,
    note: typeof b.note === "string" ? b.note : "",
    checklist,
  };
}
