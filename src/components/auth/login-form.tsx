"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { FieldWarning } from "@/components/layout/field-warning";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function LoginForm() {
  const router = useRouter();
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);
  const emailRef = useRef<HTMLInputElement>(null);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setBusy(true);
    setError(undefined);
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: form.get("email"),
        password: form.get("password"),
        remember: form.get("remember") === "on",
      }),
    }).catch(() => null);
    if (res?.ok) {
      router.replace("/");
      router.refresh();
      return;
    }
    setBusy(false);
    const body = await res?.json().catch(() => null);
    setError(body?.error ?? "Die Anmeldung hat nicht geklappt. Versuch es noch einmal.");
    emailRef.current?.focus();
  }

  return (
    <form onSubmit={submit} noValidate className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="login-email">E-Mail</Label>
        <Input ref={emailRef} id="login-email" name="email" type="email" autoComplete="username" required aria-describedby={error ? "login-error" : undefined} aria-invalid={Boolean(error)} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="login-password">Passwort</Label>
        <Input id="login-password" name="password" type="password" autoComplete="current-password" required aria-describedby={error ? "login-error" : undefined} aria-invalid={Boolean(error)} />
      </div>
      <div className="flex items-center gap-2">
        <input id="login-remember" name="remember" type="checkbox" className="size-4 accent-foreground" />
        <Label htmlFor="login-remember" className="font-normal">
          Angemeldet bleiben (30 Tage)
        </Label>
      </div>
      {error && <FieldWarning id="login-error">{error}</FieldWarning>}
      <Button type="submit" className="w-full" aria-disabled={busy}>
        {busy ? "Wird angemeldet …" : "Anmelden"}
      </Button>
    </form>
  );
}
