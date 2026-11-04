// Límite básico de intentos fallidos de inicio de sesión (adelantado de la fase 4b por la revisión D/E).
// En memoria del proceso: basta con un solo servidor; se pierde al reiniciar.
import "server-only";

const WINDOW_MS = 15 * 60 * 1000;
const MAX_PER_EMAIL = 5;
const MAX_PER_IP = 100;

const failures = new Map<string, { count: number; since: number }>();

function hits(key: string, now: number) {
  const entry = failures.get(key);
  if (!entry || now - entry.since > WINDOW_MS) return 0;
  return entry.count;
}

/** Minutos de espera si hay demasiados fallos recientes para ese correo o esa IP; si no, 0. */
export function loginBlocked(email: string, ip: string, now = Date.now()): number {
  const blocked = hits(`e:${email}`, now) >= MAX_PER_EMAIL || hits(`i:${ip}`, now) >= MAX_PER_IP;
  if (!blocked) return 0;
  const oldest = Math.min(failures.get(`e:${email}`)?.since ?? now, failures.get(`i:${ip}`)?.since ?? now);
  return Math.max(1, Math.ceil((oldest + WINDOW_MS - now) / 60000));
}

export function recordFailure(email: string, ip: string, now = Date.now()) {
  for (const key of [`e:${email}`, `i:${ip}`]) {
    const entry = failures.get(key);
    if (!entry || now - entry.since > WINDOW_MS) failures.set(key, { count: 1, since: now });
    else entry.count++;
  }
}

/** Tras entrar bien se olvidan los fallos de ese correo (no los de la IP). */
export const recordSuccess = (email: string) => failures.delete(`e:${email}`);

export const clientIp = (request: Request) =>
  request.headers.get("x-forwarded-for")?.split(",")[0].trim() || request.headers.get("x-real-ip") || "local";
