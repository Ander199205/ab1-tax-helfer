"use client";

import { Lock, Plus, Trash2, X } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { ConfirmDelete } from "@/components/layout/confirm-delete";
import { EmptyState } from "@/components/layout/empty-state";
import { FieldWarning } from "@/components/layout/field-warning";
import { NativeSelect } from "@/components/layout/native-select";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { taxYearsApi } from "@/lib/api/clients";
import { useCrud } from "@/lib/hooks/use-crud";
import { StatusBadge } from "./status-badge";
import { isClosed, maxYear, MIN_YEAR, openItems, validateTaxYear } from "@/lib/tax-years/rules";
import { YEAR_STATUS_LABELS, YEAR_STATUSES, type TaxYear, type TaxYearInput, type YearStatus } from "@/lib/types";

interface TaxYearsViewProps {
  initialYears: TaxYear[];
  /** Número de justificantes por año (año → número). */
  counts: Record<number, number>;
}

const suggestedYear = (years: TaxYear[]) => {
  const current = new Date().getFullYear();
  if (!years.some((y) => y.year === current)) return current;
  return Math.min(Math.max(...years.map((y) => y.year)) + 1, maxYear());
};

export function TaxYearsView({ initialYears, counts }: TaxYearsViewProps) {
  const { items, create, update, remove } = useCrud(initialYears, taxYearsApi, {
    created: "Steuerjahr angelegt.",
    updated: "Gespeichert.",
    removed: "Steuerjahr gelöscht.",
  });
  const [newYear, setNewYear] = useState(String(suggestedYear(initialYears)));
  const [error, setError] = useState<string>();

  async function handleCreate(event: React.FormEvent) {
    event.preventDefault();
    const year = Number(newYear);
    const local = validateTaxYear({ year, status: "offen", note: "", checklist: [] }).year;
    if (local) return setError(local);
    if (items.some((y) => y.year === year)) return setError(`Das Steuerjahr ${year} gibt es schon.`);
    // Sin `checklist`: el servidor pone la lista inicial (decisión D5).
    const result = await create({ year } as TaxYearInput);
    if (result) return setError(result.year);
    setError(undefined);
    setNewYear(String(Math.min(year + 1, maxYear())));
  }

  const sorted = [...items].sort((a, b) => b.year - a.year);

  return (
    <div className="space-y-6">
      <form onSubmit={handleCreate} noValidate className="flex flex-wrap items-end gap-2">
        <div className="w-40 space-y-1.5">
          <Label htmlFor="new-year">Neues Steuerjahr</Label>
          <Input
            id="new-year"
            type="number"
            inputMode="numeric"
            min={MIN_YEAR}
            max={maxYear()}
            value={newYear}
            onChange={(e) => {
              setNewYear(e.target.value);
              setError(undefined);
            }}
            aria-invalid={Boolean(error)}
            aria-describedby={error ? "new-year-error" : undefined}
          />
        </div>
        <Button type="submit">
          <Plus /> Anlegen
        </Button>
        {error && (
          <div className="basis-full">
            <FieldWarning id="new-year-error">{error}</FieldWarning>
          </div>
        )}
      </form>

      {sorted.length === 0 ? (
        <EmptyState>Noch keine Steuerjahre. Leg oben das erste an.</EmptyState>
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          {sorted.map((year) => (
            <YearCard
              key={year.id}
              year={year}
              count={counts[year.year] ?? 0}
              onUpdate={(patch, success) => update(year.id, patch, success)}
              onRemove={() => remove(year)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface YearCardProps {
  year: TaxYear;
  count: number;
  onUpdate: (patch: Partial<TaxYear>, success?: string | null) => Promise<unknown>;
  onRemove: () => void;
}

function YearCard({ year, count, onUpdate, onRemove }: YearCardProps) {
  const [newItem, setNewItem] = useState("");
  // Cambio optimista: la casilla responde al instante; si el servidor falla, vuelve la lista guardada.
  const [pending, setPending] = useState<TaxYear["checklist"] | null>(null);
  const checklist = pending ?? year.checklist;
  const closed = isClosed(year);
  const open = openItems({ checklist });
  const statusId = `status-${year.id}`;

  async function setChecklist(next: TaxYear["checklist"]) {
    setPending(next);
    await onUpdate({ checklist: next }, null);
    setPending(null);
  }

  function addItem(event: React.FormEvent) {
    event.preventDefault();
    const title = newItem.trim();
    if (!title) return;
    setChecklist([...checklist, { id: globalThis.crypto.randomUUID(), title, done: false }]);
    setNewItem("");
  }

  return (
    <Card>
      <CardHeader className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1.5">
          <CardTitle className="text-lg">Steuerjahr {year.year}</CardTitle>
          <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <StatusBadge status={year.status} />
            <Link href={`/belege?jahr=${year.year}`} className="inline-flex min-h-6 items-center underline-offset-4 hover:underline">
              {count === 1 ? "1 Beleg" : `${count} Belege`}
            </Link>
          </div>
        </div>
        <div className="w-full space-y-1.5 sm:w-60">
          <Label htmlFor={statusId}>Status</Label>
          <NativeSelect
            id={statusId}
            value={year.status}
            onChange={(e) => onUpdate({ status: e.target.value as YearStatus }, "Status geändert.")}
          >
            {YEAR_STATUSES.map((s) => (
              <option key={s} value={s}>
                {YEAR_STATUS_LABELS[s]}
              </option>
            ))}
          </NativeSelect>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <section aria-labelledby={`checklist-${year.id}`} className="space-y-2">
          <h3 id={`checklist-${year.id}`} className="text-sm font-medium">
            Was fehlt noch?{" "}
            <span className="font-normal text-muted-foreground">
              {open === 0 ? "– alles da" : `– ${open} von ${checklist.length} offen`}
            </span>
          </h3>
          {closed && (
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Lock className="size-3.5" /> Das Jahr ist abgeschlossen. Stell den Status auf „Offen“, um etwas zu ändern.
            </p>
          )}
          <ul className="space-y-1">
            {checklist.map((item) => (
              <li key={item.id} className="flex items-center gap-2">
                <input
                  id={`item-${item.id}`}
                  type="checkbox"
                  className="size-4 accent-foreground"
                  checked={item.done}
                  disabled={closed}
                  onChange={() =>
                    setChecklist(checklist.map((i) => (i.id === item.id ? { ...i, done: !i.done } : i)))
                  }
                />
                <label
                  htmlFor={`item-${item.id}`}
                  className={`flex-1 py-1 text-sm ${item.done ? "text-muted-foreground line-through" : ""}`}
                >
                  {item.title}
                </label>
                {!closed && (
                  <Button
                    size="icon-sm"
                    variant="ghost"
                    aria-label={`Punkt „${item.title}“ entfernen`}
                    onClick={() => setChecklist(checklist.filter((i) => i.id !== item.id))}
                  >
                    <X />
                  </Button>
                )}
              </li>
            ))}
          </ul>
          {!closed && (
            <form onSubmit={addItem} className="flex flex-wrap gap-2">
              <Label htmlFor={`new-item-${year.id}`} className="sr-only">
                Neuer Punkt für {year.year}
              </Label>
              <Input
                id={`new-item-${year.id}`}
                value={newItem}
                maxLength={120}
                placeholder="Neuer Punkt, z. B. Fahrtenbuch"
                className="min-w-40 flex-1"
                onChange={(e) => setNewItem(e.target.value)}
              />
              <Button type="submit" variant="outline">
                Hinzufügen
              </Button>
            </form>
          )}
        </section>

        <div className="flex justify-end border-t pt-3">
          {count > 0 ? (
            <p className="text-xs text-muted-foreground">Löschen geht erst, wenn keine Belege mehr dazugehören.</p>
          ) : (
            <ConfirmDelete
              title={`Steuerjahr ${year.year} löschen?`}
              description="Das Jahr und seine Liste werden endgültig gelöscht."
              onConfirm={onRemove}
            >
              <Button variant="ghost" size="sm" className="text-destructive">
                <Trash2 /> Steuerjahr löschen
              </Button>
            </ConfirmDelete>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
