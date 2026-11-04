// Cuentas y sesiones en SQLite. Sin alias ni «server-only»: lo usan también tools/admin.mjs y las pruebas.
import { createHash, randomBytes, randomUUID } from "node:crypto";
import { getDb, transaction } from "../db/database.ts";
import { hashPassword, verifyPassword } from "./password.ts";

export type Role = "admin" | "client";
export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
  active: boolean;
  createdAt: string;
}

const now = () => new Date().toISOString();
const toUser = (row: Record<string, unknown>): User => ({
  id: String(row.id),
  email: String(row.email),
  name: String(row.name),
  role: row.role as Role,
  active: row.active === 1,
  createdAt: String(row.created_at),
});

export function listUsers(): User[] {
  return getDb().prepare("SELECT * FROM users ORDER BY created_at").all().map(toUser);
}

export function findUser(id: string): User | null {
  const row = getDb().prepare("SELECT * FROM users WHERE id = ?").get(id);
  return row ? toUser(row) : null;
}

export function createUser(input: { email: string; name: string; password: string; role: Role; id?: string }): User {
  const ts = now();
  const id = input.id ?? randomUUID();
  getDb()
    .prepare("INSERT INTO users (id, email, name, password_hash, role, active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, 1, ?, ?)")
    .run(id, input.email.trim().toLowerCase(), input.name.trim(), hashPassword(input.password), input.role, ts, ts);
  return findUser(id)!;
}

export const emailTaken = (email: string) =>
  Boolean(getDb().prepare("SELECT 1 FROM users WHERE email = ?").get(email.trim().toLowerCase()));

/** Comprueba correo y contraseña. Devuelve la cuenta (aunque esté desactivada) o null. */
export function checkCredentials(email: string, password: string): User | null {
  const row = getDb().prepare("SELECT * FROM users WHERE email = ?").get(email.trim().toLowerCase());
  // Sin cuenta también se calcula un hash, para no delatar por el tiempo de respuesta qué correos existen.
  if (!row) {
    verifyPassword(password, DUMMY_HASH);
    return null;
  }
  return verifyPassword(password, String(row.password_hash)) ? toUser(row) : null;
}
const DUMMY_HASH = hashPassword("dummy-password-for-timing");

export function setPassword(userId: string, password: string): void {
  transaction((db) => {
    db.prepare("UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?").run(hashPassword(password), now(), userId);
    db.prepare("DELETE FROM sessions WHERE user_id = ?").run(userId);
  });
}

export function setActive(userId: string, active: boolean): void {
  transaction((db) => {
    db.prepare("UPDATE users SET active = ?, updated_at = ? WHERE id = ?").run(active ? 1 : 0, now(), userId);
    if (!active) db.prepare("DELETE FROM sessions WHERE user_id = ?").run(userId);
  });
}

// ── Sesiones (decisión D8: 8 h sin actividad; con «angemeldet bleiben», 30 días) ──
export const IDLE_MS = 8 * 60 * 60 * 1000;
export const REMEMBER_MS = 30 * 24 * 60 * 60 * 1000;
const TOUCH_EVERY_MS = 5 * 60 * 1000;

const digest = (token: string) => createHash("sha256").update(token).digest("hex");

/** Crea una sesión y devuelve el token para la cookie (en la base de datos solo queda su hash). */
export function createSession(userId: string, remember: boolean): { token: string; expiresAt: Date } {
  const token = randomBytes(32).toString("base64url");
  const created = new Date();
  const expiresAt = new Date(created.getTime() + (remember ? REMEMBER_MS : IDLE_MS));
  getDb()
    .prepare("INSERT INTO sessions (id, user_id, remember, created_at, last_seen_at, expires_at) VALUES (?, ?, ?, ?, ?, ?)")
    .run(digest(token), userId, remember ? 1 : 0, created.toISOString(), created.toISOString(), expiresAt.toISOString());
  return { token, expiresAt };
}

/** Cuenta activa de una sesión válida, o null. Alarga la sesión sin actividad (como mucho cada 5 min). */
export function userForSession(token: string | undefined): User | null {
  if (!token) return null;
  const db = getDb();
  const id = digest(token);
  const row = db
    .prepare("SELECT s.remember, s.last_seen_at, s.expires_at, u.* FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.id = ?")
    .get(id);
  if (!row) return null;
  const nowMs = Date.now();
  const remember = row.remember === 1;
  const lastSeen = Date.parse(String(row.last_seen_at));
  const expired = nowMs > Date.parse(String(row.expires_at)) || (!remember && nowMs - lastSeen > IDLE_MS);
  if (expired || row.active !== 1) {
    db.prepare("DELETE FROM sessions WHERE id = ?").run(id);
    return null;
  }
  if (nowMs - lastSeen > TOUCH_EVERY_MS) {
    const expiresAt = remember ? String(row.expires_at) : new Date(nowMs + IDLE_MS).toISOString();
    db.prepare("UPDATE sessions SET last_seen_at = ?, expires_at = ? WHERE id = ?").run(new Date(nowMs).toISOString(), expiresAt, id);
  }
  return toUser(row);
}

export function deleteSession(token: string | undefined): void {
  if (token) getDb().prepare("DELETE FROM sessions WHERE id = ?").run(digest(token));
}
