// Contrato de acceso a datos y su implementación sobre archivos JSON.
// Para pasar a una base de datos o a una API basta con escribir otra implementación de
// `Repository` y cambiar la constante exportada en cada `*-repository.ts`.
import "server-only";
import { randomUUID } from "crypto";
import { readCollection, updateCollection, type Migrate } from "./json-store";

export interface BaseEntity {
  id: string;
  createdAt: string;
  updatedAt: string;
}

export interface Repository<T extends BaseEntity, I> {
  list(): Promise<T[]>;
  get(id: string): Promise<T | null>;
  create(input: I): Promise<T>;
  /** Crea varias entidades de una vez (p. ej. importación de CSV). */
  createMany(inputs: I[]): Promise<T[]>;
  update(id: string, patch: Partial<I>): Promise<T | null>;
  remove(id: string): Promise<boolean>;
}

interface JsonRepositoryOptions<T> {
  /** Datos heredados de una versión anterior (se usan una sola vez). */
  migrate?: Migrate<T>;
  /** Ajusta una entidad recién creada (p. ej. campos derivados). */
  onCreate?: (item: T) => T;
  /** Ajusta una entidad tras aplicar un cambio. */
  onUpdate?: (current: T, next: T) => T;
}

export function createJsonRepository<T extends BaseEntity, I extends object>(
  collection: string,
  options: JsonRepositoryOptions<T> = {},
): Repository<T, I> {
  const { migrate, onCreate = (item: T) => item, onUpdate = (_: T, next: T) => next } = options;

  const build = (input: I, now: string) =>
    onCreate({ ...input, id: randomUUID(), createdAt: now, updatedAt: now } as unknown as T);

  return {
    list: () => readCollection<T>(collection, migrate),

    async get(id) {
      const items = await readCollection<T>(collection, migrate);
      return items.find((item) => item.id === id) ?? null;
    },

    create(input) {
      return updateCollection<T, T>(
        collection,
        (items) => {
          const item = build(input, new Date().toISOString());
          return { items: [...items, item], result: item };
        },
        migrate,
      );
    },

    createMany(inputs) {
      return updateCollection<T, T[]>(
        collection,
        (items) => {
          const now = new Date().toISOString();
          const created = inputs.map((input) => build(input, now));
          return { items: [...items, ...created], result: created };
        },
        migrate,
      );
    },

    update(id, patch) {
      return updateCollection<T, T | null>(
        collection,
        (items) => {
          const index = items.findIndex((item) => item.id === id);
          if (index === -1) return { items, result: null };
          const current = items[index];
          const merged = {
            ...current,
            ...patch,
            id,
            updatedAt: new Date().toISOString(),
          } as unknown as T;
          const updated = onUpdate(current, merged);
          const next = [...items];
          next[index] = updated;
          return { items: next, result: updated };
        },
        migrate,
      );
    },

    remove(id) {
      return updateCollection<T, boolean>(
        collection,
        (items) => {
          const next = items.filter((item) => item.id !== id);
          return { items: next, result: next.length !== items.length };
        },
        migrate,
      );
    },
  };
}
