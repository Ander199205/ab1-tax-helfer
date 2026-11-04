// Verwaltung: el administrador crea cuentas de clientes, las desactiva y restablece contraseñas (D3, D4).
import "server-only";
import { NextResponse } from "next/server";
import { currentUser, forbidden, unauthorized } from "./current-user";
import { generatePassword } from "./password.ts";
import { createUser, emailTaken, findUser, listUsers, setActive, setPassword } from "./users.ts";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const invalid = (errors: Record<string, string>) =>
  NextResponse.json({ error: "Bitte prüf die markierten Felder.", errors }, { status: 400 });

async function requireAdminApi() {
  const user = await currentUser();
  if (!user) return { error: unauthorized() };
  if (user.role !== "admin") return { error: forbidden() };
  return { user };
}

async function jsonBody(request: Request) {
  if ((request.headers.get("content-type") ?? "").split(";")[0].trim() !== "application/json") return null;
  const b: unknown = await request.json().catch(() => null);
  return b && typeof b === "object" && !Array.isArray(b) ? (b as Record<string, unknown>) : null;
}

export async function listAccounts() {
  const { error } = await requireAdminApi();
  if (error) return error;
  return NextResponse.json(listUsers());
}

/** Crea la cuenta con una contraseña inicial que se muestra una sola vez. */
export async function createAccount(request: Request) {
  const { error } = await requireAdminApi();
  if (error) return error;
  const b = await jsonBody(request);
  if (!b) return NextResponse.json({ error: "Ungültige Daten." }, { status: 400 });
  const name = typeof b.name === "string" ? b.name.trim() : "";
  const email = typeof b.email === "string" ? b.email.trim().toLowerCase() : "";
  const errors: Record<string, string> = {};
  if (!name) errors.name = "Gib einen Namen ein.";
  else if (name.length > 80) errors.name = "Höchstens 80 Zeichen.";
  if (!EMAIL.test(email)) errors.email = "Gib eine gültige E-Mail-Adresse ein.";
  else if (emailTaken(email)) errors.email = "Für diese E-Mail gibt es schon ein Konto.";
  if (Object.keys(errors).length) return invalid(errors);
  const password = generatePassword();
  const user = createUser({ name, email, password, role: "client" });
  return NextResponse.json({ user, password }, { status: 201 });
}

/** Desactivar, reactivar o restablecer la contraseña de una cuenta. */
export async function updateAccount(request: Request, id: string) {
  const { user: admin, error } = await requireAdminApi();
  if (error) return error;
  const target = findUser(id);
  if (!target) return NextResponse.json({ error: "Konto nicht gefunden." }, { status: 404 });
  const b = await jsonBody(request);
  if (!b) return NextResponse.json({ error: "Ungültige Daten." }, { status: 400 });
  if (target.id === admin!.id) {
    return NextResponse.json({ error: "Dein eigenes Konto änderst du unter „Konto“." }, { status: 409 });
  }
  let password: string | undefined;
  if (typeof b.active === "boolean") setActive(target.id, b.active);
  if (b.resetPassword === true) {
    password = generatePassword();
    setPassword(target.id, password);
  }
  return NextResponse.json({ user: findUser(target.id), ...(password ? { password } : {}) });
}
