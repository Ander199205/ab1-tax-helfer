// Cuenta de la petición actual (cookie de sesión). Solo en el servidor de Next.
import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { NextResponse } from "next/server";
import { userForSession, type User } from "./users.ts";

// Prefijo __Host-: el navegador exige Secure, Path=/ y sin Domain, así que un subdominio no puede plantarla.
export const SESSION_COOKIE = "__Host-th_session";

export async function currentUser(): Promise<User | null> {
  return userForSession((await cookies()).get(SESSION_COOKIE)?.value);
}

/** Para páginas: sin sesión válida, a «Anmelden». */
export async function requireUser(): Promise<User> {
  const user = await currentUser();
  if (!user) redirect("/anmelden");
  return user;
}

export async function requireAdmin(): Promise<User> {
  const user = await requireUser();
  if (user.role !== "admin") redirect("/");
  return user;
}

export const unauthorized = () => NextResponse.json({ error: "Bitte melde dich an." }, { status: 401 });
export const forbidden = () => NextResponse.json({ error: "Dafür fehlen dir die Rechte." }, { status: 403 });
