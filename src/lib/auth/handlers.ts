// Iniciar y cerrar sesión, y cambiar la contraseña propia (fase 4a).
import "server-only";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { currentUser, SESSION_COOKIE, unauthorized } from "./current-user";
import { weakPasswordMessage } from "./password.ts";
import { clientIp, loginBlocked, recordFailure, recordSuccess } from "./throttle";
import { checkCredentials, createSession, deleteSession, sessionRemembers, setPassword } from "./users.ts";

const isJson = (request: Request) => (request.headers.get("content-type") ?? "").split(";")[0].trim() === "application/json";
const body = async (request: Request) => {
  const b: unknown = await request.json().catch(() => null);
  return b && typeof b === "object" && !Array.isArray(b) ? (b as Record<string, unknown>) : null;
};
const text = (v: unknown) => (typeof v === "string" ? v : "");

export async function login(request: Request) {
  if (!isJson(request)) return NextResponse.json({ error: "Nur JSON wird angenommen." }, { status: 415 });
  const b = await body(request);
  const email = text(b?.email).trim().toLowerCase();
  const password = text(b?.password);
  if (!email || !password) {
    return NextResponse.json({ error: "Gib E-Mail und Passwort ein." }, { status: 400 });
  }
  const ip = clientIp(request);
  const wait = loginBlocked(email, ip);
  if (wait) {
    return NextResponse.json(
      { error: `Zu viele Fehlversuche. Versuch es in ${wait === 1 ? "einer Minute" : `${wait} Minuten`} noch einmal.` },
      { status: 429, headers: { "Retry-After": String(wait * 60) } },
    );
  }
  const user = await checkCredentials(email, password);
  // Mismo mensaje si el correo no existe o la contraseña no coincide (no delata cuentas).
  if (!user) {
    recordFailure(email, ip);
    return NextResponse.json({ error: "E-Mail oder Passwort stimmt nicht." }, { status: 401 });
  }
  recordSuccess(email);
  if (!user.active) {
    return NextResponse.json({ error: "Dieses Konto ist deaktiviert. Schreib uns, wenn du wieder Zugang brauchst." }, { status: 403 });
  }
  const remember = b?.remember === true;
  const jar = await cookies();
  deleteSession(jar.get(SESSION_COOKIE)?.value); // la sesión anterior de este navegador deja de valer
  const { token, expiresAt } = createSession(user.id, remember);
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    // Sin «angemeldet bleiben», cookie de sesión del navegador (se borra al cerrarlo).
    ...(remember ? { expires: expiresAt } : {}),
  });
  return NextResponse.json({ name: user.name });
}

export async function logout() {
  const jar = await cookies();
  deleteSession(jar.get(SESSION_COOKIE)?.value);
  jar.delete(SESSION_COOKIE);
  return new NextResponse(null, { status: 204 });
}

export async function changePassword(request: Request) {
  const user = await currentUser();
  if (!user) return unauthorized();
  if (!isJson(request)) return NextResponse.json({ error: "Nur JSON wird angenommen." }, { status: 415 });
  const b = await body(request);
  const current = text(b?.current);
  const next = text(b?.next);
  if (!(await checkCredentials(user.email, current))) {
    return NextResponse.json({ error: "Bitte prüf die markierten Felder.", errors: { current: "Das aktuelle Passwort stimmt nicht." } }, { status: 400 });
  }
  const weak = weakPasswordMessage(next, user.email);
  if (weak) return NextResponse.json({ error: "Bitte prüf die markierten Felder.", errors: { next: weak } }, { status: 400 });
  // Cambia la contraseña y cierra todas las sesiones; abre una nueva en este navegador (con el mismo «angemeldet bleiben»).
  const jar = await cookies();
  const remember = sessionRemembers(jar.get(SESSION_COOKIE)?.value);
  await setPassword(user.id, next);
  const { token, expiresAt } = createSession(user.id, remember);
  jar.set(SESSION_COOKIE, token, { httpOnly: true, secure: true, sameSite: "lax", path: "/", ...(remember ? { expires: expiresAt } : {}) });
  return new NextResponse(null, { status: 204 });
}
