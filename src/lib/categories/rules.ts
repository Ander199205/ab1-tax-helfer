// Reglas de las categorías, compartidas por cliente y servidor.
import type { Category, CategoryInput } from "@/lib/types";

export type CategoryErrors = Partial<Record<keyof CategoryInput, string>>;

const normalize = (name: string) => name.trim().toLocaleLowerCase("de-DE");

/** `others`: las demás categorías, para comprobar que el nombre no se repite. */
export function validateCategory(input: CategoryInput, others: Pick<Category, "id" | "name">[] = [], id?: string) {
  const errors: CategoryErrors = {};
  if (!input.name.trim()) errors.name = "Gib einen Namen ein.";
  else if (input.name.length > 60) errors.name = "Höchstens 60 Zeichen.";
  else if (others.some((c) => c.id !== id && normalize(c.name) === normalize(input.name))) {
    errors.name = `Die Kategorie „${input.name.trim()}“ gibt es schon.`;
  }
  return errors;
}
