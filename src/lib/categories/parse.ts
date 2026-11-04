import type { CategoryInput } from "@/lib/types";

export function parseCategoryInput(body: unknown): CategoryInput | null {
  if (!body || typeof body !== "object") return null;
  const b = body as Record<string, unknown>;
  return typeof b.name === "string" ? { name: b.name.trim() } : null;
}
