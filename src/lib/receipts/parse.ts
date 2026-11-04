import type { ReceiptInput, ReceiptKind } from "@/lib/types";

const text = (value: unknown) => (typeof value === "string" ? value.trim() : "");

/** Convierte el cuerpo de la petición en un `ReceiptInput`, o null si no encaja. */
export function parseReceiptInput(body: unknown): ReceiptInput | null {
  if (!body || typeof body !== "object") return null;
  const b = body as Record<string, unknown>;
  if (typeof b.date !== "string" || typeof b.amountCents !== "number" || typeof b.year !== "number") return null;
  return {
    date: b.date,
    amountCents: b.amountCents,
    kind: (typeof b.kind === "string" ? b.kind : "") as ReceiptKind,
    party: text(b.party),
    description: text(b.description),
    categoryId: text(b.categoryId),
    year: b.year,
    note: typeof b.note === "string" ? b.note : "",
  };
}
