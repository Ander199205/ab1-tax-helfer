// Iniciar y cerrar sesión, y cambiar la contraseña propia (fase 4a).
import "server-only";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { currentUser, SESSION_COOKIE, unauthorized } from "./current-user";
import { MIN_PASSWORD_LENGTH } from "./password.ts";
import { checkCredentials, createSession, deleteSession, setPassword } from "./users.ts";

const isJson = (request: Request) => (request.headers.get("content-type") ?? "").split(";")[0].trim() === "application/json";
const body = async (request: Request) => {
  const b: unknown = await request.json().catch(() => null);
  return b && typeof b === "object" && !Array.isArray(b) ? (b as Record<string, unknown>) : null;
};
const text = (v: unknown) => (typeof v === "string" ? v : "");

export async function login(request: Request) {
  if (!isJson(request)) return NextResponse.json({ error: "Nur JSON wird angenommen." }, { status: 415 });
  const b = await body(request);
  const email = text(b?.email);
  const password = text(b?.password);
  if (!email || !password) {
    return NextResponse.json({ error: "Gib E-Mail und Passwort ein." }, { status: 400 });
  }
  const user = checkCredentials(email, password);
  // Mismo mensaje si el correo no existe o la contraseña no coincide (no delata cuentas).
  if (!user) return NextResponse.json({ error: "E-Mail oder Passwort stimmt nicht." }, { status: 401 });
  if (!user.active) return NextResponse.json({ error: "Dieses Konto ist deaktiviert. Melde dich bei uns." }, { status: 403 });
  const remember = b?.remember === true;
  const { token, expiresAt } = createSession(user.id, remember);
  (await cookies()).set(SESSION_COOKIE, token, {
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
  if (!checkCredentials(user.email, current)) {
    return NextResponse.json({ error: "Bitte prüf die markierten Felder.", errors: { current: "Das aktuelle Passwort stimmt nicht." } }, { status: 400 });
  }
  if (next.length < MIN_PASSWORD_LENGTH) {
    return NextResponse.json(
      { error: "Bitte prüf die markierten Felder.", errors: { next: `Mindestens ${MIN_PASSWORD_LENGTH} Zeichen.` } },
      { status: 400 },
    );
  }
  // Cambia la contraseña y cierra todas las sesiones; abre una nueva en este navegador.
  setPassword(user.id, next);
  const { token } = createSession(user.id, false);
  (await cookies()).set(SESSION_COOKIE, token, { httpOnly: true, secure: true, sameSite: "lax", path: "/" });
  return new NextResponse(null, { status: 204 });
}
