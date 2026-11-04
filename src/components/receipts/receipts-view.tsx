"use client";

import { Lock, Pencil, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRef, useState } from "react";
import { ConfirmDelete } from "@/components/layout/confirm-delete";
import { EmptyState } from "@/components/layout/empty-state";
import { NativeSelect } from "@/components/layout/native-select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { receiptsApi } from "@/lib/api/clients";
import { formatDay } from "@/lib/dates";
import { useCrud } from "@/lib/hooks/use-crud";
import { formatAmount } from "@/lib/money";
import { totals } from "@/lib/receipts/rules";
import { isClosed } from "@/lib/tax-years/rules";
import { RECEIPT_KIND_LABELS, RECEIPT_KINDS, type Category, type Receipt, type TaxYear } from "@/lib/types";
import { ReceiptForm } from "./receipt-form";

interface ReceiptsViewProps {
  initialReceipts: Receipt[];
  years: TaxYear[];
  categories: Category[];
  /** Filtro de año inicial (desde `?jahr=`). */
  initialYear: string;
}

const ALL = "alle";

export function ReceiptsView({ initialReceipts, years, categories, initialYear }: ReceiptsViewProps) {
  const { items, create, update, remove } = useCrud(initialReceipts, receiptsApi, {
    created: "Beleg gespeichert.",
    updated: "Beleg geändert.",
    removed: "Beleg gelöscht.",
  });
  const [yearFilter, setYearFilter] = useState(initialYear);
  const [categoryFilter, setCategoryFilter] = useState(ALL);
  const [kindFilter, setKindFilter] = useState(ALL);
  const [dialog, setDialogState] = useState<{ mode: "new" } | { mode: "edit"; receipt: Receipt } | null>(null);
  // El diálogo se abre sin DialogTrigger: al cerrarlo, el foco vuelve al botón que lo abrió (WCAG 2.4.3).
  const opener = useRef<HTMLElement | null>(null);
  const setDialog = (next: typeof dialog) => {
    if (next) opener.current = document.activeElement as HTMLElement | null;
    setDialogState(next);
  };

  const categoryName = (id: string) => categories.find((c) => c.id === id)?.name ?? "–";
  const closedYears = new Set(years.filter(isClosed).map((y) => y.year));
  const openYears = years.filter((y) => !isClosed(y));

  const filtered = items
    .filter((r) => yearFilter === ALL || String(r.year) === yearFilter)
    .filter((r) => categoryFilter === ALL || r.categoryId === categoryFilter)
    .filter((r) => kindFilter === ALL || r.kind === kindFilter)
    .sort((a, b) => b.date.localeCompare(a.date));
  const sum = totals(filtered);
  const filtersActive = yearFilter !== ALL || categoryFilter !== ALL || kindFilter !== ALL;
  const resetFilters = () => {
    setYearFilter(ALL);
    setCategoryFilter(ALL);
    setKindFilter(ALL);
  };

  const canCreate = openYears.length > 0 && categories.length > 0;

  const actions = (receipt: Receipt) =>
    closedYears.has(receipt.year) ? (
      <span className="flex items-center gap-1 text-xs text-muted-foreground" title="Das Steuerjahr ist abgeschlossen.">
        <Lock className="size-3.5" /> abgeschlossen
      </span>
    ) : (
      <div className="flex gap-1">
        <Button
          size="icon"
          variant="ghost"
          aria-label={`Beleg „${receipt.party}“ vom ${formatDay(receipt.date)} bearbeiten`}
          onClick={() => setDialog({ mode: "edit", receipt })}
        >
          <Pencil />
        </Button>
        <ConfirmDelete
          title="Beleg löschen?"
          description={`${receipt.party}, ${formatDay(receipt.date)}, ${formatAmount(receipt.amountCents)}`}
          onConfirm={() => remove(receipt)}
        >
          <Button
            size="icon"
            variant="ghost"
            aria-label={`Beleg „${receipt.party}“ vom ${formatDay(receipt.date)} löschen`}
          >
            <Trash2 />
          </Button>
        </ConfirmDelete>
      </div>
    );

  const kindBadge = (receipt: Receipt) => (
    <Badge
      variant="outline"
      className={
        receipt.kind === "einnahme"
          ? "border-emerald-300 bg-emerald-50 text-emerald-900"
          : "border-slate-300 bg-slate-50 text-slate-800"
      }
    >
      {RECEIPT_KIND_LABELS[receipt.kind]}
    </Badge>
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <div className="w-full space-y-1.5 sm:w-40">
          <Label htmlFor="filter-year">Steuerjahr</Label>
          <NativeSelect id="filter-year" value={yearFilter} onChange={(e) => setYearFilter(e.target.value)}>
            <option value={ALL}>Alle Jahre</option>
            {[...years]
              .sort((a, b) => b.year - a.year)
              .map((y) => (
                <option key={y.id} value={y.year}>
                  {y.year}
                </option>
              ))}
          </NativeSelect>
        </div>
        <div className="w-full space-y-1.5 sm:w-56">
          <Label htmlFor="filter-category">Kategorie</Label>
          <NativeSelect id="filter-category" value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
            <option value={ALL}>Alle Kategorien</option>
            {[...categories]
              .sort((a, b) => a.name.localeCompare(b.name, "de"))
              .map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
          </NativeSelect>
        </div>
        <div className="w-full space-y-1.5 sm:w-60">
          <Label htmlFor="filter-kind">Art</Label>
          <NativeSelect id="filter-kind" value={kindFilter} onChange={(e) => setKindFilter(e.target.value)}>
            <option value={ALL}>Ausgaben und Einnahmen</option>
            {RECEIPT_KINDS.map((k) => (
              <option key={k} value={k}>
                {k === "ausgabe" ? "Nur Ausgaben" : "Nur Einnahmen"}
              </option>
            ))}
          </NativeSelect>
        </div>
        <Button className="w-full sm:ml-auto sm:w-auto" disabled={!canCreate} onClick={() => setDialog({ mode: "new" })}>
          <Plus /> Neuer Beleg
        </Button>
      </div>

      {!canCreate && (
        <p className="text-sm text-muted-foreground">
          Für neue Belege brauchst du ein offenes{" "}
          <Link href="/steuerjahre" className="underline underline-offset-4">
            Steuerjahr
          </Link>{" "}
          und mindestens eine{" "}
          <Link href="/kategorien" className="underline underline-offset-4">
            Kategorie
          </Link>
          .
        </p>
      )}

      {/* Región fija: anuncia el resultado de los filtros también cuando queda vacío (WCAG 4.1.3). */}
      <p role="status" className="text-sm text-muted-foreground">
        {filtered.length === 0 ? (
          items.length === 0 ? (
            "Noch keine Belege."
          ) : (
            "Keine Belege für diese Auswahl."
          )
        ) : (
          <>
            <span className="whitespace-nowrap">{sum.count === 1 ? "1 Beleg" : `${sum.count} Belege`}</span>
            {" · "}
            <span className="whitespace-nowrap">Ausgaben {formatAmount(sum.expenses)}</span>
            {" · "}
            <span className="whitespace-nowrap">Einnahmen {formatAmount(sum.income)}</span>
          </>
        )}
      </p>

      {items.length === 0 ? (
        <EmptyState
          action={
            <Button disabled={!canCreate} onClick={() => setDialog({ mode: "new" })}>
              <Plus /> Ersten Beleg anlegen
            </Button>
          }
        >
          Noch keine Belege.
        </EmptyState>
      ) : filtered.length === 0 ? (
        <EmptyState
          action={
            <Button variant="outline" onClick={resetFilters}>
              Filter zurücksetzen
            </Button>
          }
        >
          Keine Belege für diese Auswahl.
        </EmptyState>
      ) : (
        <>
          {filtersActive && (
            <Button variant="link" className="h-auto px-0" onClick={resetFilters}>
              Filter zurücksetzen
            </Button>
          )}

          {/* Pantallas anchas (≥ 1280 px): tabla. Por debajo no cabe junto a la barra lateral. */}
          <Card className="hidden py-0 xl:block">
            <CardContent className="px-0">
              <table className="w-full text-sm">
                <caption className="sr-only">Belege</caption>
                <thead className="border-b text-left text-xs text-muted-foreground">
                  <tr>
                    <th scope="col" className="px-4 py-3 font-medium">Datum</th>
                    <th scope="col" className="px-4 py-3 font-medium">Von / An</th>
                    <th scope="col" className="px-4 py-3 font-medium">Kategorie</th>
                    <th scope="col" className="px-4 py-3 font-medium">Art</th>
                    <th scope="col" className="px-4 py-3 text-right font-medium">Betrag</th>
                    <th scope="col" className="px-4 py-3 font-medium"><span className="sr-only">Aktionen</span></th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filtered.map((r) => (
                    <tr key={r.id}>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {formatDay(r.date)}
                        {String(r.year) !== r.date.slice(0, 4) && (
                          <span className="block text-xs text-muted-foreground">für {r.year}</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-medium">{r.party}</span>
                        {r.description && <span className="block text-xs text-muted-foreground">{r.description}</span>}
                      </td>
                      <td className="px-4 py-3">{categoryName(r.categoryId)}</td>
                      <td className="px-4 py-3">{kindBadge(r)}</td>
                      <td className="px-4 py-3 text-right whitespace-nowrap tabular-nums">{formatAmount(r.amountCents)}</td>
                      <td className="px-4 py-2 text-right">{actions(r)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>

          {/* Móvil y tableta: tarjetas (dos columnas desde 768 px) */}
          <ul className="grid gap-3 md:grid-cols-2 xl:hidden" aria-label="Belege">
            {filtered.map((r) => (
              <li key={r.id}>
                <Card className="h-full gap-2 py-4">
                  <CardContent className="space-y-2 px-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-medium">{r.party}</p>
                        {r.description && <p className="text-xs text-muted-foreground">{r.description}</p>}
                      </div>
                      <p className="font-medium whitespace-nowrap tabular-nums">{formatAmount(r.amountCents)}</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      <span>{formatDay(r.date)}</span>
                      {String(r.year) !== r.date.slice(0, 4) && <span>für {r.year}</span>}
                      <span>· {categoryName(r.categoryId)}</span>
                      {kindBadge(r)}
                    </div>
                    <div className="flex justify-end">{actions(r)}</div>
                  </CardContent>
                </Card>
              </li>
            ))}
          </ul>
        </>
      )}

      <Dialog open={dialog !== null} onOpenChange={(open) => !open && setDialog(null)}>
        <DialogContent
          className="max-h-[90vh] overflow-y-auto sm:max-w-lg"
          onCloseAutoFocus={(e) => {
            if (opener.current?.isConnected) {
              e.preventDefault();
              opener.current.focus();
            }
          }}
        >
          <DialogHeader>
            <DialogTitle>{dialog?.mode === "edit" ? "Beleg bearbeiten" : "Neuer Beleg"}</DialogTitle>
            <DialogDescription>Pflicht sind Datum, Betrag, „Von wem?“ bzw. „An wen?“ und Kategorie. Beschreibung und Notiz sind optional.</DialogDescription>
          </DialogHeader>
          {dialog && (
            <ReceiptForm
              key={dialog.mode === "edit" ? dialog.receipt.id : "new"}
              initial={dialog.mode === "edit" ? dialog.receipt : undefined}
              years={years}
              categories={categories}
              submitLabel={dialog.mode === "edit" ? "Änderungen speichern" : "Beleg speichern"}
              onCancel={() => setDialog(null)}
              onSubmit={async (input) => {
                const errors =
                  dialog.mode === "edit" ? await update(dialog.receipt.id, input) : await create(input);
                if (!errors) setDialog(null);
                return errors;
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
