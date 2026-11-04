// Hash de contraseñas con scrypt de Node (decisión D2 de la fase 4). Sin alias: lo usa tools/admin.mjs.
// Asíncrono (va al threadpool de libuv): la versión síncrona bloqueaba el servidor ~100 ms por intento.
import { randomBytes, scrypt, timingSafeEqual, type ScryptOptions } from "node:crypto";

// Parámetros recomendados por OWASP (N=2^17, r=8, p=1). Se guardan en cada hash: si cambian,
// las contraseñas antiguas siguen valiendo y se vuelven a calcular al iniciar sesión (needsRehash).
const N = 2 ** 17;
const R = 8;
const P = 1;
const KEYLEN = 64;
const MAXMEM = 256 * 1024 * 1024;

const derive = (password: string, salt: Buffer, keylen: number, options: ScryptOptions) =>
  new Promise<Buffer>((resolve, reject) =>
    scrypt(password, salt, keylen, options, (error, key) => (error ? reject(error) : resolve(key))),
  );

/** «scrypt$N$r$p$sal$hash» (base64url). */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const hash = await derive(password, salt, KEYLEN, { N, r: R, p: P, maxmem: MAXMEM });
  return ["scrypt", N, R, P, salt.toString("base64url"), hash.toString("base64url")].join("$");
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [kind, n, r, p, salt, hash] = stored.split("$");
  if (kind !== "scrypt" || !salt || !hash) return false;
  const expected = Buffer.from(hash, "base64url");
  const actual = await derive(password, Buffer.from(salt, "base64url"), expected.length, {
    N: Number(n),
    r: Number(r),
    p: Number(p),
    maxmem: MAXMEM,
  });
  return timingSafeEqual(actual, expected);
}

export const needsRehash = (stored: string) => !stored.startsWith(`scrypt$${N}$${R}$${P}$`);

/** Contraseña inicial o restablecida: 16 caracteres sin letras que se confunden (0/O, 1/l). */
export function generatePassword(): string {
  const alphabet = "abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = randomBytes(16);
  const chars = Array.from(bytes, (b) => alphabet[b % alphabet.length]);
  return `${chars.slice(0, 4).join("")}-${chars.slice(4, 8).join("")}-${chars.slice(8, 12).join("")}-${chars.slice(12).join("")}`;
}

export const MIN_PASSWORD_LENGTH = 10;
export const MAX_PASSWORD_LENGTH = 256;
const COMMON = ["passwort", "password", "1234567890", "qwertz", "qwerty", "hallo", "geheim", "steuer", "beispiel"];

/** Mensaje si la contraseña nueva no vale (en alemán), o null. */
export function weakPasswordMessage(password: string, email = ""): string | null {
  if (password.length < MIN_PASSWORD_LENGTH) return `Mindestens ${MIN_PASSWORD_LENGTH} Zeichen.`;
  if (password.length > MAX_PASSWORD_LENGTH) return `Höchstens ${MAX_PASSWORD_LENGTH} Zeichen.`;
  const lower = password.toLowerCase();
  if (new Set(lower).size < 4) return "Das Passwort braucht mehr verschiedene Zeichen.";
  const local = email.toLowerCase().split("@")[0];
  if (COMMON.some((w) => lower.includes(w)) || (local.length >= 4 && lower.includes(local))) {
    return "Dieses Passwort ist zu leicht zu erraten.";
  }
  return null;
}
