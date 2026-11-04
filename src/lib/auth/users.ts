// Cuentas y sesiones en SQLite. Sin alias ni «server-only»: lo usan también tools/admin.mjs y las pruebas.
import { createHash, randomBytes, randomUUID } from "node:crypto";
import { getDb, transaction } from "../db/database.ts";
import { hashPassword, needsRehash, verifyPassword } from "./password.ts";

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

export async function createUser(input: { email: string; name: string; password: string; role: Role; id?: string }): Promise<User> {
  const ts = now();
  const id = input.id ?? randomUUID();
  const hash = await hashPassword(input.password);
  getDb()
    .prepare("INSERT INTO users (id, email, name, password_hash, role, active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, 1, ?, ?)")
    .run(id, input.email.trim().toLowerCase(), input.name.trim(), hash, input.role, ts, ts);
  return findUser(id)!;
}

export const emailTaken = (email: string) =>
  Boolean(getDb().prepare("SELECT 1 FROM users WHERE email = ?").get(email.trim().toLowerCase()));

// Hash ficticio para comparar cuando el correo no existe (mismo tiempo de respuesta); se calcula la primera vez.
let dummyHash: Promise<string> | null = null;

/** Comprueba correo y contraseña. Devuelve la cuenta (aunque esté desactivada) o null. */
export async function checkCredentials(email: string, password: string): Promise<User | null> {
  const row = getDb().prepare("SELECT * FROM users WHERE email = ?").get(email.trim().toLowerCase());
  // Sin cuenta también se calcula un hash, para no delatar por el tiempo de respuesta qué correos existen.
  if (!row) {
    dummyHash ??= hashPassword("dummy-password-for-timing");
    await verifyPassword(password, await dummyHash);
    return null;
  }
  const stored = String(row.password_hash);
  if (!(await verifyPassword(password, stored))) return null;
  if (needsRehash(stored)) {
    getDb().prepare("UPDATE users SET password_hash = ? WHERE id = ?").run(await hashPassword(password), String(row.id));
  }
  return toUser(row);
}

/** Cambia la contraseña y cierra todas las sesiones de la cuenta. */
export async function setPassword(userId: string, password: string): Promise<void> {
  const hash = await hashPassword(password);
  transaction((db) => {
    db.prepare("UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?").run(hash, now(), userId);
    db.prepare("DELETE FROM sessions WHERE user_id = ?").run(userId);
  });
}

export function setActive(userId: string, active: boolean): void {
  transaction((db) => {
    db.prepare("UPDATE users SET active = ?, updated_at = ? WHERE id = ?").run(active ? 1 : 0, now(), userId);
    if (!active) db.prepare("DELETE FROM sessions WHERE user_id = ?").run(userId);
  });
}

// ── Sesiones (decisión D8: 8 h sin actividad; con «angemeldet bleiben», 30 días; nunca más de 30 días) ──
export const IDLE_MS = 8 * 60 * 60 * 1000;
export const REMEMBER_MS = 30 * 24 * 60 * 60 * 1000;
export const MAX_SESSION_MS = REMEMBER_MS;
const TOUCH_EVERY_MS = 5 * 60 * 1000;

const digest = (token: string) => createHash("sha256").update(token).digest("hex");

/** Crea una sesión y devuelve el token para la cookie (en la base de datos solo queda su hash). */
export function createSession(userId: string, remember: boolean): { token: string; expiresAt: Date } {
  const token = randomBytes(32).toString("base64url");
  const created = new Date();
  const expiresAt = new Date(created.getTime() + (remember ? REMEMBER_MS : IDLE_MS));
  // Limpieza: fuera las sesiones caducadas de todas las cuentas.
  getDb().prepare("DELETE FROM sessions WHERE expires_at < ?").run(created.toISOString());
  getDb()
    .prepare("INSERT INTO sessions (id, user_id, remember, created_at, last_seen_at, expires_at) VALUES (?, ?, ?, ?, ?, ?)")
    .run(digest(token), userId, remember ? 1 : 0, created.toISOString(), created.toISOString(), expiresAt.toISOString());
  return { token, expiresAt };
}

/** ¿La sesión tenía «angemeldet bleiben»? (para conservarlo al cambiar la contraseña) */
export function sessionRemembers(token: string | undefined): boolean {
  if (!token) return false;
  return getDb().prepare("SELECT remember FROM sessions WHERE id = ?").get(digest(token))?.remember === 1;
}

/** Cuenta activa de una sesión válida, o null. Alarga la sesión sin actividad (como mucho cada 5 min). */
export function userForSession(token: string | undefined): User | null {
  if (!token) return null;
  const db = getDb();
  const id = digest(token);
  const row = db
    .prepare(
      "SELECT s.remember, s.last_seen_at, s.expires_at, s.created_at AS session_created, u.* FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.id = ?",
    )
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
    // Se alarga 8 h, pero nunca más allá de 30 días desde que se abrió (revisión D/E).
    const cap = Date.parse(String(row.session_created)) + MAX_SESSION_MS;
    const expiresAt = remember ? String(row.expires_at) : new Date(Math.min(nowMs + IDLE_MS, cap)).toISOString();
    db.prepare("UPDATE sessions SET last_seen_at = ?, expires_at = ? WHERE id = ?").run(new Date(nowMs).toISOString(), expiresAt, id);
  }
  return toUser(row);
}

export function deleteSession(token: string | undefined): void {
  if (token) getDb().prepare("DELETE FROM sessions WHERE id = ?").run(digest(token));
}
