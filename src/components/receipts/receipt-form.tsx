"use client";

import { useRef, useState } from "react";
import { FieldWarning } from "@/components/layout/field-warning";
import { NativeSelect } from "@/components/layout/native-select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { FieldErrors } from "@/lib/api/http";
import { todayLocal } from "@/lib/dates";
import { amountToInput, parseAmount } from "@/lib/money";
import { validateReceipt, yearOf, type ReceiptErrors } from "@/lib/receipts/rules";
import { isClosed } from "@/lib/tax-years/rules";
import {
  RECEIPT_KIND_LABELS,
  RECEIPT_KINDS,
  type Category,
  type ReceiptInput,
  type ReceiptKind,
  type TaxYear,
} from "@/lib/types";

interface ReceiptFormProps {
  initial?: ReceiptInput;
  years: TaxYear[];
  categories: Category[];
  submitLabel: string;
  /** Devuelve errores del servidor (si los hay) o null si se guardó bien. */
  onSubmit: (input: ReceiptInput) => Promise<FieldErrors | null>;
  onCancel: () => void;
}

/** Formulario de un justificante. El año sigue a la fecha hasta que se elige a mano (decisión D2). */
export function ReceiptForm({ initial, years, categories, submitLabel, onSubmit, onCancel }: ReceiptFormProps) {
  const today = todayLocal();
  const [date, setDate] = useState(initial?.date ?? today);
  const [year, setYear] = useState(String(initial?.year ?? yearOf(today)));
  const [yearTouched, setYearTouched] = useState(Boolean(initial));
  const [kind, setKind] = useState<ReceiptKind>(initial?.kind ?? "ausgabe");
  const [amount, setAmount] = useState(initial ? amountToInput(initial.amountCents) : "");
  const [party, setParty] = useState(initial?.party ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [categoryId, setCategoryId] = useState(initial?.categoryId ?? "");
  const [note, setNote] = useState(initial?.note ?? "");
  const [serverErrors, setServerErrors] = useState<ReceiptErrors>({});
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  // Con errores, el foco va al primer campo marcado; su aria-describedby lee el aviso.
  const focusFirstInvalid = () =>
    requestAnimationFrame(() => formRef.current?.querySelector<HTMLElement>("[aria-invalid=true]")?.focus());

  const cents = parseAmount(amount);
  const candidate: ReceiptInput = {
    date,
    amountCents: cents ?? Number.NaN,
    kind,
    party: party.trim(),
    description: description.trim(),
    categoryId,
    year: Number(year),
    note,
  };
  const liveErrors = validateReceipt(candidate);
  if (amount.trim() && cents === null) liveErrors.amountCents = "Schreib den Betrag wie 1.234,56 oder 1234,56.";
  const errors: ReceiptErrors = {
    ...(submitted ? liveErrors : {}),
    ...Object.fromEntries(Object.entries(serverErrors).filter(([, v]) => v)),
  };
  const clear = (key: keyof ReceiptInput) => setServerErrors((s) => ({ ...s, [key]: undefined }));

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitted(true);
    if (Object.keys(liveErrors).length > 0) return focusFirstInvalid();
    setSaving(true);
    const result = await onSubmit(candidate);
    setSaving(false);
    if (result) {
      setServerErrors(result as ReceiptErrors);
      focusFirstInvalid();
    }
  }

  const field = (key: keyof ReceiptInput) => ({
    "aria-invalid": Boolean(errors[key]),
    "aria-describedby": errors[key] ? `receipt-${key}-error` : undefined,
  });
  const warning = (key: keyof ReceiptInput) =>
    errors[key] ? (
      <FieldWarning id={`receipt-${key}-error`} live={false}>
        {errors[key]}
      </FieldWarning>
    ) : null;

  return (
    <form ref={formRef} onSubmit={handleSubmit} noValidate className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="receipt-date">Datum</Label>
          <Input
            id="receipt-date"
            type="date"
            value={date}
            onChange={(e) => {
              setDate(e.target.value);
              const y = yearOf(e.target.value);
              if (!yearTouched && y) setYear(String(y));
              clear("date");
            }}
            {...field("date")}
          />
          {warning("date")}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="receipt-year">Steuerjahr</Label>
          <NativeSelect
            id="receipt-year"
            value={year}
            onChange={(e) => {
              setYear(e.target.value);
              setYearTouched(true);
              clear("year");
            }}
            {...field("year")}
          >
            {!years.some((y) => String(y.year) === year) && <option value={year}>{year} (nicht angelegt)</option>}
            {[...years]
              .sort((a, b) => b.year - a.year)
              .map((y) => (
                <option key={y.id} value={y.year} disabled={isClosed(y)}>
                  {y.year}
                  {isClosed(y) ? " (abgeschlossen)" : ""}
                </option>
              ))}
          </NativeSelect>
          {warning("year")}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="receipt-kind">Art</Label>
          <NativeSelect
            id="receipt-kind"
            value={kind}
            onChange={(e) => {
              setKind(e.target.value as ReceiptKind);
              if (e.target.value === "einnahme" && !categoryId) {
                const income = categories.find((c) => c.name === "Einnahmen");
                if (income) setCategoryId(income.id);
              }
            }}
          >
            {RECEIPT_KINDS.map((k) => (
              <option key={k} value={k}>
                {RECEIPT_KIND_LABELS[k]}
              </option>
            ))}
          </NativeSelect>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="receipt-amount">Betrag in €</Label>
          <Input
            id="receipt-amount"
            inputMode="decimal"
            autoComplete="off"
            placeholder="0,00"
            value={amount}
            onChange={(e) => {
              setAmount(e.target.value);
              clear("amountCents");
            }}
            {...field("amountCents")}
            aria-describedby={errors.amountCents ? "receipt-amountCents-error" : "receipt-amount-hint"}
          />
          {warning("amountCents") ?? (
            <p id="receipt-amount-hint" className="text-xs text-muted-foreground">
              Gesamtbetrag, z. B. 1.234,56
            </p>
          )}
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="receipt-party">{kind === "einnahme" ? "An wen?" : "Von wem?"}</Label>
        <Input
          id="receipt-party"
          value={party}
          maxLength={120}
          placeholder={kind === "einnahme" ? "z. B. Bäckerei Krüger" : "z. B. Bürobedarf Schneider"}
          onChange={(e) => {
            setParty(e.target.value);
            clear("party");
          }}
          {...field("party")}
        />
        {warning("party")}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="receipt-description">Beschreibung</Label>
        <Input
          id="receipt-description"
          value={description}
          maxLength={200}
          onChange={(e) => setDescription(e.target.value)}
          {...field("description")}
        />
        {warning("description")}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="receipt-category">Kategorie</Label>
        <NativeSelect
          id="receipt-category"
          value={categoryId}
          onChange={(e) => {
            setCategoryId(e.target.value);
            clear("categoryId");
          }}
          {...field("categoryId")}
        >
          <option value="">Bitte wählen</option>
          {[...categories]
            .sort((a, b) => a.name.localeCompare(b.name, "de"))
            .map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
        </NativeSelect>
        {warning("categoryId")}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="receipt-note">Notiz (optional)</Label>
        <Textarea
          id="receipt-note"
          rows={2}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          className="resize-y"
          {...field("note")}
        />
        {warning("note")}
      </div>

      <div className="flex flex-wrap gap-2 pt-1">
        <Button type="submit" disabled={saving} className="flex-1">
          {saving ? "Wird gespeichert …" : submitLabel}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel}>
          Abbrechen
        </Button>
      </div>
    </form>
  );
}
