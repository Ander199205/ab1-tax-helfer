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
  PRIMARY KEY (collection, id)
);
CREATE INDEX IF NOT EXISTS documents_owner ON documents(collection, owner_id);
`;

let db: Database | null = null;

export const databaseFile = () => process.env.TAX_HELFER_DB ?? path.join(process.cwd(), "data", "app.db");

export function getDb(): Database {
  if (db) return db;
  const sqlite = process.getBuiltinModule("node:sqlite") as unknown as { DatabaseSync: new (file: string) => Database };
  db = new sqlite.DatabaseSync(databaseFile());
  db.exec("PRAGMA journal_mode = WAL; PRAGMA busy_timeout = 5000; PRAGMA foreign_keys = ON;");
  db.exec(SCHEMA);
  return db;
}

/** Ejecuta `fn` en una transacción (todo o nada). */
export function transaction<R>(fn: (db: Database) => R): R {
  const conn = getDb();
  conn.exec("BEGIN IMMEDIATE");
  try {
    const result = fn(conn);
    conn.exec("COMMIT");
    return result;
  } catch (error) {
    conn.exec("ROLLBACK");
    throw error;
  }
}
