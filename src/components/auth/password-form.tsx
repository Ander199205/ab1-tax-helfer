"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import { FieldWarning } from "@/components/layout/field-warning";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const MIN = 10;

export function PasswordForm({ email }: { email: string }) {
  const [errors, setErrors] = useState<{ current?: string; next?: string; repeat?: string }>({});
  const [busy, setBusy] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  // Con errores, el foco va al primer campo marcado (su aria-describedby lee el aviso).
  const focusFirstInvalid = () =>
    requestAnimationFrame(() => formRef.current?.querySelector<HTMLElement>("[aria-invalid=true]")?.focus());

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const formEl = event.currentTarget;
    const form = new FormData(formEl);
    const current = String(form.get("current") ?? "");
    const next = String(form.get("next") ?? "");
    const repeat = String(form.get("repeat") ?? "");
    const local: typeof errors = {};
    if (!current) local.current = "Gib dein aktuelles Passwort ein.";
    if (next.length < MIN) local.next = `Mindestens ${MIN} Zeichen.`;
    if (repeat !== next) local.repeat = "Die beiden Passwörter sind nicht gleich.";
    setErrors(local);
    if (Object.keys(local).length) return focusFirstInvalid();
    setBusy(true);
    const res = await fetch("/api/auth/password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ current, next }),
    }).catch(() => null);
    setBusy(false);
    if (res?.ok) {
      formEl.reset();
      return toast.success("Passwort geändert. Andere Geräte sind jetzt abgemeldet.");
    }
    const body = await res?.json().catch(() => null);
    setErrors(body?.errors ?? {});
    if (body?.errors) focusFirstInvalid();
    else toast.error(body?.error ?? "Das hat nicht geklappt.");
  }

  const field = (name: "current" | "next" | "repeat", label: string, autoComplete: string, hint?: string) => (
    <div className="space-y-1.5">
      <Label htmlFor={`pw-${name}`}>{label}</Label>
      <Input
        id={`pw-${name}`}
        name={name}
        type="password"
        autoComplete={autoComplete}
        aria-invalid={Boolean(errors[name])}
        aria-describedby={errors[name] ? `pw-${name}-error` : hint ? `pw-${name}-hint` : undefined}
      />
      {errors[name] ? (
        <FieldWarning id={`pw-${name}-error`} live={false}>
          {errors[name]}
        </FieldWarning>
      ) : (
        hint && <p id={`pw-${name}-hint`} className="text-xs text-muted-foreground">{hint}</p>
      )}
    </div>
  );

  return (
    <form ref={formRef} onSubmit={submit} noValidate className="max-w-sm space-y-4">
      {/* Para los gestores de contraseñas: a qué cuenta pertenece la contraseña nueva. */}
      <input type="email" name="username" autoComplete="username" value={email} readOnly hidden />
      {field("current", "Aktuelles Passwort", "current-password")}
      {field("next", "Neues Passwort", "new-password", `Mindestens ${MIN} Zeichen.`)}
      {field("repeat", "Neues Passwort wiederholen", "new-password")}
      <Button type="submit" aria-disabled={busy}>
        {busy ? "Wird gespeichert …" : "Passwort ändern"}
      </Button>
    </form>
  );
}
