// Tipos del dominio. Se usan en cliente y servidor (sin dependencias de servidor).

export interface Entity {
  id: string;
  createdAt: string;
  updatedAt: string;
}

// ── Steuerjahre ─────────────────────────────────────────────
export const YEAR_STATUSES = ["offen", "uebergeben", "abgeschlossen"] as const;
export type YearStatus = (typeof YEAR_STATUSES)[number];
export const YEAR_STATUS_LABELS: Record<YearStatus, string> = {
  offen: "Offen",
  uebergeben: "An Steuerberatung übergeben",
  abgeschlossen: "Abgeschlossen",
};

export interface ChecklistItem {
  id: string;
  title: string;
  done: boolean;
}

export interface TaxYearInput {
  year: number;
  status: YearStatus;
  note: string;
  checklist: ChecklistItem[];
}
export interface TaxYear extends Entity, TaxYearInput {}

/** Puntos con los que empieza cada año nuevo (decisión D5 de la fase 2). */
export const DEFAULT_CHECKLIST = [
  "Kontoauszüge (Januar–Dezember)",
  "Ausgangsrechnungen",
  "Eingangsrechnungen",
  "Verträge (Miete, Versicherungen)",
  "Sonstige Nachweise",
];

// ── Belege ──────────────────────────────────────────────────
export const RECEIPT_KINDS = ["ausgabe", "einnahme"] as const;
export type ReceiptKind = (typeof RECEIPT_KINDS)[number];
export const RECEIPT_KIND_LABELS: Record<ReceiptKind, string> = { ausgabe: "Ausgabe", einnahme: "Einnahme" };

export interface ReceiptInput {
  /** "YYYY-MM-DD" */
  date: string;
  /** Importe bruto en céntimos (entero > 0). Sin desglose de IVA (decisión D6). */
  amountCents: number;
  kind: ReceiptKind;
  /** Quien emite la factura (gasto) o el cliente (ingreso). */
  party: string;
  description: string;
  categoryId: string;
  /** Año fiscal al que pertenece; por defecto el de la fecha (decisión D2). */
  year: number;
  note: string;
}
export interface Receipt extends Entity, ReceiptInput {}

// ── Kategorien ──────────────────────────────────────────────
export interface CategoryInput {
  name: string;
}
export interface Category extends Entity, CategoryInput {}
