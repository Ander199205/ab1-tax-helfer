import { redirect } from "next/navigation";
import { LoginForm } from "@/components/auth/login-form";
import { currentUser } from "@/lib/auth/current-user";

export const metadata = { title: "Anmelden · ab1 Tax Helfer" };
export const dynamic = "force-dynamic";

export default async function LoginPage() {
  if (await currentUser()) redirect("/");
  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm space-y-6">
        <div className="flex items-center gap-2">
          <div className="flex size-9 items-center justify-center rounded-lg bg-primary text-sm font-semibold text-primary-foreground">
            ab1
          </div>
          <div className="leading-tight">
            <p className="font-semibold">Tax Helfer</p>
            <p className="text-xs text-muted-foreground">Belege ordnen</p>
          </div>
        </div>
        <div className="space-y-1">
          <h1 id="page-title" tabIndex={-1} className="text-2xl font-semibold tracking-tight outline-none">
            Anmelden
          </h1>
          <p className="text-sm text-muted-foreground">Melde dich mit dem Zugang an, den du von uns bekommen hast.</p>
        </div>
        <LoginForm />
        <p className="text-xs text-muted-foreground">
          Passwort vergessen? Schreib uns kurz, dann setzen wir es zurück.
        </p>
      </div>
    </main>
  );
}
