"use client";

import { Copy, KeyRound, Plus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { EmptyState } from "@/components/layout/empty-state";
import { FieldWarning } from "@/components/layout/field-warning";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatDay } from "@/lib/dates";

export interface Account {
  id: string;
  email: string;
  name: string;
  role: "admin" | "client";
  active: boolean;
  createdAt: string;
}

const post = (url: string, method: string, body: unknown) =>
  fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).then(async (r) => ({
    ok: r.ok,
    body: await r.json().catch(() => ({})),
  }));

/** Lista de cuentas y alta de clientes. La contraseña nueva se muestra una sola vez. */
export function AccountsView({ initialAccounts, selfId }: { initialAccounts: Account[]; selfId: string }) {
  const [accounts, setAccounts] = useState(initialAccounts);
  const [errors, setErrors] = useState<{ name?: string; email?: string }>({});
  const [busy, setBusy] = useState(false);
  // `open` aparte de `shown`: al cerrar, el contenido se queda hasta el final de la animación.
  const [shown, setShownState] = useState<{ account: Account; password: string; reason: "neu" | "reset" } | null>(null);
  const [open, setOpen] = useState(false);
  const setShown = (value: typeof shown) => {
    if (value) setShownState(value);
    setOpen(Boolean(value));
  };

  const replace = (a: Account) => setAccounts((list) => list.map((x) => (x.id === a.id ? a : x)));

  async function create(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formEl = event.currentTarget;
    const form = new FormData(formEl);
    setBusy(true);
    const res = await post("/api/admin/users", "POST", { name: form.get("name"), email: form.get("email") });
    setBusy(false);
    if (!res.ok) {
      setErrors(res.body.errors ?? {});
      if (!res.body.errors) toast.error(res.body.error ?? "Das hat nicht geklappt.");
      return;
    }
    setErrors({});
    formEl.reset();
    setAccounts((list) => [...list, res.body.user]);
    setShown({ account: res.body.user, password: res.body.password, reason: "neu" });
  }

  async function change(account: Account, patch: { active?: boolean; resetPassword?: true }) {
    const res = await post(`/api/admin/users/${account.id}`, "PATCH", patch);
    if (!res.ok) return toast.error(res.body.error ?? "Das hat nicht geklappt.");
    replace(res.body.user);
    if (res.body.password) setShown({ account: res.body.user, password: res.body.password, reason: "reset" });
    else toast.success(patch.active ? "Konto aktiviert." : "Konto deaktiviert. Offene Sitzungen sind beendet.");
  }

  async function copy(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Kopiert.");
    } catch {
      toast.error("Kopieren ging nicht. Markier das Passwort und kopier es von Hand.");
    }
  }

  return (
    <div className="space-y-6">
      <form onSubmit={create} noValidate className="flex max-w-3xl flex-wrap items-end gap-3">
        <div className="min-w-48 flex-1 space-y-1.5">
          <Label htmlFor="acc-name">Name des Kunden</Label>
          <Input id="acc-name" name="name" placeholder="z. B. Bäckerei Krüger" aria-invalid={Boolean(errors.name)} aria-describedby={errors.name ? "acc-name-error" : undefined} />
        </div>
        <div className="min-w-56 flex-1 space-y-1.5">
          <Label htmlFor="acc-email">E-Mail</Label>
          <Input id="acc-email" name="email" type="email" autoComplete="off" aria-invalid={Boolean(errors.email)} aria-describedby={errors.email ? "acc-email-error" : undefined} />
        </div>
        <Button type="submit" aria-disabled={busy}>
          <Plus /> {busy ? "Wird angelegt …" : "Konto anlegen"}
        </Button>
        {(errors.name || errors.email) && (
          <div className="basis-full space-y-1">
            {errors.name && <FieldWarning id="acc-name-error">{errors.name}</FieldWarning>}
            {errors.email && <FieldWarning id="acc-email-error">{errors.email}</FieldWarning>}
          </div>
        )}
      </form>

      {accounts.length === 0 ? (
        <EmptyState>Noch keine Konten.</EmptyState>
      ) : (
        <Card className="max-w-3xl py-0">
          <CardContent className="px-0">
            <ul className="divide-y" aria-label="Konten">
              {accounts.map((a) => (
                <li key={a.id} data-row className="flex flex-wrap items-center gap-3 px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">
                      {a.name} {a.id === selfId && <span className="text-xs font-normal text-muted-foreground">(du)</span>}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {a.email} · seit {formatDay(a.createdAt.slice(0, 10))}
                    </p>
                  </div>
                  <Badge variant="outline">{a.role === "admin" ? "Verwaltung" : "Kunde"}</Badge>
                  {!a.active && (
                    <Badge variant="outline" className="border-amber-300 bg-amber-50 text-amber-900">
                      Deaktiviert
                    </Badge>
                  )}
                  {a.id !== selfId && (
                    <div className="flex flex-wrap gap-2">
                      <Button size="sm" variant="outline" onClick={() => change(a, { resetPassword: true })} aria-label={`Passwort von ${a.name} zurücksetzen`}>
                        <KeyRound /> Passwort zurücksetzen
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => change(a, { active: !a.active })} aria-label={`${a.name} ${a.active ? "deaktivieren" : "aktivieren"}`}>
                        {a.active ? "Deaktivieren" : "Aktivieren"}
                      </Button>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      <Dialog open={open} onOpenChange={(next) => !next && setShown(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{shown?.reason === "neu" ? "Konto angelegt" : "Passwort zurückgesetzt"}</DialogTitle>
            <DialogDescription>
              Gib {shown?.account.name} dieses Passwort auf einem sicheren Weg weiter. Es wird nur jetzt angezeigt.
            </DialogDescription>
          </DialogHeader>
          {shown && (
            <div className="space-y-3">
              <p className="text-sm">
                E-Mail: <span className="font-medium">{shown.account.email}</span>
              </p>
              <div className="flex items-center gap-2">
                <code data-testid="new-password" className="flex-1 rounded-md border bg-muted px-3 py-2 font-mono text-base select-all">
                  {shown.password}
                </code>
                <Button size="icon" variant="outline" aria-label="Passwort kopieren" onClick={() => copy(shown.password)}>
                  <Copy />
                </Button>
              </div>
              <Button className="w-full" onClick={() => setShown(null)}>
                Fertig
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
