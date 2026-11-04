// Conexión única a SQLite con el módulo que trae Node (`node:sqlite`, decisión D1 de la fase 4).
// Sin imports con alias «@/» ni «server-only»: lo usan también tools/admin.mjs y las pruebas.
// Se carga con process.getBuiltinModule para que el empaquetador de Next no intente resolverlo.
import path from "node:path";

/** Lo que usamos de `node:sqlite` (los tipos de @types/node 20 aún no lo traen). */
export interface Statement {
  run(...params: unknown[]): { changes: number | bigint };
  get(...params: unknown[]): Record<string, unknown> | undefined;
  all(...params: unknown[]): Record<string, unknown>[];
}
export interface Database {
  exec(sql: string): void;
  prepare(sql: string): Statement;
  close(): void;
}

const SCHEMA = `
CREATE TABLE IF NOT EXISTS users (
  id            TEXT PRIMARY KEY,
  email         TEXT NOT NULL UNIQUE COLLATE NOCASE,
  name          TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  role          TEXT NOT NULL CHECK (role IN ('admin', 'client')),
  active        INTEGER NOT NULL DEFAULT 1,
  created_at    TEXT NOT NULL,
  updated_at    TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS sessions (
  id           TEXT PRIMARY KEY,           -- SHA-256 del token; el token solo vive en la cookie
  user_id      TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  remember     INTEGER NOT NULL,
  created_at   TEXT NOT NULL,
  last_seen_at TEXT NOT NULL,
  expires_at   TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS sessions_user ON sessions(user_id);
-- Documentos de cada cuenta (años, Belege, categorías) en JSON; owner_id separa las cuentas.
CREATE TABLE IF NOT EXISTS documents (
  collection TEXT NOT NULL,
  id         TEXT NOT NULL,
  owner_id   TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  data       TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (owner_id, collection, id)  -- el id solo tiene que ser único dentro de cada cuenta
);
CREATE INDEX IF NOT EXISTS documents_owner ON documents(collection, owner_id);
`;

let db: Database | null = null;
let depth = 0;

/** Bases de datos de antes de la revisión 4a: la clave de `documents` no incluía owner_id. Sin datos reales aún. */
function migrateDocumentsKey(conn: Database) {
  const cols = conn.prepare("PRAGMA table_info(documents)").all();
  const ownerInKey = cols.some((c) => c.name === "owner_id" && Number(c.pk) > 0);
  if (cols.length === 0 || ownerInKey) return;
  conn.exec("ALTER TABLE documents RENAME TO documents_old; DROP INDEX IF EXISTS documents_owner;");
  conn.exec(SCHEMA);
  conn.exec("INSERT INTO documents SELECT collection, id, owner_id, data, created_at, updated_at FROM documents_old; DROP TABLE documents_old;");
}

export const databaseFile = () => process.env.TAX_HELFER_DB ?? path.join(process.cwd(), "data", "app.db");

export function getDb(): Database {
  if (db) return db;
  const sqlite = process.getBuiltinModule("node:sqlite") as unknown as { DatabaseSync: new (file: string) => Database };
  db = new sqlite.DatabaseSync(databaseFile());
  // busy_timeout corto: DatabaseSync bloquea el proceso mientras espera (p. ej. si tools/admin.mjs escribe).
  db.exec("PRAGMA journal_mode = WAL; PRAGMA busy_timeout = 1000; PRAGMA foreign_keys = ON;");
  migrateDocumentsKey(db);
  db.exec(SCHEMA);
  return db;
}

/**
 * Ejecuta `fn` en una transacción (todo o nada). `fn` tiene que ser síncrona: con un `await` dentro, el
 * COMMIT llegaría antes de tiempo. Dentro de otra transacción usa un SAVEPOINT.
 */
export function transaction<R>(fn: (db: Database) => R extends Promise<unknown> ? never : R): R {
  const conn = getDb();
  const savepoint = `sp${depth}`;
  conn.exec(depth === 0 ? "BEGIN IMMEDIATE" : `SAVEPOINT ${savepoint}`);
  depth++;
  try {
    const result = fn(conn) as R;
    depth--;
    conn.exec(depth === 0 ? "COMMIT" : `RELEASE ${savepoint}`);
    return result;
  } catch (error) {
    depth--;
    conn.exec(depth === 0 ? "ROLLBACK" : `ROLLBACK TO ${savepoint}`);
    throw error;
  }
}
