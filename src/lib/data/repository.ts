// Contrato de acceso a datos y su implementación sobre SQLite (fase 4; antes, archivos JSON).
// Cada repositorio está ligado a una cuenta: `forOwner(id)` solo ve y cambia los documentos de esa cuenta,
// así el aislamiento entre clientes no depende de que cada ruta se acuerde de filtrar.
// Sin alias «@/»: lo usan también tools/admin.mjs y las pruebas.
import { randomUUID } from "node:crypto";
import { getDb } from "../db/database.ts";

export interface BaseEntity {
  id: string;
  createdAt: string;
  updatedAt: string;
}

export interface Repository<T extends BaseEntity, I> {
  list(): Promise<T[]>;
  get(id: string): Promise<T | null>;
  create(input: I): Promise<T>;
  update(id: string, patch: Partial<I>): Promise<T | null>;
  remove(id: string): Promise<boolean>;
}

interface RepositoryOptions<T> {
  /** Ajusta una entidad recién creada (p. ej. campos derivados). */
  onCreate?: (item: T) => T;
}

export type OwnedRepository<T extends BaseEntity, I> = (ownerId: string) => Repository<T, I>;

export function createSqlRepository<T extends BaseEntity, I extends object>(
  collection: string,
  options: RepositoryOptions<T> = {},
): OwnedRepository<T, I> {
  const { onCreate = (item: T) => item } = options;
  const parse = (row: Record<string, unknown> | undefined) => (row ? (JSON.parse(String(row.data)) as T) : null);

  return (ownerId: string) => {
    if (!ownerId) throw new Error("Repositorio sin cuenta");
    const db = getDb();
    const one = (id: string) =>
      parse(db.prepare("SELECT data FROM documents WHERE collection = ? AND owner_id = ? AND id = ?").get(collection, ownerId, id));

    return {
      async list() {
        return db
          .prepare("SELECT data FROM documents WHERE collection = ? AND owner_id = ? ORDER BY created_at, id")
          .all(collection, ownerId)
          .map((row) => parse(row)!);
      },
      async get(id) {
        return one(id);
      },
      async create(input) {
        const ts = new Date().toISOString();
        const item = onCreate({ ...input, id: randomUUID(), createdAt: ts, updatedAt: ts } as unknown as T);
        db.prepare("INSERT INTO documents (collection, id, owner_id, data, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)").run(
          collection,
          item.id,
          ownerId,
          JSON.stringify(item),
          item.createdAt,
          item.updatedAt,
        );
        return item;
      },
      async update(id, patch) {
        const current = one(id);
        if (!current) return null;
        const updated = { ...current, ...patch, id, updatedAt: new Date().toISOString() } as T;
        db.prepare("UPDATE documents SET data = ?, updated_at = ? WHERE collection = ? AND owner_id = ? AND id = ?").run(
          JSON.stringify(updated),
          updated.updatedAt,
          collection,
          ownerId,
          id,
        );
        return updated;
      },
      async remove(id) {
        const result = db.prepare("DELETE FROM documents WHERE collection = ? AND owner_id = ? AND id = ?").run(collection, ownerId, id);
        return Number(result.changes) > 0;
      },
    };
  };
}

/** Inserta documentos tal cual (datos de ejemplo). Solo para tools/admin.mjs. */
export function insertDocuments(collection: string, ownerId: string, items: BaseEntity[]): void {
  const stmt = getDb().prepare(
    "INSERT INTO documents (collection, id, owner_id, data, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)",
  );
  for (const item of items) stmt.run(collection, item.id, ownerId, JSON.stringify(item), item.createdAt, item.updatedAt);
}
